import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, ArrowLeft, Lock } from "lucide-react";

export const AIC_NAV = [
  { to: "/founder/ai-compliance", label: "Control Overview" },
  { to: "/founder/ai-compliance/systems", label: "AI System Inventory" },
  { to: "/founder/ai-compliance/data-flows", label: "Data Flow Register" },
  { to: "/founder/ai-compliance/oversight", label: "Human Oversight" },
  { to: "/founder/ai-compliance/evidence", label: "Evidence Pack" },
  { to: "/founder/ai-compliance/risk", label: "Risk Classifier" },
  { to: "/founder/ai-compliance/gaps", label: "Gaps & Actions" },
];

export function AICLayout({ title, subtitle, children, actions }: {
  title: string; subtitle?: string; children: ReactNode; actions?: ReactNode;
}) {
  const { pathname } = useLocation();
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Link to="/founder" className="hover:text-primary inline-flex items-center gap-1">
            <ArrowLeft size={12} /> Founder
          </Link>
          <span>/</span>
          <span>AI Compliance Control</span>
        </div>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ShieldCheck size={20} className="text-primary" />
              {title}
              <Badge variant="outline" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px]">Live internal</Badge>
              <Badge variant="outline" className="bg-yellow-500/15 text-yellow-300 border-yellow-500/30 text-[10px]">
                <Lock size={9} className="mr-1" /> External actions approval-gated
              </Badge>
            </h1>
            {subtitle && <p className="text-sm text-muted-foreground mt-1 max-w-3xl">{subtitle}</p>}
            <p className="text-[10px] text-muted-foreground mt-1 max-w-3xl">
              AI compliance readiness only — not legal advice. Adviser / legal review required for regulated decisions.
            </p>
          </div>
          {actions}
        </div>
        <Card className="tech-card">
          <div className="flex gap-1 overflow-x-auto p-2 text-xs">
            {AIC_NAV.map(n => (
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

export function AICSection({ title, description, children, actions }: {
  title: string; description?: string; children: ReactNode; actions?: ReactNode;
}) {
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

export function AICStat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
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

const RISK_CLS: Record<string, string> = {
  low: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  medium: "bg-primary/15 text-primary border-primary/30",
  high: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
  critical: "bg-destructive/15 text-destructive border-destructive/30",
};
export function RiskBadge({ level }: { level: string }) {
  return <Badge variant="outline" className={`text-[10px] ${RISK_CLS[level] ?? "border-border/50"}`}>{level}</Badge>;
}

const STATUS_CLS: Record<string, string> = {
  live: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  paused: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
  blocked: "bg-destructive/15 text-destructive border-destructive/30",
  retired: "bg-muted text-muted-foreground border-border/50",
  under_review: "bg-primary/15 text-primary border-primary/30",
};
export function StatusBadge({ status }: { status: string }) {
  return <Badge variant="outline" className={`text-[10px] ${STATUS_CLS[status] ?? "border-border/50"}`}>{status.replace(/_/g, " ")}</Badge>;
}

const SEV_CLS: Record<string, string> = {
  info: "bg-muted text-muted-foreground border-border/50",
  low: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  medium: "bg-primary/15 text-primary border-primary/30",
  high: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
  critical: "bg-destructive/15 text-destructive border-destructive/30",
};
export function SeverityBadge({ level }: { level: string }) {
  return <Badge variant="outline" className={`text-[10px] ${SEV_CLS[level] ?? "border-border/50"}`}>{level}</Badge>;
}

export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="border border-dashed border-border/50 rounded p-6 text-center text-xs text-muted-foreground space-y-2">
      <p className="font-medium text-foreground">{title}</p>
      {hint && <p>{hint}</p>}
      {action}
    </div>
  );
}