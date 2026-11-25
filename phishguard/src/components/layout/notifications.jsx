import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCheck, Info, ShieldAlert, Trash2, UserCircle, LifeBuoy } from "lucide-react";
import { api } from "@/lib/api";
import { cn, timeAgo } from "@/lib/utils";
import { useDismiss } from "@/hooks/use-dismiss";
import { useAuth } from "@/hooks/auth-context";

const ICONS = { scan: ShieldAlert, welcome: Info, security: UserCircle, support: LifeBuoy };

/** Bell with an unread badge; the list is loaded from the database and refreshed every minute. */
export function NotificationsMenu() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const ref = useRef(null);
  const [open, setOpen] = useState(false);
  const [data, setData] = useState({ notifications: [], unread: 0 });
  useDismiss(ref, open, () => setOpen(false));

  const load = useCallback(() => api.notifications().then(setData).catch(() => {}), []);
  useEffect(() => {
    if (!user) return undefined;
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, [user?.id, load]); // eslint-disable-line react-hooks/exhaustive-deps
  // Refresh when opened and after a scan finishes (new alerts are created by the backend).
  useEffect(() => { if (open) load(); }, [open, load]);
  useEffect(() => {
    window.addEventListener("phishguard:scan-done", load);
    return () => window.removeEventListener("phishguard:scan-done", load);
  }, [load]);

  async function markAll() { await api.markNotificationsRead().catch(() => {}); load(); }
  async function clearAll() { await api.clearNotifications().catch(() => {}); load(); }
  async function openItem(n) {
    setOpen(false);
    if (!n.read) { await api.markNotificationsRead([n.id]).catch(() => {}); load(); }
    if (n.link) navigate(n.link);
  }

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-haspopup="true" aria-expanded={open}
        aria-label={data.unread ? `Notifications, ${data.unread} unread` : "Notifications"}
        className="relative grid size-10 place-items-center rounded-md text-white/80 hover:bg-white/10 hover:text-white">
        <Bell className="size-5" />
        {data.unread > 0 && (
          <span className="absolute right-1 top-1 grid min-w-4 place-items-center rounded-full bg-cyan px-1 text-[10px] font-bold leading-4 text-navy">{data.unread > 9 ? "9+" : data.unread}</span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-12 z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-lg border border-border bg-white text-navy shadow-xl">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold">Notifications</h2>
            <div className="flex gap-1">
              <button type="button" onClick={markAll} disabled={!data.unread} className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium hover:bg-secondary disabled:opacity-40"><CheckCheck className="size-3.5" />Mark read</button>
              <button type="button" onClick={clearAll} disabled={!data.notifications.length} aria-label="Clear all notifications" className="rounded px-2 py-1 text-xs hover:bg-secondary disabled:opacity-40"><Trash2 className="size-3.5" /></button>
            </div>
          </div>
          <ul className="max-h-96 overflow-y-auto">
            {data.notifications.length === 0 && <li className="px-4 py-8 text-center text-sm text-muted-foreground">You're all caught up.</li>}
            {data.notifications.map((n) => {
              const Icon = ICONS[n.kind] ?? Info;
              return (
                <li key={n.id}>
                  <button type="button" onClick={() => openItem(n)} className={cn("flex w-full items-start gap-3 border-b border-border/60 px-4 py-3 text-left hover:bg-secondary", !n.read && "bg-cyan/10")}>
                    <Icon className={cn("mt-0.5 size-4 shrink-0", n.kind === "scan" ? "text-danger" : "text-cyan-dark")} aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">{n.title}</span>
                      {n.body && <span className="block truncate text-xs text-muted-foreground">{n.body}</span>}
                      <span className="mt-0.5 block text-[11px] text-muted-foreground">{timeAgo(n.ts)}</span>
                    </span>
                    {!n.read && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-cyan" aria-label="Unread" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
