import { useQuery } from "@tanstack/react-query";
import { TsLayout, RiskTable } from "./_shared";
import { listRiskEvents } from "@/lib/trustSafety";

const ACCOUNT_TYPES = new Set(["duplicate_account","fake_seller","fake_buyer","identity_mismatch","policy_violation"]);
export default function TsAccounts() {
  const { data: all = [] } = useQuery({ queryKey: ["ts-accounts"], queryFn: () => listRiskEvents({ limit: 500 }) });
  const rows = all.filter(r => ACCOUNT_TYPES.has(r.risk_type));
  return (
    <TsLayout title="Account risk" subtitle="Duplicate accounts, fake sellers/buyers, identity mismatch and policy violations. Account suspensions require founder approval.">
      <RiskTable rows={rows} />
    </TsLayout>
  );
}
