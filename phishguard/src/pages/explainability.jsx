import { useState } from "react";
import { BookOpen, CheckCircle2, Info, ScanSearch, ShieldAlert, ShieldCheck, TriangleAlert } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { ScanForm } from "@/components/scan-form";
import { useScans } from "@/hooks/scan-context";
import { api } from "@/lib/api";
import { VERDICT_META } from "@/lib/verdict";
import { ATTACK_TECHNIQUES, PHISHING_TYPES } from "@/lib/phishing-knowledge";
import { analyzeUrl, explainVerdict, EDUCATION } from "@/lib/url-analysis";
import { pct } from "@/lib/utils";

const VERDICT_ICON = { safe: ShieldCheck, suspicious: TriangleAlert, phishing: ShieldAlert };
const SEVERITY = {
  high: { label: "High strength", cls: "bg-danger/10 text-danger border-danger/30" },
  medium: { label: "Medium strength", cls: "bg-warn/10 text-warn border-warn/30" },
  low: { label: "Low strength", cls: "bg-secondary text-navy border-border" },
};

function BulletList({ items }) {
  return (
    <ul className="space-y-2">
      {items.map((t) => (
        <li key={t} className="flex items-start gap-2.5 text-sm">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-cyan-dark" aria-hidden="true" />
          <span>{t}</span>
        </li>
      ))}
    </ul>
  );
}

