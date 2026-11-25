import { Link, useLocation } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";
import { CRUMB_LABELS } from "./nav";

/** Breadcrumb trail built from the current URL: Home / Section / Page. */
export function Breadcrumbs() {
  const { pathname } = useLocation();
  const parts = pathname.split("/").filter(Boolean);
  const crumbs = parts.map((seg, i) => ({
    to: `/${parts.slice(0, i + 1).join("/")}`,
    label: CRUMB_LABELS[seg] ?? (/^\d+$/.test(seg) ? `Scan #${seg}` : seg),
  }));
  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      <ol className="flex items-center gap-1.5 text-sm text-white/65">
        <li className="shrink-0">
          <Link to="/dashboard" aria-label="Dashboard home" className="grid size-6 place-items-center rounded hover:text-cyan"><Home className="size-4" /></Link>
        </li>
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1;
          return (
            <li key={c.to} className={`flex min-w-0 items-center gap-1.5 ${last ? "" : "hidden sm:flex"}`}>
              <ChevronRight className="size-3.5 shrink-0 text-white/35" aria-hidden="true" />
              {last
                ? <span aria-current="page" className="truncate font-medium text-white">{c.label}</span>
                : <Link to={c.to} className="truncate hover:text-cyan">{c.label}</Link>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
