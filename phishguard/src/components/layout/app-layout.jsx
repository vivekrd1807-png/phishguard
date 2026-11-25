import { useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/hooks/use-sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

export function AppLayout() {
  const { collapsed } = useSidebar();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // The API answers 403 when a request is not allowed for this account: show the Unauthorized page.
  useEffect(() => {
    const onForbidden = () => navigate("/unauthorized", { replace: true });
    window.addEventListener("phishguard:forbidden", onForbidden);
    return () => window.removeEventListener("phishguard:forbidden", onForbidden);
  }, [navigate]);

  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);

  return (
    <TooltipProvider delayDuration={100}>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[70] focus:rounded-md focus:bg-cyan focus:px-3 focus:py-2 focus:text-navy">
        Skip to content
      </a>
      <Sidebar />
      <div className={cn("flex min-h-full flex-col transition-[padding] duration-250 ease-in-out", collapsed ? "lg:pl-[72px]" : "lg:pl-64")}>
        <Topbar />
        <main id="main" className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>
    </TooltipProvider>
  );
}
