import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { LogoLightbox } from "@/components/logo-lightbox";

const tileClass = "grid size-12 shrink-0 place-items-center rounded-md bg-white p-1.5 transition duration-200 hover:scale-105 hover:shadow-[0_0_0_2px_#00D1FF] active:scale-100";
const logoImg = <img src="/logo.svg" alt="" width={356} height={383} className="h-full w-auto object-contain" draggable={false} />;

/**
 * Official PhishGuard logo (public/logo.svg). Defaults to the Dashboard; the landing page passes to="/".
 * With `expandable` the logo tile opens a full-size view when clicked and only the name links to `to`.
 */
export function Brand({ collapsed = false, onNavigate, to = "/dashboard", label = "PhishGuard – go to Dashboard", expandable = false }) {
  const name = (
    <span
      className={cn(
        "whitespace-nowrap text-xl font-semibold tracking-tight text-white transition-[opacity,color] duration-200 group-hover:text-cyan",
        collapsed && "opacity-0"
      )}
    >
      PhishGuard
    </span>
  );
  if (expandable) {
    return (
      <div className="flex items-center gap-3 overflow-hidden">
        {/* White tile keeps the logo's navy half visible against the navy sidebar. */}
        <LogoLightbox buttonClassName={cn(tileClass, "hover:scale-105")}>{logoImg}</LogoLightbox>
        <Link to={to} onClick={onNavigate} aria-label={label} className={cn("group rounded-md", collapsed && "pointer-events-none")} tabIndex={collapsed ? -1 : 0}>{name}</Link>
      </div>
    );
  }
  return (
    <Link to={to} onClick={onNavigate} aria-label={label} className="group flex items-center gap-3 overflow-hidden rounded-md">
      <span className={cn(tileClass, "group-hover:scale-105 group-hover:shadow-[0_0_0_2px_#00D1FF] group-active:scale-100")}>{logoImg}</span>
      {name}
    </Link>
  );
}
