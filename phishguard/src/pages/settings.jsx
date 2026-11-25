import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Download, Loader2, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/page-header";
import { Field, FormError, FormSuccess } from "@/components/auth/auth-shell";
import { PasswordInput, passwordProblem } from "@/components/auth/password-input";
import { useAuth } from "@/hooks/auth-context";
import { useScans } from "@/hooks/scan-context";
import { useSidebar } from "@/hooks/use-sidebar";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

const TABS = [["account", "Account"], ["privacy", "Privacy"], ["preferences", "Preferences"]];

function SwitchRow({ id, label, description, checked, onChange, disabled }) {
  return (
    <div className="flex max-w-xl items-center justify-between gap-4">
      <div><Label htmlFor={id}>{label}</Label><p className="mt-1 text-sm text-muted-foreground">{description}</p></div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </div>
  );
}

/** Shows a saved/failed message after an async action. */
function useStatus() {
  const [status, setStatus] = useState({ type: "", text: "" });
  return [status, {
    ok: (text) => setStatus({ type: "ok", text }),
    fail: (err) => setStatus({ type: "error", text: err.message ?? String(err), field: err.field }),
    clear: () => setStatus({ type: "", text: "" }),
  }];
}
function StatusLine({ status }) {
  return status.type === "ok" ? <FormSuccess>{status.text}</FormSuccess> : status.type === "error" ? <FormError>{status.text}</FormError> : null;
}

function ProfileForm() {
  const { user, setUser } = useAuth();
  const [form, setForm] = useState({ name: user.name, email: user.email, bio: user.bio || "", current_password: "" });
  const [status, s] = useStatus();
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const emailChanged = form.email.trim().toLowerCase() !== user.email.toLowerCase();

  async function submit(e) {
    e.preventDefault();
    s.clear();
    setBusy(true);
    try {
      const body = { name: form.name, bio: form.bio, email: form.email };
      if (emailChanged) body.current_password = form.current_password;
      const d = await api.updateProfile(body);
      setUser(d.user);
      setForm((f) => ({ ...f, current_password: "" }));
      s.ok("Profile saved.");
    } catch (err) { s.fail(err); } finally { setBusy(false); }
  }

  return (
    <Card>
      <CardHeader><CardTitle>Profile</CardTitle><CardDescription>Your name and the email you sign in with.</CardDescription></CardHeader>
      <CardContent>
        <form onSubmit={submit} className="max-w-xl space-y-4" noValidate>
          <StatusLine status={status} />
          <Field id="p-name" label="Full name"><Input id="p-name" value={form.name} onChange={set("name")} maxLength={80} /></Field>
          <Field id="p-email" label="Email"><Input id="p-email" type="email" value={form.email} onChange={set("email")} /></Field>
          {emailChanged && (
            <Field id="p-pw" label="Current password" hint="Required to change your email address.">
              <PasswordInput id="p-pw" autoComplete="current-password" value={form.current_password} onChange={set("current_password")} />
            </Field>
          )}
          <Field id="p-bio" label="About you" hint={`${form.bio.length}/300`}>
            <textarea id="p-bio" value={form.bio} onChange={set("bio")} maxLength={300} rows={3}
              className="flex w-full rounded-md border border-input bg-white px-3 py-2 text-sm text-navy placeholder:text-muted-foreground focus-visible:border-cyan" />
          </Field>
          <Button type="submit" disabled={busy}>{busy && <Loader2 className="animate-spin" />}Save profile</Button>
        </form>
      </CardContent>
    </Card>
  );
}

