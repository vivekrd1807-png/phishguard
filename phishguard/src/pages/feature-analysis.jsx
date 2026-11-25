import { useMemo, useState } from "react";
import { CheckCircle2, Globe, TriangleAlert, XCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { VerdictBadge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { ScanForm } from "@/components/scan-form";
import { ScanResult } from "@/components/scan-result";
import { useScans } from "@/hooks/scan-context";
import { FEATURE_INFO } from "@/lib/verdict";
import { timeAgo } from "@/lib/utils";

function Row({ label, children }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border py-2.5 text-sm last:border-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{children}</dd>
    </div>
  );
}
const YesNo = ({ v, goodWhen }) => {
  const good = v === goodWhen;
  const Icon = good ? CheckCircle2 : XCircle;
  return <span className={`inline-flex items-center gap-1.5 ${good ? "text-safe" : "text-danger"}`}><Icon className="size-4" aria-hidden="true" />{v ? "Yes" : "No"}</span>;
};
const YES_NO_KEYS = ["https", "has_ip", "has_at"];

export default function FeatureAnalysis() {
  const { scans } = useScans();
  const [result, setResult] = useState(null);

  const domains = useMemo(() => {
    const map = new Map();
    scans.forEach((s) => {
      const e = map.get(s.domain) ?? { domain: s.domain, scans: 0, last: s.ts, verdict: s.verdict };
      e.scans += 1;
      map.set(s.domain, e);
    });
    return [...map.values()].slice(0, 10);
  }, [scans]);

  const f = result?.features;
  const labels = result ? result.domain.split(".").filter(Boolean) : [];

  return (
    <div className="space-y-6">
      <PageHeader title="Feature Analysis" description="Break a URL into the structural features the detector looks at and see which ones raise a warning." />
      <Card className="p-5 sm:p-6">
        <ScanForm mode="single" onResult={setResult} placeholder="Enter a URL or domain, e.g. axis-bank-kyc.example.com" />
      </Card>

      {result && (
        <>
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Domain structure</CardTitle><CardDescription className="break-all font-mono text-xs">{result.domain}</CardDescription></CardHeader>
              <CardContent>
                <dl>
                  <Row label="Top-level domain">.{labels[labels.length - 1] ?? "—"}</Row>
                  <Row label="Labels in hostname">{labels.length}</Row>
                  <Row label="Subdomains">{f.subdomains}</Row>
                  <Row label="Hostname is an IP address"><YesNo v={!!f.has_ip} goodWhen={false} /></Row>
                  <Row label="Contains '@'"><YesNo v={!!f.has_at} goodWhen={false} /></Row>
                  <Row label="HTTPS typed in URL"><YesNo v={!!f.https} goodWhen={true} /></Row>
                </dl>
              </CardContent>
            </Card>
            <ScanResult scan={result} compact />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Feature breakdown</CardTitle>
              <CardDescription>Values extracted from the URL. A warning means the value is in a range commonly seen in phishing links.</CardDescription>
            </CardHeader>
            <CardContent className="px-0 pb-2">
              <Table>
                <TableHeader><TableRow className="hover:bg-transparent"><TableHead>Feature</TableHead><TableHead className="text-right">Value</TableHead><TableHead>Status</TableHead><TableHead className="hidden md:table-cell">What it means</TableHead></TableRow></TableHeader>
                <TableBody>
                  {FEATURE_INFO.map((info) => {
                    const on = info.flag(f);
                    const v = f[info.key];
                    return (
                      <TableRow key={info.key}>
                        <TableCell className="font-medium">{info.label}</TableCell>
                        <TableCell className="text-right tabular-nums">{YES_NO_KEYS.includes(info.key) ? (v ? "Yes" : "No") : v}</TableCell>
                        <TableCell>
                          {on
                            ? <span className="inline-flex items-center gap-1.5 text-warn"><TriangleAlert className="size-4" aria-hidden="true" />Warning</span>
                            : <span className="inline-flex items-center gap-1.5 text-safe"><CheckCircle2 className="size-4" aria-hidden="true" />Normal</span>}
                        </TableCell>
                        <TableCell className="hidden text-muted-foreground md:table-cell">{info.note}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      <Card>
        <CardHeader><CardTitle>Recently analyzed</CardTitle><CardDescription>Domains from your scan history</CardDescription></CardHeader>
        <CardContent className="px-0 pb-2">
          {domains.length === 0 ? (
            <EmptyState icon={Globe} title="Nothing analyzed yet">Analyze a URL above to start the list.</EmptyState>
          ) : (
            <Table>
              <TableHeader><TableRow className="hover:bg-transparent"><TableHead>Domain</TableHead><TableHead>Latest verdict</TableHead><TableHead className="text-right">Scans</TableHead><TableHead className="text-right">Last scanned</TableHead></TableRow></TableHeader>
              <TableBody>
                {domains.map((d) => (
                  <TableRow key={d.domain}>
                    <TableCell className="break-all font-mono text-xs">{d.domain}</TableCell>
                    <TableCell><VerdictBadge verdict={d.verdict} /></TableCell>
                    <TableCell className="text-right tabular-nums">{d.scans}</TableCell>
                    <TableCell className="whitespace-nowrap text-right text-muted-foreground">{timeAgo(d.last)}</TableCell>
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
