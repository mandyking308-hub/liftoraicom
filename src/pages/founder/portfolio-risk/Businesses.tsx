import { useEffect, useState } from "react";
import { PRLayout, PRSection, StatusBadge, RiskBar } from "./_shared";
import {
  fetchRiskScores, latestPerBusiness, RISK_FIELDS,
  type RiskScore,
} from "@/lib/portfolioRiskEngine";

export default function PRBusinesses() {
  const [scores, setScores] = useState<RiskScore[]>([]);
  useEffect(() => { fetchRiskScores().then(setScores).catch(() => {}); }, []);
  const latest = latestPerBusiness(scores);
  return (
    <PRLayout title="Business risk cards" subtitle="Per-business breakdown across all 12 risk categories.">
      <PRSection title={`Business cards (${latest.length})`}>
        {latest.length === 0 ? (
          <p className="text-xs text-muted-foreground">No risk scores yet.</p>
        ) : (
          <div className="space-y-3">
            {latest.map(s => (
              <div key={s.id} className="border border-border/50 rounded p-3 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-[11px]">{s.business_id.slice(0, 8)}</span>
                  <StatusBadge status={s.risk_status} />
                  <span className="ml-auto text-base font-bold text-destructive">{s.total_risk_score.toFixed(2)}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
                  {RISK_FIELDS.map(f => {
                    const v = Number(s[f.key] ?? 0);
                    return (
                      <div key={String(f.key)} className="space-y-1">
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                          <span>{f.label}</span><span>{v.toFixed(1)}</span>
                        </div>
                        <RiskBar value={v} />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </PRSection>
    </PRLayout>
  );
}