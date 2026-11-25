import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/** PhishGuard logo (public/logo.svg). Click it to view the logo maximized; click outside, the X, or press Esc to close. */
/** Default trigger is the logo image; pass children (and buttonClassName) to use your own trigger content. */
export function LogoLightbox({ className, buttonClassName, children }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="View PhishGuard logo larger"
        className={cn("shrink-0 cursor-zoom-in rounded-md transition-transform duration-200 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan", buttonClassName)}
      >
        {children ?? <img src="/logo.svg" alt="PhishGuard logo" width={356} height={383} className={cn("h-14 w-auto", className)} draggable={false} />}
      </button>

      {open &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label="PhishGuard logo"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[100] grid cursor-zoom-out place-items-center bg-black/80 p-6 backdrop-blur-sm animate-in fade-in"
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="absolute right-4 top-4 grid size-10 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
            <img src="/logo.svg" alt="PhishGuard logo" className="max-h-[85vh] max-w-[90vw] object-contain" draggable={false} />
          </div>,
          document.body
        )}
    </>
  );
}
