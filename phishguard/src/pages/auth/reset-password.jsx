import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { AuthShell, Field, FormError } from "@/components/auth/auth-shell";
import { PasswordInput, passwordProblem } from "@/components/auth/password-input";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const navigate = useNavigate();
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    const problem = passwordProblem(pw) || (pw !== confirm ? "Passwords do not match." : "");
    if (problem) { setError(problem); return; }
    setError("");
    setLoading(true);
    try {
      const r = await api.resetPassword(token, pw);
      navigate("/login", { replace: true, state: { message: r.message } });
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <AuthShell title="Choose a new password" footer={<Link to="/login" className="font-medium text-cyan hover:underline">Back to sign in</Link>}>
      {!token ? (
        <div className="space-y-3">
          <FormError>This reset link is incomplete.</FormError>
          <Button asChild className="w-full"><Link to="/forgot-password">Request a new link</Link></Button>
        </div>
      ) : (
        <form onSubmit={submit} noValidate className="space-y-4">
          <FormError>{error}</FormError>
          <Field id="password" label="New password" hint="At least 8 characters, with a letter and a number."><PasswordInput id="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus /></Field>
          <Field id="confirm" label="Confirm new password"><PasswordInput id="confirm" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} /></Field>
          <Button type="submit" size="lg" className="w-full" disabled={loading}>{loading && <Loader2 className="animate-spin" />}{loading ? "Saving…" : "Update password"}</Button>
        </form>
      )}
    </AuthShell>
  );
}
