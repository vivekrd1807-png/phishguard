"""Authentication, profile, preferences and account management endpoints."""
import hashlib
import json
import logging
import os
import secrets
import smtplib
from email.message import EmailMessage

from flask import Blueprint, g, jsonify, request, session
from werkzeug.security import check_password_hash, generate_password_hash

from db import IntegrityError, get_db, now_ms
from security import (ApiError, check_new_password, csrf_token, email_field, json_body, login_required,
                      password_field, rate_limit, start_session, text_field, allowed_origins)

log = logging.getLogger("phishguard")
bp = Blueprint("auth", __name__, url_prefix="/api")

MAX_FAILED = 5
LOCK_MS = 15 * 60 * 1000
RESET_TTL_MS = 30 * 60 * 1000
# A real hash to compare against when the e-mail is unknown, so response time does not reveal which accounts exist.
_DUMMY_HASH = generate_password_hash("phishguard-dummy-password")

PREF_DEFAULTS = {
    "sidebar_collapsed": False, "suspicious_threshold": 0.75, "save_history": True,
    "strip_query": False, "notify_phishing": True, "notify_security": True,
}
BOOL_PREFS = [k for k, v in PREF_DEFAULTS.items() if isinstance(v, bool)]


# ------------------------------------------------------------------ helpers
def user_json(u):
    return {"id": u["id"], "name": u["name"], "email": u["email"], "bio": u["bio"],
            "created_at": u["created_at"], "last_login_at": u["last_login_at"]}


def get_prefs(user_id):
    row = get_db().execute("SELECT * FROM preferences WHERE user_id = ?", (user_id,)).fetchone()
    if row is None:
        return dict(PREF_DEFAULTS)
    out = {k: bool(row[k]) for k in BOOL_PREFS}
    out["suspicious_threshold"] = float(row["suspicious_threshold"])
    return out


def notify(user_id, kind, title, body="", link=None, pref=None):
    """Create an in-app notification (skipped when the user switched that category off). Keeps the latest 100."""
    db = get_db()
    if pref:
        if not get_prefs(user_id).get(pref, True):
            return
    db.execute("INSERT INTO notifications (user_id, kind, title, body, link, created_at) VALUES (?,?,?,?,?,?)",
               (user_id, kind, title, body, link, now_ms()))
    db.execute("DELETE FROM notifications WHERE user_id = ? AND id NOT IN "
               "(SELECT id FROM notifications WHERE user_id = ? ORDER BY id DESC LIMIT 100)", (user_id, user_id))


def session_payload(user):
    return {"user": user_json(user), "preferences": get_prefs(user["id"]), "csrf": csrf_token()}


def send_reset(email, link):
    """E-mail the reset link when SMTP is configured; otherwise print it in the backend console."""
    host = os.environ.get("PHISHGUARD_SMTP_HOST")
    if not host:
        log.warning("Password reset link for %s (SMTP not configured): %s", email, link)
        print(f"[PhishGuard] Password reset link for {email}: {link}", flush=True)
        return False
    msg = EmailMessage()
    msg["Subject"] = "Reset your PhishGuard password"
    msg["From"] = os.environ.get("PHISHGUARD_SMTP_FROM", "no-reply@phishguard.local")
    msg["To"] = email
    msg.set_content(f"Use this link within 30 minutes to choose a new password:\n\n{link}\n\n"
                    "If you did not request this, you can ignore this message.")
    with smtplib.SMTP(host, int(os.environ.get("PHISHGUARD_SMTP_PORT", "587")), timeout=10) as s:
        s.starttls()
        if os.environ.get("PHISHGUARD_SMTP_USER"):
            s.login(os.environ["PHISHGUARD_SMTP_USER"], os.environ.get("PHISHGUARD_SMTP_PASSWORD", ""))
        s.send_message(msg)
    return True


def is_dev():
    return os.environ.get("PHISHGUARD_ENV", "development").lower() != "production"


# ------------------------------------------------------------------ auth
@bp.get("/auth/csrf")
def get_csrf():
    return jsonify(csrf=csrf_token())


@bp.get("/auth/me")
def me():
    if g.user is None:
        return jsonify(user=None, csrf=csrf_token())
    return jsonify(session_payload(g.user))


@bp.post("/auth/register")
@rate_limit("register", 10, 3600)
def register():
    body = json_body()
    name = text_field(body, "name", min_len=2, max_len=80)
    email = email_field(body)
    pw = check_new_password(password_field(body))
    db = get_db()
    try:
        cur = db.execute("INSERT INTO users (name, email, password_hash, created_at, last_login_at) VALUES (?,?,?,?,?)",
                         (name, email, generate_password_hash(pw), now_ms(), now_ms()))
    except IntegrityError:
        raise ApiError("An account with this email already exists.", 409, "email")
    uid = cur.lastrowid
    db.execute("INSERT INTO preferences (user_id) VALUES (?)", (uid,))
    notify(uid, "welcome", "Welcome to PhishGuard", "Scan a URL from the Dashboard to get started.", "/dashboard")
    db.commit()
    user = db.execute("SELECT * FROM users WHERE id = ?", (uid,)).fetchone()
    start_session(user, remember=bool(body.get("remember")))
    return jsonify(session_payload(user)), 201


