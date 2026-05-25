import { useEffect, useState } from "react";
import { PPLayout, PPSection, DecisionBadge } from "./_shared";
import { fetchScores, latestScorePerBusiness, type PriorityScore } from "@/lib/portfolioPrioritisationEngine";

export default function PPPark() {
  const [scores, setScores] = useState<PriorityScore[]>([]);
  useEffect(() => { fetchScores().then(setScores).catch(() => {}); }, []);
  const list = latestScorePerBusiness(scores).filter(s =>
    s.recommended_decision === "park" || s.recommended_decision === "pause" ||
    s.recommended_decision === "watch" || s.recommended_decision === "kill_review" ||
    s.recommended_decision === "exit_prepare"
  );
  return (
    <PPLayout title="Park / Pause / Kill review"
      subtitle="Distraction or risk candidates. Any pause, kill or exit-prepare action requires founder approval before execution.">
      <PPSection title={`Candidates (${list.length})`}>
        {list.length === 0 ? <p className="text-xs text-muted-foreground">No candidates.</p> : (
          <div className="space-y-2">
            {list.map(s => (
              <div key={s.id} className="border border-border/50 rounded p-3 flex items-center gap-2 flex-wrap">
                <span className="font-mono text-[11px]">{s.business_id.slice(0,8)}</span>
                <DecisionBadge decision={s.recommended_decision} />
                <span className="ml-auto text-sm font-bold text-primary">{s.total_priority_score.toFixed(1)}</span>
                <p className="basis-full text-[11px] text-muted-foreground">{s.reason_summary}</p>
              </div>
            ))}
          </div>
        )}
      </PPSection>
    </PPLayout>
  );
}