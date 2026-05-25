import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PPLayout, PPSection, PPStat, DecisionBadge } from "./_shared";
import {
  fetchScores, fetchDecisions, summarize, diagnose, latestScorePerBusiness,
  type PriorityScore, type PriorityDecisionRow,
} from "@/lib/portfolioPrioritisationEngine";

export default function PPOverview() {
  const [scores, setScores] = useState<PriorityScore[]>([]);
  const [decisions, setDecisions] = useState<PriorityDecisionRow[]>([]);
  useEffect(() => {
    fetchScores().then(setScores).catch(() => {});
    fetchDecisions().then(setDecisions).catch(() => {});
  }, []);
  const sum = summarize(scores, decisions);
  const warns = diagnose(scores);
  const top = latestScorePerBusiness(scores).slice(0, 8);
  return (
    <PPLayout title="Portfolio Prioritisation"
      subtitle="Ranks every business by revenue potential, speed, buildability, AI operability, margin, compliance risk, exit fit, founder attention, cash, and market signal. Internal scoring runs live; pausing, killing, selling, contacting buyers or changing entity/legal structure require founder approval.">
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <PPStat label="Businesses scored" value={sum.businesses_scored} />
        <PPStat label="Avg score" value={sum.avg_score} hint="0–10" />
        <PPStat label="Build now" value={sum.build_now} />
        <PPStat label="Scale" value={sum.scale} />
        <PPStat label="Park / pause" value={sum.park + sum.pause} />
        <PPStat label="Decisions pending" value={sum.pending_decisions} hint="Founder review" />
      </div>

      <PPSection title="Warnings" description="Portfolio Prioritisation Agent diagnostics">
        {warns.length === 0 ? (
          <p className="text-xs text-muted-foreground">No portfolio warnings.</p>
        ) : (
          <ul className="text-xs space-y-1">
            {warns.map((w, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className={w.severity === "block" ? "text-destructive" : "text-yellow-300"}>•</span>
                <span className="text-muted-foreground font-mono">{w.business_id.slice(0,8)}</span>
                <span>{w.message}</span>
              </li>
            ))}
          </ul>
        )}
      </PPSection>

      <PPSection title="Top priorities" actions={<Link to="/founder/portfolio-prioritisation/scores" className="text-xs text-primary hover:underline">All scorecards →</Link>}>
        {top.length === 0 ? (
          <p className="text-xs text-muted-foreground">No scores yet. Run scoring to populate.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {top.map(s => (
              <div key={s.id} className="border border-border/50 rounded p-3 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-[11px]">{s.business_id.slice(0, 8)}</span>
                  <DecisionBadge decision={s.recommended_decision} />
                  <span className="ml-auto text-sm font-bold text-primary">{s.total_priority_score.toFixed(1)}</span>
                </div>
                <p className="text-[11px] text-muted-foreground">{s.reason_summary}</p>
              </div>
            ))}
          </div>
        )}
      </PPSection>
    </PPLayout>
  );
}