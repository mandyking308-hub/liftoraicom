import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Gavel, ArrowLeft, Lock } from "lucide-react";
import { DECISION_STATUS_META, DECISION_TYPE_LABEL, isIrreversible, type FounderDecision } from "@/lib/decisionRegister";

export const DEC_NAV = [
  { to: "/founder/decisions",             label: "Overview" },
  { to: "/founder/decisions/open",        label: "Open" },
  { to: "/founder/decisions/made",        label: "Made" },
  { to: "/founder/decisions/implemented", label: "Implemented" },
  { to: "/founder/decisions/review",      label: "Review" },
  { to: "/founder/decisions/settings",    label: "Settings" },
];

export function DecLayout({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  const { pathname } = useLocation();
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Link to="/founder/command-centre" className="hover:text-primary inline-flex items-center gap-1">
            <ArrowLeft size={12} /> Command Centre
          </Link>
          <span>/</span><span>Founder Decision Register</span>
        </div>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Gavel size={20} className="text-primary" />
            {title}
            <Badge variant="outline" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px]">Live capture</Badge>
            <Badge variant="outline" className="bg-yellow-500/15 text-yellow-300 border-yellow-500/30 text-[10px]">
              <Lock size={9} className="mr-1" /> Irreversible gated
            </Badge>
          </h1>
          {subtitle && <p className="text-sm text-muted-foreground mt-1 max-w-3xl">{subtitle}</p>}
        </div>
        <Card className="tech-card">
          <div className="flex gap-1 overflow-x-auto p-2 text-xs">
            {DEC_NAV.map(n => (
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

export function DecStat({ label, value, hint, tone }: { label: string; value: number|string; hint?: string; tone?: "ok"|"warn"|"bad" }) {
  const cls = tone === "bad" ? "border-red-500/40" : tone === "warn" ? "border-yellow-500/40" : tone === "ok" ? "border-emerald-500/40" : "border-border/50";
  return (
    <div className={`border ${cls} rounded p-3`}>
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className="text-lg font-bold">{value}</p>
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function DecisionRow({ d }: { d: FounderDecision }) {
  const status = DECISION_STATUS_META[d.decision_status] ?? DECISION_STATUS_META.needed;
  const irrev = isIrreversible(d);
  return (
    <div className="border border-border/50 rounded p-3 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className={`text-[10px] ${status.cls}`}>{status.label}</Badge>
        <Badge variant="outline" className="text-[10px]">{DECISION_TYPE_LABEL[d.decision_type] ?? d.decision_type}</Badge>
        {irrev && <Badge variant="outline" className="text-[10px] bg-red-500/15 text-red-300 border-red-500/30">Irreversible · gated</Badge>}
        {d.audit_metadata?.live_internal_test && (
          <Badge variant="outline" className="text-[10px] bg-blue-500/15 text-blue-300 border-blue-500/30">Live internal test</Badge>
        )}
        <span className="ml-auto text-[10px] text-muted-foreground">{d.source_module ?? "—"}</span>
      </div>
      <p className="text-sm font-semibold">{d.decision_title}</p>
      {d.decision_summary && <p className="text-xs text-muted-foreground">{d.decision_summary}</p>}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[11px]">
        <div><span className="text-muted-foreground">Recommended:</span> {d.recommended_option ?? "—"}</div>
        <div><span className="text-muted-foreground">Financial:</span> {d.financial_impact_summary ?? "—"}</div>
        <div><span className="text-muted-foreground">Risk:</span> {d.risk_summary ?? "—"}</div>
      </div>
      {d.options_json?.length > 0 && (
        <div className="text-[11px] space-y-1">
          <p className="text-muted-foreground">Options:</p>
          <ul className="space-y-0.5">
            {d.options_json.map(o => (
              <li key={o.key} className="flex gap-2">
                <span className="font-medium">{o.label}</span>
                {o.reasoning && <span className="text-muted-foreground">— {o.reasoning}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
      {d.deadline && (
        <p className="text-[10px] text-muted-foreground">Deadline: {new Date(d.deadline).toLocaleString()}</p>
      )}
    </div>
  );
}