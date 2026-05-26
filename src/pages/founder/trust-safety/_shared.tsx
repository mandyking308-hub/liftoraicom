import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, ArrowLeft, ShieldAlert } from "lucide-react";

export const TS_NAV = [
  { to: "/founder/trust-safety",              label: "Overview" },
  { to: "/founder/trust-safety/risk-events",  label: "Risk events" },
  { to: "/founder/trust-safety/accounts",     label: "Accounts" },
  { to: "/founder/trust-safety/payments",     label: "Payments / payouts" },
  { to: "/founder/trust-safety/messages",     label: "Message abuse" },
  { to: "/founder/trust-safety/actions",      label: "Actions" },
  { to: "/founder/trust-safety/settings",     label: "Settings" },
];

export function TsLayout({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  const { pathname } = useLocation();
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Link to="/founder/command-centre" className="hover:text-primary inline-flex items-center gap-1">
            <ArrowLeft size={12} /> Command Centre
          </Link>
          <span>/</span><span>Trust / Fraud / Abuse Engine</span>
        </div>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck size={20} className="text-primary" />
            {title}
            <Badge variant="outline" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px]">Live scoring</Badge>
            <Badge variant="outline" className="bg-yellow-500/15 text-yellow-300 border-yellow-500/30 text-[10px]">
              <ShieldAlert size={9} className="mr-1" /> No auto-suspend / no auto-refund
            </Badge>
          </h1>
          {subtitle && <p className="text-sm text-muted-foreground mt-1 max-w-3xl">{subtitle}</p>}
        </div>
        <Card className="tech-card">
          <div className="flex gap-1 overflow-x-auto p-2 text-xs">
            {TS_NAV.map(n => (
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

export function SeverityBadge({ severity }: { severity: string }) {
  const tone = severity === "critical" || severity === "high" ? "bg-red-500/15 text-red-300 border-red-500/30" :
               severity === "medium" ? "bg-yellow-500/15 text-yellow-300 border-yellow-500/30" :
               "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
  return <Badge variant="outline" className={`text-[10px] capitalize ${tone}`}>{severity}</Badge>;
}

export function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "resolved" || status === "approved" || status === "completed" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" :
    status === "open" || status === "draft" || status === "review_required" || status === "approval_required" ? "bg-yellow-500/15 text-yellow-300 border-yellow-500/30" :
    status === "action_required" || status === "rejected" || status === "cancelled" ? "bg-red-500/15 text-red-300 border-red-500/30" :
    "bg-secondary/40 text-muted-foreground border-border/40";
  return <Badge variant="outline" className={`text-[10px] capitalize ${tone}`}>{status.replace(/_/g," ")}</Badge>;
}

export function RiskTable({ rows }: { rows: any[] }) {
  return (
    <Card className="tech-card p-0 overflow-hidden">
      <table className="w-full text-xs">
        <thead className="bg-secondary/30 text-muted-foreground">
          <tr><th className="text-left p-2">When</th><th className="text-left p-2">Type</th><th className="text-left p-2">Severity</th><th className="text-left p-2">Summary</th><th className="text-left p-2">Recommended</th><th className="text-left p-2">Status</th></tr>
        </thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan={6} className="p-4 text-center text-muted-foreground">No risk events.</td></tr>}
          {rows.map(r => (
            <tr key={r.id} className="border-t border-border/30">
              <td className="p-2 whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</td>
              <td className="p-2 capitalize">{r.risk_type.replace(/_/g," ")}</td>
              <td className="p-2"><SeverityBadge severity={r.severity} /></td>
              <td className="p-2 max-w-[280px] truncate">{r.risk_summary ?? "—"}</td>
              <td className="p-2 max-w-[280px] truncate text-muted-foreground">{r.recommended_action ?? "—"}</td>
              <td className="p-2"><StatusBadge status={r.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
