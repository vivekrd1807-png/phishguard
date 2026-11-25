import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Loader2, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/auth-context";

function FullScreen({ children }) {
  return <div className="grid min-h-full place-items-center bg-navy px-6 text-center text-white">{children}</div>;
}

/** Wraps every signed-in page. Anonymous visitors are sent to /login and returned to the page they wanted. */
export function ProtectedRoute() {
  const { user, status } = useAuth();
  const location = useLocation();
  if (status === "loading") {
    return <FullScreen><Loader2 className="size-8 animate-spin text-cyan" aria-label="Loading" /></FullScreen>;
  }
  if (status === "offline") {
    return (
      <FullScreen>
        <div className="max-w-sm space-y-3">
          <WifiOff className="mx-auto size-10 text-cyan" aria-hidden="true" />
          <h1 className="text-xl font-semibold">Cannot reach the backend</h1>
          <p className="text-sm text-white/70">Start it with <code className="rounded bg-white/10 px-1.5 py-0.5">cd backend &amp;&amp; python app.py</code>, then reload.</p>
          <Button onClick={() => window.location.reload()}>Reload</Button>
        </div>
      </FullScreen>
    );
  }
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  return <Outlet />;
}

/** Login / register pages: signed-in users go straight to the dashboard instead. */
export function PublicOnlyRoute() {
  const { user, status } = useAuth();
  if (status === "loading") return <FullScreen><Loader2 className="size-8 animate-spin text-cyan" aria-label="Loading" /></FullScreen>;
  if (user) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}
