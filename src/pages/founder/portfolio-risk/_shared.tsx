import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, ArrowLeft, Lock } from "lucide-react";
import {
  STATUS_META, SEVERITY_META,
  type RiskStatus, type ItemSeverity,
} from "@/lib/portfolioRiskEngine";

export const PR_NAV = [
  { to: "/founder/portfolio-risk", label: "Overview" },
  { to: "/founder/portfolio-risk/matrix", label: "Risk matrix" },
  { to: "/founder/portfolio-risk/businesses", label: "Business cards" },
  { to: "/founder/portfolio-risk/critical", label: "Critical board" },
  { to: "/founder/portfolio-risk/actions", label: "Action queue" },
];

export function PRLayout({ title, subtitle, children, actions }: { title: string; subtitle?: string; children: ReactNode; actions?: ReactNode }) {
  const { pathname } = useLocation();
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Link to="/founder/command-centre" className="hover:text-primary inline-flex items-center gap-1">
            <ArrowLeft size={12} /> Command Centre
          </Link>
          <span>/</span>
          <span>Portfolio Risk Matrix</span>
        </div>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ShieldAlert size={20} className="text-primary" />
              {title}
              <Badge variant="outline" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px]">Live internal</Badge>
              <Badge variant="outline" className="bg-yellow-500/15 text-yellow-300 border-yellow-500/30 text-[10px]">
                <Lock size={9} className="mr-1" /> Legal / tax / customer actions gated
              </Badge>
            </h1>
            {subtitle && <p className="text-sm text-muted-foreground mt-1 max-w-3xl">{subtitle}</p>}
          </div>
          {actions}
        </div>
        <Card className="tech-card">
          <div className="flex gap-1 overflow-x-auto p-2 text-xs">
            {PR_NAV.map(n => (
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

export function PRSection({ title, description, children, actions }: { title: string; description?: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <Card className="tech-card">
      <CardHeader className="pb-3 flex flex-row items-start justify-between gap-2">
        <div>
          <CardTitle className="text-sm">{title}</CardTitle>
          {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
        </div>
        {actions}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function PRStat({ label, value, hint, tone }: { label: string; value: ReactNode; hint?: string; tone?: "danger" | "warn" | "ok" }) {
  const toneCls = tone === "danger" ? "text-destructive" : tone === "warn" ? "text-yellow-300" : tone === "ok" ? "text-emerald-400" : "";
  return (
    <Card className="tech-card">
      <CardContent className="p-4 space-y-1">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className={`text-2xl font-bold ${toneCls}`}>{value}</p>
        {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

export function StatusBadge({ status }: { status: RiskStatus }) {
  const m = STATUS_META[status];
  return <Badge variant="outline" className={`text-[10px] ${m.cls}`}>{m.label}</Badge>;
}

export function SeverityBadge({ severity }: { severity: ItemSeverity }) {
  const m = SEVERITY_META[severity];
  return <Badge variant="outline" className={`text-[10px] ${m.cls}`}>{m.label}</Badge>;
}

export function RiskBar({ value, max = 10 }: { value: number; max?: number }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const tone = value >= 8 ? "bg-destructive" : value >= 6 ? "bg-yellow-400" : value >= 4 ? "bg-sky-400" : "bg-emerald-500";
  return (
    <div className="h-1.5 w-full bg-secondary rounded overflow-hidden">
      <div className={`h-full ${tone}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function HeatCell({ value }: { value: number }) {
  const tone =
    value >= 8 ? "bg-destructive/40 text-destructive-foreground border-destructive/60" :
    value >= 6 ? "bg-yellow-500/30 text-yellow-100 border-yellow-500/50" :
    value >= 4 ? "bg-sky-500/20 text-sky-100 border-sky-500/40" :
    "bg-emerald-500/15 text-emerald-200 border-emerald-500/30";
  return (
    <div className={`text-[10px] font-mono text-center px-1 py-1 rounded border ${tone}`}>
      {value.toFixed(1)}
    </div>
  );
}