"""Per-user data: scan history, global search, notifications and support tickets. Every query is scoped to g.user."""
import json
from urllib.parse import urlsplit, urlunsplit

from flask import Blueprint, g, jsonify, request

from auth import get_prefs, notify
from db import get_db, now_ms
from security import ApiError, json_body, login_required, rate_limit, text_field

bp = Blueprint("userdata", __name__, url_prefix="/api")
VERDICTS = {"safe", "suspicious", "phishing"}
MAX_SCANS_PER_USER = 5000
CATEGORIES = {"general", "bug", "detection", "account", "feature"}


# ------------------------------------------------------------------ verdicts + scan storage
def to_verdict(result, mode, threshold=0.75):
    """Python port of src/lib/verdict.js: the API returns phishing|legitimate, the app adds 'suspicious'."""
    if result.get("source") == "trusted_list":
        return "safe"
    phishing = result.get("prediction") == "phishing"
    if mode == "ensemble":
        if result.get("agreement") and result["agreement"] != "3/3":
            return "suspicious"
        return "phishing" if phishing else "safe"
    conf = result.get("confidence")
    if conf is not None and conf < threshold:
        return "suspicious"
    return "phishing" if phishing else "safe"


def host_of(url):
    raw = url if "://" in url else f"http://{url}"
    try:
        host = urlsplit(raw).hostname or ""
    except ValueError:
        host = ""
    host = host or url.split("/")[0].split("?")[0].split("#")[0].split(":")[0]
    host = host.lower()
    return host[4:] if host.startswith("www.") else host


def scan_json(r):
    return {
        "id": r["id"], "url": r["url"], "domain": r["domain"], "mode": r["mode"], "ts": r["created_at"],
        "prediction": r["prediction"], "confidence": r["confidence"], "agreement": r["agreement"],
        "source": r["source"], "verdict": r["verdict"],
        "features": json.loads(r["features"]) if r["features"] else None,
        "models": json.loads(r["models"]) if r["models"] else None,
    }


def record_scan(url, mode, result, persist=True):
    """Build the scan record for the current user and (if their privacy setting allows and persist is True) store it."""
    prefs = get_prefs(g.user["id"])
    shown = url
    if prefs["strip_query"]:
        try:
            p = urlsplit(url if "://" in url else f"http://{url}")
            stripped = urlunsplit((p.scheme, p.netloc, p.path, "", ""))
            shown = stripped if "://" in url else stripped.split("://", 1)[1]
        except ValueError:
            pass
    rec = {
        "id": None, "url": shown, "domain": host_of(url), "mode": mode, "ts": now_ms(),
        "prediction": result["prediction"], "confidence": result.get("confidence"),
        "agreement": result.get("agreement"), "source": result.get("source"),
        "verdict": to_verdict(result, mode, prefs["suspicious_threshold"]),
        "features": result.get("features"), "models": result.get("models"), "saved": False,
    }
    if persist and prefs["save_history"]:
        db = get_db()
        cur = db.execute(
            "INSERT INTO scans (user_id,url,domain,mode,prediction,confidence,agreement,source,verdict,features,models,created_at) "
            "VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
            (g.user["id"], rec["url"], rec["domain"], mode, rec["prediction"], rec["confidence"], rec["agreement"],
             rec["source"], rec["verdict"], json.dumps(rec["features"]), json.dumps(rec["models"]) if rec["models"] else None, rec["ts"]))
        rec["id"], rec["saved"] = cur.lastrowid, True
        db.execute("DELETE FROM scans WHERE user_id = ? AND id NOT IN "
                   "(SELECT id FROM scans WHERE user_id = ? ORDER BY id DESC LIMIT ?)", (g.user["id"], g.user["id"], MAX_SCANS_PER_USER))
    if persist and rec["verdict"] != "safe":
        label = "Phishing detected" if rec["verdict"] == "phishing" else "Suspicious URL"
        notify(g.user["id"], "scan", label, rec["domain"] or rec["url"][:60],
               f"/history/{rec['id']}" if rec["id"] else "/history", "notify_phishing")
    get_db().commit()
    return rec


def like(q):
    return "%" + q.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%"


# ------------------------------------------------------------------ scans
@bp.get("/scans")
@login_required
def list_scans():
    mode = request.args.get("mode", "all")
    verdict = request.args.get("verdict", "all")
    q = request.args.get("q", "").strip()[:200]
    if mode not in {"all", "single", "ensemble"}:
        raise ApiError("mode must be all, single or ensemble.")
    if verdict != "all" and verdict not in VERDICTS:
        raise ApiError("verdict must be all, safe, suspicious or phishing.")
    try:
        limit = min(max(int(request.args.get("limit", 500)), 1), 1000)
        offset = max(int(request.args.get("offset", 0)), 0)
    except ValueError:
        raise ApiError("limit and offset must be integers.")
    where, args = ["user_id = ?"], [g.user["id"]]
    if mode != "all":
        where.append("mode = ?"); args.append(mode)
    if verdict != "all":
        where.append("verdict = ?"); args.append(verdict)
    if q:
        where.append("url LIKE ? ESCAPE '\\'"); args.append(like(q))
    clause = " AND ".join(where)
    db = get_db()
    total = db.execute(f"SELECT COUNT(*) FROM scans WHERE {clause}", args).fetchone()[0]
    rows = db.execute(f"SELECT * FROM scans WHERE {clause} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?", [*args, limit, offset]).fetchall()
    return jsonify(scans=[scan_json(r) for r in rows], total=total)


