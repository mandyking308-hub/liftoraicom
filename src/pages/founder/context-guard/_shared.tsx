import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, ArrowLeft, Lock } from "lucide-react";

export const CG_NAV = [
  { to: "/founder/context-fabric", label: "Overview" },
  { to: "/founder/context-fabric/events", label: "Events" },
  { to: "/founder/context-fabric/missing-business", label: "Missing business" },
  { to: "/founder/context-fabric/cross-contamination", label: "Cross-contamination" },
  { to: "/founder/context-fabric/settings", label: "Settings" },
];

export function CGLayout({ title, subtitle, children, actions }: { title: string; subtitle?: string; children: ReactNode; actions?: ReactNode }) {
  const { pathname } = useLocation();
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Link to="/founder/command-centre" className="hover:text-primary inline-flex items-center gap-1">
            <ArrowLeft size={12} /> Command Centre
          </Link>
          <span>/</span>
          <span>Context Fabric</span>
        </div>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ShieldCheck size={20} className="text-primary" />
              {title}
              <Badge variant="outline" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px]">Live internal</Badge>
              <Badge variant="outline" className="bg-yellow-500/15 text-yellow-300 border-yellow-500/30 text-[10px]">
                <Lock size={9} className="mr-1" /> External actions gated
              </Badge>
            </h1>
            {subtitle && <p className="text-sm text-muted-foreground mt-1 max-w-3xl">{subtitle}</p>}
          </div>
          {actions}
        </div>
        <Card className="tech-card">
          <div className="flex gap-1 overflow-x-auto p-2 text-xs">
            {CG_NAV.map(n => (
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

export function CGSection({ title, description, children, actions }: { title: string; description?: string; children: ReactNode; actions?: ReactNode }) {
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

export function CGStat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <Card className="tech-card">
      <CardContent className="p-4 space-y-1">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold">{value}</p>
        {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

const SEV_CLS: Record<string, string> = {
  low: "bg-muted text-muted-foreground border-border/50",
  medium: "bg-primary/15 text-primary border-primary/30",
  high: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
  critical: "bg-destructive/15 text-destructive border-destructive/30",
};
export function SevBadge({ level }: { level: string }) {
  return <Badge variant="outline" className={`text-[10px] ${SEV_CLS[level] ?? "border-border/50"}`}>{level}</Badge>;
}

const ACTION_CLS: Record<string, string> = {
  allowed: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  warned: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
  approval_required: "bg-primary/15 text-primary border-primary/30",
  blocked: "bg-destructive/15 text-destructive border-destructive/30",
};
export function ActionBadge({ action }: { action: string }) {
  return <Badge variant="outline" className={`text-[10px] ${ACTION_CLS[action] ?? "border-border/50"}`}>{action.replace(/_/g, " ")}</Badge>;
}