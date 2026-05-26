import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plug, ArrowLeft, Lock } from "lucide-react";

export const CR_NAV = [
  { to: "/founder/connectors",               label: "Overview" },
  { to: "/founder/connectors/registry",      label: "Registry" },
  { to: "/founder/connectors/health",        label: "Health" },
  { to: "/founder/connectors/webhooks",      label: "Webhooks" },
  { to: "/founder/connectors/secrets",       label: "Secrets" },
  { to: "/founder/connectors/business-map",  label: "Business Map" },
  { to: "/founder/connectors/settings",      label: "Settings" },
];

export function CRLayout({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  const { pathname } = useLocation();
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Link to="/founder/command-centre" className="hover:text-primary inline-flex items-center gap-1">
            <ArrowLeft size={12} /> Command Centre
          </Link>
          <span>/</span><span>Connectors</span>
        </div>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Plug size={20} className="text-primary" />
            {title}
            <Badge variant="outline" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px]">Live tracking</Badge>
            <Badge variant="outline" className="bg-yellow-500/15 text-yellow-300 border-yellow-500/30 text-[10px]">
              <Lock size={9} className="mr-1" /> Provider actions gated
            </Badge>
          </h1>
          {subtitle && <p className="text-sm text-muted-foreground mt-1 max-w-3xl">{subtitle}</p>}
        </div>
        <Card className="tech-card">
          <div className="flex gap-1 overflow-x-auto p-2 text-xs">
            {CR_NAV.map(n => (
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

export function CRStat({ label, value, hint, tone }: { label: string; value: number|string; hint?: string; tone?: "ok"|"warn"|"bad" }) {
  const cls = tone === "bad" ? "border-red-500/40" : tone === "warn" ? "border-yellow-500/40" : tone === "ok" ? "border-emerald-500/40" : "border-border/50";
  return (
    <div className={`border ${cls} rounded p-3`}>
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className="text-lg font-bold">{value}</p>
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function statusBadge(s: string) {
  const map: Record<string,string> = {
    live: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    healthy: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    configured: "bg-primary/15 text-primary border-primary/30",
    needed: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
    not_connected: "bg-muted text-muted-foreground border-border/50",
    not_needed: "bg-muted text-muted-foreground border-border/50",
    not_configured: "bg-muted text-muted-foreground border-border/50",
    paused: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
    warning: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
    error: "bg-red-500/15 text-red-300 border-red-500/30",
    failed: "bg-red-500/15 text-red-300 border-red-500/30",
    unknown: "bg-muted text-muted-foreground border-border/50",
  };
  return map[s] ?? "bg-muted text-muted-foreground border-border/50";
}

export function riskBadge(r: string) {
  const map: Record<string,string> = {
    low: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    medium: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
    high: "bg-orange-500/15 text-orange-300 border-orange-500/30",
    critical: "bg-red-500/15 text-red-300 border-red-500/30",
  };
  return map[r] ?? "bg-muted";
}