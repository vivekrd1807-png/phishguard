import { NavLink, useMatch } from "react-router-dom";
import { PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/hooks/use-sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Brand } from "./brand";
import { useAuth } from "@/hooks/auth-context";
import { NAV_GROUPS } from "./nav";
import { initials } from "./profile-menu";

function NavItem({ item, collapsed, onNavigate }) {
  const Icon = item.icon;
  // className must be a plain string: Radix's Tooltip <Slot> cannot merge NavLink's className callback.
  const isActive = !!useMatch({ path: item.to, end: item.end ?? false });
  const link = (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      aria-label={collapsed ? item.label : undefined}
      className={cn(
        "group flex h-10 items-center gap-3 rounded-md px-[14px] text-sm font-medium transition-colors",
        isActive ? "bg-cyan text-navy" : "text-white/75 hover:bg-white/10 hover:text-white"
      )}
    >
      <Icon className="size-[18px] shrink-0" aria-hidden="true" />
      <span className={cn("overflow-hidden whitespace-nowrap transition-opacity duration-200", collapsed ? "opacity-0" : "opacity-100")}>
        {item.label}
      </span>
    </NavLink>
  );
  if (!collapsed) return link;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{item.label}</TooltipContent>
    </Tooltip>
  );
}

function CollapseToggle({ collapsed, onToggle }) {
  const Icon = collapsed ? PanelLeftOpen : PanelLeftClose;
  const label = collapsed ? "Expand sidebar" : "Collapse sidebar";
  const btn = (
    <button
      type="button"
      onClick={onToggle}
      aria-label={label}
      aria-expanded={!collapsed}
      className="flex h-10 w-full items-center gap-3 rounded-md px-[14px] text-sm font-medium text-white/75 transition-colors hover:bg-white/10 hover:text-white"
    >
      <Icon className="size-[18px] shrink-0" aria-hidden="true" />
      <span className={cn("overflow-hidden whitespace-nowrap transition-opacity duration-200", collapsed ? "opacity-0" : "opacity-100")}>Collapse</span>
    </button>
  );
  if (!collapsed) return btn;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{btn}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

/** Signed-in user card at the bottom of the sidebar; links to the profile page. */
function UserCard({ collapsed, onNavigate }) {
  const { user } = useAuth();
  const isActive = !!useMatch({ path: "/profile" });
  if (!user) return null;
  const link = (
    <NavLink to="/profile" onClick={onNavigate} aria-label={collapsed ? "My profile" : undefined}
      className={cn("flex h-14 items-center gap-3 rounded-md px-[14px] transition-colors", isActive ? "bg-white/15" : "hover:bg-white/10")}>
      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-cyan text-[11px] font-bold text-navy">{initials(user.name)}</span>
      <span className={cn("min-w-0 overflow-hidden transition-opacity duration-200", collapsed ? "opacity-0" : "opacity-100")}>
        <span className="block truncate text-sm font-medium text-white">{user.name}</span>
        <span className="block truncate text-xs text-white/55">{user.email}</span>
      </span>
    </NavLink>
  );
  if (!collapsed) return link;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{user.name}</TooltipContent>
    </Tooltip>
  );
}

function SidebarBody({ collapsed, onNavigate, onClose, onToggle }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-20 shrink-0 items-center justify-between border-b border-navy-700 px-3">
        <Brand collapsed={collapsed} onNavigate={onNavigate} expandable />
        {onClose && (
          <button type="button" onClick={onClose} aria-label="Close sidebar"
            className="grid size-8 place-items-center rounded-md text-white/80 hover:bg-white/10 hover:text-white">
            <X className="size-5" />
          </button>
        )}
      </div>
      <nav aria-label="Main" className="flex-1 overflow-y-auto overflow-x-hidden p-3">
        {NAV_GROUPS.map((g, i) => (
          <div key={g.group} className={cn("space-y-1", i > 0 && "mt-4")}>
            {/* Heading when expanded, thin divider when collapsed so the groups stay distinguishable. */}
            {collapsed
              ? (i > 0 && <div className="mx-3 mb-3 border-t border-navy-700" aria-hidden="true" />)
              : <p className="px-[14px] pb-1 text-[11px] font-semibold uppercase tracking-wider text-white/40">{g.group}</p>}
            {g.items.map((item) => (
              <NavItem key={item.to} item={item} collapsed={collapsed} onNavigate={onNavigate} />
            ))}
          </div>
        ))}
      </nav>
      <div className="shrink-0 space-y-1 border-t border-navy-700 p-3">
        <UserCard collapsed={collapsed} onNavigate={onNavigate} />
        {onToggle && <CollapseToggle collapsed={collapsed} onToggle={onToggle} />}
      </div>
    </div>
  );
}

export function Sidebar() {
  const { collapsed, setCollapsed, mobileOpen, setMobileOpen } = useSidebar();
  return (
    <>
      {/* Desktop: fixed, width animates 250ms; <main> padding animates in step so nothing overlaps. */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden border-r border-navy-700 bg-navy transition-[width] duration-250 ease-in-out lg:block",
          collapsed ? "w-[72px]" : "w-64"
        )}
      >
        <SidebarBody collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      </aside>

      {/* Mobile: the menu button lives in the top navbar; this is the overlay with backdrop and close button. */}
      <div
        className={cn("fixed inset-0 z-40 bg-navy/70 transition-opacity duration-250 lg:hidden", mobileOpen ? "opacity-100" : "pointer-events-none opacity-0")}
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
      />
      <aside
        aria-label="Navigation menu"
        aria-hidden={!mobileOpen}
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 border-r border-navy-700 bg-navy transition-[transform,visibility] duration-250 ease-in-out lg:hidden",
          mobileOpen ? "visible translate-x-0" : "invisible -translate-x-full"
        )}
      >
        <SidebarBody collapsed={false} onNavigate={() => setMobileOpen(false)} onClose={() => setMobileOpen(false)} />
      </aside>
    </>
  );
}
