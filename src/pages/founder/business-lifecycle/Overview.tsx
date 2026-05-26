import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BLLayout, BLSection, BLStat, StageBadge } from "./_shared";
import {
  fetchStages, fetchAssignments, fetchTransitions, summarize, diagnose,
  type LifecycleStage, type Assignment, type TransitionEvent, type StageCode,
} from "@/lib/businessLifecycleEngine";

export default function BLOverview() {
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
  return (
    <BLLayout title="Business Lifecycle Stage Control"
      subtitle="Every business has a lifecycle stage. The stage controls which modules, agents and external actions apply. Moving to customer-live, revenue-live, scaling, exit-ready, paused, parked or sold-closed requires founder confirmation.">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <BLStat label="Stages defined" value={sum.stages_active} hint={`${sum.stages_total} total`} />
        <BLStat label="Businesses assigned" value={sum.businesses_assigned} />
        <BLStat label="Pending transitions" value={sum.pending_transitions} hint="Founder confirmation" />
        <BLStat label="Revenue live" value={sum.counts["revenue_live"] ?? 0} />
        <BLStat label="Scaling" value={sum.counts["scaling"] ?? 0} />
      </div>

      <BLSection title="Stage distribution" description="How many businesses sit in each lifecycle stage right now.">
        <div className="flex flex-wrap gap-2">
          {stages.map(s => (
            <div key={s.id} className="border border-border/50 rounded px-3 py-1.5 text-xs flex items-center gap-2">
              <StageBadge code={s.stage_code as StageCode} />
              <span className="font-bold">{sum.counts[s.stage_code] ?? 0}</span>
            </div>
          ))}
        </div>
      </BLSection>

      <BLSection title="Warnings" description="Lifecycle Agent diagnostics" actions={<Link to="/founder/business-lifecycle/transitions" className="text-xs text-primary hover:underline">Transition queue →</Link>}>
        {warns.length === 0 ? (
          <p className="text-xs text-muted-foreground">No lifecycle warnings.</p>
        ) : (
          <ul className="text-xs space-y-1">
            {warns.slice(0, 60).map((w, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className={w.severity === "block" ? "text-destructive" : w.severity === "warn" ? "text-yellow-300" : "text-muted-foreground"}>•</span>
                <span className="text-muted-foreground font-mono">{w.business_id.slice(0, 8)}</span>
                <span>{w.message}</span>
              </li>
            ))}
          </ul>
        )}
      </BLSection>
    </BLLayout>
  );
}