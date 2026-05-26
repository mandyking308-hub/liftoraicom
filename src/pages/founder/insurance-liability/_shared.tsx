import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, ArrowLeft, Lock } from "lucide-react";
import {
  POLICY_TYPE_META, POLICY_STATUS_META, SEVERITY_META, EVENT_TYPE_META,
  type PolicyType, type PolicyStatus, type Severity, type EventType,
} from "@/lib/insuranceLiabilityEngine";

export const INS_NAV = [
  { to: "/founder/insurance-liability",            label: "Overview" },
  { to: "/founder/insurance-liability/businesses", label: "Businesses" },
  { to: "/founder/insurance-liability/policies",   label: "Policies" },
  { to: "/founder/insurance-liability/gaps",       label: "Gaps" },
  { to: "/founder/insurance-liability/claims",     label: "Claims & events" },
];

export function InsLayout({ title, subtitle, children, actions }: { title: string; subtitle?: string; children: ReactNode; actions?: ReactNode }) {
  const { pathname } = useLocation();
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Link to="/founder/command-centre" className="hover:text-primary inline-flex items-center gap-1">
            <ArrowLeft size={12} /> Command Centre
          </Link>
          <span>/</span>
          <span>Insurance / Liability Matrix</span>
        </div>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ShieldCheck size={20} className="text-primary" />
              {title}
              <Badge variant="outline" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px]">Live internal</Badge>
              <Badge variant="outline" className="bg-yellow-500/15 text-yellow-300 border-yellow-500/30 text-[10px]">
                <Lock size={9} className="mr-1" /> Buy / change cover gated
              </Badge>
            </h1>
            {subtitle && <p className="text-sm text-muted-foreground mt-1 max-w-3xl">{subtitle}</p>}
          </div>
          {actions}
        </div>
        <Card className="tech-card">
          <div className="flex gap-1 overflow-x-auto p-2 text-xs">
            {INS_NAV.map(n => (
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

export function InsSection({ title, description, children, actions }: { title: string; description?: string; children: ReactNode; actions?: ReactNode }) {
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

export function InsStat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
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

export function PolicyTypeBadge({ t }: { t: PolicyType }) {
  const m = POLICY_TYPE_META[t] ?? POLICY_TYPE_META.other;
  return <Badge variant="outline" className={`text-[10px] ${m.cls}`}>{m.label}</Badge>;
}
export function PolicyStatusBadge({ s }: { s: PolicyStatus }) {
  const m = POLICY_STATUS_META[s] ?? POLICY_STATUS_META.missing;
  return <Badge variant="outline" className={`text-[10px] ${m.cls}`}>{m.label}</Badge>;
}
export function SeverityBadge({ s }: { s: Severity }) {
  const m = SEVERITY_META[s] ?? SEVERITY_META.medium;
  return <Badge variant="outline" className={`text-[10px] ${m.cls}`}>{m.label}</Badge>;
}
export function EventTypeBadge({ t }: { t: EventType }) {
  const m = EVENT_TYPE_META[t] ?? EVENT_TYPE_META.other;
  return <Badge variant="outline" className={`text-[10px] ${m.cls}`}>{m.label}</Badge>;
}

export function shortId(id: string | null | undefined, n = 6) {
  if (!id) return "—";
  return id.slice(0, n);
}

export function fmtMoney(n: number | null | undefined, currency = "GBP") {
  if (n == null) return "—";
  try { return new Intl.NumberFormat("en-GB", { style: "currency", currency, maximumFractionDigits: 0 }).format(Number(n)); }
  catch { return `${currency} ${Number(n).toFixed(0)}`; }
}