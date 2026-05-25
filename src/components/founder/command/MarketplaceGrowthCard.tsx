import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, ArrowRight, Lock } from "lucide-react";
import { computeGrowthSnapshot } from "@/lib/marketplaceGrowthEngine";

export default function MarketplaceGrowthCard() {
  const { data: snap } = useQuery({ queryKey: ["mp-growth-card"], queryFn: computeGrowthSnapshot, refetchInterval: 90000 });

  return (
    <Card className="tech-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <TrendingUp size={14} className="text-primary" /> Marketplace Growth Loop
          <Badge variant="outline" className="ml-auto bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px]">Live internal</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="text-xs space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Cells" value={snap?.total_cells ?? 0} />
          <Stat label="Supply short" value={snap?.supply_short ?? 0} warn={!!(snap && snap.supply_short)} />
          <Stat label="Demand short" value={snap?.demand_short ?? 0} warn={!!(snap && snap.demand_short)} />
          <Stat label="Cold start" value={snap?.cold_start ?? 0} warn={!!(snap && snap.cold_start)} />
          <Stat label="Oversupplied" value={snap?.oversupplied ?? 0} />
          <Stat label="Watch" value={snap?.watch ?? 0} warn={!!(snap && snap.watch)} />
        </div>
        <p className="text-primary/90">{snap?.recommended_action ?? "—"}</p>
        <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
          <span>Failed match rate: <span className="font-mono">{((snap?.failed_match_rate ?? 0) * 100).toFixed(1)}%</span></span>
          <span>Open actions: <span className="font-mono">{snap?.growth_actions_open ?? 0}</span></span>
          <span className="inline-flex items-center gap-1"><Lock size={10} className="text-yellow-400" /> {snap?.growth_actions_approval ?? 0} need approval</span>
        </div>
        <div className="flex gap-2 pt-1 flex-wrap">
          <Link to="/founder/marketplace/liquidity" className="text-xs text-primary hover:underline inline-flex items-center gap-1">Liquidity <ArrowRight size={11} /></Link>
          <Link to="/founder/marketplace/growth-actions" className="text-xs text-primary hover:underline inline-flex items-center gap-1">Actions <ArrowRight size={11} /></Link>
          <Link to="/founder/marketplace/category-balance" className="text-xs text-primary hover:underline inline-flex items-center gap-1">Categories <ArrowRight size={11} /></Link>
          <Link to="/founder/marketplace/location-balance" className="text-xs text-primary hover:underline inline-flex items-center gap-1">Locations <ArrowRight size={11} /></Link>
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, warn }: { label: string; value: number | string; warn?: boolean }) {
  return (
    <div className="rounded border border-border/50 px-2 py-1.5">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`text-base font-bold ${warn ? "text-yellow-300" : "text-foreground"}`}>{value}</p>
    </div>
  );
}