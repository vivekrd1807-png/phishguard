import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";

const AuthContext = createContext(null);

export const DEFAULT_PREFS = {
  sidebar_collapsed: false, suspicious_threshold: 0.75, save_history: true,
  strip_query: false, notify_phishing: true, notify_security: true,
};

/** Holds the signed-in user and their saved preferences. The session itself lives in an HttpOnly cookie set by the backend. */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);
  const [status, setStatus] = useState("loading"); // loading | ready | offline

  const apply = useCallback((data) => {
    setUser(data.user ?? null);
    if (data.preferences) setPrefs({ ...DEFAULT_PREFS, ...data.preferences });
  }, []);

  useEffect(() => {
    let live = true;
    api.me()
      .then((d) => { if (live) { apply(d); setStatus("ready"); } })
      .catch(() => { if (live) setStatus("offline"); });
    return () => { live = false; };
  }, [apply]);

  // Any API call answered with 401 means the session ended (expired, signed out elsewhere, password changed).
  useEffect(() => {
    const onExpired = () => setUser(null);
    window.addEventListener("phishguard:unauthorized", onExpired);
    return () => window.removeEventListener("phishguard:unauthorized", onExpired);
  }, []);

  const login = useCallback(async (email, password, remember) => { const d = await api.login(email, password, remember); apply(d); return d; }, [apply]);
  const register = useCallback(async (name, email, password, remember) => { const d = await api.register(name, email, password, remember); apply(d); return d; }, [apply]);
  const logout = useCallback(async () => {
    try { await api.logout(); } finally { setUser(null); setPrefs(DEFAULT_PREFS); }
  }, []);

  /** Saves a preference change to the database; the UI updates immediately and rolls back if the save fails. */
  const updatePrefs = useCallback(async (patch) => {
    let before;
    setPrefs((p) => { before = p; return { ...p, ...patch }; });
    try {
      const d = await api.savePreferences(patch);
      setPrefs({ ...DEFAULT_PREFS, ...d.preferences });
    } catch (err) {
      setPrefs(before);
      throw err;
    }
  }, []);

  const value = useMemo(
    () => ({ user, setUser, prefs, status, login, register, logout, updatePrefs }),
    [user, prefs, status, login, register, logout, updatePrefs]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
};
