import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Banknote, Lock } from "lucide-react";

export const AF_NAV = [
  { to: "/founder/acquisition-funding",                label: "Command Centre" },
  { to: "/founder/acquisition-funding/opportunities",  label: "Opportunities" },
  { to: "/founder/acquisition-funding/funders",        label: "Funding Sources" },
  { to: "/founder/acquisition-funding/deals",          label: "Deal Structures" },
  { to: "/founder/acquisition-funding/pitches",        label: "Pitch Packs" },
];

export function AFLayout({
  title, subtitle, actions, children,
}: { title: string; subtitle?: string; actions?: ReactNode; children: ReactNode }) {
  const { pathname } = useLocation();
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Link to="/founder/command-centre" className="hover:text-primary inline-flex items-center gap-1">
            <ArrowLeft size={12} /> Command Centre
          </Link>
          <span>/</span><span>Acquisition Funding</span>
        </div>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2 flex-wrap">
              <Banknote size={20} className="text-primary" /> {title}
              <Badge variant="outline" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px]">Internal research</Badge>
              <Badge variant="outline" className="bg-yellow-500/15 text-yellow-300 border-yellow-500/30 text-[10px]">
                <Lock size={9} className="mr-1" /> Founder approval required for every funder, offer, bid or external outreach
              </Badge>
            </h1>
            {subtitle && <p className="text-sm text-muted-foreground mt-1 max-w-3xl">{subtitle}</p>}
          </div>
          {actions}
        </div>
        <Card className="tech-card">
          <div className="flex gap-1 overflow-x-auto p-2 text-xs">
            {AF_NAV.map(n => (
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

export function AFStat({ label, value, accent }: { label: string; value: number | string; accent?: "amber" | "rose" | "emerald" }) {
  const cls = accent === "amber" ? "text-amber-300" : accent === "rose" ? "text-rose-400" : accent === "emerald" ? "text-emerald-400" : "text-foreground";
  return (
    <Card className="tech-card">
      <div className="p-3">
        <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
        <p className={`text-lg font-bold tabular-nums ${cls}`}>{value}</p>
      </div>
    </Card>
  );
}