import { useState } from "react";
import { Activity, CheckCircle2, Link2, ShieldAlert } from "lucide-react";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/stat-card";
import { ScanForm } from "@/components/scan-form";
import { ScanResult } from "@/components/scan-result";
import { DistributionChart } from "@/components/distribution-chart";
import { ActivityChart } from "@/components/activity";
import { useScans } from "@/hooks/scan-context";
import { pct } from "@/lib/utils";

export default function Dashboard() {
  const { scans, stats, metrics } = useScans();
  const [latest, setLatest] = useState(null);
  // The dashboard scanner uses the single Logistic Regression model, so show that model's test accuracy.
  const lr = metrics?.scores?.["Logistic Regression"];

  return (
    <div className="space-y-6">
      <Card className="p-5 sm:p-6">
        <div className="mb-4 flex items-center gap-3">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">PhishGuard</h2>
            <p className="text-sm text-muted-foreground">Check any URL with the machine-learning phishing detector.</p>
          </div>
        </div>
        <ScanForm mode="single" onResult={setLatest} />
      </Card>

      {latest && <ScanResult scan={latest} compact />}

      <section aria-label="Statistics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total URLs scanned" value={stats.total} icon={Link2} hint="Saved to your account" />
        <StatCard label="Phishing detected" value={stats.phishing} icon={ShieldAlert} hint={`${stats.suspicious} more marked suspicious`} />
        <StatCard label="Safe URLs" value={stats.safe} icon={CheckCircle2} hint={stats.total ? `${Math.round((stats.safe / stats.total) * 100)}% of all scans` : "No scans yet"} />
        <StatCard label="Detection accuracy" value={lr ? pct(lr.accuracy) : "—"} icon={Activity}
          hint={lr ? `Logistic Regression, ${metrics.test_rows.toLocaleString()} held-out test URLs` : "Unavailable until the backend is running"} />
      </section>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2 [&>*]:h-full"><ActivityChart scans={scans} /></div>
        <DistributionChart stats={stats} />
      </div>
    </div>
  );
}
