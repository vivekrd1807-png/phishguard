# PhishGuard – ML-Based Phishing URL Detection

React (Vite) front end + Python Flask API.

Front end: React + Vite + Tailwind CSS + shadcn/ui + Lucide, laid out like the Shadcn Admin template
(collapsible sidebar, top bar, card dashboard). Palette: Midnight Navy `#0F1B3D` / White `#FFFFFF` / Electric Cyan `#00D1FF`.

* **Dashboard** - scan a URL with the Logistic Regression model (`model.pkl`), stats, recent scans, threat charts.
* **Ensemble Feature** - scan a URL with the combined ensemble detector (`ensemble.pkl`).
* **Accounts**: register, sign in/out, password reset, profile; every page except the landing, login, register and reset pages requires sign-in.
* **Top bar**: breadcrumbs, global search (press `/`), notifications bell and profile menu. Also **Help & Support**, 404 and Access-denied pages.
* **Settings**: account (profile, password, delete account), privacy (save history, strip query strings, export/delete data) and preferences (sidebar, suspicious threshold, notifications).
* **Threat Intelligence**, **Feature Analysis**, **AI Explainability** (reference guide to phishing types, attack techniques and characteristics), **Scan History**, **Settings**.

Accounts, scan history and settings are stored per user in a SQLite database (`backend/instance/phishguard.db`, created on first run). Accuracy and model scores come from `GET /metrics`.
The UI adds a third label, *Suspicious*: single-model confidence below 75%, or a non-unanimous ensemble vote.
Open the app at http://localhost:5173 (the API's CORS allows localhost:5173 and 127.0.0.1:5173).

## Backend (Windows, terminal 1)
```
cd backend
..\.venv\Scripts\Activate.ps1          # or create a venv: python -m venv .venv
pip install -r requirements.txt
python train_model.py phishing_site_urls.csv    # -> model.pkl      (single model)
python train_all.py   phishing_site_urls.csv    # -> ensemble.pkl + metrics.json
python app.py                                   # http://localhost:5000
```
Check http://localhost:5000/health → `model_loaded` and `ensemble_loaded` should be true.

## Frontend (terminal 2, project root = folder with package.json)
```
npm install
npm run dev                                     # http://localhost:5173
```

## Accounts, database and security
* No extra packages: SQLite via the standard library, password hashing via Werkzeug (scrypt), sessions via Flask's signed cookie.
* Session cookie is `HttpOnly` + `SameSite=Lax`; all non-GET requests need the `X-CSRF-Token` header and an allowed `Origin`; logins lock for 15 minutes after 5 failures; auth, scan and support endpoints are rate limited.
* Every query is filtered by the signed-in user, so one user can never read or delete another user's scans, notifications or tickets.
* Password reset: set `PHISHGUARD_SMTP_HOST` (and `_PORT`, `_USER`, `_PASSWORD`, `_FROM`) to e-mail the link. Without it the link is printed in the backend console and shown on the page (development only).
* Environment variables: `PHISHGUARD_ENV=production` (HTTPS-only cookies, no dev reset link), `PHISHGUARD_SECRET_KEY`, `PHISHGUARD_ORIGINS` (comma-separated front-end origins; the first is used in reset links), `PHISHGUARD_DB`.
* Tests: `cd backend && python -m pytest -q test_api.py`.

## API
* `POST /predict`           `{ "url": "...", "save"?: false }` → `{ prediction, confidence, features, scan }` (sign-in required; saved to history)
* `POST /predict/ensemble`  `{ "url": "..." }` → adds `agreement`, `models[]`, `source`
* `/api/auth/*`, `/api/profile`, `/api/preferences`, `/api/scans`, `/api/search`, `/api/notifications`, `/api/support`, `/api/account/*`: accounts and per-user data (see `backend/auth.py`, `backend/userdata.py`)
* `GET  /metrics`           test accuracy / precision / recall / F1 of each ensemble model

