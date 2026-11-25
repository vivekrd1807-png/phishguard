import { cn } from "@/lib/utils";

export function Progress({ value = 0, className, barClassName, label }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div role="progressbar" aria-valuenow={Math.round(v)} aria-valuemin={0} aria-valuemax={100} aria-label={label}
      className={cn("h-2 w-full overflow-hidden rounded-full bg-secondary", className)}>
      <div className={cn("h-full rounded-full bg-cyan transition-[width] duration-300", barClassName)} style={{ width: `${v}%` }} />
    </div>
  );
}
