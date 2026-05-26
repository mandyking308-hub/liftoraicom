import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bell, ArrowLeft, Lock } from "lucide-react";
import { SEVERITY_META, STATUS_META, setStatus, snooze, type Notification } from "@/lib/notificationCentreEngine";

export const NC_NAV = [
  { to: "/founder/notifications", label: "Overview" },
  { to: "/founder/notifications/inbox", label: "Inbox" },
  { to: "/founder/notifications/urgent", label: "Urgent" },
  { to: "/founder/notifications/escalations", label: "Escalations" },
  { to: "/founder/notifications/rules", label: "Rules" },
  { to: "/founder/notifications/archive", label: "Archive" },
  { to: "/founder/notifications/settings", label: "Settings" },
];

export function NCLayout({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  const { pathname } = useLocation();
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Link to="/founder/command-centre" className="hover:text-primary inline-flex items-center gap-1">
            <ArrowLeft size={12} /> Command Centre
          </Link>
          <span>/</span><span>Unified Notification & Escalation Centre</span>
        </div>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bell size={20} className="text-primary" />
            {title}
            <Badge variant="outline" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px]">Live</Badge>
            <Badge variant="outline" className="bg-yellow-500/15 text-yellow-300 border-yellow-500/30 text-[10px]">
              <Lock size={9} className="mr-1" /> External channels off
            </Badge>
          </h1>
          {subtitle && <p className="text-sm text-muted-foreground mt-1 max-w-3xl">{subtitle}</p>}
        </div>
        <Card className="tech-card">
          <div className="flex gap-1 overflow-x-auto p-2 text-xs">
            {NC_NAV.map(n => (
              <Link key={n.to} to={n.to}
                className={`shrink-0 px-2 py-1 rounded border transition ${pathname === n.to ? "border-primary/60 bg-primary/10 text-primary" : "border-border/50 hover:bg-secondary text-muted-foreground hover:text-foreground"}`}>
                {n.label}
              </Link>
            ))}
          </div>
        </Card>
        {children}
      </div>
    </div>
  );
}

export function NCSection({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <Card className="tech-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">{title}</CardTitle>
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function NCStat({ label, value, tone, hint }: { label: string; value: any; tone?: "ok" | "warn" | "bad"; hint?: string }) {
  const cls = tone === "bad" ? "border-red-500/40" : tone === "warn" ? "border-yellow-500/40" : "border-border/50";
  return (
    <div className={`border ${cls} rounded p-3`}>
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className="text-xl font-bold">{value ?? "—"}</p>
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function NotificationRow({ n, onChange }: { n: Notification; onChange?: () => void }) {
  const sm = SEVERITY_META[n.severity] ?? SEVERITY_META.info;
  const st = STATUS_META[n.notification_status] ?? STATUS_META.new;
  const overdue = n.due_at && new Date(n.due_at) < new Date();
  const act = async (s: Notification["notification_status"]) => { await setStatus(n.id, s); onChange?.(); };
  const sz = async (h: number) => { await snooze(n.id, h); onChange?.(); };
  return (
    <div className="border border-border/50 rounded p-3 space-y-1 hover:border-primary/40 transition">
      <div className="flex items-start gap-2 flex-wrap">
        <Badge variant="outline" className={`text-[10px] ${sm.cls}`}>{sm.label}</Badge>
        <Badge variant="outline" className={`text-[10px] ${st.cls}`}>{st.label}</Badge>
        <Badge variant="outline" className="text-[10px]">{n.source_module}</Badge>
        <Badge variant="outline" className="text-[10px]">{n.notification_type}</Badge>
        {n.action_required && <Badge variant="outline" className="text-[10px] bg-yellow-500/15 text-yellow-300 border-yellow-500/30">Action</Badge>}
        {n.is_test_data && <Badge variant="outline" className="text-[10px] bg-purple-500/15 text-purple-300 border-purple-500/30">LIVE_INTERNAL_TEST</Badge>}
        <span className="text-[10px] text-muted-foreground ml-auto">
          {n.due_at ? <span className={overdue ? "text-red-400" : ""}>Due {new Date(n.due_at).toLocaleDateString()}</span> : new Date(n.created_at).toLocaleString()}
        </span>
      </div>
      <p className="text-sm font-medium">{n.title}</p>
      {n.message && <p className="text-xs text-muted-foreground">{n.message}</p>}
      <div className="flex items-center gap-2 flex-wrap pt-1">
        {n.action_url && <Link to={n.action_url} className="text-[11px] text-primary hover:underline">Open source →</Link>}
        {n.related_work_item_id && <Link to="/founder/work-queue" className="text-[11px] text-primary hover:underline">Work item →</Link>}
        <div className="ml-auto flex gap-1">
          {n.notification_status === "new" && <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => act("seen")}>Seen</Button>}
          {n.notification_status !== "acknowledged" && n.notification_status !== "resolved" && <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => act("acknowledged")}>Ack</Button>}
          {n.notification_status !== "snoozed" && <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => sz(24)}>Snooze 24h</Button>}
          {n.notification_status !== "resolved" && <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => act("resolved")}>Resolve</Button>}
          {n.notification_status !== "archived" && <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => act("archived")}>Archive</Button>}
        </div>
      </div>
    </div>
  );
}