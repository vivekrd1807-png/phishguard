import { BarChart3, CheckCircle2, ShieldAlert, ShieldCheck, TriangleAlert } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useScans } from "@/hooks/scan-context";
import { VERDICT_META } from "@/lib/verdict";
import { formatDateTime, pct } from "@/lib/utils";

const ICON = { safe: ShieldCheck, suspicious: TriangleAlert, phishing: ShieldAlert };
const SUMMARY = {
  safe: "No phishing indicators were found by the model.",
  suspicious: "The detector is not confident. Treat this link with caution.",
  phishing: "This URL matches phishing patterns. Do not enter credentials.",
};

const ENSEMBLE_SUMMARY = {
  safe: "No phishing indicators were found by the ensemble model.",
  suspicious: "The ensemble models do not agree. Treat this link with caution.",
  phishing: "This URL matches phishing patterns. Do not enter credentials.",
};
const BAR = { phishing: "bg-danger", suspicious: "bg-warn", safe: "bg-safe" };

/** Full-width result for the Ensemble Feature: verdict, ensemble confidence, vote and the per-model table. */
function EnsembleResult({ scan }) {
  const { metrics } = useScans();
  const meta = VERDICT_META[scan.verdict];
  const Icon = ICON[scan.verdict];
  const trusted = scan.source === "trusted_list";
  const models = scan.models ?? [];
  const unanimous = !trusted && scan.agreement === "3/3";

  return (
    <Card>
      <div className="flex flex-wrap items-start gap-4 border-b border-border p-5">
        <span className="grid size-12 shrink-0 place-items-center rounded-md text-white" style={{ background: meta.color }}>
          <Icon className="size-6" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className={`text-lg font-semibold ${meta.text}`}>{meta.label}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{ENSEMBLE_SUMMARY[scan.verdict]}</p>
          <p className="mt-2 break-all font-mono text-xs">{scan.url}</p>
        </div>
        <p className="text-xs text-muted-foreground">{formatDateTime(scan.ts)}</p>
      </div>

      <CardContent className="space-y-6 pt-5">
        <div>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="text-base font-semibold sm:text-lg">Ensemble ({models.length || 3} Models)</span>
              {unanimous && (
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-safe">
                  <CheckCircle2 className="size-4" aria-hidden="true" />3/3 models agree
                </span>
              )}
            </div>
            <span className="text-base font-semibold tabular-nums sm:text-lg">{trusted ? "n/a" : pct(scan.confidence)}</span>
          </div>
          <Progress value={trusted ? 0 : (scan.confidence ?? 0) * 100} label="Ensemble confidence" className="h-2.5" barClassName={BAR[scan.verdict]} />
        </div>

        <dl className="grid gap-4 text-sm sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-border">
          <div className="sm:pr-6"><dt className="text-muted-foreground">Detection mode</dt><dd className="font-medium">Ensemble (Majority Vote)</dd></div>
          <div className="sm:px-6"><dt className="text-muted-foreground">Models used</dt><dd className="font-medium">{(models.length ? models.map((m) => m.name) : ["Logistic Regression", "Random Forest", "XGBoost"]).join(", ")}</dd></div>
          <div className="sm:pl-6">
            <dt className="text-muted-foreground">Ensemble vote</dt>
            <dd className="font-medium">{trusted || !scan.agreement ? "n/a" : `${scan.agreement} (${unanimous ? "Unanimous" : "Split decision"})`}</dd>
          </div>
        </dl>
        {trusted && (
          <p className="text-sm"><span className="text-muted-foreground">Source: </span><span className="font-medium">Trusted domain list (well-known site). The models' own votes are shown below for transparency.</span></p>
        )}

        {models.length > 0 && (
          <div className="overflow-hidden rounded-lg border border-border">
            <div className="flex items-center gap-2 px-4 py-3">
              <BarChart3 className="size-4 text-cyan-dark" aria-hidden="true" />
              <h4 className="text-base font-semibold">Model Results</h4>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="bg-cyan/10 hover:bg-cyan/10">
                  {["Model", "Verdict", "Confidence", "Test Accuracy", "Test F1"].map((h) => (
                    <TableHead key={h} className="uppercase tracking-wide text-cyan-dark">{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {models.map((m) => {
                  const phishing = m.prediction === "phishing";
                  const VIcon = phishing ? ShieldAlert : ShieldCheck;
                  const score = metrics?.scores?.[m.name];
                  return (
                    <TableRow key={m.name}>
                      <TableCell className="whitespace-nowrap font-semibold">{m.name}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold text-white ${phishing ? "bg-danger" : "bg-safe"}`}>
                          <VIcon className="size-3.5" aria-hidden="true" />
                          {phishing ? "Phishing" : "Legitimate"}
                        </span>
                      </TableCell>
                      <TableCell className="tabular-nums">{pct(m.confidence)}</TableCell>
                      <TableCell className="tabular-nums">{pct(score?.accuracy)}</TableCell>
                      <TableCell className="tabular-nums">{pct(score?.f1)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function ScanResult({ scan, compact = false }) {
  if (!compact) return <EnsembleResult scan={scan} />;
  const meta = VERDICT_META[scan.verdict];
  const Icon = ICON[scan.verdict];
  const trusted = scan.source === "trusted_list";

  return (
    <Card>
      <div className="flex flex-wrap items-start gap-4 border-b border-border p-5">
        <span className="grid size-12 shrink-0 place-items-center rounded-md text-white" style={{ background: meta.color }}>
          <Icon className="size-6" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className={`text-lg font-semibold ${meta.text}`}>{meta.label}</h3>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{SUMMARY[scan.verdict]}</p>
          <p className="mt-2 break-all font-mono text-xs">{scan.url}</p>
        </div>
        <p className="text-xs text-muted-foreground">{formatDateTime(scan.ts)}</p>
      </div>

      <CardContent className="grid gap-6 pt-5">
        <div className="space-y-4">
          <div>
            <div className="mb-1.5 flex justify-between text-sm">
              <span className="font-medium">Model confidence</span>
              <span className="tabular-nums">{trusted ? "n/a" : pct(scan.confidence)}</span>
            </div>
            <Progress value={(scan.confidence ?? 0) * 100} label="Model confidence" barClassName={scan.verdict === "phishing" ? "bg-danger" : scan.verdict === "suspicious" ? "bg-warn" : "bg-safe"} />
          </div>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div><dt className="text-muted-foreground">Detection mode</dt><dd className="font-medium">{scan.mode === "ensemble" ? "Ensemble Feature" : "Logistic Regression"}</dd></div>
            <div><dt className="text-muted-foreground">Domain</dt><dd className="break-all font-mono text-xs font-medium">{scan.domain}</dd></div>
            {scan.mode === "ensemble" && scan.agreement && !trusted && <div><dt className="text-muted-foreground">Ensemble vote</dt><dd className="font-medium">{scan.agreement === "3/3" ? "Unanimous" : "Split decision"}</dd></div>}
            {trusted && <div className="col-span-2"><dt className="text-muted-foreground">Source</dt><dd className="font-medium">Trusted domain list (well-known site, ML vote skipped)</dd></div>}
          </dl>
        </div>

      </CardContent>
    </Card>
  );
}
