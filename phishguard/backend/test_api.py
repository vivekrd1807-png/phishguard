"""API tests: run from the backend folder with `python -m pytest -q test_api.py`."""
import os
import tempfile

import pytest

os.environ["PHISHGUARD_SECRET_KEY"] = "test-secret"
os.environ["PHISHGUARD_ENV"] = "development"

import app as app_module  # noqa: E402
import security  # noqa: E402


class FakeEnsemble:
    """Stands in for ensemble.pkl so the tests do not depend on xgboost."""
    def predict_url(self, url):
        bad = "login" in url
        return {"prediction": "phishing" if bad else "legitimate", "confidence": 0.9, "agreement": "2/3" if bad else "3/3",
                "models": [{"name": "Logistic Regression", "prediction": "phishing", "confidence": 0.9}]}


class Client:
    def __init__(self, flask_app):
        self.c = flask_app.test_client()
        self.csrf = self.c.get("/api/auth/csrf").get_json()["csrf"]

    def req(self, method, path, json=None, csrf=True, **kw):
        headers = {"X-CSRF-Token": self.csrf} if csrf else {}
        r = getattr(self.c, method)(path, json=json, headers=headers, **kw)
        data = r.get_json(silent=True) or {}
        if isinstance(data, dict) and data.get("csrf"):
            self.csrf = data["csrf"]
        return r

    def get(self, p, **kw): return self.req("get", p, **kw)
    def post(self, p, json=None, **kw): return self.req("post", p, json, **kw)
    def put(self, p, json=None, **kw): return self.req("put", p, json, **kw)
    def patch(self, p, json=None, **kw): return self.req("patch", p, json, **kw)
    def delete(self, p, json=None, **kw): return self.req("delete", p, json, **kw)


@pytest.fixture()
def flask_app(tmp_path):
    app_module.app.config.update(TESTING=True, DATABASE=str(tmp_path / "t.db"))
    app_module.init_db(app_module.app)
    if app_module.ensemble_model is None:
        app_module.ensemble_model = FakeEnsemble()
    security.reset_rate_limits()
    return app_module.app


def register(cl, email="a@example.com", name="Alice", pw="Passw0rd!x"):
    return cl.post("/api/auth/register", {"name": name, "email": email, "password": pw})


@pytest.fixture()
def alice(flask_app):
    cl = Client(flask_app)
    assert register(cl).status_code == 201
    return cl


def test_register_validation_and_duplicates(flask_app):
    cl = Client(flask_app)
    assert cl.post("/api/auth/register", {"name": "A", "email": "x@y.zz", "password": "Passw0rd1"}).status_code == 400
    assert cl.post("/api/auth/register", {"name": "Al", "email": "bad", "password": "Passw0rd1"}).status_code == 400
    assert cl.post("/api/auth/register", {"name": "Al", "email": "x@y.zz", "password": "short"}).status_code == 400
    assert cl.post("/api/auth/register", {"name": "Al", "email": "x@y.zz", "password": "onlyletters"}).status_code == 400
    assert cl.post("/api/auth/register", ["nope"]).status_code == 400
    assert register(cl).status_code == 201
    other = Client(flask_app)
    r = register(other, email="A@EXAMPLE.com")
    assert r.status_code == 409


def test_password_is_hashed(flask_app, alice):
    with flask_app.app_context():
        row = app_module.auth.get_db().execute("SELECT password_hash FROM users").fetchone()
    assert "Passw0rd!x" not in row[0] and ":" in row[0]


def test_login_logout_and_me(flask_app, alice):
    assert alice.get("/api/auth/me").get_json()["user"]["email"] == "a@example.com"
    assert alice.post("/api/auth/logout").status_code == 200
    assert alice.get("/api/auth/me").get_json()["user"] is None
    assert alice.get("/api/scans").status_code == 401
    bad = alice.post("/api/auth/login", {"email": "a@example.com", "password": "wrong"})
    assert bad.status_code == 401
    assert alice.post("/api/auth/login", {"email": "nobody@example.com", "password": "wrong"}).get_json() == bad.get_json()
    ok = alice.post("/api/auth/login", {"email": "a@example.com", "password": "Passw0rd!x", "remember": True})
    assert ok.status_code == 200 and ok.get_json()["preferences"]["suspicious_threshold"] == 0.75


def test_account_lockout(flask_app, alice):
    alice.post("/api/auth/logout")
    for _ in range(5):
        alice.post("/api/auth/login", {"email": "a@example.com", "password": "bad"})
    r = alice.post("/api/auth/login", {"email": "a@example.com", "password": "Passw0rd!x"})
    assert r.status_code == 429


