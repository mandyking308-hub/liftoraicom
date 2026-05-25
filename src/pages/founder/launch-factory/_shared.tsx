import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Rocket, ArrowLeft, Lock } from "lucide-react";

export const LF_NAV = [
  { to: "/founder/launch-factory", label: "Overview" },
  { to: "/founder/launch-factory/brand", label: "Brand" },
  { to: "/founder/launch-factory/domains", label: "Domains" },
  { to: "/founder/launch-factory/email", label: "Email" },
  { to: "/founder/launch-factory/socials", label: "Socials" },
  { to: "/founder/launch-factory/legal-pages", label: "Legal pages" },
  { to: "/founder/launch-factory/tracking", label: "Tracking" },
  { to: "/founder/launch-factory/checklist", label: "Checklist" },
];

export function LFLayout({ title, subtitle, children, actions }: { title: string; subtitle?: string; children: ReactNode; actions?: ReactNode }) {
  const { pathname } = useLocation();
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Link to="/founder/command-centre" className="hover:text-primary inline-flex items-center gap-1">
            <ArrowLeft size={12} /> Command Centre
          </Link>
          <span>/</span>
          <span>Launch Factory</span>
        </div>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Rocket size={20} className="text-primary" />
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
            {LF_NAV.map(n => (
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

export function LFSection({ title, description, children, actions }: { title: string; description?: string; children: ReactNode; actions?: ReactNode }) {
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

export function LFStat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
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

const STATUS_CLS: Record<string, string> = {
  missing: "bg-destructive/15 text-destructive border-destructive/30",
  draft: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
  configured: "bg-primary/15 text-primary border-primary/30",
  approval_required: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
  complete: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  not_needed: "bg-muted text-muted-foreground border-border/50",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={`text-[10px] ${STATUS_CLS[status] ?? "border-border/50 text-muted-foreground"}`}>
      {status.replace(/_/g, " ")}
    </Badge>
  );
}