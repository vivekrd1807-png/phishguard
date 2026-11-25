import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronDown, LifeBuoy, LogOut, Settings, UserCircle } from "lucide-react";
import { useAuth } from "@/hooks/auth-context";
import { useDismiss } from "@/hooks/use-dismiss";

export const initials = (name = "") => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("") || "U";

/** Avatar button that opens a dropdown: profile, settings, help and sign out. */
export function ProfileMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const ref = useRef(null);
  const [open, setOpen] = useState(false);
  useDismiss(ref, open, () => setOpen(false));
  if (!user) return null;

  const item = "flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm hover:bg-secondary";
  async function signOut() {
    setOpen(false);
    await logout().catch(() => {});
    navigate("/login", { replace: true });
  }

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open} aria-label="Account menu"
        className="flex h-10 items-center gap-2 rounded-md px-1.5 text-white hover:bg-white/10">
        <span className="grid size-8 place-items-center rounded-full bg-cyan text-xs font-bold text-navy">{initials(user.name)}</span>
        <span className="hidden max-w-[120px] truncate text-sm font-medium md:block">{user.name}</span>
        <ChevronDown className="hidden size-4 text-white/60 md:block" aria-hidden="true" />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-12 z-50 w-64 rounded-lg border border-border bg-white p-1.5 text-navy shadow-xl">
          <div className="border-b border-border px-3 pb-2.5 pt-2">
            <p className="truncate text-sm font-semibold">{user.name}</p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          </div>
          <div className="py-1.5">
            <Link role="menuitem" to="/profile" onClick={() => setOpen(false)} className={item}><UserCircle className="size-4" />My profile</Link>
            <Link role="menuitem" to="/settings" onClick={() => setOpen(false)} className={item}><Settings className="size-4" />Settings</Link>
            <Link role="menuitem" to="/help" onClick={() => setOpen(false)} className={item}><LifeBuoy className="size-4" />Help &amp; Support</Link>
          </div>
          <div className="border-t border-border pt-1.5">
            <button type="button" role="menuitem" onClick={signOut} className={`${item} text-danger`}><LogOut className="size-4" />Sign out</button>
          </div>
        </div>
      )}
    </div>
  );
}
