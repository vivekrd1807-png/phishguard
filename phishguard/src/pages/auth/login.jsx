import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { AuthShell, Field, FormError, FormSuccess } from "@/components/auth/auth-shell";
import { PasswordInput } from "@/components/auth/password-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/auth-context";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { state } = useLocation();
  const [form, setForm] = useState({ email: "", password: "", remember: false });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  async function submit(e) {
    e.preventDefault();
    if (!form.email.trim() || !form.password) { setError("Enter your email and password."); return; }
    setError("");
    setLoading(true);
    try {
      await login(form.email.trim(), form.password, form.remember);
      navigate(state?.from || "/dashboard", { replace: true });
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to your PhishGuard account."
      footer={<>New to PhishGuard? <Link to="/register" className="font-medium text-cyan hover:underline">Create an account</Link></>}>
      <form onSubmit={submit} noValidate className="space-y-4">
        <FormSuccess>{state?.message}</FormSuccess>
        <FormError>{error}</FormError>
        <Field id="email" label="Email">
          <Input id="email" type="email" autoComplete="email" value={form.email} onChange={set("email")} placeholder="you@example.com" autoFocus />
        </Field>
        <Field id="password" label="Password">
          <PasswordInput id="password" autoComplete="current-password" value={form.password} onChange={set("password")} />
        </Field>
        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" checked={form.remember} onChange={set("remember")} className="size-4 accent-cyan" />Remember me</label>
          <Link to="/forgot-password" className="font-medium text-cyan-dark hover:underline">Forgot password?</Link>
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={loading}>{loading && <Loader2 className="animate-spin" />}{loading ? "Signing in…" : "Sign in"}</Button>
      </form>
    </AuthShell>
  );
}
