import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, FileSearch, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorPanel } from "@/components/error-panel";
import { PageHeader } from "@/components/page-header";
import { ScanResult } from "@/components/scan-result";
import { api } from "@/lib/api";

/** One saved scan, loaded from the database. The backend only returns scans that belong to the signed-in user. */
export default function ScanDetail() {
  const { id } = useParams();
  const [scan, setScan] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let live = true;
    setScan(null); setError(null);
    api.scan(id).then((d) => live && setScan(d.scan)).catch((e) => live && setError(e));
    return () => { live = false; };
  }, [id]);

  if (error) {
    return (
      <ErrorPanel icon={FileSearch} code={error.status === 404 ? "404" : "Error"} title={error.status === 404 ? "Scan not found" : "Could not load scan"}
        actions={<Button asChild><Link to="/history"><ArrowLeft />Back to Scan History</Link></Button>}>
        {error.status === 404 ? "This scan does not exist in your history. It may have been deleted." : error.message}
      </ErrorPanel>
    );
  }
  if (!scan) return <div className="grid place-items-center py-24"><Loader2 className="size-8 animate-spin text-cyan" aria-label="Loading scan" /></div>;
  return (
    <div className="space-y-6">
      <PageHeader title="Scan details" description={`${scan.mode === "ensemble" ? "Ensemble" : "Logistic Regression"} scan saved to your history.`}
        actions={<Button asChild variant="outline" size="sm" className="bg-white"><Link to="/history"><ArrowLeft />Scan History</Link></Button>} />
      <ScanResult scan={scan} compact={scan.mode !== "ensemble"} />
    </div>
  );
}
