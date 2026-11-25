import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

/** Big status message used by the 404 and unauthorized pages (and inline "not found" states). */
export function ErrorPanel({ icon: Icon, code, title, children, actions }) {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center py-12 text-center text-white">
      <span className="grid size-16 place-items-center rounded-2xl bg-white text-navy"><Icon className="size-8" aria-hidden="true" /></span>
      {code && <p className="mt-6 text-sm font-semibold tracking-widest text-cyan">{code}</p>}
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-3 text-white/70">{children}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        {actions ?? <Button asChild><Link to="/dashboard">Go to Dashboard</Link></Button>}
      </div>
    </div>
  );
}
