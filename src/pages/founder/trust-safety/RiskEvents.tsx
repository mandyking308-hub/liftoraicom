import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { TsLayout, RiskTable } from "./_shared";
import { Card } from "@/components/ui/card";
import { listRiskEvents, RiskType, RiskSeverity, RiskStatus } from "@/lib/trustSafety";

export default function TsRiskEvents() {
  const [type, setType] = useState<RiskType | "">("");
  const [severity, setSeverity] = useState<RiskSeverity | "">("");
  const [status, setStatus] = useState<RiskStatus | "">("");
  const { data: rows = [] } = useQuery({
    queryKey: ["ts-risk-events", type, severity, status],
    queryFn: () => listRiskEvents({ type: type || undefined, severity: severity || undefined, status: status || undefined, limit: 500 }),
  });
  return (
    <TsLayout title="Risk events" subtitle="All risk events detected across Liftor. Filter by type, severity or status. No external action taken from this page.">
      <Card className="tech-card p-3">
        <div className="grid md:grid-cols-3 gap-2 text-xs">
          <select className="h-8 bg-background border border-border/50 rounded px-2" value={type} onChange={e => setType(e.target.value as any)}>
            <option value="">All types</option>
            {["duplicate_account","suspicious_payment","chargeback_risk","refund_abuse","fake_seller","fake_buyer","abusive_message","spam","identity_mismatch","payout_risk","policy_violation","other"].map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select className="h-8 bg-background border border-border/50 rounded px-2" value={severity} onChange={e => setSeverity(e.target.value as any)}>
            <option value="">All severities</option>
            {["low","medium","high","critical"].map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select className="h-8 bg-background border border-border/50 rounded px-2" value={status} onChange={e => setStatus(e.target.value as any)}>
            <option value="">All statuses</option>
            {["open","review_required","action_required","resolved","false_positive","accepted"].map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </Card>
      <RiskTable rows={rows} />
    </TsLayout>
  );
}
