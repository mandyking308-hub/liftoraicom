import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Rocket, ArrowLeft, ShieldAlert } from "lucide-react";

export const DEP_NAV = [
  { to: "/founder/deployment",                label: "Overview" },
  { to: "/founder/deployment/environments",   label: "Environments" },
  { to: "/founder/deployment/releases",       label: "Releases" },
  { to: "/founder/deployment/migrations",     label: "Migrations" },
  { to: "/founder/deployment/edge-functions", label: "Edge functions" },
  { to: "/founder/deployment/env-vars",       label: "Env vars" },
  { to: "/founder/deployment/rollback",       label: "Rollback" },
  { to: "/founder/deployment/settings",       label: "Settings" },
];

export function DepLayout({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  const { pathname } = useLocation();
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Link to="/founder/command-centre" className="hover:text-primary inline-flex items-center gap-1">
            <ArrowLeft size={12} /> Command Centre
          </Link>
          <span>/</span><span>Environment / Deployment Control</span>
        </div>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Rocket size={20} className="text-primary" />
            {title}
            <Badge variant="outline" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px]">Live tracking</Badge>
            <Badge variant="outline" className="bg-yellow-500/15 text-yellow-300 border-yellow-500/30 text-[10px]">
              <ShieldAlert size={9} className="mr-1" /> No auto-deploy · No secret values
            </Badge>
          </h1>
          {subtitle && <p className="text-sm text-muted-foreground mt-1 max-w-3xl">{subtitle}</p>}
        </div>
        <Card className="tech-card">
          <div className="flex gap-1 overflow-x-auto p-2 text-xs">
            {DEP_NAV.map(n => (
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

export function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "deployed" || status === "applied" || status === "healthy" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" :
    status === "pending" || status === "unknown" || status === "warning" || status === "deprecated" ? "bg-yellow-500/15 text-yellow-300 border-yellow-500/30" :
    status === "failed" || status === "error" || status === "rolled_back" || status === "cancelled" || status === "paused" ? "bg-red-500/15 text-red-300 border-red-500/30" :
    "bg-secondary/40 text-muted-foreground border-border/40";
  return <Badge variant="outline" className={`text-[10px] capitalize ${tone}`}>{status.replace(/_/g," ")}</Badge>;
}

export function SensitivityBadge({ s }: { s: string }) {
  const tone = s === "critical" ? "bg-red-500/15 text-red-300 border-red-500/30" :
               s === "high" ? "bg-yellow-500/15 text-yellow-300 border-yellow-500/30" :
               "bg-secondary/40 text-muted-foreground border-border/40";
  return <Badge variant="outline" className={`text-[10px] capitalize ${tone}`}>{s}</Badge>;
}