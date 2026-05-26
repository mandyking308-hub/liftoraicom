import { useQuery } from "@tanstack/react-query";
import { TsLayout, RiskTable } from "./_shared";
import { listRiskEvents } from "@/lib/trustSafety";

const PAY_TYPES = new Set(["suspicious_payment","chargeback_risk","refund_abuse","payout_risk"]);
export default function TsPayments() {
  const { data: all = [] } = useQuery({ queryKey: ["ts-payments"], queryFn: () => listRiskEvents({ limit: 500 }) });
  const rows = all.filter(r => PAY_TYPES.has(r.risk_type));
  return (
    <TsLayout title="Payment / payout risk" subtitle="Chargebacks, refund abuse, suspicious payments and payout holds. No payout is held automatically.">
      <RiskTable rows={rows} />
    </TsLayout>
  );
}
