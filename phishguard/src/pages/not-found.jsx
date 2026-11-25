import { Link, useNavigate } from "react-router-dom";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorPanel } from "@/components/error-panel";
import { useAuth } from "@/hooks/auth-context";

/** 404 page. Standalone (no sidebar) so it also works for visitors who are not signed in. */
export default function NotFound() {
  const { user } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="grid min-h-full place-items-center bg-navy px-4">
      <ErrorPanel icon={Compass} code="404" title="Page not found"
        actions={<>
          <Button asChild><Link to={user ? "/dashboard" : "/"}>{user ? "Go to Dashboard" : "Go to home"}</Link></Button>
          <Button variant="outline" onClick={() => navigate(-1)}>Go back</Button>
        </>}>
        The page you are looking for does not exist or may have been moved.
      </ErrorPanel>
    </div>
  );
}
