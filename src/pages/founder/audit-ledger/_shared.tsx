import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, ArrowLeft, Lock } from "lucide-react";

export const AUDIT_NAV = [
  { to: "/founder/audit-ledger",              label: "Overview" },
  { to: "/founder/audit-ledger/events",       label: "Events" },
  { to: "/founder/audit-ledger/by-business",  label: "By business" },
  { to: "/founder/audit-ledger/by-user",      label: "By user" },
  { to: "/founder/audit-ledger/by-module",    label: "By module" },
  { to: "/founder/audit-ledger/sensitive",    label: "Sensitive" },
  { to: "/founder/audit-ledger/settings",     label: "Settings" },
];

export function AuditLayout({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  const { pathname } = useLocation();
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Link to="/founder/command-centre" className="hover:text-primary inline-flex items-center gap-1">
            <ArrowLeft size={12} /> Command Centre
          </Link>
          <span>/</span><span>Global Audit Ledger</span>
        </div>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck size={20} className="text-primary" />
            {title}
            <Badge variant="outline" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px]">Append-only live</Badge>
            <Badge variant="outline" className="bg-yellow-500/15 text-yellow-300 border-yellow-500/30 text-[10px]">
              <Lock size={9} className="mr-1" /> Export requires approval
            </Badge>
          </h1>
          {subtitle && <p className="text-sm text-muted-foreground mt-1 max-w-3xl">{subtitle}</p>}
        </div>
        <Card className="tech-card">
          <div className="flex gap-1 overflow-x-auto p-2 text-xs">
            {AUDIT_NAV.map(n => (
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

export function AuditStat({ label, value, hint, tone }: { label: string; value: number|string; hint?: string; tone?: "ok"|"warn"|"bad" }) {
  const cls = tone === "bad" ? "border-red-500/40" : tone === "warn" ? "border-yellow-500/40" : tone === "ok" ? "border-emerald-500/40" : "border-border/50";
  return (
    <div className={`border ${cls} rounded p-3`}>
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className="text-lg font-bold">{value}</p>
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function sensitivityBadge(s: string) {
  const m: Record<string, string> = {
    low: "bg-muted text-muted-foreground border-border/50",
    medium: "bg-primary/15 text-primary border-primary/30",
    high: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
    critical: "bg-red-500/15 text-red-300 border-red-500/30",
  };
  return m[s] ?? "bg-muted";
}

export function categoryBadge(c: string) {
  const m: Record<string, string> = {
    ai: "bg-primary/15 text-primary border-primary/30",
    approval: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    external_action: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
    data_change: "bg-muted text-muted-foreground border-border/50",
    access: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
    finance: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    privacy: "bg-red-500/15 text-red-300 border-red-500/30",
    security: "bg-red-500/15 text-red-300 border-red-500/30",
    configuration: "bg-primary/15 text-primary border-primary/30",
    workflow: "bg-muted text-muted-foreground border-border/50",
    provider: "bg-primary/15 text-primary border-primary/30",
    document: "bg-muted text-muted-foreground border-border/50",
    decision: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    other: "bg-muted",
  };
  return m[c] ?? "bg-muted";
}