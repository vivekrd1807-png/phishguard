import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/auth-context";

const ScanContext = createContext(null);

/**
 * Scan history is stored per user in the backend database (SQLite) and loaded when you sign in,
 * so it follows your account across browsers and devices.
 */
export function ScanProvider({ children }) {
  const { user } = useAuth();
  const [scans, setScans] = useState([]);            // Dashboard (single model) scans
  const [ensembleScans, setEnsembleScans] = useState([]); // Ensemble Feature scans, kept apart
  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    api.metrics().then(setMetrics).catch(() => setMetrics(null));
  }, []);

  const reload = useCallback(async () => {
    const { scans: all } = await api.scans();
    setScans(all.filter((s) => s.mode !== "ensemble"));
    setEnsembleScans(all.filter((s) => s.mode === "ensemble"));
  }, []);

  useEffect(() => {
    if (!user) { setScans([]); setEnsembleScans([]); return undefined; }
    let live = true;
    setLoading(true);
    api.scans()
      .then(({ scans: all }) => {
        if (!live) return;
        setScans(all.filter((s) => s.mode !== "ensemble"));
        setEnsembleScans(all.filter((s) => s.mode === "ensemble"));
      })
      .catch(() => {})
      .finally(() => live && setLoading(false));
    return () => { live = false; };
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  /** mode: "single" = Logistic Regression (Dashboard), "ensemble" = Ensemble Feature */
  const runScan = useCallback(async (url, mode = "single") => {
    const clean = url.trim();
    const result = mode === "ensemble" ? await api.predictEnsemble(clean) : await api.predict(clean);
    const record = result.scan; // built and (unless history is switched off) saved by the server
    if (record.saved) {
      if (mode === "ensemble") setEnsembleScans((prev) => [record, ...prev]);
      else setScans((prev) => [record, ...prev]);
    }
    window.dispatchEvent(new Event("phishguard:scan-done")); // lets the navbar bell pick up new alerts
    return record;
  }, []);

  const clearHistory = useCallback(async () => { await api.clearScans("single"); setScans([]); }, []);
  const clearEnsembleHistory = useCallback(async () => { await api.clearScans("ensemble"); setEnsembleScans([]); }, []);
  const clearAllHistory = useCallback(async () => { await api.clearScans("all"); setScans([]); setEnsembleScans([]); }, []);
  const removeScan = useCallback(async (id) => {
    await api.deleteScan(id);
    setScans((p) => p.filter((s) => s.id !== id));
    setEnsembleScans((p) => p.filter((s) => s.id !== id));
  }, []);

  const stats = useMemo(() => {
    const total = scans.length;
    const count = (v) => scans.filter((s) => s.verdict === v).length;
    return { total, phishing: count("phishing"), suspicious: count("suspicious"), safe: count("safe") };
  }, [scans]);

  const value = { scans, ensembleScans, stats, metrics, loading, reload, runScan, clearHistory, clearEnsembleHistory, clearAllHistory, removeScan };
  return <ScanContext.Provider value={value}>{children}</ScanContext.Provider>;
}

export const useScans = () => {
  const ctx = useContext(ScanContext);
  if (!ctx) throw new Error("useScans must be used inside <ScanProvider>");
  return ctx;
};
