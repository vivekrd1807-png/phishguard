import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from "recharts";
import { Activity, Globe, Radar, ShieldAlert, TriangleAlert } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { VerdictBadge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { StatCard } from "@/components/stat-card";
import { useScans } from "@/hooks/scan-context";
import { FEATURE_INFO } from "@/lib/verdict";
import { timeAgo } from "@/lib/utils";

const INDICATORS = FEATURE_INFO.filter((f) => ["has_ip", "has_at", "subdomains", "hyphens", "keyword_count", "https", "url_length"].includes(f.key));

export default function ThreatIntelligence() {
  const { scans, stats } = useScans();
  const flagged = useMemo(() => scans.filter((s) => s.verdict !== "safe"), [scans]);

  const topDomains = useMemo(() => {
    const map = new Map();
    flagged.forEach((s) => {
      const e = map.get(s.domain) ?? { domain: s.domain, hits: 0, last: 0, verdict: s.verdict };
      e.hits += 1;
      if (s.ts > e.last) { e.last = s.ts; e.verdict = s.verdict; }
      map.set(s.domain, e);
    });
    return [...map.values()].sort((a, b) => b.hits - a.hits || b.last - a.last).slice(0, 8);
  }, [flagged]);

  const indicatorData = useMemo(() => {
    const safe = scans.filter((s) => s.verdict === "safe");
    const rate = (list, f) => (list.length ? Math.round((list.filter((s) => f.flag(s.features)).length / list.length) * 100) : 0);
    return INDICATORS.map((f) => ({ name: f.label, Flagged: rate(flagged, f), Safe: rate(safe, f) }));
  }, [scans, flagged]);

  const threatRate = stats.total ? Math.round(((stats.phishing + stats.suspicious) / stats.total) * 100) : 0;

  return (
    <div className="space-y-6">
      <PageHeader title="Threat Intelligence" description="Patterns across the URLs you have scanned: which domains are flagged most and which risk indicators they share." />

      <section aria-label="Summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Flagged URLs" value={flagged.length} icon={ShieldAlert} hint="Phishing and suspicious" />
        <StatCard label="Threat rate" value={`${threatRate}%`} icon={Activity} hint="Flagged share of all scans" />
        <StatCard label="Unique risky domains" value={new Set(flagged.map((s) => s.domain)).size} icon={Globe} />
        <StatCard label="Suspicious" value={stats.suspicious} icon={TriangleAlert} hint="Low confidence or split vote" />
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Most flagged domains</CardTitle><CardDescription>Domains that triggered a phishing or suspicious verdict</CardDescription></CardHeader>
          <CardContent className="px-0 pb-2">
            {topDomains.length === 0 ? (
              <EmptyState icon={Radar} title="No flagged domains yet">Scan some URLs to build a threat list.</EmptyState>
            ) : (
              <Table>
                <TableHeader><TableRow className="hover:bg-transparent"><TableHead>Domain</TableHead><TableHead>Latest verdict</TableHead><TableHead className="text-right">Hits</TableHead><TableHead className="text-right">Last seen</TableHead></TableRow></TableHeader>
                <TableBody>
                  {topDomains.map((d) => (
                    <TableRow key={d.domain}>
                      <TableCell className="break-all font-mono text-xs">{d.domain}</TableCell>
                      <TableCell><VerdictBadge verdict={d.verdict} /></TableCell>
                      <TableCell className="text-right tabular-nums">{d.hits}</TableCell>
                      <TableCell className="whitespace-nowrap text-right text-muted-foreground">{timeAgo(d.last)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Common risk indicators</CardTitle><CardDescription>% of flagged vs safe scans showing each indicator</CardDescription></CardHeader>
          <CardContent>
            {flagged.length === 0 ? (
              <EmptyState icon={Radar} title="Not enough data">Indicators are compared once a URL has been flagged.</EmptyState>
            ) : (
              <div className="h-72" role="img" aria-label="Bar chart comparing risk indicator frequency in flagged and safe URLs">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={indicatorData} layout="vertical" margin={{ left: 24, right: 8 }}>
                    <CartesianGrid horizontal={false} stroke="#E6E9F0" />
                    <XAxis type="number" domain={[0, 100]} unit="%" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#5B6785" }} />
                    <YAxis type="category" dataKey="name" width={110} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#0F1B3D" }} />
                    <RTooltip formatter={(v) => `${v}%`} cursor={{ fill: "#F0F2F7" }} contentStyle={{ borderRadius: 6, border: "1px solid #DDE1EA", fontSize: 12 }} />
                    <Legend iconType="square" wrapperStyle={{ fontSize: 12 }} formatter={(v) => <span style={{ color: "#0F1B3D" }}>{v}</span>} />
                    <Bar dataKey="Flagged" fill="#00D1FF" radius={[0, 3, 3, 0]} isAnimationActive={false} />
                    <Bar dataKey="Safe" fill="#0F1B3D" radius={[0, 3, 3, 0]} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
