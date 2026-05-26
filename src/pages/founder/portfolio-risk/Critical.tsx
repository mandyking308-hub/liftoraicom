import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PRLayout, PRSection, StatusBadge, SeverityBadge } from "./_shared";
import {
  fetchRiskScores, fetchRiskItems, latestPerBusiness,
  CATEGORY_FIX_LINK, CATEGORY_LABEL,
  type RiskScore, type RiskItem,
} from "@/lib/portfolioRiskEngine";

export default function PRCritical() {
  const [scores, setScores] = useState<RiskScore[]>([]);
  const [items, setItems] = useState<RiskItem[]>([]);
  useEffect(() => {
    fetchRiskScores().then(setScores).catch(() => {});
    fetchRiskItems().then(setItems).catch(() => {});
  }, []);
  const critScores = latestPerBusiness(scores).filter(s => s.risk_status === "critical" || s.risk_status === "high");
  const critItems = items.filter(i => (i.severity === "critical" || i.severity === "high") && i.status !== "resolved" && i.status !== "accepted");
  return (
    <PRLayout title="Critical risk board" subtitle="Businesses in critical/high risk status and all unresolved critical/high risk items. Risks are not hidden because a business is high priority.">
      <PRSection title={`Businesses (${critScores.length})`}>
        {critScores.length === 0 ? (
          <p className="text-xs text-muted-foreground">No businesses in high/critical risk.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {critScores.map(s => (
              <div key={s.id} className="border border-destructive/30 rounded p-3 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-[11px]">{s.business_id.slice(0, 8)}</span>
                  <StatusBadge status={s.risk_status} />
                  <span className="ml-auto text-sm font-bold text-destructive">{s.total_risk_score.toFixed(1)}</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Drivers: legal {s.legal_risk.toFixed(1)} · tax {s.tax_risk.toFixed(1)} · privacy {s.data_privacy_risk.toFixed(1)} · compliance {s.compliance_risk.toFixed(1)} · cashflow {s.cashflow_risk.toFixed(1)} · customer {s.customer_risk.toFixed(1)}
                </p>
              </div>
            ))}
          </div>
        )}
      </PRSection>

      <PRSection title={`Risk items (${critItems.length})`} description="Approval-gated. External communications, legal/tax/insurance actions and customer notices require founder approval.">
        {critItems.length === 0 ? (
          <p className="text-xs text-muted-foreground">No critical or high open items.</p>
        ) : (
          <ul className="space-y-2">
            {critItems.map(i => {
              const fix = CATEGORY_FIX_LINK[i.risk_category];
              return (
                <li key={i.id} className="border border-border/50 rounded p-3 text-xs space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-[11px]">{i.business_id.slice(0, 8)}</span>
                    <SeverityBadge severity={i.severity} />
                    <span className="text-muted-foreground">{CATEGORY_LABEL[i.risk_category] ?? i.risk_category}</span>
                    {fix && <Link to={fix.to} className="ml-auto text-primary hover:underline">Fix in {fix.label} →</Link>}
                  </div>
                  <p>{i.risk_summary}</p>
                  {i.recommended_action && <p className="text-muted-foreground">Action: {i.recommended_action}</p>}
                </li>
              );
            })}
          </ul>
        )}
      </PRSection>
    </PRLayout>
  );
}