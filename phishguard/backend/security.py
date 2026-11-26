"""Shared security helpers: secret key, CSRF + Origin checks, rate limiting, login_required, input validation."""
import hmac
import logging
import os
import re
import secrets
import time
from collections import defaultdict, deque
from functools import wraps

from flask import abort, current_app, g, jsonify, request, session

from db import INSTANCE_DIR, get_db

EMAIL_RE = re.compile(r"^[^@\s]{1,64}@[^@\s]+\.[^@\s]{2,}$")
UNSAFE = {"POST", "PUT", "PATCH", "DELETE"}


class ApiError(Exception):
    def __init__(self, message, status=400, field=None):
        super().__init__(message)
        self.message, self.status, self.field = message, status, field


def load_secret_key():
    """SECRET_KEY from the environment, otherwise a random key generated once and kept in instance/secret_key."""
    env = os.environ.get("PHISHGUARD_SECRET_KEY")
    if env:
        return env
    if os.environ.get("RENDER") or os.environ.get("PHISHGUARD_ENV", "").lower() == "production":
        logging.getLogger(__name__).warning("PHISHGUARD_SECRET_KEY is not set: a temporary key is used and every "
                                            "user is signed out on each restart. Set it in the host's environment.")
    os.makedirs(INSTANCE_DIR, exist_ok=True)
    path = os.path.join(INSTANCE_DIR, "secret_key")
    if not os.path.exists(path):
        fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(fd, "w") as f:
            f.write(secrets.token_hex(32))
    with open(path) as f:
        return f.read().strip()


# ---------------------------------------------------------------- validation
def json_body():
    body = request.get_json(silent=True)
    if not isinstance(body, dict):
        raise ApiError("Request body must be a JSON object.")
    return body


def text_field(body, name, *, label=None, min_len=0, max_len=255, required=True, default=""):
    label = label or name.replace("_", " ")
    value = body.get(name, default)
    if value is None:
        value = default
    if not isinstance(value, str):
        raise ApiError(f"{label.capitalize()} must be text.", field=name)
    value = value.strip()
    if required and not value:
        raise ApiError(f"{label.capitalize()} is required.", field=name)
    if value and len(value) < min_len:
        raise ApiError(f"{label.capitalize()} must be at least {min_len} characters.", field=name)
    if len(value) > max_len:
        raise ApiError(f"{label.capitalize()} must be at most {max_len} characters.", field=name)
    return value


def email_field(body, name="email"):
    value = text_field(body, name, label="email", max_len=254).lower()
    if not EMAIL_RE.match(value):
        raise ApiError("Enter a valid email address.", field=name)
    return value


def password_field(body, name="password", label="password"):
    value = body.get(name)
    if not isinstance(value, str) or not value:
        raise ApiError(f"{label.capitalize()} is required.", field=name)
    return value


def check_new_password(pw, field="password"):
    if len(pw) < 8:
        raise ApiError("Password must be at least 8 characters.", field=field)
    if len(pw) > 128:
        raise ApiError("Password must be at most 128 characters.", field=field)
    if not (re.search(r"[A-Za-z]", pw) and re.search(r"\d", pw)):
        raise ApiError("Password must contain at least one letter and one number.", field=field)
    return pw


# ---------------------------------------------------------------- CSRF / Origin
def allowed_origins():
    # Exact frontend origins allowed to access the backend
    default = (
        "http://localhost:5173,"
        "http://127.0.0.1:5173,"
        "http://localhost:4173,"
        "http://127.0.0.1:4173,"
        "https://phishguard-beryl-rho.vercel.app"
    )

    raw = os.environ.get("PHISHGUARD_ORIGINS", default)
    return [o.strip().rstrip("/") for o in raw.split(",") if o.strip()]


def csrf_token():
    if "csrf" not in session:
        session["csrf"] = secrets.token_urlsafe(32)
    return session["csrf"]


def protect_request():
    """before_request: reject unsafe requests from foreign origins or without a valid CSRF token."""
    if request.method not in UNSAFE or request.method == "OPTIONS":
        return None
    origin = request.headers.get("Origin")
    if origin and origin.rstrip("/") not in allowed_origins():
        return jsonify(error="Request origin is not allowed."), 403
    sent = request.headers.get("X-CSRF-Token", "")
    expected = session.get("csrf", "")
    if not expected or not hmac.compare_digest(sent, expected):
        return jsonify(error="Missing or invalid CSRF token. Reload the page and try again."), 403
    return None


# ---------------------------------------------------------------- rate limiting (in memory, per process)
_hits = defaultdict(deque)


def rate_limit(name, limit, per_seconds, key=None):
    """Decorator: at most `limit` calls per `per_seconds` for the user (or client address)."""
    def deco(fn):
        @wraps(fn)
        def wrapper(*a, **kw):
            who = key() if key else (getattr(g, "user", None) and g.user["id"]) or request.remote_addr
            q = _hits[(name, who)]
            now = time.monotonic()
            while q and now - q[0] > per_seconds:
                q.popleft()
            if len(q) >= limit:
                retry = int(per_seconds - (now - q[0])) + 1
                resp = jsonify(error="Too many requests. Please wait a moment and try again.")
                resp.status_code = 429
                resp.headers["Retry-After"] = str(retry)
                return resp
            q.append(now)
            return fn(*a, **kw)
        return wrapper
    return deco


def reset_rate_limits():
    _hits.clear()


# ---------------------------------------------------------------- current user
def load_user():
    """before_request: attach g.user if the session is valid (user exists and session_version matches)."""
    g.user = None
    uid = session.get("uid")
    if not uid:
        return
    row = get_db().execute("SELECT * FROM users WHERE id = ?", (uid,)).fetchone()
    if row is None or row["session_version"] != session.get("sv"):
        session.clear()
        return
    g.user = row


def login_required(fn):
    @wraps(fn)
    def wrapper(*a, **kw):
        if g.get("user") is None:
            return jsonify(error="Please sign in to continue."), 401
        return fn(*a, **kw)
    return wrapper


def start_session(user_row, remember=False):
    session.clear()                       # new session id/contents on every login (prevents fixation)
    session["uid"] = user_row["id"]
    session["sv"] = user_row["session_version"]
    session.permanent = bool(remember)
    csrf_token()
