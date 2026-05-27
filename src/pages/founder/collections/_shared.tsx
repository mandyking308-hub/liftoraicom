import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Coins, ArrowLeft, ShieldAlert } from "lucide-react";

export const COL_NAV = [
  { to: "/founder/collections",                label: "Overview" },
  { to: "/founder/collections/overdue",        label: "Overdue" },
  { to: "/founder/collections/failed-payments",label: "Failed payments" },
  { to: "/founder/collections/reminders",      label: "Reminders" },
  { to: "/founder/collections/payment-plans",  label: "Payment plans" },
  { to: "/founder/collections/service-holds",  label: "Service holds" },
  { to: "/founder/collections/settings",       label: "Settings" },
];

export function ColLayout({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  const { pathname } = useLocation();
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Link to="/founder/command-centre" className="hover:text-primary inline-flex items-center gap-1">
            <ArrowLeft size={12} /> Command Centre
          </Link>
          <span>/</span><span>Collections / Dunning</span>
        </div>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Coins size={20} className="text-primary" />
            {title}
            <Badge variant="outline" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px]">Live planning</Badge>
            <Badge variant="outline" className="bg-yellow-500/15 text-yellow-300 border-yellow-500/30 text-[10px]">
              <ShieldAlert size={9} className="mr-1" /> Chasing / retry / hold approval-gated
            </Badge>
          </h1>
          {subtitle && <p className="text-sm text-muted-foreground mt-1 max-w-3xl">{subtitle}</p>}
        </div>
        <Card className="tech-card">
          <div className="flex gap-1 overflow-x-auto p-2 text-xs">
            {COL_NAV.map(n => (
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

export function riskTone(t: string): "ok"|"warn"|"bad"|"muted" {
  if (t === "critical") return "bad";
  if (t === "high") return "bad";
  if (t === "medium") return "warn";
  return "ok";
}