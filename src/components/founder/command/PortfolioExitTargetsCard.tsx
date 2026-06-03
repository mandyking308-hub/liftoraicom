import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Target } from "lucide-react";
import { Link } from "react-router-dom";
import {
  fetchTargets, fetchSettings, summarisePortfolio, fmtMoney,
  type PortfolioExitTarget, type Settings,
} from "@/lib/portfolioExitTargetEngine";

export default function PortfolioExitTargetsCard() {
  const [t, setT] = useState<PortfolioExitTarget[]>([]);
  const [s, setS] = useState<Settings | null>(null);
  useEffect(() => {
    fetchTargets().then(setT).catch(() => {});
    fetchSettings().then(setS).catch(() => {});
  }, []);
  const sum = s ? summarisePortfolio(t, s) : null;
  return (
    <Card className="tech-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Target size={14} className="text-primary" />
          Portfolio Exit Targets
          <Badge variant="outline" className="ml-auto text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">Live</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="text-xs space-y-2">
        {!sum ? <p className="text-muted-foreground">Loading…</p> : (
          <>
            <div className="grid grid-cols-2 gap-2">
              <Stat label="Portfolio MRR" value={fmtMoney(sum.total_mrr)} />
              <Stat label="Portfolio ARR" value={fmtMoney(sum.total_arr)} />
              <Stat label="Activated" value={sum.activated} />
              <Stat label="Near sale trigger" value={sum.near_sale_trigger} />
            </div>
            {sum.needs_attention && (
              <p className="text-amber-300">Needs attention: <Link to={`/founder/portfolio-exit-targets/${sum.needs_attention.id}`} className="hover:underline">{sum.needs_attention.business_name}</Link></p>
            )}
          </>
        )}
        <div className="flex gap-2 pt-1 flex-wrap">
          <Link to="/founder/portfolio-exit-targets" className="text-primary hover:underline">Dashboard</Link>
          <Link to="/founder/portfolio-exit-targets/businesses" className="text-primary hover:underline">Businesses</Link>
          <Link to="/founder/portfolio-exit-targets/alerts" className="text-primary hover:underline">Alerts</Link>
          <Link to="/founder/portfolio-exit-targets/settings" className="text-primary hover:underline">Settings</Link>
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="border border-border/50 rounded p-2">
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className="text-sm font-bold tabular-nums">{value}</p>
    </div>
  );
}