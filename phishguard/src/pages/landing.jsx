import { LandingNav } from "@/components/landing/landing-nav";
import { Hero } from "@/components/landing/hero";

/** Public landing page (route "/"). Sits outside AppLayout so the dashboard sidebar is not shown. */
export default function Landing() {
  return (
    <div className="relative min-h-full overflow-x-hidden bg-navy">
      {/* Background image (public/c.png) with a light navy overlay for text legibility */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: "url(/c.png)" }} />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-navy/30" />
      {/* Soft cyan glow, kept subtle */}
      <div aria-hidden="true" className="pointer-events-none absolute -right-40 -top-40 size-[640px] rounded-full bg-cyan/10 blur-[120px]" />
      <LandingNav />
      <main id="main">
        <Hero />
      </main>
    </div>
  );
}
