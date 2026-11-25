import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Activity, CheckCircle2, History, Link2, ShieldAlert, Settings } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { initials } from "@/components/layout/profile-menu";
import { useAuth } from "@/hooks/auth-context";
import { api } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";

export default function Profile() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  useEffect(() => { api.profile().then((d) => setStats(d.stats)).catch(() => {}); }, [user?.name]);
  const n = (v) => (stats ? v : "—");

  return (
    <div className="space-y-6">
      <PageHeader title="My Profile" description="Your account details and activity."
        actions={<Button asChild variant="outline" size="sm" className="bg-white"><Link to="/settings"><Settings />Edit in Settings</Link></Button>} />
      <Card>
        <CardContent className="flex flex-col items-start gap-5 p-6 sm:flex-row sm:items-center">
          <span className="grid size-20 shrink-0 place-items-center rounded-full bg-navy text-2xl font-bold text-cyan">{initials(user.name)}</span>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-xl font-semibold">{user.name}</h3>
            <p className="truncate text-sm text-muted-foreground">{user.email}</p>
            {user.bio && <p className="mt-2 max-w-2xl whitespace-pre-line text-sm">{user.bio}</p>}
          </div>
          <dl className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm sm:text-right">
            <div><dt className="text-muted-foreground">Member since</dt><dd className="font-medium">{formatDateTime(user.created_at)}</dd></div>
            <div><dt className="text-muted-foreground">Last sign-in</dt><dd className="font-medium">{user.last_login_at ? formatDateTime(user.last_login_at) : "—"}</dd></div>
          </dl>
        </CardContent>
      </Card>
      <section aria-label="Your activity" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total scans" value={n(stats?.total)} icon={Link2} hint="Dashboard and Ensemble" />
        <StatCard label="Phishing found" value={n(stats?.phishing)} icon={ShieldAlert} />
        <StatCard label="Suspicious" value={n(stats?.suspicious)} icon={Activity} />
        <StatCard label="Safe" value={n(stats?.safe)} icon={CheckCircle2} />
      </section>
      <Button asChild><Link to="/history"><History />View scan history</Link></Button>
    </div>
  );
}
