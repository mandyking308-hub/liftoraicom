import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PRLayout, PRSection, PRStat, StatusBadge } from "./_shared";
import {
  fetchRiskScores, fetchRiskItems, summarize, diagnose, latestPerBusiness,
  type RiskScore, type RiskItem,
} from "@/lib/portfolioRiskEngine";

export default function PROverview() {
  const [scores, setScores] = useState<RiskScore[]>([]);
  const [items, setItems] = useState<RiskItem[]>([]);
  useEffect(() => {
    fetchRiskScores().then(setScores).catch(() => {});
    fetchRiskItems().then(setItems).catch(() => {});
  }, []);
  const sum = summarize(scores, items);
  const warns = diagnose(scores, items);
  const top = latestPerBusiness(scores).slice(0, 8);
  return (
    <PRLayout title="Portfolio Risk Matrix"
      subtitle="Risk across legal, tax, data, AI cost, delivery, customer, reputation, compliance, cashflow, integrations, dependency and founder overload. Internal scoring runs live; legal/tax/compliance actions, customer notices, insurance and external communications require approval.">
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <PRStat label="Businesses scored" value={sum.businesses_scored} />
        <PRStat label="Avg risk" value={sum.avg_risk} hint="0–10" />
        <PRStat label="Critical" value={sum.critical} tone={sum.critical ? "danger" : undefined} />
        <PRStat label="High" value={sum.high} tone={sum.high ? "warn" : undefined} />
        <PRStat label="Open items" value={sum.open_items} />
        <PRStat label="Critical items" value={sum.critical_items} tone={sum.critical_items ? "danger" : undefined} />
      </div>

      <PRSection title="Warnings" description="Portfolio Risk Agent diagnostics — risks not hidden because a business is high priority.">
        {warns.length === 0 ? (
          <p className="text-xs text-muted-foreground">No portfolio risk warnings.</p>
        ) : (
          <ul className="text-xs space-y-1">
            {warns.slice(0, 50).map((w, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className={w.severity === "block" ? "text-destructive" : "text-yellow-300"}>•</span>
                <span className="text-muted-foreground font-mono">{w.business_id.slice(0, 8)}</span>
                <span>{w.message}</span>
              </li>
            ))}
          </ul>
        )}
      </PRSection>

      <PRSection title="Highest-risk businesses" actions={<Link to="/founder/portfolio-risk/businesses" className="text-xs text-primary hover:underline">All business cards →</Link>}>
        {top.length === 0 ? (
          <p className="text-xs text-muted-foreground">No risk scores yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {top.map(s => (
              <div key={s.id} className="border border-border/50 rounded p-3 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-[11px]">{s.business_id.slice(0, 8)}</span>
                  <StatusBadge status={s.risk_status} />
                  <span className="ml-auto text-sm font-bold text-destructive">{s.total_risk_score.toFixed(1)}</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Top: legal {s.legal_risk.toFixed(1)} · tax {s.tax_risk.toFixed(1)} · privacy {s.data_privacy_risk.toFixed(1)} · cashflow {s.cashflow_risk.toFixed(1)}
                </p>
              </div>
            ))}
          </div>
        )}
      </PRSection>
    </PRLayout>
  );
}