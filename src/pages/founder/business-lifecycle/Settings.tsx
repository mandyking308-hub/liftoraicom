import { useEffect, useState } from "react";
import { BLLayout, BLSection, StageBadge } from "./_shared";
import { fetchStages, FOUNDER_CONFIRM_STAGES, type LifecycleStage, type StageCode } from "@/lib/businessLifecycleEngine";

export default function BLSettings() {
  const [stages, setStages] = useState<LifecycleStage[]>([]);
  useEffect(() => { fetchStages().then(setStages).catch(() => {}); }, []);
  return (
    <BLLayout title="Settings" subtitle="Lifecycle policy: which stages always require founder confirmation, and the approval-gated transitions.">
      <BLSection title="Stages that always require founder confirmation">
        <div className="flex flex-wrap gap-2">
          {FOUNDER_CONFIRM_STAGES.map(c => <StageBadge key={c} code={c} />)}
        </div>
        <p className="text-[11px] text-muted-foreground mt-2">
          Customer-live, revenue-live, scaling, exit-ready, paused, parked and sold/closed are confirmation-gated.
          Idea, research, build, internal-live and stable can move freely between each other.
        </p>
      </BLSection>
      <BLSection title={`Stage catalogue (${stages.length})`}>
        <ul className="text-xs space-y-1">
          {stages.map(s => (
            <li key={s.id} className="flex items-center gap-2">
              <StageBadge code={s.stage_code as StageCode} />
              <span className="text-muted-foreground">{s.stage_name}</span>
              {s.approval_required_for_entry && <span className="text-[10px] text-yellow-300">· confirmation required</span>}
            </li>
          ))}
        </ul>
      </BLSection>
    </BLLayout>
  );
}