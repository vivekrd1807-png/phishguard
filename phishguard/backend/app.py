"""PhishGuard Flask API.

POST /predict            -> single model (Logistic Regression, model.pkl)   [Dashboard]   (sign-in required)
POST /predict/ensemble   -> 3-model vote (ensemble.pkl)                     [Ensemble page] (sign-in required)
GET  /metrics            -> held-out test scores of the ensemble models
GET  /health

Accounts, history and settings live under /api/* (see auth.py and userdata.py); data is stored in SQLite (db.py).
"""
import json
import os
from pathlib import Path

import joblib
from datetime import timedelta

from flask import Flask, jsonify, request
from flask_cors import CORS

from features import extract_features
from trusted import is_trusted
import ensemble  # noqa: F401  (needed so ensemble.pkl can be unpickled)
import textmodel  # noqa: F401  (needed so both pickles can find clean_url)
import auth
import userdata
from db import close_db, init_db
from security import (ApiError, allowed_origins, load_secret_key, load_user, login_required, protect_request,
                      rate_limit)

# Ensemble page only: skip the ML vote for well-known sites (clearly labelled in the UI).
# Set to False to use the ML ensemble for every URL.
USE_TRUSTED_LIST = True

app = Flask(__name__)
IS_PROD = os.environ.get("PHISHGUARD_ENV", "development").lower() == "production"
BASE_DIR = Path(__file__).resolve().parent
app.config.update(
    SECRET_KEY=load_secret_key(),
    SESSION_COOKIE_NAME="phishguard_session",
    SESSION_COOKIE_HTTPONLY=True,          # not readable from JavaScript
    # Use "None" only when frontend and API are on different sites; HTTPS is then mandatory.
    SESSION_COOKIE_SAMESITE=os.environ.get("PHISHGUARD_COOKIE_SAMESITE", "Lax").capitalize(),
    SESSION_COOKIE_SECURE=IS_PROD,         # HTTPS only in production
    PERMANENT_SESSION_LIFETIME=timedelta(days=14),   # used when "Remember me" is ticked
    MAX_CONTENT_LENGTH=64 * 1024,          # API bodies are tiny; reject anything bigger
)
# supports_credentials lets the React app send the session cookie; origins are an explicit allow-list (never "*").
CORS(app, origins=allowed_origins(), supports_credentials=True, allow_headers=["Content-Type", "X-CSRF-Token"],
     methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"])
init_db(app)
app.teardown_appcontext(close_db)
app.before_request(load_user)
app.before_request(protect_request)
app.register_blueprint(auth.bp)
app.register_blueprint(userdata.bp)


@app.errorhandler(ApiError)
def _api_error(e):
    body = {"error": e.message}
    if e.field:
        body["field"] = e.field
    return jsonify(body), e.status


@app.errorhandler(404)
def _not_found(_e):
    return jsonify(error="Not found."), 404


@app.errorhandler(405)
def _bad_method(_e):
    return jsonify(error="Method not allowed."), 405


@app.errorhandler(413)
def _too_large(_e):
    return jsonify(error="Request is too large."), 413


@app.errorhandler(500)
def _server_error(_e):
    return jsonify(error="Something went wrong on the server."), 500


@app.after_request
def _security_headers(resp):
    resp.headers.setdefault("X-Content-Type-Options", "nosniff")
    resp.headers.setdefault("X-Frame-Options", "DENY")
    resp.headers.setdefault("Referrer-Policy", "no-referrer")
    if request.path.startswith("/api/") or request.path.startswith("/predict"):
        resp.headers["Cache-Control"] = "no-store"
    return resp


def _load(path):
    try:
        return joblib.load(BASE_DIR / path)
    except FileNotFoundError:
        return None


single_model = _load("model.pkl")
ensemble_model = _load("ensemble.pkl")


def _get_url():
    body = request.get_json(silent=True) or {}
    url = str(body.get("url", "")).strip()
    if not url:
        return None, (jsonify(error="Request body must be JSON with a non-empty 'url'."), 400)
    if len(url) > 2048:
        return None, (jsonify(error="URL is too long (max 2048 characters)."), 400)
    return url, None


def _wants_save():
    """Clients may send {"save": false} to scan without adding the result to history (AI Explainability does)."""
    return (request.get_json(silent=True) or {}).get("save") is not False


@app.get("/health")
def health():
    return jsonify(status="ok", model_loaded=single_model is not None,
                   ensemble_loaded=ensemble_model is not None)


@app.get("/metrics")
def metrics():
    try:
        with (BASE_DIR / "metrics.json").open(encoding="utf-8") as f:
            return jsonify(json.load(f))
    except FileNotFoundError:
        return jsonify(error="metrics.json not found. Run train_all.py first."), 404


@app.post("/predict")
@login_required
@rate_limit("scan", 60, 60)
def predict():
    if single_model is None:
        return jsonify(error="model.pkl not found. Run: python train_model.py phishing_site_urls.csv"), 503
    url, err = _get_url()
    if err:
        return err

    proba = single_model.predict_proba([url])[0]
    p_bad = float(proba[list(single_model.classes_).index("bad")])
    is_phish = p_bad >= 0.5
    result = dict(
        prediction="phishing" if is_phish else "legitimate",
        confidence=round(p_bad if is_phish else 1 - p_bad, 4),
        features=extract_features(url),
        source="single_model",
    )
    result["scan"] = userdata.record_scan(url, "single", result, persist=_wants_save())   # saved to this user's history
    return jsonify(result)


@app.post("/predict/ensemble")
@login_required
@rate_limit("scan", 60, 60)
def predict_ensemble():
    if ensemble_model is None:
        return jsonify(error="ensemble.pkl not found. Run: python train_all.py phishing_site_urls.csv"), 503
    url, err = _get_url()
    if err:
        return err

    result = ensemble_model.predict_url(url)
    result["features"] = extract_features(url)
    if USE_TRUSTED_LIST and is_trusted(url):
        # The models' own votes stay in result["models"] for transparency.
        result.update(prediction="legitimate", confidence=None, agreement=None, source="trusted_list")
    else:
        result["source"] = "ml_ensemble"
    result["scan"] = userdata.record_scan(url, "ensemble", result, persist=_wants_save())   # saved to this user's history
    return jsonify(result)


if __name__ == "__main__":
    # Local development only. Production should run via Gunicorn (see backend/Procfile).
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", "5000")), debug=False)
