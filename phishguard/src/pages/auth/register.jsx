import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { AuthShell, Field, FormError } from "@/components/auth/auth-shell";
import { PasswordInput, passwordProblem } from "@/components/auth/password-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/auth-context";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    const errs = {};
    if (form.name.trim().length < 2) errs.name = "Enter your name.";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(form.email.trim())) errs.email = "Enter a valid email address.";
    const pw = passwordProblem(form.password);
    if (pw) errs.password = pw;
    if (form.confirm !== form.password) errs.confirm = "Passwords do not match.";
    setErrors(errs);
    setFormError("");
    if (Object.keys(errs).length) return;
    setLoading(true);
    try {
      await register(form.name.trim(), form.email.trim(), form.password, false);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      if (err.field) setErrors({ [err.field]: err.message }); else setFormError(err.message);
      setLoading(false);
    }
  }

  return (
    <AuthShell title="Create your account" subtitle="Save your scan history and preferences across devices."
      footer={<>Already have an account? <Link to="/login" className="font-medium text-cyan hover:underline">Sign in</Link></>}>
      <form onSubmit={submit} noValidate className="space-y-4">
        <FormError>{formError}</FormError>
        <Field id="name" label="Full name" error={errors.name}><Input id="name" autoComplete="name" value={form.name} onChange={set("name")} aria-invalid={!!errors.name} autoFocus /></Field>
        <Field id="email" label="Email" error={errors.email}><Input id="email" type="email" autoComplete="email" value={form.email} onChange={set("email")} aria-invalid={!!errors.email} /></Field>
        <Field id="password" label="Password" error={errors.password} hint="At least 8 characters, with a letter and a number.">
          <PasswordInput id="password" autoComplete="new-password" value={form.password} onChange={set("password")} aria-invalid={!!errors.password} />
        </Field>
        <Field id="confirm" label="Confirm password" error={errors.confirm}>
          <PasswordInput id="confirm" autoComplete="new-password" value={form.confirm} onChange={set("confirm")} aria-invalid={!!errors.confirm} />
        </Field>
        <Button type="submit" size="lg" className="w-full" disabled={loading}>{loading && <Loader2 className="animate-spin" />}{loading ? "Creating account…" : "Create account"}</Button>
      </form>
    </AuthShell>
  );
}
