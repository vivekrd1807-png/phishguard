import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RTooltip } from "recharts";
import { PieChart as PieIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { VERDICT_META } from "@/lib/verdict";

const ORDER = ["safe", "suspicious", "phishing"];

export function DistributionChart({ stats }) {
  const data = ORDER.map((k) => ({ key: k, name: VERDICT_META[k].label, value: stats[k], color: VERDICT_META[k].color }));
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Threat distribution</CardTitle>
        <CardDescription>Share of scanned URLs by verdict</CardDescription>
      </CardHeader>
      <CardContent>
        {stats.total === 0 ? (
          <EmptyState icon={PieIcon} title="Nothing to chart yet">The distribution appears after your first scan.</EmptyState>
        ) : (
          <>
            <div className="relative h-48" role="img" aria-label={`Safe ${stats.safe}, Suspicious ${stats.suspicious}, Phishing ${stats.phishing}`}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data} dataKey="value" innerRadius={56} outerRadius={80} paddingAngle={2} stroke="#fff" strokeWidth={2} isAnimationActive={false}>
                    {data.map((d) => <Cell key={d.key} fill={d.color} />)}
                  </Pie>
                  <RTooltip formatter={(v, n) => [`${v} URLs`, n]} contentStyle={{ borderRadius: 6, border: "1px solid #DDE1EA", fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 grid place-items-center">
                <div className="text-center">
                  <p className="text-2xl font-semibold tabular-nums">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">scans</p>
                </div>
              </div>
            </div>
            <ul className="mt-2 space-y-2">
              {data.map((d) => (
                <li key={d.key} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2"><span className="size-2.5 rounded-sm" style={{ background: d.color }} aria-hidden="true" />{d.name}</span>
                  <span className="tabular-nums text-muted-foreground">{d.value} ({Math.round((d.value / stats.total) * 100)}%)</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}
