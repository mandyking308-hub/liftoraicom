import { useEffect, useState } from "react";
import { PRLayout, PRSection, HeatCell, StatusBadge } from "./_shared";
import {
  fetchRiskScores, latestPerBusiness, RISK_FIELDS,
  type RiskScore,
} from "@/lib/portfolioRiskEngine";

export default function PRMatrix() {
  const [scores, setScores] = useState<RiskScore[]>([]);
  useEffect(() => { fetchRiskScores().then(setScores).catch(() => {}); }, []);
  const latest = latestPerBusiness(scores);
  return (
    <PRLayout title="Risk matrix" subtitle="Heatmap of all 12 risk categories per business. Darker red = higher risk.">
      <PRSection title={`Heatmap (${latest.length} businesses)`}>
        {latest.length === 0 ? (
          <p className="text-xs text-muted-foreground">No risk scores yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[10px] border-separate border-spacing-1">
              <thead>
                <tr>
                  <th className="text-left text-muted-foreground font-normal px-1">Business</th>
                  <th className="text-left text-muted-foreground font-normal px-1">Status</th>
                  {RISK_FIELDS.map(f => (
                    <th key={String(f.key)} className="text-left text-muted-foreground font-normal px-1 whitespace-nowrap" title={f.label}>
                      {f.label.slice(0, 8)}
                    </th>
                  ))}
                  <th className="text-left text-muted-foreground font-normal px-1">Total</th>
                </tr>
              </thead>
              <tbody>
                {latest.map(s => (
                  <tr key={s.id}>
                    <td className="font-mono text-[11px] px-1 whitespace-nowrap">{s.business_id.slice(0, 8)}</td>
                    <td className="px-1"><StatusBadge status={s.risk_status} /></td>
                    {RISK_FIELDS.map(f => (
                      <td key={String(f.key)} className="px-1 min-w-[44px]">
                        <HeatCell value={Number(s[f.key] ?? 0)} />
                      </td>
                    ))}
                    <td className="px-1 font-bold text-destructive">{s.total_risk_score.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PRSection>
    </PRLayout>
  );
}