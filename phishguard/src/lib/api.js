// Calls the PhishGuard backend (Flask). Override the address with VITE_API_URL in a .env file if needed.
// By default the API is expected on port 5000 of the same host the page was opened from, so the session cookie
// stays same-site whether you browse localhost or 127.0.0.1.
const BASE = (import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:5000`).replace(/\/+$/, "");

export class ApiError extends Error {
  constructor(message, status, field) {
    super(message);
    this.status = status;
    this.field = field;
  }
}

let csrf = null; // anti-CSRF token for this session; sent as X-CSRF-Token on every non-GET request

async function raw(path, options) {
  try {
    return await fetch(`${BASE}${path}`, { credentials: "include", ...options });
  } catch {
    throw new ApiError("Cannot reach the detection service. Start the backend with: cd backend && python app.py", 0);
  }
}

async function ensureCsrf() {
  if (!csrf) {
    const res = await raw("/api/auth/csrf");
    csrf = (await res.json().catch(() => ({}))).csrf ?? null;
  }
  return csrf;
}

async function request(path, { method = "GET", body } = {}, retried = false) {
  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (method !== "GET") headers["X-CSRF-Token"] = (await ensureCsrf()) ?? "";
  const res = await raw(path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (data.csrf) csrf = data.csrf;
  if (!res.ok) {
    // Expired CSRF token (e.g. the server restarted): fetch a fresh one and retry once.
    if (res.status === 403 && /csrf/i.test(data.error || "") && !retried) {
      csrf = null;
      return request(path, { method, body }, true);
    }
    if (res.status === 401 && !path.startsWith("/api/auth/")) window.dispatchEvent(new Event("phishguard:unauthorized"));
    if (res.status === 403 && !/csrf/i.test(data.error || "")) window.dispatchEvent(new Event("phishguard:forbidden"));
    throw new ApiError(data.error || `Request failed (${res.status})`, res.status, data.field);
  }
  return data;
}

const post = (path, body) => request(path, { method: "POST", body });
const send = (method) => (path, body) => request(path, { method, body });
const qs = (params) => {
  const s = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== "" && v !== null)).toString();
  return s ? `?${s}` : "";
};

export const api = {
  // detection (unchanged endpoints; they now require a signed-in user and save the scan to the account)
  metrics: () => request("/metrics"),
  predict: (url, save = true) => post("/predict", { url, save }), // Logistic Regression (Dashboard); save=false skips history
  predictEnsemble: (url) => post("/predict/ensemble", { url }), // Ensemble Feature

  // authentication
  me: () => request("/api/auth/me"),
  login: (email, password, remember) => post("/api/auth/login", { email, password, remember }),
  register: (name, email, password, remember) => post("/api/auth/register", { name, email, password, remember }),
  logout: () => post("/api/auth/logout"),
  forgotPassword: (email) => post("/api/auth/forgot-password", { email }),
  resetPassword: (token, password) => post("/api/auth/reset-password", { token, password }),

  // profile, account, preferences
  profile: () => request("/api/profile"),
  updateProfile: (data) => send("PATCH")("/api/profile", data),
  changePassword: (current_password, new_password) => post("/api/account/password", { current_password, new_password }),
  deleteAccount: (password) => send("DELETE")("/api/account", { password }),
  exportData: () => request("/api/account/export"),
  savePreferences: (prefs) => send("PUT")("/api/preferences", prefs),

  // scan history
  scans: (params = {}) => request(`/api/scans${qs({ limit: 1000, ...params })}`),
  scan: (id) => request(`/api/scans/${encodeURIComponent(id)}`),
  deleteScan: (id) => send("DELETE")(`/api/scans/${encodeURIComponent(id)}`),
  clearScans: (mode = "all") => send("DELETE")(`/api/scans${qs({ mode })}`),

  // navbar
  search: (q) => request(`/api/search${qs({ q })}`),
  notifications: () => request("/api/notifications"),
  markNotificationsRead: (ids) => post("/api/notifications/read", ids ? { ids } : {}),
  clearNotifications: () => send("DELETE")("/api/notifications"),

  // help & support
  tickets: () => request("/api/support"),
  createTicket: (data) => post("/api/support", data),
};
