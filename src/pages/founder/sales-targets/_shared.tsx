import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lock, ArrowLeft, Target } from "lucide-react";

export const ST_NAV: { to: string; label: string }[] = [
  { to: "/founder/sales-targets", label: "Cockpit" },
  { to: "/founder/sales-targets/business", label: "Business Targets" },
  { to: "/founder/sales-targets/activity-plan", label: "Activity Plan" },
  { to: "/founder/sales-targets/conversion", label: "Conversion" },
  { to: "/founder/sales-targets/gaps", label: "Gaps" },
  { to: "/founder/sales-targets/forecast", label: "Forecast" },
];

export function STLayout({ title, subtitle, children, actions }: { title: string; subtitle?: string; children: ReactNode; actions?: ReactNode }) {
  const { pathname } = useLocation();
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Link to="/founder/command-centre" className="hover:text-primary inline-flex items-center gap-1">
            <ArrowLeft size={12} /> Command Centre
          </Link>
          <span>/</span>
          <span>Sales Target Achievement Engine</span>
        </div>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Target size={20} className="text-primary" />
              {title}
              <Badge variant="outline" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px]">Live operating</Badge>
              <Badge variant="outline" className="bg-yellow-500/15 text-yellow-300 border-yellow-500/30 text-[10px]">
                <Lock size={9} className="mr-1" /> External actions approval-gated
              </Badge>
            </h1>
            {subtitle && <p className="text-sm text-muted-foreground mt-1 max-w-3xl">{subtitle}</p>}
          </div>
          {actions}
        </div>
        <Card className="tech-card">
          <div className="flex gap-1 overflow-x-auto p-2 text-xs">
            {ST_NAV.map(n => (
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

export function STSection({ title, description, children, actions }: { title: string; description?: string; children: ReactNode; actions?: ReactNode }) {
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

export function STEmpty({ title, hint }: { title: string; hint?: string }) {
  return (
    <Card className="tech-card border-dashed">
      <CardContent className="py-10 text-center space-y-2">
        <p className="text-sm font-medium">{title}</p>
        {hint && <p className="text-xs text-muted-foreground max-w-md mx-auto">{hint}</p>}
      </CardContent>
    </Card>
  );
}

export const STATUS_TONE: Record<string, string> = {
  on_track: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  exceeded: "bg-emerald-500/25 text-emerald-300 border-emerald-500/40",
  watch: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
  behind: "bg-orange-500/15 text-orange-300 border-orange-500/30",
  critical: "bg-destructive/20 text-destructive border-destructive/30",
};

export function fmtMoney(n: number, ccy = "GBP") {
  try { return new Intl.NumberFormat("en-GB", { style: "currency", currency: ccy, maximumFractionDigits: 0 }).format(n || 0); }
  catch { return `${ccy} ${Math.round(n || 0).toLocaleString()}`; }
}