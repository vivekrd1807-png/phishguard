import { useState } from "react";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { AuthShell, Field, FormError, FormSuccess } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(null);
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!email.trim()) { setError("Enter the email address of your account."); return; }
    setError("");
    setLoading(true);
    try {
      setDone(await api.forgotPassword(email.trim()));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title="Reset your password" subtitle="We'll send you a link to choose a new password."
      footer={<Link to="/login" className="font-medium text-cyan hover:underline">Back to sign in</Link>}>
      {done ? (
        <div className="space-y-4">
          <FormSuccess>{done.message}</FormSuccess>
          {done.dev_reset_link && (
            <div className="rounded-md border border-border bg-secondary p-3 text-sm">
              <p className="font-medium">Development mode: no mail server is configured.</p>
              <p className="mt-1 text-muted-foreground">Use this link to continue (it is also printed in the backend console):</p>
              <a href={done.dev_reset_link} className="mt-2 block break-all font-mono text-xs text-cyan-dark underline">{done.dev_reset_link}</a>
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={submit} noValidate className="space-y-4">
          <FormError>{error}</FormError>
          <Field id="email" label="Email"><Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus /></Field>
          <Button type="submit" size="lg" className="w-full" disabled={loading}>{loading && <Loader2 className="animate-spin" />}{loading ? "Sending…" : "Send reset link"}</Button>
        </form>
      )}
    </AuthShell>
  );
}