@bp.get("/scans/<int:scan_id>")
@login_required
def get_scan(scan_id):
    row = get_db().execute("SELECT * FROM scans WHERE id = ? AND user_id = ?", (scan_id, g.user["id"])).fetchone()
    if row is None:
        raise ApiError("Scan not found.", 404)       # same answer whether it does not exist or belongs to someone else
    return jsonify(scan=scan_json(row))


@bp.delete("/scans/<int:scan_id>")
@login_required
def delete_scan(scan_id):
    db = get_db()
    cur = db.execute("DELETE FROM scans WHERE id = ? AND user_id = ?", (scan_id, g.user["id"]))
    db.commit()
    if cur.rowcount == 0:
        raise ApiError("Scan not found.", 404)
    return jsonify(ok=True)


@bp.delete("/scans")
@login_required
def clear_scans():
    mode = request.args.get("mode", "all")
    if mode not in {"all", "single", "ensemble"}:
        raise ApiError("mode must be all, single or ensemble.")
    db = get_db()
    if mode == "all":
        cur = db.execute("DELETE FROM scans WHERE user_id = ?", (g.user["id"],))
    else:
        cur = db.execute("DELETE FROM scans WHERE user_id = ? AND mode = ?", (g.user["id"], mode))
    db.commit()
    return jsonify(ok=True, deleted=cur.rowcount)


# ------------------------------------------------------------------ global search
@bp.get("/search")
@login_required
@rate_limit("search", 60, 60)
def search():
    q = request.args.get("q", "").strip()[:100]
    if len(q) < 2:
        return jsonify(scans=[], notifications=[])
    db, uid = get_db(), g.user["id"]
    scans = db.execute("SELECT id,url,domain,verdict,mode,created_at FROM scans WHERE user_id = ? AND url LIKE ? ESCAPE '\\' "
                       "ORDER BY created_at DESC LIMIT 6", (uid, like(q))).fetchall()
    notes = db.execute("SELECT id,title,body,link,created_at FROM notifications WHERE user_id = ? AND (title LIKE ? ESCAPE '\\' OR body LIKE ? ESCAPE '\\') "
                       "ORDER BY created_at DESC LIMIT 3", (uid, like(q), like(q))).fetchall()
    return jsonify(
        scans=[{"id": r["id"], "url": r["url"], "domain": r["domain"], "verdict": r["verdict"], "mode": r["mode"], "ts": r["created_at"]} for r in scans],
        notifications=[{"id": r["id"], "title": r["title"], "body": r["body"], "link": r["link"], "ts": r["created_at"]} for r in notes])


# ------------------------------------------------------------------ notifications
def note_json(r):
    return {"id": r["id"], "kind": r["kind"], "title": r["title"], "body": r["body"], "link": r["link"], "read": bool(r["is_read"]), "ts": r["created_at"]}


@bp.get("/notifications")
@login_required
def list_notifications():
    db, uid = get_db(), g.user["id"]
    rows = db.execute("SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT 30", (uid,)).fetchall()
    unread = db.execute("SELECT COUNT(*) FROM notifications WHERE user_id = ? AND is_read = 0", (uid,)).fetchone()[0]
    return jsonify(notifications=[note_json(r) for r in rows], unread=unread)


@bp.post("/notifications/read")
@login_required
def mark_read():
    body = request.get_json(silent=True) or {}
    ids = body.get("ids") if isinstance(body, dict) else None
    db = get_db()
    if ids is None:
        db.execute("UPDATE notifications SET is_read = 1 WHERE user_id = ?", (g.user["id"],))
    else:
        if not isinstance(ids, list) or len(ids) > 100 or not all(isinstance(i, int) and not isinstance(i, bool) for i in ids):
            raise ApiError("ids must be a list of integers.")
        db.execute(f"UPDATE notifications SET is_read = 1 WHERE user_id = ? AND id IN ({','.join('?' * len(ids)) or 'NULL'})", [g.user["id"], *ids])
    db.commit()
    return jsonify(ok=True)


@bp.delete("/notifications")
@login_required
def clear_notifications():
    db = get_db()
    db.execute("DELETE FROM notifications WHERE user_id = ?", (g.user["id"],))
    db.commit()
    return jsonify(ok=True)


# ------------------------------------------------------------------ support
def ticket_json(r):
    return {"id": r["id"], "category": r["category"], "subject": r["subject"], "message": r["message"], "status": r["status"], "ts": r["created_at"]}


@bp.get("/support")
@login_required
def list_tickets():
    rows = get_db().execute("SELECT * FROM support_tickets WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT 50", (g.user["id"],)).fetchall()
    return jsonify(tickets=[ticket_json(r) for r in rows])


@bp.post("/support")
@login_required
@rate_limit("support", 5, 3600)
def create_ticket():
    body = json_body()
    category = text_field(body, "category", max_len=20, required=False, default="general") or "general"
    if category not in CATEGORIES:
        raise ApiError("Choose a valid category.", field="category")
    subject = text_field(body, "subject", min_len=3, max_len=120)
    message = text_field(body, "message", min_len=10, max_len=2000)
    db = get_db()
    cur = db.execute("INSERT INTO support_tickets (user_id,category,subject,message,created_at) VALUES (?,?,?,?,?)",
                     (g.user["id"], category, subject, message, now_ms()))
    notify(g.user["id"], "support", "Support request received", subject, "/help")
    db.commit()
    row = db.execute("SELECT * FROM support_tickets WHERE id = ?", (cur.lastrowid,)).fetchone()
    return jsonify(ticket=ticket_json(row)), 201
