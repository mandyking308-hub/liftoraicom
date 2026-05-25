import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Target } from "lucide-react";
import { Link } from "react-router-dom";
import {
  fetchScores, fetchDecisions, summarize, diagnose,
  type PriorityScore, type PriorityDecisionRow,
} from "@/lib/portfolioPrioritisationEngine";

export default function PortfolioPrioritisationCard() {
  const [scores, setScores] = useState<PriorityScore[]>([]);
  const [decisions, setDecisions] = useState<PriorityDecisionRow[]>([]);
  useEffect(() => {
    fetchScores().then(setScores).catch(() => {});
    fetchDecisions().then(setDecisions).catch(() => {});
  }, []);
  const sum = summarize(scores, decisions);
  const warns = diagnose(scores);
  const blocks = warns.filter(w => w.severity === "block").length;
  return (
    <Card className="tech-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Target size={14} className="text-primary" />
          Portfolio Prioritisation
          <Badge variant="outline" className="ml-auto text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">Live</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="text-xs space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <Stat label="Scored" value={sum.businesses_scored} />
          <Stat label="Avg score" value={sum.avg_score} />
          <Stat label="Build now" value={sum.build_now} />
          <Stat label="Scale" value={sum.scale} />
          <Stat label="Park / pause" value={sum.park + sum.pause} />
          <Stat label="Pending decisions" value={sum.pending_decisions} />
        </div>
        {blocks > 0 && <p className="text-destructive">{blocks} blocking issue{blocks === 1 ? "" : "s"} — founder review required.</p>}
        {sum.kill_review > 0 && <p className="text-destructive">{sum.kill_review} kill-review flagged — approval-gated.</p>}
        <div className="flex gap-2 pt-1 flex-wrap">
          <Link to="/founder/portfolio-prioritisation" className="text-primary hover:underline">Overview</Link>
          <Link to="/founder/portfolio-prioritisation/scores" className="text-primary hover:underline">Scorecards</Link>
          <Link to="/founder/portfolio-prioritisation/build-now" className="text-primary hover:underline">Build now</Link>
          <Link to="/founder/portfolio-prioritisation/decisions" className="text-primary hover:underline">Decisions</Link>
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