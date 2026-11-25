import { LogoLightbox } from "@/components/logo-lightbox";
import { Check, Link2, ScanSearch, ShieldAlert } from "lucide-react";

/** Neural-network style nodes drawn around the shield (decorative). viewBox 0 0 400 400 */
const NODES = [
  [60, 90], [120, 50], [290, 55], [345, 120], [350, 260], [300, 340], [110, 345], [50, 250], [70, 170],
];

function DetectionScene() {
  return (
    <svg viewBox="0 0 400 400" className="absolute inset-0 size-full" aria-hidden="true" preserveAspectRatio="xMidYMid slice">
      <defs>
        <radialGradient id="pg-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#00D1FF" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#00D1FF" stopOpacity="0" />
        </radialGradient>
        <pattern id="pg-grid" width="28" height="28" patternUnits="userSpaceOnUse">
          <path d="M28 0H0V28" fill="none" stroke="#fff" strokeOpacity="0.06" />
        </pattern>
      </defs>
      <rect width="400" height="400" fill="url(#pg-grid)" />
      <circle cx="200" cy="200" r="190" fill="url(#pg-glow)" />
      {[70, 120, 170].map((r, i) => (
        <circle key={r} cx="200" cy="200" r={r} fill="none" stroke="#00D1FF" strokeOpacity={0.35 - i * 0.09} strokeDasharray={i === 1 ? "3 7" : undefined} />
      ))}
      {NODES.map(([x, y], i) => (
        <g key={i}>
          <line x1={x} y1={y} x2="200" y2="200" stroke="#00D1FF" strokeOpacity="0.22" />
          <circle cx={x} cy={y} r="4" fill="#0F1B3D" stroke="#00D1FF" strokeWidth="1.5" className="animate-node-pulse" style={{ animationDelay: `${i * 0.35}s`, transformOrigin: `${x}px ${y}px` }} />
        </g>
      ))}
    </svg>
  );
}

function FloatCard({ className = "", delay = "0s", children, ...rest }) {
  return (
    <div
      className={`absolute rounded-2xl bg-white p-4 text-navy shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)] ring-1 ring-navy/5 animate-float ${className}`}
      style={{ animationDelay: delay }}
      {...rest}
    >
      {children}
    </div>
  );
}

const STEPS = [
  { label: "Parsed URL structure", time: "12 ms" },
  { label: "Checked lookalike domain", time: "31 ms" },
  { label: "Scored with ML ensemble", time: "48 ms" },
];

export function HeroVisual() {
  return (
    <div className="relative mx-auto w-full max-w-[540px] pb-8 pr-5 lg:max-w-none lg:pr-6">
      {/* Offset plate behind the panel, echoing the reference's layered block */}
      <div aria-hidden="true" className="absolute inset-0 left-5 top-5 rounded-[2rem] border border-cyan/70 bg-cyan/10" />

      {/* Main scene */}
      <div
        role="img"
        aria-label="Illustration: a PhishGuard shield scanning a suspicious URL with AI"
        className="relative aspect-[4/4.6] overflow-hidden rounded-[2rem] bg-gradient-to-br from-navy-700 via-navy-800 to-navy ring-1 ring-white/10 shadow-[0_30px_80px_-20px_rgba(0,209,255,0.25)]"
      >
        <DetectionScene />

        {/* Scan beam */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-24 animate-scan bg-gradient-to-b from-transparent via-cyan/20 to-transparent">
          <div className="absolute inset-x-0 bottom-0 h-px bg-cyan/70" />
        </div>

        {/* Pill chip, like the reference's location tag */}
        <div className="absolute left-5 top-5 flex items-center gap-2 rounded-full border border-white/15 bg-navy/70 px-3 py-1.5 text-xs font-medium text-white/90 backdrop-blur">
          <ScanSearch className="size-3.5 text-cyan" aria-hidden="true" /> AI-powered detection
        </div>

        {/* Shield */}
        <div className="absolute left-1/2 top-[46%] -translate-x-1/2 -translate-y-1/2">
          <div className="relative grid size-28 place-items-center rounded-[1.75rem] bg-white shadow-[0_0_60px_rgba(0,209,255,0.45)] sm:size-36">
            <span aria-hidden="true" className="absolute inset-0 animate-ping rounded-[1.75rem] ring-2 ring-cyan/40 [animation-duration:3s]" />
            <LogoLightbox buttonClassName="relative grid h-full w-full place-items-center rounded-[1.75rem] hover:scale-100">
              <img src="/logo.svg" alt="PhishGuard logo" width={356} height={383} className="h-[72%] w-auto object-contain" draggable={false} />
            </LogoLightbox>
          </div>
        </div>

        {/* Address bar being scanned */}
        <div className="absolute inset-x-5 bottom-[26%] sm:bottom-[24%]">
          <div className="flex items-center gap-2 rounded-xl border border-cyan/40 bg-navy/80 px-3 py-2.5 font-mono text-[11px] text-white/90 backdrop-blur sm:text-xs">
            <Link2 className="size-3.5 shrink-0 text-cyan" aria-hidden="true" />
            <span className="truncate"><span className="text-cyan">paypa1</span>-secure-login.com/verify</span>
          </div>
        </div>
      </div>

      {/* Floating card, top right: ensemble votes */}
      <FloatCard className="-right-1 top-10 w-[44%] max-w-[210px] sm:-right-3 sm:top-14" delay="0s">
        <p className="text-[10px] font-medium uppercase tracking-wider text-navy/50">Sample result</p>
        <p className="mt-1 text-3xl font-bold leading-none tracking-tight sm:text-4xl">
          97<span className="text-base font-medium text-navy/50 sm:text-lg">% phishing</span>
        </p>
        <div className="mt-3 flex h-8 items-end gap-1.5" aria-hidden="true">
          {[40, 55, 48, 70, 84, 100].map((h, i) => (
            <span key={i} style={{ height: `${h}%` }} className={`flex-1 rounded-sm ${i === 5 ? "bg-navy" : "bg-navy/15"}`} />
          ))}
        </div>
      </FloatCard>

      {/* Floating card, bottom left: live analysis */}
      <FloatCard className="-left-2 bottom-0 w-[78%] max-w-[330px] sm:-left-8 sm:bottom-2" delay="1.2s">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">Live analysis</p>
          <span className="text-[10px] text-navy/50">Just now</span>
        </div>
        <ul className="mt-2.5 divide-y divide-navy/10">
          {STEPS.map((s) => (
            <li key={s.label} className="flex items-center gap-2.5 py-2 text-xs">
              <span className="grid size-5 shrink-0 place-items-center rounded-full bg-navy text-cyan">
                <Check className="size-3" strokeWidth={3} aria-hidden="true" />
              </span>
              <span className="flex-1">{s.label}</span>
              <span className="tabular-nums text-navy/40">{s.time}</span>
            </li>
          ))}
          <li className="flex items-center gap-2.5 pt-2.5 text-xs font-semibold">
            <span className="grid size-5 shrink-0 place-items-center rounded-full bg-cyan text-navy">
              <ShieldAlert className="size-3" aria-hidden="true" />
            </span>
            <span className="flex-1">Phishing detected</span>
            <span className="rounded-full bg-navy px-2 py-0.5 text-[10px] font-semibold text-cyan">Blocked</span>
          </li>
        </ul>
      </FloatCard>
    </div>
  );
}
