import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/auth-context";

const SidebarContext = createContext(null);
const KEY = "phishguard.sidebarCollapsed";

/** The collapsed/expanded choice is saved to the user's preferences in the database (localStorage only avoids a flash before sign-in). */
export function SidebarProvider({ children }) {
  const { user, prefs, updatePrefs } = useAuth();
  const [collapsed, setCollapsedState] = useState(() => {
    try { return localStorage.getItem(KEY) === "1"; } catch { return false; }
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const ref = useRef(collapsed);
  ref.current = collapsed;

  // When the account's saved preference loads (or changes elsewhere), follow it.
  useEffect(() => {
    if (user) setCollapsedState(!!prefs.sidebar_collapsed);
  }, [user?.id, prefs.sidebar_collapsed]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    try { localStorage.setItem(KEY, collapsed ? "1" : "0"); } catch { /* ignore */ }
  }, [collapsed]);

  const setCollapsed = useCallback((next) => {
    const value = typeof next === "function" ? next(ref.current) : next;
    setCollapsedState(value);
    if (user) updatePrefs({ sidebar_collapsed: value }).catch(() => {});
  }, [user, updatePrefs]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && setMobileOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <SidebarContext.Provider value={{ collapsed, setCollapsed, mobileOpen, setMobileOpen }}>
      {children}
    </SidebarContext.Provider>
  );
}

export const useSidebar = () => {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error("useSidebar must be used inside <SidebarProvider>");
  return ctx;
};