def test_csrf_and_origin_are_enforced(flask_app, alice):
    assert alice.post("/api/auth/logout", csrf=False).status_code == 403
    r = alice.c.post("/api/auth/logout", headers={"X-CSRF-Token": alice.csrf, "Origin": "http://evil.example"})
    assert r.status_code == 403
    r = alice.c.post("/api/auth/logout", headers={"X-CSRF-Token": alice.csrf, "Origin": "http://localhost:5173"})
    assert r.status_code == 200


def test_session_cookie_flags(flask_app):
    r = flask_app.test_client().get("/api/auth/csrf")
    cookie = r.headers["Set-Cookie"]
    assert "HttpOnly" in cookie and "SameSite=Lax" in cookie


def test_predict_requires_login_and_saves_history(flask_app, alice):
    anon = Client(flask_app)
    assert anon.post("/predict", {"url": "example.com"}).status_code == 401
    r = alice.post("/predict", {"url": "http://paypa1-login.com/verify?x=1"})
    assert r.status_code == 200
    body = r.get_json()
    assert body["prediction"] in {"phishing", "legitimate"} and "features" in body and body["source"] == "single_model"
    assert body["scan"]["id"] and body["scan"]["verdict"] in {"safe", "suspicious", "phishing"}
    r = alice.post("/predict/ensemble", {"url": "secure-login.example.com"})
    assert r.get_json()["scan"]["verdict"] == "suspicious" and r.get_json()["agreement"] == "2/3"
    assert alice.post("/predict", {"url": ""}).status_code == 400
    assert alice.post("/predict", {"url": "a" * 3000}).status_code == 400
    assert alice.post("/predict", {"nourl": 1}).status_code == 400
    scans = alice.get("/api/scans").get_json()
    assert scans["total"] == 2
    assert alice.get("/api/scans?mode=ensemble").get_json()["total"] == 1
    assert alice.get("/api/scans?q=paypa1").get_json()["total"] == 1
    assert alice.get("/api/scans?mode=bogus").status_code == 400


def test_users_only_access_their_own_records(flask_app, alice):
    sid = alice.post("/predict", {"url": "http://paypa1-login.com/verify"}).get_json()["scan"]["id"]
    bob = Client(flask_app)
    register(bob, email="b@example.com", name="Bob")
    assert bob.get(f"/api/scans/{sid}").status_code == 404
    assert bob.delete(f"/api/scans/{sid}").status_code == 404
    assert bob.get("/api/scans").get_json()["total"] == 0
    assert bob.get("/api/search?q=paypa1").get_json()["scans"] == []
    bob.delete("/api/scans")
    assert alice.get(f"/api/scans/{sid}").status_code == 200
    assert alice.delete(f"/api/scans/{sid}").status_code == 200
    assert alice.get("/api/scans").get_json()["total"] == 0


def test_notifications_are_private_and_markable(flask_app, alice):
    alice.post("/predict", {"url": "http://paypa1-login.com/verify"})
    data = alice.get("/api/notifications").get_json()
    assert data["unread"] >= 1 and any(n["title"] == "Welcome to PhishGuard" for n in data["notifications"])
    bob = Client(flask_app)
    register(bob, email="b@example.com", name="Bob")
    ids = [n["id"] for n in data["notifications"]]
    bob.post("/api/notifications/read", {"ids": ids})
    assert alice.get("/api/notifications").get_json()["unread"] == data["unread"]
    alice.post("/api/notifications/read", {})
    assert alice.get("/api/notifications").get_json()["unread"] == 0
    assert alice.post("/api/notifications/read", {"ids": ["x"]}).status_code == 400
    alice.delete("/api/notifications")
    assert alice.get("/api/notifications").get_json()["notifications"] == []


def test_preferences_and_privacy_settings(flask_app, alice):
    assert alice.put("/api/preferences", {"suspicious_threshold": 5}).status_code == 400
    assert alice.put("/api/preferences", {"save_history": "yes"}).status_code == 400
    assert alice.put("/api/preferences", {"hacker": True}).status_code == 400
    r = alice.put("/api/preferences", {"sidebar_collapsed": True, "suspicious_threshold": 0.9, "save_history": False})
    assert r.status_code == 200
    prefs = alice.get("/api/preferences").get_json()["preferences"]
    assert prefs["sidebar_collapsed"] is True and prefs["suspicious_threshold"] == 0.9 and prefs["save_history"] is False
    scan = alice.post("/predict", {"url": "http://paypa1-login.com/verify"}).get_json()["scan"]
    assert scan["id"] is None and scan["saved"] is False
    assert alice.get("/api/scans").get_json()["total"] == 0
    alice.put("/api/preferences", {"save_history": True, "strip_query": True})
    alice.post("/predict", {"url": "https://example.com/path?token=secret#frag"})
    assert alice.get("/api/scans").get_json()["scans"][0]["url"] == "https://example.com/path"


