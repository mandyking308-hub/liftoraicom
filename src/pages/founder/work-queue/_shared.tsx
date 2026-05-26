import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Inbox, ArrowLeft, Lock } from "lucide-react";
import { PRIORITY_META, STATUS_META, type WorkItem } from "@/lib/masterWorkQueueEngine";

export const WQ_NAV = [
  { to: "/founder/work-queue",            label: "Overview" },
  { to: "/founder/work-queue/today",      label: "Today" },
  { to: "/founder/work-queue/by-business",label: "By business" },
  { to: "/founder/work-queue/by-agent",   label: "By agent" },
  { to: "/founder/work-queue/approvals",  label: "Approvals" },
  { to: "/founder/work-queue/blocked",    label: "Blocked" },
  { to: "/founder/work-queue/high-value", label: "High-value" },
  { to: "/founder/work-queue/overdue",    label: "Overdue" },
  { to: "/founder/work-queue/settings",   label: "Settings" },
];

export function WQLayout({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  const { pathname } = useLocation();
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Link to="/founder/command-centre" className="hover:text-primary inline-flex items-center gap-1">
            <ArrowLeft size={12} /> Command Centre
          </Link>
          <span>/</span><span>Master Work Queue / Portfolio PMO</span>
        </div>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Inbox size={20} className="text-primary" />
            {title}
            <Badge variant="outline" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px]">Live</Badge>
            <Badge variant="outline" className="bg-yellow-500/15 text-yellow-300 border-yellow-500/30 text-[10px]">
              <Lock size={9} className="mr-1" /> External actions gated
            </Badge>
          </h1>
          {subtitle && <p className="text-sm text-muted-foreground mt-1 max-w-3xl">{subtitle}</p>}
        </div>
        <Card className="tech-card">
          <div className="flex gap-1 overflow-x-auto p-2 text-xs">
            {WQ_NAV.map(n => (
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

export function WQSection({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
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

export function WorkItemRow({ item }: { item: WorkItem }) {
  const pm = PRIORITY_META[item.priority] ?? PRIORITY_META.normal;
  const sm = STATUS_META[item.status] ?? STATUS_META.new;
  const overdue = item.due_at && new Date(item.due_at) < new Date();
  return (
    <div className="border border-border/50 rounded p-3 space-y-1 hover:border-primary/40 transition">
      <div className="flex items-start gap-2 flex-wrap">
        <Badge variant="outline" className={`text-[10px] ${pm.cls}`}>{pm.label}</Badge>
        <Badge variant="outline" className={`text-[10px] ${sm.cls}`}>{sm.label}</Badge>
        <Badge variant="outline" className="text-[10px]">{item.source_module}</Badge>
        {item.approval_required && <Badge variant="outline" className="text-[10px] bg-yellow-500/15 text-yellow-300 border-yellow-500/30">Approval</Badge>}
        {item.is_test_data && <Badge variant="outline" className="text-[10px] bg-purple-500/15 text-purple-300 border-purple-500/30">LIVE_INTERNAL_TEST</Badge>}
        <span className="text-[10px] text-muted-foreground ml-auto">
          {item.due_at ? <span className={overdue ? "text-red-400" : ""}>Due {new Date(item.due_at).toLocaleDateString()}</span> : "No due date"}
        </span>
      </div>
      <p className="text-sm font-medium">{item.title}</p>
      {item.description && <p className="text-xs text-muted-foreground">{item.description}</p>}
      <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
        {item.estimated_value_amount != null && <span>Value: {item.estimated_value_currency} {Number(item.estimated_value_amount).toLocaleString()}</span>}
        <span>Owner: {item.assigned_agent ?? item.owner_type}</span>
        {item.blocker_reason && <span className="text-red-400">Blocker: {item.blocker_reason}</span>}
        {item.action_url && <Link to={item.action_url} className="text-primary hover:underline">Open source →</Link>}
      </div>
      {item.recommended_action && <p className="text-[11px] text-primary/90">Next: {item.recommended_action}</p>}
    </div>
  );
}

export function WQStat({ label, value, hint, tone }: { label: string; value: number | string; hint?: string; tone?: "ok" | "warn" | "bad" }) {
  const cls = tone === "bad" ? "border-red-500/40" : tone === "warn" ? "border-yellow-500/40" : "border-border/50";
  return (
    <div className={`border ${cls} rounded p-3`}>
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className="text-xl font-bold">{value}</p>
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}