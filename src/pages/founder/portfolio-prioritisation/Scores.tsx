import { useEffect, useState } from "react";
import { PPLayout, PPSection, DecisionBadge, ScoreBar } from "./_shared";
import { fetchScores, latestScorePerBusiness, type PriorityScore } from "@/lib/portfolioPrioritisationEngine";

const FIELDS: Array<{ key: keyof PriorityScore; label: string }> = [
  { key: "revenue_potential_score", label: "Revenue potential" },
  { key: "speed_to_revenue_score", label: "Speed to revenue" },
  { key: "buildability_score", label: "Buildability" },
  { key: "ai_operability_score", label: "AI operability" },
  { key: "margin_score", label: "Margin" },
  { key: "compliance_risk_score", label: "Compliance safety" },
  { key: "exit_potential_score", label: "Exit potential" },
  { key: "founder_attention_required_score", label: "Founder attention (inv)" },
  { key: "cash_required_score", label: "Cash needed (inv)" },
  { key: "market_signal_score", label: "Market signal" },
];

export default function PPScores() {
  const [scores, setScores] = useState<PriorityScore[]>([]);
  useEffect(() => { fetchScores().then(setScores).catch(() => {}); }, []);
  const latest = latestScorePerBusiness(scores);
  return (
    <PPLayout title="Scorecards" subtitle="Latest weekly score per business with sub-score breakdown.">
      <PPSection title={`Scorecards (${latest.length})`}>
        {latest.length === 0 ? (
          <p className="text-xs text-muted-foreground">No scores yet.</p>
        ) : (
          <div className="space-y-3">
            {latest.map(s => (
              <div key={s.id} className="border border-border/50 rounded p-3 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-[11px]">{s.business_id.slice(0,8)}</span>
                  <DecisionBadge decision={s.recommended_decision} />
                  <span className="ml-auto text-base font-bold text-primary">{s.total_priority_score.toFixed(2)}</span>
                </div>
                {s.reason_summary && <p className="text-[11px] text-muted-foreground">{s.reason_summary}</p>}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
                  {FIELDS.map(f => {
                    const v = Number(s[f.key] ?? 0);
                    return (
                      <div key={String(f.key)} className="space-y-1">
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                          <span>{f.label}</span><span>{v.toFixed(1)}</span>
                        </div>
                        <ScoreBar value={v} />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </PPSection>
    </PPLayout>
  );
}