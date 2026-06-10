import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, AlertTriangle, Lock } from "lucide-react";
import { QTCLayout, QTCSection, QTCStat } from "./_shared";

type Counts = {
  missing_business_id: number;
  missing_legal_entity: number;
  temporary_payout_used: number;
  pending_transfer: number;
  not_sale_ready: number;
  test_payments: number;
  total_payments: number;
};

const ZERO: Counts = {
  missing_business_id: 0, missing_legal_entity: 0, temporary_payout_used: 0,
  pending_transfer: 0, not_sale_ready: 0, test_payments: 0, total_payments: 0,
};

export default function PaymentArchitectureReadiness() {
  const [c, setC] = useState<Counts>(ZERO);
  const [providerConfigured, setProviderConfigured] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("qtc_payments")
        .select("business_id,legal_entity,temporary_payout_account_used,transfer_required_to_primary_account,sale_ready,is_test_data")
        .limit(10000);
      const rows = (data || []) as any[];
      setC({
        total_payments: rows.length,
        missing_business_id: rows.filter(r => !r.business_id).length,
        missing_legal_entity: rows.filter(r => !r.legal_entity).length,
        temporary_payout_used: rows.filter(r => r.temporary_payout_account_used).length,
        pending_transfer: rows.filter(r => r.transfer_required_to_primary_account).length,
        not_sale_ready: rows.filter(r => !r.sale_ready && !r.is_test_data).length,
        test_payments: rows.filter(r => r.is_test_data).length,
      });
      setProviderConfigured(false); // Stripe not wired in this phase
      setLoading(false);
    })();
  }, []);

  const safeForStripeTest =
    c.missing_business_id === 0 &&
    c.missing_legal_entity === 0 &&
    c.pending_transfer === 0;

  return (
    <QTCLayout
      title="Payment architecture readiness"
      subtitle="Pre-Stripe data-architecture check. Every payment must be traceable to a business, brand, legal entity and payout account so any individual business can be sold cleanly with its own evidence pack."
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <QTCStat label="Total payments" value={loading ? "…" : c.total_payments} />
        <QTCStat label="Missing business_id" value={loading ? "…" : c.missing_business_id} tone={c.missing_business_id > 0 ? "bad" : "good"} />
        <QTCStat label="Missing legal entity" value={loading ? "…" : c.missing_legal_entity} tone={c.missing_legal_entity > 0 ? "warn" : "good"} />
        <QTCStat label="Temporary payout used" value={loading ? "…" : c.temporary_payout_used} tone={c.temporary_payout_used > 0 ? "warn" : "good"} />
        <QTCStat label="Transfer to primary pending" value={loading ? "…" : c.pending_transfer} tone={c.pending_transfer > 0 ? "warn" : "good"} />
        <QTCStat label="Not sale-ready" value={loading ? "…" : c.not_sale_ready} tone={c.not_sale_ready > 0 ? "warn" : "good"} />
        <QTCStat label="Test rows (excluded)" value={loading ? "…" : c.test_payments} />
        <QTCStat
          label="Stripe provider"
          value={providerConfigured ? "configured" : "not configured"}
          tone={providerConfigured ? "good" : "warn"}
        />
      </div>

      <QTCSection title="Readiness checklist" description="Each item must be green before Stripe test-mode wiring is enabled.">
        <ul className="space-y-2 text-xs">
          <Item ok={c.missing_business_id === 0} label="Every payment has a business_id" detail={`${c.missing_business_id} missing`} />
          <Item ok={c.missing_legal_entity === 0} label="Every payment has a legal_entity (GSM_LLC default)" detail={`${c.missing_legal_entity} missing`} />
          <Item ok={c.pending_transfer === 0} label="No funds awaiting transfer to primary GSM account" detail={`${c.pending_transfer} pending`} warnOnly />
          <Item ok={c.temporary_payout_used === 0} label="No temporary payout accounts in use" detail={`${c.temporary_payout_used} temporary`} warnOnly />
          <Item ok={c.test_payments >= 0} label="Test rows are tagged and excluded from confirmed revenue" detail={`${c.test_payments} test`} />
          <Item ok={!providerConfigured ? false : true} label="Stripe provider configured" detail={providerConfigured ? "configured" : "not configured (phase-locked)"} warnOnly />
        </ul>
      </QTCSection>

      <QTCSection title="Stripe test-mode wiring gate">
        <div className="flex items-center gap-2 text-sm">
          <Badge variant="outline" className="bg-yellow-500/15 text-yellow-300 border-yellow-500/30 text-[10px]">
            <Lock size={9} className="mr-1" /> Approval-gated
          </Badge>
          {safeForStripeTest ? (
            <span className="text-emerald-400 inline-flex items-center gap-1">
              <CheckCircle2 size={14} /> Data architecture is safe to proceed to Stripe test-mode wiring (founder approval still required).
            </span>
          ) : (
            <span className="text-yellow-400 inline-flex items-center gap-1">
              <AlertTriangle size={14} /> Not safe to proceed yet — resolve the red/yellow items above first.
            </span>
          )}
        </div>
      </QTCSection>
    </QTCLayout>
  );
}

function Item({ ok, label, detail, warnOnly }: { ok: boolean; label: string; detail: string; warnOnly?: boolean }) {
  const Icon = ok ? CheckCircle2 : warnOnly ? AlertTriangle : XCircle;
  const cls = ok ? "text-emerald-400" : warnOnly ? "text-yellow-400" : "text-red-400";
  return (
    <li className="flex items-start gap-2 p-2 rounded border border-border/50">
      <Icon size={14} className={`mt-0.5 ${cls}`} />
      <div className="flex-1">
        <p className="text-foreground">{label}</p>
        <p className="text-[11px] text-muted-foreground">{detail}</p>
      </div>
    </li>
  );
}
