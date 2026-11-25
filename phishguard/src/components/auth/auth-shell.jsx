import { Link } from "react-router-dom";
import { Brand } from "@/components/layout/brand";
import { Card } from "@/components/ui/card";

/** Centered white card on the navy background, shared by login, register and password-reset pages. */
export function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="relative flex min-h-full flex-col items-center justify-center overflow-hidden bg-navy px-4 py-10">
      <div aria-hidden="true" className="pointer-events-none absolute -right-40 -top-40 size-[560px] rounded-full bg-cyan/10 blur-[120px]" />
      <div className="relative w-full max-w-md">
        <div className="mb-6 flex justify-center"><Brand to="/" label="PhishGuard – home" /></div>
        <Card className="p-6 sm:p-8">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </Card>
        {footer && <p className="mt-5 text-center text-sm text-white/70">{footer}</p>}
        <p className="mt-6 text-center text-xs text-white/40"><Link to="/" className="hover:text-cyan">← Back to home</Link></p>
      </div>
    </div>
  );
}

export function Field({ id, label, error, hint, children }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium">{label}</label>
      {children}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && <p id={`${id}-error`} role="alert" className="text-xs text-danger">{error}</p>}
    </div>
  );
}

export function FormError({ children }) {
  if (!children) return null;
  return <p role="alert" className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{children}</p>;
}
export function FormSuccess({ children }) {
  if (!children) return null;
  return <p role="status" className="rounded-md border border-safe/30 bg-safe/10 px-3 py-2 text-sm text-safe">{children}</p>;
}
