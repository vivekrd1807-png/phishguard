import { useState } from "react";
import { Layers } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { VerdictBadge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { ScanForm } from "@/components/scan-form";
import { ScanResult } from "@/components/scan-result";
import { useScans } from "@/hooks/scan-context";
import { pct, timeAgo, truncate } from "@/lib/utils";

export default function EnsembleFeature() {
  const { ensembleScans } = useScans();
  const [result, setResult] = useState(null);
  return (
    <div className="space-y-6">
      <PageHeader title="Ensemble Feature" description="Check a URL with the combined ensemble detector, which weighs several signals into one more reliable verdict." />
      <Card className="p-5 sm:p-6"><ScanForm mode="ensemble" onResult={setResult} /></Card>
      {result && <ScanResult scan={result} />}

      <Card>
        <CardHeader><CardTitle>Recent ensemble scans</CardTitle><CardDescription>URLs checked with the Ensemble Feature</CardDescription></CardHeader>
        <CardContent className="px-0 pb-2">
          {ensembleScans.length === 0 ? (
            <EmptyState icon={Layers} title="No ensemble scans yet">Scan a URL above and the result will be listed here.</EmptyState>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>URL</TableHead><TableHead>Verdict</TableHead><TableHead className="text-right">Confidence</TableHead><TableHead className="text-right">When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ensembleScans.slice(0, 8).map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="max-w-[260px] font-mono text-xs" title={s.url}>{truncate(s.url, 60)}</TableCell>
                    <TableCell><VerdictBadge verdict={s.verdict} /></TableCell>
                    <TableCell className="text-right tabular-nums">{s.source === "trusted_list" ? "n/a" : pct(s.confidence)}</TableCell>
                    <TableCell className="whitespace-nowrap text-right text-muted-foreground">{timeAgo(s.ts)}</TableCell>
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
