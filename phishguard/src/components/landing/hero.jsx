import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeroVisual } from "./hero-visual";

export function Hero() {
  return (
    <section className="relative z-10 mx-auto grid w-full max-w-[1280px] items-center gap-14 px-5 pb-16 pt-6 sm:px-8 lg:grid-cols-[1.08fr_1fr] lg:gap-10 lg:pb-24 lg:pt-10">
      <div className="animate-fade-up">
        <h1 className="text-[2.75rem] font-bold leading-[1.04] tracking-tight text-white sm:text-6xl lg:text-[4.25rem] xl:text-[5.25rem]">
          Your First Line of{" "}
          <span className="text-cyan">Defense</span> Against{" "}
          <span className="relative inline-block text-cyan">
            Phishing.
            <svg aria-hidden="true" viewBox="0 0 300 14" preserveAspectRatio="none" className="absolute -bottom-1 left-0 h-3 w-full text-cyan sm:-bottom-2">
              <path d="M2 9 C 60 2, 150 2, 298 8" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
            </svg>
          </span>
        </h1>

        <p className="mt-8 max-w-xl text-base leading-relaxed text-white/70 sm:text-lg">
          Detect malicious URLs. Uncover hidden threats. Browse with confidence.
        </p>

        <div className="mt-10">
          <Button asChild size="lg" className="group h-14 rounded-full px-8 text-base font-semibold shadow-[0_0_40px_-8px_rgba(0,209,255,0.6)] transition-shadow hover:shadow-[0_0_50px_-4px_rgba(0,209,255,0.75)]">
            <Link to="/ensemble">
              Start Scanning
              <ArrowRight className="!size-5 transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </div>

      <div className="animate-fade-up [animation-delay:150ms]">
        <HeroVisual />
      </div>
    </section>
  );
}
