"""SQLite storage for PhishGuard: users, preferences, scans, notifications, reset tokens, support tickets.

Uses only the standard library (sqlite3). The database file lives in backend/instance/ (override with PHISHGUARD_DB).
"""
import os
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


def now_ms():
    return int(time.time() * 1000)


def db_path(app):
    return app.config.get("DATABASE") or os.environ.get("PHISHGUARD_DB") or os.path.join(INSTANCE_DIR, "phishguard.db")


def get_db():
    if "db" not in g:
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
    path = db_path(app)
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
    conn = sqlite3.connect(path)
    try:
        conn.execute("PRAGMA journal_mode = WAL")
        conn.executescript(SCHEMA)
        conn.commit()
    finally:
        conn.close()
