import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from "recharts";
import { BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";

export function scansPerDay(scans, days = 7) {
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i);
    const start = d.getTime(), end = start + 86400000;
    const inDay = scans.filter((s) => s.ts >= start && s.ts < end);
    out.push({
      day: d.toLocaleDateString(undefined, { weekday: "short" }),
      scans: inDay.length,
      threats: inDay.filter((s) => s.verdict !== "safe").length,
    });
  }
  return out;
}

export function ActivityChart({ scans }) {
  const data = scansPerDay(scans);
  const any = data.some((d) => d.scans > 0);
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Scan activity</CardTitle>
        <CardDescription>URLs scanned in the last 7 days</CardDescription>
      </CardHeader>
      <CardContent>
        {!any ? (
          <EmptyState icon={BarChart3} title="No activity this week">Activity is recorded each time you scan a URL.</EmptyState>
        ) : (
          <div className="h-56" role="img" aria-label="Bar chart of URLs scanned per day over the last 7 days">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#E6E9F0" />
                <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#5B6785" }} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#5B6785" }} />
                <RTooltip cursor={{ fill: "#F0F2F7" }} contentStyle={{ borderRadius: 6, border: "1px solid #DDE1EA", fontSize: 12 }} />
                <Bar dataKey="scans" name="Scanned" fill="#00D1FF" radius={[3, 3, 0, 0]} isAnimationActive={false} />
                <Bar dataKey="threats" name="Flagged" fill="#0F1B3D" radius={[3, 3, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
