import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FlaskConical, ArrowLeft, ShieldAlert } from "lucide-react";

export const EXP_NAV = [
  { to: "/founder/experiments",                  label: "Overview" },
  { to: "/founder/experiments/plans",            label: "Plans" },
  { to: "/founder/experiments/results",          label: "Results" },
  { to: "/founder/experiments/winners",          label: "Winners" },
  { to: "/founder/experiments/learning-library", label: "Learning library" },
];

export function ExpLayout({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  const { pathname } = useLocation();
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Link to="/founder/command-centre" className="hover:text-primary inline-flex items-center gap-1">
            <ArrowLeft size={12} /> Command Centre
          </Link>
          <span>/</span><span>Experiments</span>
        </div>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FlaskConical size={20} className="text-primary" />
            {title}
            <Badge variant="outline" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px]">Live planning</Badge>
            <Badge variant="outline" className="bg-yellow-500/15 text-yellow-300 border-yellow-500/30 text-[10px]">
              <ShieldAlert size={9} className="mr-1" /> External launch approval-gated
            </Badge>
          </h1>
          {subtitle && <p className="text-sm text-muted-foreground mt-1 max-w-3xl">{subtitle}</p>}
        </div>
        <Card className="tech-card">
          <div className="flex gap-1 overflow-x-auto p-2 text-xs">
            {EXP_NAV.map(n => (
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

export function TagBadge({ label, tone = "muted" }: { label: string; tone?: "muted"|"ok"|"warn"|"bad"|"info" }) {
  const cls =
    tone === "ok" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" :
    tone === "warn" ? "bg-yellow-500/15 text-yellow-300 border-yellow-500/30" :
    tone === "bad" ? "bg-red-500/15 text-red-300 border-red-500/30" :
    tone === "info" ? "bg-primary/15 text-primary border-primary/30" :
    "bg-secondary/40 text-muted-foreground border-border/40";
  return <Badge variant="outline" className={`text-[10px] capitalize ${cls}`}>{label.replace(/_/g," ")}</Badge>;
}