import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Download, History, Search, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { VerdictBadge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { useScans } from "@/hooks/scan-context";
import { cn, formatDateTime, pct } from "@/lib/utils";

const FILTERS = [["all", "All"], ["safe", "Safe"], ["suspicious", "Suspicious"], ["phishing", "Phishing"]];

function exportCsv(rows) {
  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const head = ["time", "url", "verdict", "prediction", "confidence"];
  const lines = rows.map((s) => [new Date(s.ts).toISOString(), s.url, s.verdict, s.prediction, s.confidence].map(esc).join(","));
  const blob = new Blob([[head.join(","), ...lines].join("\n")], { type: "text/csv" });
  const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: "phishguard-scan-history.csv" });
  a.click();
  URL.revokeObjectURL(a.href);
}

export default function ScanHistory() {
  const { scans, removeScan, clearHistory, loading } = useScans();
  const [params] = useSearchParams();
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState(params.get("q") ?? ""); // the navbar search links here with ?q=
  const [error, setError] = useState("");
  const guard = (fn) => async (...a) => { setError(""); try { await fn(...a); } catch (e) { setError(e.message); } };
  const rows = useMemo(
    () => scans.filter((s) => (filter === "all" || s.verdict === filter) && s.url.toLowerCase().includes(q.trim().toLowerCase())),
    [scans, filter, q]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Scan History"
        description="Every URL you have scanned, saved to your account."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="bg-white" disabled={!rows.length} onClick={() => exportCsv(rows)}><Download /> Export CSV</Button>
            <Button variant="destructive" size="sm" disabled={!scans.length} onClick={() => window.confirm("Delete all Dashboard scan history from your account?") && guard(clearHistory)()}><Trash2 /> Clear all</Button>
          </div>
        }
      />
      {error && <p role="alert" className="rounded-md border border-danger/30 bg-white px-3 py-2 text-sm text-danger">{error}</p>}
      <Card>
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div role="group" aria-label="Filter by verdict" className="flex flex-wrap gap-1">
            {FILTERS.map(([v, l]) => (
              <button key={v} type="button" aria-pressed={filter === v} onClick={() => setFilter(v)}
                className={cn("rounded-md px-3 py-1.5 text-sm font-medium transition-colors", filter === v ? "bg-navy text-white" : "text-navy hover:bg-secondary")}>
                {l}
              </button>
            ))}
          </div>
          <div className="relative sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search URLs" aria-label="Search URLs" className="pl-9" />
          </div>
        </div>
        <CardContent className="px-0 pb-2 pt-0">
          {rows.length === 0 ? (
            <EmptyState icon={History} title={loading ? "Loading your history…" : scans.length ? "No scans match" : "No scans yet"}>
              {scans.length ? "Try a different filter or search term." : "Scanned URLs will be listed here."}
            </EmptyState>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>URL</TableHead><TableHead>Verdict</TableHead><TableHead>Detection</TableHead>
                  <TableHead className="text-right">Confidence</TableHead><TableHead>Scanned</TableHead><TableHead><span className="sr-only">Actions</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="max-w-[360px] break-all font-mono text-xs"><Link to={`/history/${s.id}`} className="hover:text-cyan-dark hover:underline">{s.url}</Link></TableCell>
                    <TableCell><VerdictBadge verdict={s.verdict} /></TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">Logistic Regression</TableCell>
                    <TableCell className="text-right tabular-nums">{s.source === "trusted_list" ? "n/a" : pct(s.confidence)}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{formatDateTime(s.ts)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" aria-label={`Delete scan of ${s.domain}`} onClick={() => guard(removeScan)(s.id)}><Trash2 /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
