import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GitBranch } from "lucide-react";
import { Link } from "react-router-dom";
import {
  fetchStages, fetchAssignments, fetchTransitions, summarize, diagnose,
  type LifecycleStage, type Assignment, type TransitionEvent,
} from "@/lib/businessLifecycleEngine";

export default function BusinessLifecycleCard() {
  const [stages, setStages] = useState<LifecycleStage[]>([]);
  const [asgs, setAsgs] = useState<Assignment[]>([]);
  const [trs, setTrs] = useState<TransitionEvent[]>([]);
  useEffect(() => {
    fetchStages().then(setStages).catch(() => {});
    fetchAssignments().then(setAsgs).catch(() => {});
    fetchTransitions().then(setTrs).catch(() => {});
  }, []);
  const sum = summarize(stages, asgs, trs);
  const warns = diagnose(stages, asgs, trs);
  const blocks = warns.filter(w => w.severity === "block").length;
  return (
    <Card className="tech-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <GitBranch size={14} className="text-primary" />
          Business Lifecycle
          <Badge variant="outline" className="ml-auto text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">Live</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="text-xs space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <Stat label="Stages" value={sum.stages_active} />
          <Stat label="Assigned" value={sum.businesses_assigned} />
          <Stat label="Revenue live" value={sum.counts["revenue_live"] ?? 0} />
          <Stat label="Scaling" value={sum.counts["scaling"] ?? 0} />
          <Stat label="Paused / parked" value={(sum.counts["paused"] ?? 0) + (sum.counts["parked"] ?? 0)} />
          <Stat label="Pending transitions" value={sum.pending_transitions} />
        </div>
        {blocks > 0 && <p className="text-destructive">{blocks} transition{blocks === 1 ? "" : "s"} awaiting founder confirmation.</p>}
        <div className="flex gap-2 pt-1 flex-wrap">
          <Link to="/founder/business-lifecycle" className="text-primary hover:underline">Overview</Link>
          <Link to="/founder/business-lifecycle/businesses" className="text-primary hover:underline">Business map</Link>
          <Link to="/founder/business-lifecycle/transitions" className="text-primary hover:underline">Transitions</Link>
          <Link to="/founder/business-lifecycle/stages" className="text-primary hover:underline">Stages</Link>
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