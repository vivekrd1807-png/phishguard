import { useState } from "react";
import { Link2, Loader2, ScanSearch, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useScans } from "@/hooks/scan-context";

/** mode "single" = Logistic Regression (Dashboard); mode "ensemble" = Ensemble Feature. `onScan` optionally replaces the default scan (used by AI Explainability). */
export function ScanForm({ onResult, onScan, mode = "single", placeholder = "Enter a URL to scan, e.g. secure-login.example.com/verify" }) {
  const { runScan } = useScans();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    if (!url.trim()) { setError("Enter a URL to scan."); return; }
    setError("");
    setLoading(true);
    try {
      const rec = onScan ? await onScan(url) : await runScan(url, mode);
      onResult?.(rec);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate>
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Link2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={placeholder}
            aria-label="URL to scan"
            aria-invalid={!!error}
            autoComplete="off"
            spellCheck={false}
            className="h-11 pl-9 font-mono text-[13px]"
          />
        </div>
        <Button type="submit" size="lg" disabled={loading}>
          {loading ? <Loader2 className="animate-spin" /> : <ScanSearch />}
          {loading ? "Scanning…" : "Scan URL"}
        </Button>
      </div>
      {error && (
        <p role="alert" className="mt-3 flex items-start gap-2 text-sm text-danger">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
    </form>
  );
}
