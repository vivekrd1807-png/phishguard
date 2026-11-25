import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, FileText, Search } from "lucide-react";
import { api } from "@/lib/api";
import { cn, truncate } from "@/lib/utils";
import { useDismiss } from "@/hooks/use-dismiss";
import { VerdictBadge } from "@/components/ui/badge";
import { SEARCHABLE_PAGES } from "./nav";

/** Global search: pages (instant) + your saved scans and notifications (searched in the database). */
export function GlobalSearch() {
  const navigate = useNavigate();
  const box = useRef(null);
  const input = useRef(null);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [remote, setRemote] = useState({ scans: [], notifications: [] });
  const [active, setActive] = useState(0);
  useDismiss(box, open, () => setOpen(false));

  // "/" focuses the search box, like most dashboards.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "/" && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName) && !document.activeElement?.isContentEditable) {
        e.preventDefault();
        input.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const term = q.trim();
  useEffect(() => {
    if (term.length < 2) { setRemote({ scans: [], notifications: [] }); return undefined; }
    let live = true;
    const t = setTimeout(() => {
      api.search(term).then((r) => live && setRemote(r)).catch(() => live && setRemote({ scans: [], notifications: [] }));
    }, 250);
    return () => { live = false; clearTimeout(t); };
  }, [term]);

  const items = useMemo(() => {
    if (!term) return [];
    const lower = term.toLowerCase();
    const pages = SEARCHABLE_PAGES.filter((p) => p.label.toLowerCase().includes(lower)).map((p) => ({ key: `p${p.to}`, type: "page", label: p.label, icon: FileText, to: p.to }));
    const scans = remote.scans.map((s) => ({ key: `s${s.id}`, type: "scan", label: truncate(s.url, 48), verdict: s.verdict, to: `/history/${s.id}` }));
    const notes = remote.notifications.map((n) => ({ key: `n${n.id}`, type: "note", label: n.title, sub: n.body, icon: Bell, to: n.link || "/dashboard" }));
    return [...pages, ...scans, ...notes];
  }, [term, remote]);

  useEffect(() => setActive(0), [items.length]);

  function go(item) {
    setOpen(false);
    setQ("");
    navigate(item.to);
  }
  function onKeyDown(e) {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, items.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === "Enter") {
      e.preventDefault();
      if (items[active]) go(items[active]);
      else if (term) { setOpen(false); navigate(`/history?q=${encodeURIComponent(term)}`); }
    }
  }

  return (
    <div ref={box} className="relative w-full max-w-md">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/50" aria-hidden="true" />
      <input
        ref={input}
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        role="combobox"
        aria-expanded={open && !!term}
        aria-controls="global-search-results"
        aria-label="Search pages, scans and notifications"
        placeholder="Search…  ( / )"
        autoComplete="off"
        spellCheck={false}
        className="h-10 w-full rounded-md border border-navy-600 bg-navy-800 pl-9 pr-3 text-sm text-white placeholder:text-white/45 focus-visible:border-cyan"
      />
      {open && term && (
        <div id="global-search-results" role="listbox" className="absolute left-0 right-0 top-12 z-50 max-h-96 overflow-y-auto rounded-lg border border-border bg-white p-1.5 text-navy shadow-xl">
          {items.length === 0 ? (
            <div className="px-3 py-4 text-sm text-muted-foreground">
              No matches for “{truncate(term, 40)}”.
              {term.length < 2 && " Type at least 2 characters to search your scans."}
            </div>
          ) : items.map((it, i) => {
            const Icon = it.icon;
            return (
              <button key={it.key} type="button" role="option" aria-selected={i === active} onMouseEnter={() => setActive(i)} onClick={() => go(it)}
                className={cn("flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm", i === active ? "bg-secondary" : "")}>
                {Icon ? <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" /> : <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />}
                <span className="min-w-0 flex-1">
                  <span className={cn("block truncate", it.type === "scan" && "font-mono text-xs")}>{it.label}</span>
                  {it.sub && <span className="block truncate text-xs text-muted-foreground">{it.sub}</span>}
                </span>
                <span className="shrink-0 text-[11px] uppercase tracking-wide text-muted-foreground">{it.type === "scan" ? <VerdictBadge verdict={it.verdict} /> : it.type === "page" ? "Page" : "Alert"}</span>
              </button>
            );
          })}
          <button type="button" onClick={() => { setOpen(false); navigate(`/history?q=${encodeURIComponent(term)}`); }}
            className="mt-1 flex w-full items-center gap-2 rounded-md border-t border-border px-3 py-2 text-left text-xs font-medium text-navy hover:bg-secondary">
            <Search className="size-3.5" aria-hidden="true" /> See all scans matching “{truncate(term, 30)}”
          </button>
        </div>
      )}
    </div>
  );
}