@bp.post("/auth/login")
@rate_limit("login", 30, 300)
def login():
    body = json_body()
    email = email_field(body)
    pw = password_field(body)
    db = get_db()
    user = db.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
    generic = ApiError("Incorrect email or password.", 401)
    if user is None:
        check_password_hash(_DUMMY_HASH, pw)
        raise generic
    if user["locked_until"] > now_ms():
        raise ApiError("Too many failed attempts. Try again in a few minutes or reset your password.", 429)
    if not check_password_hash(user["password_hash"], pw):
        fails = user["failed_attempts"] + 1
        locked = now_ms() + LOCK_MS if fails >= MAX_FAILED else 0
        db.execute("UPDATE users SET failed_attempts = ?, locked_until = ? WHERE id = ?",
                   (0 if locked else fails, locked, user["id"]))
        db.commit()
        raise generic
    db.execute("UPDATE users SET failed_attempts = 0, locked_until = 0, last_login_at = ? WHERE id = ?", (now_ms(), user["id"]))
    db.commit()
    user = db.execute("SELECT * FROM users WHERE id = ?", (user["id"],)).fetchone()
    start_session(user, remember=bool(body.get("remember")))
    return jsonify(session_payload(user))


@bp.post("/auth/logout")
def logout():
    session.clear()
    return jsonify(ok=True, csrf=csrf_token())


@bp.post("/auth/forgot-password")
@rate_limit("forgot", 5, 900)
def forgot_password():
    email = email_field(json_body())
    db = get_db()
    user = db.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
    resp = {"ok": True, "message": "If an account exists for that email, a reset link has been sent."}
    if user is not None:
        token = secrets.token_urlsafe(32)
        db.execute("UPDATE reset_tokens SET used = 1 WHERE user_id = ?", (user["id"],))
        db.execute("INSERT INTO reset_tokens (user_id, token_hash, expires_at) VALUES (?,?,?)",
                   (user["id"], hashlib.sha256(token.encode()).hexdigest(), now_ms() + RESET_TTL_MS))
        db.commit()
        link = f"{allowed_origins()[0]}/reset-password?token={token}"
        try:
            sent = send_reset(email, link)
        except Exception:  # mail server problems must not reveal whether the account exists
            log.exception("Could not send reset e-mail")
            sent = False
        if not sent and is_dev():
            resp["dev_reset_link"] = link      # development only: no mail server, so show the link
    return jsonify(resp)


@bp.post("/auth/reset-password")
@rate_limit("reset", 10, 900)
def reset_password():
    body = json_body()
    token = text_field(body, "token", max_len=200)
    pw = check_new_password(password_field(body, "password"))
    db = get_db()
    row = db.execute("SELECT * FROM reset_tokens WHERE token_hash = ?", (hashlib.sha256(token.encode()).hexdigest(),)).fetchone()
    if row is None or row["used"] or row["expires_at"] < now_ms():
        raise ApiError("This reset link is invalid or has expired. Request a new one.", 400, "token")
    db.execute("UPDATE reset_tokens SET used = 1 WHERE user_id = ?", (row["user_id"],))
    db.execute("UPDATE users SET password_hash = ?, session_version = session_version + 1, failed_attempts = 0, locked_until = 0 WHERE id = ?",
               (generate_password_hash(pw), row["user_id"]))
    notify(row["user_id"], "security", "Password reset", "Your password was changed using a reset link.", "/settings", "notify_security")
    db.commit()
    session.clear()
    return jsonify(ok=True, csrf=csrf_token(), message="Password updated. You can now sign in.")


# ------------------------------------------------------------------ profile / account
@bp.get("/profile")
@login_required
def get_profile():
    db = get_db()
    stats = db.execute("SELECT COUNT(*) AS total, "
                       "SUM(CASE WHEN verdict='phishing' THEN 1 ELSE 0 END) AS phishing, SUM(CASE WHEN verdict='suspicious' THEN 1 ELSE 0 END) AS suspicious, SUM(CASE WHEN verdict='safe' THEN 1 ELSE 0 END) AS safe "
                       "FROM scans WHERE user_id = ?", (g.user["id"],)).fetchone()
    return jsonify(user=user_json(g.user), stats={k: stats[k] or 0 for k in ("total", "phishing", "suspicious", "safe")})


