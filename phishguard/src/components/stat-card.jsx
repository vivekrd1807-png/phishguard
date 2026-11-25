import { Card } from "@/components/ui/card";

export function StatCard({ label, value, hint, icon: Icon }) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight">{value}</p>
        </div>
        <span className="grid size-10 shrink-0 place-items-center rounded-md bg-navy text-cyan">
          <Icon className="size-5" aria-hidden="true" />
        </span>
      </div>
      {hint && <p className="mt-3 text-xs text-muted-foreground">{hint}</p>}
    </Card>
  );
}
