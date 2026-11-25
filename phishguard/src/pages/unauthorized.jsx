import { Link } from "react-router-dom";
import { LifeBuoy, ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorPanel } from "@/components/error-panel";

/** 403 page: shown when the backend refuses a request for this account. */
export default function Unauthorized() {
  return (
    <ErrorPanel icon={ShieldX} code="403" title="Access denied"
      actions={<>
        <Button asChild><Link to="/dashboard">Go to Dashboard</Link></Button>
        <Button asChild variant="outline"><Link to="/help"><LifeBuoy />Contact support</Link></Button>
      </>}>
      You do not have permission to view this page or record. If you think this is a mistake, contact support.
    </ErrorPanel>
  );
}