@bp.patch("/profile")
@login_required
def update_profile():
    body = json_body()
    db = get_db()
    name = text_field(body, "name", min_len=2, max_len=80) if "name" in body else g.user["name"]
    bio = text_field(body, "bio", max_len=300, required=False) if "bio" in body else g.user["bio"]
    email = g.user["email"]
    if "email" in body:
        new_email = email_field(body)
        if new_email != email.lower():
            # Changing the sign-in address needs the current password.
            if not check_password_hash(g.user["password_hash"], password_field(body, "current_password", "current password")):
                raise ApiError("Current password is incorrect.", 403, "current_password")
            email = new_email
    try:
        db.execute("UPDATE users SET name = ?, bio = ?, email = ? WHERE id = ?", (name, bio, email, g.user["id"]))
    except IntegrityError:
        raise ApiError("That email is already used by another account.", 409, "email")
    if email != g.user["email"]:
        notify(g.user["id"], "security", "Email changed", f"Your sign-in email is now {email}.", "/settings", "notify_security")
    db.commit()
    user = db.execute("SELECT * FROM users WHERE id = ?", (g.user["id"],)).fetchone()
    return jsonify(user=user_json(user))


@bp.post("/account/password")
@login_required
@rate_limit("chpw", 10, 900)
def change_password():
    body = json_body()
    if not check_password_hash(g.user["password_hash"], password_field(body, "current_password", "current password")):
        raise ApiError("Current password is incorrect.", 403, "current_password")
    new = check_new_password(password_field(body, "new_password", "new password"), "new_password")
    db = get_db()
    db.execute("UPDATE users SET password_hash = ?, session_version = session_version + 1 WHERE id = ?",
               (generate_password_hash(new), g.user["id"]))
    notify(g.user["id"], "security", "Password changed", "Your password was changed. Other devices were signed out.", "/settings", "notify_security")
    db.commit()
    user = db.execute("SELECT * FROM users WHERE id = ?", (g.user["id"],)).fetchone()
    start_session(user, remember=session.permanent)   # keep this device signed in, sign out all others
    return jsonify(ok=True, csrf=csrf_token())


@bp.delete("/account")
@login_required
@rate_limit("delacct", 5, 900)
def delete_account():
    if not check_password_hash(g.user["password_hash"], password_field(json_body(), "password")):
        raise ApiError("Password is incorrect.", 403, "password")
    db = get_db()
    db.execute("DELETE FROM users WHERE id = ?", (g.user["id"],))     # cascades to every user-owned table
    db.commit()
    session.clear()
    return jsonify(ok=True, csrf=csrf_token())


@bp.get("/account/export")
@login_required
def export_account():
    db, uid = get_db(), g.user["id"]
    scans = [dict(r) for r in db.execute("SELECT * FROM scans WHERE user_id = ? ORDER BY created_at DESC", (uid,))]
    for s in scans:
        s.pop("user_id", None)
        for k in ("features", "models"):
            s[k] = json.loads(s[k]) if s[k] else None
    data = {
        "profile": user_json(g.user),
        "preferences": get_prefs(uid),
        "scans": scans,
        "notifications": [dict(r) for r in db.execute("SELECT kind,title,body,link,is_read,created_at FROM notifications WHERE user_id = ?", (uid,))],
        "support_tickets": [dict(r) for r in db.execute("SELECT category,subject,message,status,created_at FROM support_tickets WHERE user_id = ?", (uid,))],
    }
    resp = jsonify(data)
    resp.headers["Content-Disposition"] = "attachment; filename=phishguard-my-data.json"
    return resp


# ------------------------------------------------------------------ preferences
@bp.get("/preferences")
@login_required
def read_prefs():
    return jsonify(preferences=get_prefs(g.user["id"]))


@bp.put("/preferences")
@login_required
def write_prefs():
    body = json_body()
    current = get_prefs(g.user["id"])
    unknown = set(body) - set(PREF_DEFAULTS)
    if unknown:
        raise ApiError(f"Unknown preference: {sorted(unknown)[0]}.")
    for k in BOOL_PREFS:
        if k in body:
            if not isinstance(body[k], bool):
                raise ApiError(f"{k} must be true or false.", field=k)
            current[k] = body[k]
    if "suspicious_threshold" in body:
        t = body["suspicious_threshold"]
        if isinstance(t, bool) or not isinstance(t, (int, float)) or not 0.5 <= t <= 0.99:
            raise ApiError("Suspicious threshold must be a number between 0.5 and 0.99.", field="suspicious_threshold")
        current["suspicious_threshold"] = round(float(t), 2)
    db = get_db()
    cols = list(PREF_DEFAULTS)
    db.execute(f"INSERT INTO preferences (user_id, {', '.join(cols)}) VALUES (?{',?' * len(cols)}) "
               f"ON CONFLICT (user_id) DO UPDATE SET {', '.join(f'{c} = excluded.{c}' for c in cols)}",
               (g.user["id"], *[int(current[c]) if c in BOOL_PREFS else current[c] for c in cols]))
    db.commit()
    return jsonify(preferences=current)
