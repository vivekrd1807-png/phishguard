"""Storage for PhishGuard: users, preferences, scans, notifications, reset tokens, support tickets.

Two backends share the same SQL:
  * PostgreSQL when DATABASE_URL is set (use this on hosts with an ephemeral disk, e.g. Render/Vercel setups).
  * SQLite otherwise (local development). File lives in backend/instance/ (override with PHISHGUARD_DB).
"""
import os
import re
import sqlite3
import time

from flask import current_app, g

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
INSTANCE_DIR = os.path.join(BASE_DIR, "instance")

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    email            TEXT    NOT NULL UNIQUE COLLATE NOCASE,
    name             TEXT    NOT NULL,
    password_hash    TEXT    NOT NULL,
    bio              TEXT    NOT NULL DEFAULT '',
    session_version  INTEGER NOT NULL DEFAULT 1,
    failed_attempts  INTEGER NOT NULL DEFAULT 0,
    locked_until     INTEGER NOT NULL DEFAULT 0,
    created_at       INTEGER NOT NULL,
    last_login_at    INTEGER
);
CREATE TABLE IF NOT EXISTS preferences (
    user_id              INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    sidebar_collapsed    INTEGER NOT NULL DEFAULT 0,
    suspicious_threshold REAL    NOT NULL DEFAULT 0.75,
    save_history         INTEGER NOT NULL DEFAULT 1,
    strip_query          INTEGER NOT NULL DEFAULT 0,
    notify_phishing      INTEGER NOT NULL DEFAULT 1,
    notify_security      INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS scans (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    url         TEXT    NOT NULL,
    domain      TEXT    NOT NULL,
    mode        TEXT    NOT NULL CHECK (mode IN ('single', 'ensemble')),
    prediction  TEXT    NOT NULL,
    confidence  REAL,
    agreement   TEXT,
    source      TEXT,
    verdict     TEXT    NOT NULL,
    features    TEXT,
    models      TEXT,
    created_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_scans_user_time ON scans(user_id, created_at DESC);
CREATE TABLE IF NOT EXISTS notifications (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    kind        TEXT    NOT NULL,
    title       TEXT    NOT NULL,
    body        TEXT    NOT NULL DEFAULT '',
    link        TEXT,
    is_read     INTEGER NOT NULL DEFAULT 0,
    created_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_notif_user_time ON notifications(user_id, created_at DESC);
CREATE TABLE IF NOT EXISTS reset_tokens (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  TEXT    NOT NULL UNIQUE,
    expires_at  INTEGER NOT NULL,
    used        INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS support_tickets (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category    TEXT    NOT NULL,
    subject     TEXT    NOT NULL,
    message     TEXT    NOT NULL,
    status      TEXT    NOT NULL DEFAULT 'open',
    created_at  INTEGER NOT NULL
);
"""


def database_url():
    url = (os.environ.get("DATABASE_URL") or "").strip()
    return url or None


def using_postgres(app=None):
    # An explicit app.config["DATABASE"] (used by the tests) always means SQLite.
    if app is not None and app.config.get("DATABASE"):
        return False
    return database_url() is not None


try:  # psycopg2 is only needed when DATABASE_URL is set
    import psycopg2
    IntegrityError = (sqlite3.IntegrityError, psycopg2.IntegrityError)
except ImportError:  # pragma: no cover
    psycopg2 = None
    IntegrityError = (sqlite3.IntegrityError,)

TABLES_WITH_ID = {"users", "scans", "notifications", "reset_tokens", "support_tickets"}


def pg_schema():
    out = SCHEMA.replace("INTEGER PRIMARY KEY AUTOINCREMENT", "BIGSERIAL PRIMARY KEY")
    out = out.replace(" COLLATE NOCASE", "").replace("INTEGER", "BIGINT").replace(" REAL", " DOUBLE PRECISION")
    return out


class Row:
    """Row that supports row["col"], row[0], dict(row) and row.keys(), like sqlite3.Row."""
    __slots__ = ("_k", "_v")

    def __init__(self, keys, values):
        self._k, self._v = keys, values

    def __getitem__(self, i):
        return self._v[i] if isinstance(i, int) else self._v[self._k.index(i)]

    def keys(self):
        return list(self._k)

    def __iter__(self):
        return iter(self._v)

    def __len__(self):
        return len(self._v)


class PgCursor:
    def __init__(self, cur, lastrowid=None):
        self._cur, self.lastrowid = cur, lastrowid
        self.rowcount = cur.rowcount

    def _row(self, values):
        return None if values is None else Row([d[0] for d in self._cur.description], values)

    def fetchone(self):
        return self._row(self._cur.fetchone())

    def fetchall(self):
        return [self._row(v) for v in self._cur.fetchall()]

    def __iter__(self):
        return iter(self.fetchall())


class PgConnection:
    """Minimal sqlite3-style wrapper over a psycopg2 connection (same ? placeholders, lastrowid, Row objects)."""

    def __init__(self, conn):
        self._conn = conn

    def execute(self, sql, params=()):
        sql = sql.replace("?", "%s")
        sql = re.sub(r"\bLIKE\b", "ILIKE", sql)          # SQLite LIKE is case-insensitive; PostgreSQL's is not
        m = re.match(r"\s*INSERT\s+INTO\s+(\w+)", sql, re.I)
        returning = bool(m and m.group(1).lower() in TABLES_WITH_ID)
        if returning:
            sql += " RETURNING id"
        cur = self._conn.cursor()
        cur.execute(sql, tuple(params))
        lastrowid = cur.fetchone()[0] if returning else None
        return PgCursor(cur, lastrowid)

    def commit(self):
        self._conn.commit()

    def rollback(self):
        self._conn.rollback()

    def close(self):
        self._conn.close()


def connect_postgres():
    if psycopg2 is None:
        raise RuntimeError("DATABASE_URL is set but psycopg2 is not installed. Add psycopg2-binary to requirements.txt.")
    return PgConnection(psycopg2.connect(database_url(), connect_timeout=10))


def now_ms():
    return int(time.time() * 1000)


def db_path(app):
    return app.config.get("DATABASE") or os.environ.get("PHISHGUARD_DB") or os.path.join(INSTANCE_DIR, "phishguard.db")


def get_db():
    if "db" not in g:
        if using_postgres(current_app):
            g.db = connect_postgres()
        else:
            conn = sqlite3.connect(db_path(current_app), timeout=10)
            conn.row_factory = sqlite3.Row
            conn.execute("PRAGMA foreign_keys = ON")
            g.db = conn
    return g.db


def close_db(_exc=None):
    conn = g.pop("db", None)
    if conn is not None:
        conn.close()


def init_db(app):
    if using_postgres(app):
        conn = connect_postgres()
        try:
            cur = conn._conn.cursor()
            cur.execute(pg_schema())
            # Supabase exposes public tables through its REST API; RLS with no policies blocks that API while the
            # backend (which connects as the table owner / postgres role) keeps full access.
            for table in ("users", "preferences", "scans", "notifications", "reset_tokens", "support_tickets"):
                cur.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY")
            conn.commit()
        finally:
            conn.close()
        return
    path = db_path(app)
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
    conn = sqlite3.connect(path)
    try:
        conn.execute("PRAGMA journal_mode = WAL")
        conn.executescript(SCHEMA)
        conn.commit()
    finally:
        conn.close()
