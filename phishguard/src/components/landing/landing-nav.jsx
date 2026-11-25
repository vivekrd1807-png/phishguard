import { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/auth-context";

const LINKS = [
  { to: "/dashboard", label: "Product" },
  { to: "/explainability", label: "About" },
];
const [PRODUCT, ABOUT] = LINKS;

const linkClass =
  "rounded-md px-3 py-2 text-sm font-medium text-white/70 transition-colors hover:text-cyan";

/** Minimal landing navigation: logo, Product, About, Login. */
export function LandingNav() {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const cta = user ? { to: "/dashboard", label: "Dashboard" } : { to: "/login", label: "Login" };
  return (
    <header className="relative z-20">
      <nav aria-label="Primary" className="mx-auto flex h-20 w-full max-w-[1280px] items-center justify-between px-5 sm:px-8">
        <div className="hidden md:block">
          <Link to={PRODUCT.to} className={linkClass}>{PRODUCT.label}</Link>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Link to={ABOUT.to} className={`${linkClass} hidden md:inline-block`}>{ABOUT.label}</Link>
          {!user && <Link to="/register" className={`${linkClass} hidden md:inline-block`}>Sign up</Link>}
          <Button asChild size="lg" className="hidden h-10 rounded-full px-6 font-semibold md:inline-flex">
            <Link to={cta.to}>{cta.label}</Link>
          </Button>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="landing-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            className="grid size-10 place-items-center rounded-md text-white transition-colors hover:bg-white/10 md:hidden"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </nav>

      {open && (
        <div id="landing-menu" className="mx-5 rounded-2xl border border-white/10 bg-navy-800 p-3 shadow-xl animate-in fade-in slide-in-from-top-2 md:hidden">
          {LINKS.map((l) => (
            <Link key={l.label} to={l.to} onClick={() => setOpen(false)} className="block rounded-lg px-4 py-3 text-base font-medium text-white/85 hover:bg-white/10 hover:text-cyan">
              {l.label}
            </Link>
          ))}
          <Button asChild size="lg" className="mt-2 w-full rounded-full font-semibold">
            <Link to={cta.to} onClick={() => setOpen(false)}>{cta.label}</Link>
          </Button>
        </div>
      )}
    </header>
  );
}