function PasswordForm() {
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [status, s] = useStatus();
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    s.clear();
    const problem = !form.current ? "Enter your current password." : passwordProblem(form.next) || (form.next !== form.confirm ? "New passwords do not match." : "");
    if (problem) { s.fail(new Error(problem)); return; }
    setBusy(true);
    try {
      await api.changePassword(form.current, form.next);
      setForm({ current: "", next: "", confirm: "" });
      s.ok("Password changed. Your other devices have been signed out.");
    } catch (err) { s.fail(err); } finally { setBusy(false); }
  }

  return (
    <Card>
      <CardHeader><CardTitle>Change password</CardTitle><CardDescription>Changing your password signs you out everywhere else.</CardDescription></CardHeader>
      <CardContent>
        <form onSubmit={submit} className="max-w-xl space-y-4" noValidate>
          <StatusLine status={status} />
          <Field id="cp-current" label="Current password"><PasswordInput id="cp-current" autoComplete="current-password" value={form.current} onChange={set("current")} /></Field>
          <Field id="cp-new" label="New password" hint="At least 8 characters, with a letter and a number."><PasswordInput id="cp-new" autoComplete="new-password" value={form.next} onChange={set("next")} /></Field>
          <Field id="cp-confirm" label="Confirm new password"><PasswordInput id="cp-confirm" autoComplete="new-password" value={form.confirm} onChange={set("confirm")} /></Field>
          <Button type="submit" disabled={busy}>{busy && <Loader2 className="animate-spin" />}Update password</Button>
        </form>
      </CardContent>
    </Card>
  );
}

function DeleteAccount() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [pw, setPw] = useState("");
  const [status, s] = useStatus();
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    s.clear();
    setBusy(true);
    try {
      await api.deleteAccount(pw);
      await logout().catch(() => {});
      navigate("/", { replace: true });
    } catch (err) { s.fail(err); setBusy(false); }
  }

  return (
    <Card className="border-danger/40">
      <CardHeader><CardTitle className="text-danger">Delete account</CardTitle><CardDescription>Permanently removes your account, scan history, notifications and preferences. This cannot be undone.</CardDescription></CardHeader>
      <CardContent>
        {!open ? (
          <Button variant="destructive" onClick={() => setOpen(true)}><Trash2 />Delete my account…</Button>
        ) : (
          <form onSubmit={submit} className="max-w-xl space-y-4" noValidate>
            <StatusLine status={status} />
            <Field id="del-pw" label="Confirm with your password"><PasswordInput id="del-pw" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus /></Field>
            <div className="flex gap-2">
              <Button type="submit" variant="destructive" disabled={busy || !pw}>{busy && <Loader2 className="animate-spin" />}Permanently delete</Button>
              <Button type="button" variant="outline" onClick={() => { setOpen(false); setPw(""); s.clear(); }}>Cancel</Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

function PrivacyTab() {
  const { prefs, updatePrefs } = useAuth();
  const { scans, ensembleScans, clearAllHistory } = useScans();
  const [status, s] = useStatus();
  const total = scans.length + ensembleScans.length;

  const toggle = (key, msg) => async (value) => {
    s.clear();
    try { await updatePrefs({ [key]: value }); s.ok(msg(value)); } catch (err) { s.fail(err); }
  };
  async function exportData() {
    s.clear();
    try {
      const data = await api.exportData();
      const a = Object.assign(document.createElement("a"), {
        href: URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })),
        download: "phishguard-my-data.json",
      });
      a.click();
      URL.revokeObjectURL(a.href);
      s.ok("Your data was downloaded.");
    } catch (err) { s.fail(err); }
  }
  async function clearAll() {
    if (!window.confirm("Permanently delete all scan history from your account?")) return;
    s.clear();
    try { await clearAllHistory(); s.ok("Scan history deleted."); } catch (err) { s.fail(err); }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Scan data</CardTitle><CardDescription>Control what PhishGuard keeps about the URLs you scan.</CardDescription></CardHeader>
        <CardContent className="space-y-5">
          <StatusLine status={status} />
          <SwitchRow id="save-history" label="Save scan history" checked={prefs.save_history} onChange={toggle("save_history", (v) => (v ? "New scans will be saved." : "New scans will not be saved."))}
            description="When off, scans still run but are not stored, and will not appear in history, charts or search." />
          <SwitchRow id="strip-query" label="Remove query strings from saved URLs" checked={prefs.strip_query} onChange={toggle("strip_query", (v) => (v ? "Query strings and fragments will be removed from saved URLs." : "Full URLs will be saved."))}
            description="Saves https://site.com/page instead of https://site.com/page?token=… so secrets in links are never stored. The scan itself still uses the full URL." />
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Your data</CardTitle><CardDescription>Download everything stored for your account, or erase your scan history.</CardDescription></CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={exportData}><Download />Download my data (JSON)</Button>
          <Button variant="destructive" disabled={!total} onClick={clearAll}><Trash2 />Delete scan history ({total})</Button>
        </CardContent>
      </Card>
    </div>
  );
}

