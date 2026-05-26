import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert } from "lucide-react";
import { Link } from "react-router-dom";
import {
  fetchRiskScores, fetchRiskItems, summarize, diagnose,
  type RiskScore, type RiskItem,
} from "@/lib/portfolioRiskEngine";

export default function PortfolioRiskCard() {
  const [scores, setScores] = useState<RiskScore[]>([]);
  const [items, setItems] = useState<RiskItem[]>([]);
  useEffect(() => {
    fetchRiskScores().then(setScores).catch(() => {});
    fetchRiskItems().then(setItems).catch(() => {});
  }, []);
  const sum = summarize(scores, items);
  const warns = diagnose(scores, items);
  const blocks = warns.filter(w => w.severity === "block").length;
  return (
    <Card className="tech-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <ShieldAlert size={14} className="text-primary" />
          Portfolio Risk Matrix
          <Badge variant="outline" className="ml-auto text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">Live</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="text-xs space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <Stat label="Scored" value={sum.businesses_scored} />
          <Stat label="Avg risk" value={sum.avg_risk} />
          <Stat label="Critical" value={sum.critical} />
          <Stat label="High" value={sum.high} />
          <Stat label="Open items" value={sum.open_items} />
          <Stat label="Critical items" value={sum.critical_items} />
        </div>
        {blocks > 0 && <p className="text-destructive">{blocks} blocking risk{blocks === 1 ? "" : "s"} — founder review required.</p>}
        <div className="flex gap-2 pt-1 flex-wrap">
          <Link to="/founder/portfolio-risk" className="text-primary hover:underline">Overview</Link>
          <Link to="/founder/portfolio-risk/matrix" className="text-primary hover:underline">Matrix</Link>
          <Link to="/founder/portfolio-risk/critical" className="text-primary hover:underline">Critical</Link>
          <Link to="/founder/portfolio-risk/actions" className="text-primary hover:underline">Actions</Link>
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="border border-border/50 rounded p-2">
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className="text-sm font-bold">{value}</p>
    </div>
  );
}