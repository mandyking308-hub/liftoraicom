import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lock, ArrowLeft, ShieldCheck } from "lucide-react";

export const PR_NAV: { to: string; label: string }[] = [
  { to: "/founder/privacy", label: "Overview" },
  { to: "/founder/privacy/dsar", label: "DSAR Queue" },
  { to: "/founder/privacy/retention", label: "Retention" },
  { to: "/founder/privacy/consent", label: "Consent" },
  { to: "/founder/privacy/processors", label: "Processors" },
  { to: "/founder/privacy/breaches", label: "Breaches" },
  { to: "/founder/privacy/settings", label: "Settings" },
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
          <span>Data Protection / Privacy Operations</span>
        </div>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ShieldCheck size={20} className="text-primary" />
              {title}
              <Badge variant="outline" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px]">Live tracking</Badge>
              <Badge variant="outline" className="bg-yellow-500/15 text-yellow-300 border-yellow-500/30 text-[10px]">
                <Lock size={9} className="mr-1" /> Deletion / export / notices approval-gated
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

export function PREmpty({ title, hint }: { title: string; hint?: string }) {
  return (
    <Card className="tech-card border-dashed">
      <CardContent className="py-10 text-center space-y-2">
        <p className="text-sm font-medium">{title}</p>
        {hint && <p className="text-xs text-muted-foreground max-w-md mx-auto">{hint}</p>}
      </CardContent>
    </Card>
  );
}

export function PRStat({ label, value, hint, tone = "default" }: { label: string; value: ReactNode; hint?: string; tone?: "default" | "good" | "warn" | "bad" }) {
  const cls = tone === "good" ? "text-emerald-400" : tone === "warn" ? "text-yellow-400" : tone === "bad" ? "text-red-400" : "text-foreground";
  return (
    <Card className="tech-card">
      <CardContent className="p-4 space-y-1">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className={`text-2xl font-bold ${cls}`}>{value}</p>
        {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

export const PR_DSAR_TONE: Record<string, string> = {
  received: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  verifying_identity: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
  in_progress: "bg-primary/15 text-primary border-primary/30",
  approval_required: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
  completed: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  rejected: "bg-muted text-muted-foreground border-border/50",
  escalated: "bg-red-500/15 text-red-400 border-red-500/30",
};

export const PR_CONSENT_TONE: Record<string, string> = {
  granted: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  withdrawn: "bg-red-500/15 text-red-400 border-red-500/30",
  unknown: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
};

export const PR_BREACH_TONE: Record<string, string> = {
  suspected: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
  investigating: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  contained: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  report_required: "bg-red-500/15 text-red-400 border-red-500/30",
  reported: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  closed: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
};

export const PR_RISK_TONE: Record<string, string> = {
  low: "bg-muted text-muted-foreground border-border/50",
  medium: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  high: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  critical: "bg-red-500/15 text-red-400 border-red-500/30",
};

export function NoAutoActionsBanner() {
  return (
    <Card className="tech-card border-yellow-500/30 bg-yellow-500/5">
      <CardContent className="p-3 text-xs text-yellow-200 flex items-center gap-2">
        <Lock size={12} />
        Liftor never deletes user data, exports DSAR packages, sends legal responses or files regulator notices automatically. Every such action requires founder/legal approval.
      </CardContent>
    </Card>
  );
}