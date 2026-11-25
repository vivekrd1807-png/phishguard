import { cn } from "@/lib/utils";
import { VERDICT_META } from "@/lib/verdict";
import { ShieldAlert, ShieldCheck, TriangleAlert } from "lucide-react";

const ICONS = { safe: ShieldCheck, suspicious: TriangleAlert, phishing: ShieldAlert };

/** Safe / Suspicious / Phishing indicator – always icon + text, never colour alone. */
export function VerdictBadge({ verdict, className }) {
  const meta = VERDICT_META[verdict];
  if (!meta) return null;
  const Icon = ICONS[verdict];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-semibold", meta.soft, className)}>
      <Icon className="size-3.5" aria-hidden="true" />
      {meta.label}
    </span>
  );
}

export function Badge({ className, ...props }) {
  return (
    <span className={cn("inline-flex items-center rounded-md border border-border bg-secondary px-2 py-0.5 text-xs font-medium text-navy", className)} {...props} />
  );
}