def test_profile_password_change_and_session_invalidation(flask_app, alice):
    assert alice.patch("/api/profile", {"name": "Alice B", "bio": "hi"}).get_json()["user"]["name"] == "Alice B"
    assert alice.patch("/api/profile", {"email": "new@example.com"}).status_code == 400   # needs current password
    assert alice.patch("/api/profile", {"email": "new@example.com", "current_password": "Passw0rd!x"}).status_code == 200
    other_device = Client(flask_app)
    assert other_device.post("/api/auth/login", {"email": "new@example.com", "password": "Passw0rd!x"}).status_code == 200
    assert alice.post("/api/account/password", {"current_password": "bad", "new_password": "Newpass123"}).status_code == 403
    assert alice.post("/api/account/password", {"current_password": "Passw0rd!x", "new_password": "weak"}).status_code == 400
    assert alice.post("/api/account/password", {"current_password": "Passw0rd!x", "new_password": "Newpass123"}).status_code == 200
    assert alice.get("/api/profile").status_code == 200                # this device stays signed in
    assert other_device.get("/api/profile").status_code == 401         # other devices are signed out
    assert alice.post("/api/auth/logout").status_code == 200
    assert alice.post("/api/auth/login", {"email": "new@example.com", "password": "Newpass123"}).status_code == 200


def test_password_reset_flow(flask_app, alice):
    alice.post("/api/auth/logout")
    unknown = alice.post("/api/auth/forgot-password", {"email": "ghost@example.com"}).get_json()
    assert "dev_reset_link" not in unknown
    known = alice.post("/api/auth/forgot-password", {"email": "a@example.com"}).get_json()
    token = known["dev_reset_link"].split("token=")[1]
    assert known["message"] == unknown["message"]
    assert alice.post("/api/auth/reset-password", {"token": "bogus", "password": "Another123"}).status_code == 400
    assert alice.post("/api/auth/reset-password", {"token": token, "password": "weak"}).status_code == 400
    assert alice.post("/api/auth/reset-password", {"token": token, "password": "Another123"}).status_code == 200
    assert alice.post("/api/auth/reset-password", {"token": token, "password": "Another456"}).status_code == 400   # single use
    assert alice.post("/api/auth/login", {"email": "a@example.com", "password": "Another123"}).status_code == 200


def test_support_and_search(flask_app, alice):
    assert alice.post("/api/support", {"subject": "x", "message": "short"}).status_code == 400
    assert alice.post("/api/support", {"subject": "Help me", "message": "Something is wrong here", "category": "nope"}).status_code == 400
    r = alice.post("/api/support", {"subject": "Help me", "message": "Something is wrong here", "category": "bug"})
    assert r.status_code == 201
    assert len(alice.get("/api/support").get_json()["tickets"]) == 1
    alice.post("/predict", {"url": "http://abc100%_x.com"})
    assert len(alice.get("/api/search?q=100%25_").get_json()["scans"]) == 1
    assert alice.get("/api/search?q=zzzzzz").get_json()["scans"] == []


def test_export_and_delete_account(flask_app, alice):
    alice.post("/predict", {"url": "http://paypa1-login.com/verify"})
    data = alice.get("/api/account/export").get_json()
    assert data["profile"]["email"] == "a@example.com" and len(data["scans"]) == 1 and "password_hash" not in str(data)
    assert alice.delete("/api/account", {"password": "wrong"}).status_code == 403
    assert alice.delete("/api/account", {"password": "Passw0rd!x"}).status_code == 200
    assert alice.get("/api/profile").status_code == 401
    with flask_app.app_context():
        db = app_module.auth.get_db()
        assert db.execute("SELECT COUNT(*) FROM users").fetchone()[0] == 0
        assert db.execute("SELECT COUNT(*) FROM scans").fetchone()[0] == 0


def test_public_endpoints_still_work(flask_app):
    cl = Client(flask_app)
    assert cl.get("/health").get_json()["status"] == "ok"
    assert cl.get("/nope").status_code == 404 and cl.get("/nope").get_json()["error"]


def test_scan_without_saving(flask_app, alice):
    r = alice.post("/predict", {"url": "http://paypa1-login.com/verify", "save": False})
    assert r.status_code == 200 and r.get_json()["scan"]["id"] is None
    assert alice.get("/api/scans").get_json()["total"] == 0
    assert alice.get("/api/notifications").get_json()["unread"] == 1      # only the welcome message