/** Results of one scan: findings from the URL itself first, then general education, kept visibly apart. */
function UrlAnalysis({ scan, analysis }) {
  const { metrics } = useScans();
  const lr = metrics?.scores?.["Logistic Regression"];
  const meta = VERDICT_META[scan.verdict];
  const Icon = VERDICT_ICON[scan.verdict];
  const { findings, clear, registered } = analysis;

  // One education entry per distinct technique, in order of the findings that raised it.
  const eduKeys = [...new Set(findings.map((f) => f.edu))];

  return (
    <>
      <Card aria-label="Findings for this URL">
        <div className="flex flex-wrap items-start gap-4 border-b border-border p-5">
          <span className="grid size-12 shrink-0 place-items-center rounded-md text-white" style={{ background: meta.color }}>
            <Icon className="size-6" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="mb-1 inline-flex items-center gap-1.5 rounded-md bg-cyan/15 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-cyan-dark">
              <ScanSearch className="size-3.5" aria-hidden="true" />Findings for this URL
            </p>
            <h3 className={`text-lg font-semibold ${meta.text}`}>{meta.label}{scan.confidence != null && <span className="ml-2 text-sm font-medium text-muted-foreground tabular-nums">{pct(scan.confidence)} confidence</span>}</h3>
            <p className="mt-1 break-all font-mono text-xs">{scan.url}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Logistic Regression, the same model as the Dashboard{lr ? ` (${pct(lr.accuracy)} test accuracy)` : ""}. Registered domain: <span className="font-mono">{registered}</span>
            </p>
          </div>
        </div>

        <CardContent className="space-y-6 pt-5">
          <div>
            <p className="mb-1 text-sm font-semibold">Why this URL was classified {meta.label}</p>
            <p className="text-sm text-muted-foreground">{explainVerdict(scan, findings)}</p>
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold">Indicators detected in this URL ({findings.length})</p>
            {findings.length === 0 ? (
              <p className="rounded-md bg-secondary p-3 text-sm text-muted-foreground">No suspicious URL patterns were detected in this address.</p>
            ) : (
              <ul className="divide-y divide-border rounded-md border border-border">
                {findings.map((f) => (
                  <li key={f.id} className="space-y-2 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold">{f.title}</span>
                      <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${SEVERITY[f.severity].cls}`}>{SEVERITY[f.severity].label}</span>
                    </div>
                    <ul className="space-y-1">
                      {f.evidence.map((e) => <li key={e} className="break-all font-mono text-xs"><span className="text-muted-foreground">Found: </span>{e}</li>)}
                    </ul>
                    <p className="text-sm"><span className="font-medium">How it contributes: </span><span className="text-muted-foreground">{f.why}</span></p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {clear.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-semibold">Checked and not found</p>
              <ul className="flex flex-wrap gap-2">
                {clear.map((c) => (
                  <li key={c} className="inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary px-2 py-1 text-xs">
                    <CheckCircle2 className="size-3.5 text-safe" aria-hidden="true" />{c}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="flex items-start gap-2 rounded-md bg-secondary p-3 text-xs text-muted-foreground">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>Indicators are read directly from the URL text. The model scores the words in the URL and does not expose per-indicator weights, so the strength label shows how strongly each pattern is usually tied to phishing, not an exact model weight.</span>
          </p>
        </CardContent>
      </Card>

      {eduKeys.length > 0 && (
        <Card aria-label="About the techniques found">
          <CardHeader>
            <p className="mb-1 inline-flex w-fit items-center gap-1.5 rounded-md bg-secondary px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-navy">
              <BookOpen className="size-3.5" aria-hidden="true" />General information
            </p>
            <CardTitle>About the techniques found in this URL</CardTitle>
            <CardDescription>Background on the techniques identified above. This section explains the techniques in general and is not a finding about your URL.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 lg:grid-cols-2">
            {eduKeys.map((key) => {
              const e = EDUCATION[key];
              const type = PHISHING_TYPES.find((t) => t.id === e.typeId);
              const tech = ATTACK_TECHNIQUES.find((t) => t.name === e.technique);
              const example = tech?.example ?? e.example;
              return (
                <div key={key} className="space-y-3 rounded-md border border-border p-4 text-sm">
                  <p className="font-semibold">{type?.name ?? tech?.name}</p>
                  {type && <p className="text-muted-foreground">{type.overview}</p>}
                  {tech && <p><span className="font-medium">{tech.name}: </span><span className="text-muted-foreground">{tech.how}</span></p>}
                  {example && <p><span className="font-medium">Illustrative example: </span><span className="break-all font-mono text-xs">{example}</span></p>}
                  {type && <p><span className="font-medium">Attacker's goal: </span><span className="text-muted-foreground">{type.goal}</span></p>}
                  <div>
                    <p className="mb-1.5 font-medium">How to protect yourself</p>
                    <ul className="space-y-1.5">
                      {e.tips.map((t) => (
                        <li key={t} className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-cyan-dark" aria-hidden="true" /><span>{t}</span></li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </>
  );
}

export default function Explainability() {
  const [result, setResult] = useState(null);

  // Same endpoint and verdict rules as the Dashboard (Logistic Regression), so both pages always agree.
  // The scan is not added to the Dashboard's history or statistics.
  async function scanUrl(url) {
    const clean = url.trim();
    const res = await api.predict(clean, false); // save=false: not stored in history
    return res.scan;
  }

  return (
    <div className="space-y-6">
      <PageHeader title="AI Explainability" description="The main types of phishing attack, the techniques behind them, and the characteristics that give them away." />

      <Card className="p-5 sm:p-6"><ScanForm mode="single" onScan={scanUrl} onResult={setResult} /></Card>
      {result && <UrlAnalysis scan={result} analysis={analyzeUrl(result.url, result.features)} />}

      <h3 className="pt-2 text-lg font-semibold text-white">General reference</h3>
      <p className="-mt-4 text-sm text-white/65">Background on phishing in general. Nothing in this part is specific to the URL you scanned.</p>

      <section aria-label="Phishing types" className="grid gap-6 lg:grid-cols-2">
        {PHISHING_TYPES.map((t) => (
          <Card key={t.id}>
            <CardHeader><CardTitle>{t.name}</CardTitle><CardDescription>{t.overview}</CardDescription></CardHeader>
            <CardContent className="space-y-5">
              <div>
                <p className="mb-2 text-sm font-semibold">Attack techniques</p>
                <BulletList items={t.techniques} />
              </div>
              <div>
                <p className="mb-2 text-sm font-semibold">Characteristics</p>
                <BulletList items={t.characteristics} />
              </div>
              <div className="rounded-md bg-secondary p-3 text-sm">
                <p className="font-medium">Attacker's goal</p>
                <p className="mt-0.5 text-muted-foreground">{t.goal}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      <Card>
        <CardHeader><CardTitle>Common URL attack techniques</CardTitle><CardDescription>Tricks used to make a malicious link look legitimate</CardDescription></CardHeader>
        <CardContent className="px-0 pb-2">
          <Table>
            <TableHeader><TableRow className="hover:bg-transparent"><TableHead>Technique</TableHead><TableHead>How it works</TableHead><TableHead className="hidden md:table-cell">Example</TableHead></TableRow></TableHeader>
            <TableBody>
              {ATTACK_TECHNIQUES.map((t) => (
                <TableRow key={t.name}>
                  <TableCell className="whitespace-nowrap font-medium">{t.name}</TableCell>
                  <TableCell className="text-muted-foreground">{t.how}</TableCell>
                  <TableCell className="hidden break-all font-mono text-xs md:table-cell">{t.example}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