`backend/trusted_domains.txt` is used by the **Ensemble page only** (exact domain or `www.` form).
Set `USE_TRUSTED_LIST = False` in `backend/app.py` to turn it off.


## Production deployment

The project is split into a static React frontend and a Flask API. Deploy them as separate services:

### 1. Backend (Python web service)

- Set the service root directory to `backend`.
- Install command: `pip install -r requirements.txt`.
- Start command: `gunicorn --workers 1 --threads 4 --timeout 120 --bind 0.0.0.0:$PORT wsgi:app`.
- Set the environment variables shown in `backend/.env.example`.
- Set `PHISHGUARD_ORIGINS` to the exact deployed frontend origin (for example `https://your-app.vercel.app`, without a trailing slash).
- Set `PHISHGUARD_SECRET_KEY` to a long random secret and keep it stable across restarts/deployments.
- Set `PHISHGUARD_DB` to a location on a persistent disk, for example `/var/data/phishguard.db`. If the host does not provide persistent storage, use a managed PostgreSQL database before accepting real user accounts; the default local SQLite file is not durable on ephemeral hosts.
- Keep one Gunicorn worker for the current in-memory rate limiter and SQLite setup. For multiple workers/instances, move rate limiting to shared storage and use a database designed for concurrent hosted access.
- The `model.pkl`, `ensemble.pkl`, `metrics.json`, `trusted_domains.txt`, and Python modules must remain available in the backend service. `backend/model.pkl` was previously excluded by `.gitignore`; that exclusion has been removed so Git deployments can include the single-model artifact. Do not run model training as part of every server startup.

### 2. Frontend (static site)

- Set the project root to the repository root.
- Build command: `npm ci && npm run build`.
- Output directory: `dist`.
- Set `VITE_API_URL` to the public backend URL (for example `https://your-api.onrender.com`). This value is embedded at build time, so rebuild after changing it.
- `vercel.json` routes client-side React paths back to `index.html`.

### 3. Connecting Vercel, Render and the database

**Frontend <-> backend.** `vercel.json` proxies `https://<vercel-app>/backend/*` to the Render API, and the built app calls `/backend/...`, so the browser only talks to the Vercel origin and the login cookie is first-party (works in Safari/Chrome without third-party-cookie problems). Do **not** set `VITE_API_URL` on Vercel (it is ignored in production builds). If you change the Render URL, edit the destination in `vercel.json`.

**Render environment variables:** `PHISHGUARD_ENV=production`, `PHISHGUARD_SECRET_KEY=<long random>`, `PHISHGUARD_ORIGINS=https://phishguard-im3h.vercel.app`, `DATABASE_URL=<postgres url>`. Leave `PHISHGUARD_COOKIE_SAMESITE` unset (Lax).

**Database.** Render's disk is wiped on every redeploy/restart, so SQLite loses all accounts. Set `DATABASE_URL` to a PostgreSQL URL (Render Postgres, Neon or Supabase); tables are created automatically on startup and the SQLite file is no longer used. Without `DATABASE_URL` the app falls back to SQLite (local development).

### 4. Password reset email

Configure the `PHISHGUARD_SMTP_*` variables in `backend/.env.example`. In production, password-reset links are not returned in API responses; without SMTP configuration users will not receive reset emails.

### 5. Verify after deployment

- Open `https://YOUR_BACKEND/health`; both `model_loaded` and `ensemble_loaded` should be `true`.
- Open `https://YOUR_BACKEND/metrics` and confirm the model metrics load.
- Register a test account, sign in, run both scan modes, and verify scan history.
- Restart/redeploy the backend and confirm the account and scan history still exist.
- Test password reset only after SMTP is configured.

### Important model compatibility note

The supplied scikit-learn pickle artifacts record scikit-learn version `1.9.1`. Keep the runtime compatible with the version used to train the artifacts. If dependency versions change, retrain `model.pkl` and `ensemble.pkl` using the deployment environment's installed dependencies, then deploy the new artifacts together with the code. Never load model pickle files from untrusted sources.
