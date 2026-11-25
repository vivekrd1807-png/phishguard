import { useEffect, useState } from "react";
import { ChevronDown, Loader2, Send } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/page-header";
import { Field, FormError, FormSuccess } from "@/components/auth/auth-shell";
import { api } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";

const FAQ = [
  ["What is the difference between the Dashboard and the Ensemble Feature?", "The Dashboard scans a URL with a single Logistic Regression model. The Ensemble Feature combines Logistic Regression, Random Forest and XGBoost and takes a majority vote, so it is usually more reliable. Ensemble scans are listed only on the Ensemble page and in global search."],
  ["What does “Suspicious” mean?", "The detector is not sure. For single-model scans the confidence is below your suspicious threshold (75% by default, changeable under Settings → Preferences). For ensemble scans the three models did not all agree."],
  ["Is a “Safe” result a guarantee?", "No. PhishGuard looks at the structure and words of the URL only; it does not open the page. Treat any unexpected link with care and never enter credentials from a link you did not expect."],
  ["Where is my scan history stored?", "In the PhishGuard database, linked to your account, so it follows you across browsers. You can stop saving scans, strip query strings, download or delete everything under Settings → Privacy."],
  ["I forgot my password.", "Choose “Forgot password?” on the sign-in page. A reset link valid for 30 minutes is sent to your email. Changing your password signs you out of every other device."],
  ["How do I search?", "Use the search box in the top bar (press / to focus it) to find pages, saved scans and notifications. Press Enter to open the first match."],
];

const CATEGORIES = [["general", "General question"], ["detection", "Detection result looks wrong"], ["bug", "Report a bug"], ["account", "Account or sign-in"], ["feature", "Feature request"]];

export default function Help() {
  const [tickets, setTickets] = useState([]);
  const [form, setForm] = useState({ category: "general", subject: "", message: "" });
  const [status, setStatus] = useState({ type: "", text: "" });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  useEffect(() => { api.tickets().then((d) => setTickets(d.tickets)).catch(() => {}); }, []);

  async function submit(e) {
    e.preventDefault();
    setStatus({ type: "", text: "" });
    if (form.subject.trim().length < 3) { setStatus({ type: "error", text: "Enter a subject (at least 3 characters)." }); return; }
    if (form.message.trim().length < 10) { setStatus({ type: "error", text: "Describe your question in at least 10 characters." }); return; }
    setBusy(true);
    try {
      const { ticket } = await api.createTicket(form);
      setTickets((t) => [ticket, ...t]);
      setForm({ category: "general", subject: "", message: "" });
      setStatus({ type: "ok", text: "Thanks! Your request was sent. We'll follow up by email." });
    } catch (err) {
      setStatus({ type: "error", text: err.message });
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Help & Support" description="Answers to common questions, and a way to reach us." />
      <div className="grid gap-6 xl:grid-cols-5">
        <Card className="xl:col-span-3">
          <CardHeader><CardTitle>Frequently asked questions</CardTitle></CardHeader>
          <CardContent className="divide-y divide-border pt-0">
            {FAQ.map(([q, a]) => (
              <details key={q} className="group py-3">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium">
                  {q}<ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden="true" />
                </summary>
                <p className="mt-2 text-sm text-muted-foreground">{a}</p>
              </details>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-6 xl:col-span-2">
          <Card>
            <CardHeader><CardTitle>Contact support</CardTitle><CardDescription>Your request is saved to your account.</CardDescription></CardHeader>
            <CardContent>
              <form onSubmit={submit} className="space-y-4" noValidate>
                <FormSuccess>{status.type === "ok" ? status.text : ""}</FormSuccess>
                <FormError>{status.type === "error" ? status.text : ""}</FormError>
                <Field id="s-cat" label="Topic">
                  <select id="s-cat" value={form.category} onChange={set("category")} className="flex h-10 w-full rounded-md border border-input bg-white px-3 text-sm text-navy focus-visible:border-cyan">
                    {CATEGORIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </Field>
                <Field id="s-sub" label="Subject"><Input id="s-sub" value={form.subject} onChange={set("subject")} maxLength={120} /></Field>
                <Field id="s-msg" label="Message" hint={`${form.message.length}/2000`}>
                  <textarea id="s-msg" value={form.message} onChange={set("message")} maxLength={2000} rows={5}
                    className="flex w-full rounded-md border border-input bg-white px-3 py-2 text-sm text-navy focus-visible:border-cyan" />
                </Field>
                <Button type="submit" disabled={busy}>{busy ? <Loader2 className="animate-spin" /> : <Send />}Send request</Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Your requests</CardTitle></CardHeader>
            <CardContent className="pt-0">
              {tickets.length === 0 ? <p className="text-sm text-muted-foreground">You have not contacted support yet.</p> : (
                <ul className="divide-y divide-border">
                  {tickets.map((t) => (
                    <li key={t.id} className="py-3">
                      <div className="flex items-start justify-between gap-2"><p className="text-sm font-medium">{t.subject}</p><span className="shrink-0 rounded-md border border-border bg-secondary px-2 py-0.5 text-xs capitalize">{t.status}</span></div>
                      <p className="mt-0.5 text-xs text-muted-foreground">{formatDateTime(t.ts)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
