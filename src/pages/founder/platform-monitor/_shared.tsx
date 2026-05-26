import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, ArrowLeft, ShieldAlert } from "lucide-react";

export const PM_NAV = [
  { to: "/founder/platform-monitor",                  label: "Overview" },
  { to: "/founder/platform-monitor/performance",      label: "Performance" },
  { to: "/founder/platform-monitor/errors",           label: "Errors" },
  { to: "/founder/platform-monitor/rate-limits",      label: "Rate limits" },
  { to: "/founder/platform-monitor/costs",            label: "Costs" },
  { to: "/founder/platform-monitor/scalability",      label: "Scalability" },
  { to: "/founder/platform-monitor/recommendations",  label: "Recommendations" },
];

export function PMLayout({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  const { pathname } = useLocation();
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Link to="/founder/command-centre" className="hover:text-primary inline-flex items-center gap-1">
            <ArrowLeft size={12} /> Command Centre
          </Link>
          <span>/</span><span>Platform Monitor</span>
        </div>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity size={20} className="text-primary" />
            {title}
            <Badge variant="outline" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px]">Live monitoring</Badge>
            <Badge variant="outline" className="bg-yellow-500/15 text-yellow-300 border-yellow-500/30 text-[10px]">
              <ShieldAlert size={9} className="mr-1" /> Infra change requires approval
            </Badge>
          </h1>
          {subtitle && <p className="text-sm text-muted-foreground mt-1 max-w-3xl">{subtitle}</p>}
        </div>
        <Card className="tech-card">
          <div className="flex gap-1 overflow-x-auto p-2 text-xs">
            {PM_NAV.map(n => (
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

export function Stat({ label, value, hint, tone }: { label: string; value: number|string; hint?: string; tone?: "ok"|"warn"|"bad" }) {
  const cls = tone === "bad" ? "border-red-500/40" : tone === "warn" ? "border-yellow-500/40" : tone === "ok" ? "border-emerald-500/40" : "border-border/50";
  return (
    <div className={`border ${cls} rounded p-3`}>
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className="text-lg font-bold">{value}</p>
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function SevBadge({ severity }: { severity: string }) {
  const tone =
    severity === "critical" ? "bg-red-500/20 text-red-300 border-red-500/40" :
    severity === "high" ? "bg-yellow-500/15 text-yellow-300 border-yellow-500/30" :
    severity === "medium" ? "bg-primary/15 text-primary border-primary/30" :
    "bg-secondary/40 text-muted-foreground border-border/40";
  return <Badge variant="outline" className={`text-[10px] capitalize ${tone}`}>{severity}</Badge>;
}

export function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "resolved" || status === "implemented" || status === "approved" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" :
    status === "open" || status === "approval_required" ? "bg-yellow-500/15 text-yellow-300 border-yellow-500/30" :
    status === "acknowledged" || status === "parked" ? "bg-primary/15 text-primary border-primary/30" :
    status === "ignored" || status === "rejected" ? "bg-secondary/40 text-muted-foreground border-border/40" :
    "bg-secondary/40 text-muted-foreground border-border/40";
  return <Badge variant="outline" className={`text-[10px] capitalize ${tone}`}>{status.replace(/_/g," ")}</Badge>;
}

export function PerfTable({ rows }: { rows: any[] }) {
  return (
    <Card className="tech-card p-0 overflow-hidden">
      <table className="w-full text-xs">
        <thead className="bg-secondary/30 text-muted-foreground">
          <tr>
            <th className="text-left p-2">When</th>
            <th className="text-left p-2">Module</th>
            <th className="text-left p-2">Type</th>
            <th className="text-left p-2">Severity</th>
            <th className="text-left p-2">Summary</th>
            <th className="text-left p-2">Metric / Threshold</th>
            <th className="text-left p-2">Recommended</th>
            <th className="text-left p-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan={8} className="p-4 text-center text-muted-foreground">No events.</td></tr>}
          {rows.map(r => (
            <tr key={r.id} className="border-t border-border/30">
              <td className="p-2 whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</td>
              <td className="p-2">{r.source_module}</td>
              <td className="p-2 capitalize">{r.event_type.replace(/_/g," ")}</td>
              <td className="p-2"><SevBadge severity={r.severity} /></td>
              <td className="p-2 max-w-[280px] truncate">{r.event_summary ?? "—"}</td>
              <td className="p-2 text-muted-foreground">{r.metric_value ?? "—"}{r.threshold_value ? ` / ${r.threshold_value}` : ""}</td>
              <td className="p-2 max-w-[200px] truncate">{r.recommended_action ?? "—"}</td>
              <td className="p-2"><StatusBadge status={r.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}