function PreferencesTab() {
  const { prefs, updatePrefs } = useAuth();
  const { collapsed, setCollapsed } = useSidebar();
  const [status, s] = useStatus();
  const [threshold, setThreshold] = useState(Math.round(prefs.suspicious_threshold * 100));

  const save = (patch, msg) => async () => { s.clear(); try { await updatePrefs(patch); s.ok(msg); } catch (err) { s.fail(err); } };
  const commitThreshold = () => save({ suspicious_threshold: threshold / 100 }, "Saved. The new threshold applies to future scans.")();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Interface</CardTitle></CardHeader>
        <CardContent className="space-y-5">
          <StatusLine status={status} />
          <SwitchRow id="collapse" label="Collapsed sidebar" description="Show icons only. Hover an icon to see its label." checked={collapsed} onChange={setCollapsed} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Notifications</CardTitle><CardDescription>Alerts shown in the bell menu of the top bar.</CardDescription></CardHeader>
        <CardContent className="space-y-5">
          <SwitchRow id="n-phish" label="Threat alerts" description="Notify me when a scan is flagged as phishing or suspicious." checked={prefs.notify_phishing}
            onChange={(v) => save({ notify_phishing: v }, "Notification preference saved.")()} />
          <SwitchRow id="n-sec" label="Security alerts" description="Notify me when my password or email changes." checked={prefs.notify_security}
            onChange={(v) => save({ notify_security: v }, "Notification preference saved.")()} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>How verdicts are labelled</CardTitle></CardHeader>
        <CardContent className="max-w-2xl space-y-4 text-sm text-muted-foreground">
          <p>Each scan ends as <strong className="text-navy">Safe</strong>, <strong className="text-navy">Suspicious</strong> or <strong className="text-navy">Phishing</strong>.</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Suspicious: the detector's confidence is below {threshold}%, or the ensemble models do not all agree.</li>
            <li>Phishing: the URL matches phishing patterns with high confidence.</li>
            <li>Safe: no strong phishing pattern was found with high confidence.</li>
          </ul>
          <div>
            <Label htmlFor="threshold">Suspicious threshold (single-model scans): <span className="tabular-nums text-navy">{threshold}%</span></Label>
            <div className="mt-2 flex items-center gap-3">
              <input id="threshold" type="range" min={50} max={99} step={1} value={threshold} onChange={(e) => setThreshold(Number(e.target.value))}
                onMouseUp={commitThreshold} onTouchEnd={commitThreshold} onKeyUp={commitThreshold} className="w-full max-w-xs accent-cyan" />
              <Button size="sm" variant="outline" disabled={threshold === 75} onClick={() => { setThreshold(75); save({ suspicious_threshold: 0.75 }, "Threshold reset to 75%.")(); }}>Reset</Button>
            </div>
            <p className="mt-1 text-xs">Higher values flag more results as suspicious. Default is 75%.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SettingsPage() {
  const [params, setParams] = useSearchParams();
  const tab = TABS.some(([k]) => k === params.get("tab")) ? params.get("tab") : "account";

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Manage your account, privacy and preferences. Changes are saved to your account." />
      <div role="tablist" aria-label="Settings sections" className="flex gap-1 border-b border-navy-700">
        {TABS.map(([k, label]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setParams({ tab: k }, { replace: true })}
            className={cn("-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors", tab === k ? "border-cyan text-white" : "border-transparent text-white/60 hover:text-white")}>
            {label}
          </button>
        ))}
      </div>
      <div role="tabpanel" className="space-y-6">
        {tab === "account" && <><ProfileForm /><PasswordForm /><DeleteAccount /></>}
        {tab === "privacy" && <PrivacyTab />}
        {tab === "preferences" && <PreferencesTab />}
      </div>
    </div>
  );
}
