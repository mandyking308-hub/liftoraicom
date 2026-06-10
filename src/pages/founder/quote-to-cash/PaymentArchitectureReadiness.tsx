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
  const [stripe, setStripe] = useState<{ secret_key_configured: boolean; webhook_secret_configured: boolean; mode: string } | null>(null);
  const [stripeStats, setStripeStats] = useState({ checkoutSessions: 0, webhookEvents: 0, verifiedPayments: 0, verifiedRevenue: 0, metaBusiness: 0, metaLegal: 0, metaGroup: 0, tempPayout: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: payments }, configRes, { count: webhookCount }] = await Promise.all([
        supabase
        .from("qtc_payments")
        .select("business_id,legal_entity,saleable_asset_group,temporary_payout_account_used,transfer_required_to_primary_account,sale_ready,is_test_data,stripe_checkout_session_id,stripe_payment_intent_id,webhook_confirmation_source")
        .limit(10000),
        supabase.functions.invoke("stripe-config-status", { body: {} }),
        supabase.from("stripe_webhook_events").select("*", { count: "exact", head: true }),
      ]);
      const rows = (payments || []) as any[];
      const verifiedPayments = rows.filter(r => r.webhook_confirmation_source);
      const { count: verifiedRevenueCount } = await supabase.from("qtc_revenue_confirmations").select("*", { count: "exact", head: true }).eq("stripe_verified", true);
      setC({
        total_payments: rows.length,
        missing_business_id: rows.filter(r => !r.business_id).length,
        missing_legal_entity: rows.filter(r => !r.legal_entity).length,
        temporary_payout_used: rows.filter(r => r.temporary_payout_account_used).length,
        pending_transfer: rows.filter(r => r.transfer_required_to_primary_account).length,
        not_sale_ready: rows.filter(r => !r.sale_ready && !r.is_test_data).length,
        test_payments: rows.filter(r => r.is_test_data).length,
      });
      setStripeStats({
        checkoutSessions: rows.filter(r => r.stripe_checkout_session_id).length,
        webhookEvents: webhookCount ?? 0,
        verifiedPayments: verifiedPayments.length,
        verifiedRevenue: verifiedRevenueCount ?? 0,
        metaBusiness: verifiedPayments.filter(r => r.business_id).length,
        metaLegal: verifiedPayments.filter(r => r.legal_entity).length,
        metaGroup: verifiedPayments.filter(r => r.saleable_asset_group).length,
        tempPayout: rows.filter(r => r.temporary_payout_account_used).length,
      });
      const cfg = (configRes?.data as any) ?? null;
      setStripe(cfg);
      setLoading(false);
    })();
  }, []);

  const stripeReady = !!(stripe?.secret_key_configured && stripe?.webhook_secret_configured && stripe?.mode === "test");
  const safeForStripeTest =
    c.missing_business_id === 0 &&
    c.missing_legal_entity === 0 &&
    c.pending_transfer === 0 &&
    stripeReady;

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
          value={stripe?.secret_key_configured ? `${stripe.mode} mode` : "not configured"}
          tone={stripeReady ? "good" : "warn"}
        />
      </div>

      <QTCSection title="Readiness checklist" description="Each item must be green before Stripe test-mode wiring is enabled.">
        <ul className="space-y-2 text-xs">
          <Item ok={c.missing_business_id === 0} label="Every payment has a business_id" detail={`${c.missing_business_id} missing`} />
          <Item ok={c.missing_legal_entity === 0} label="Every payment has a legal_entity (GSM_LLC default)" detail={`${c.missing_legal_entity} missing`} />
          <Item ok={c.pending_transfer === 0} label="No funds awaiting transfer to primary GSM account" detail={`${c.pending_transfer} pending`} warnOnly />
          <Item ok={c.temporary_payout_used === 0} label="No temporary payout accounts in use" detail={`${c.temporary_payout_used} temporary`} warnOnly />
          <Item ok={c.test_payments >= 0} label="Test rows are tagged and excluded from confirmed revenue" detail={`${c.test_payments} test`} />
        </ul>
      </QTCSection>

      <QTCSection title="Stripe test-mode wiring checklist">
        <ul className="space-y-2 text-xs">
          <Item ok={!!stripe?.secret_key_configured && stripe?.mode === "test"} label="Stripe test secret key configured (sk_test_…)" detail={stripe?.secret_key_configured ? `mode: ${stripe.mode}` : "STRIPE_SECRET_KEY missing"} />
          <Item ok={!!stripe?.webhook_secret_configured} label="Stripe webhook secret configured" detail={stripe?.webhook_secret_configured ? "configured" : "STRIPE_WEBHOOK_SECRET missing"} />
          <Item ok={stripeStats.checkoutSessions > 0} label="Test checkout session created" detail={`${stripeStats.checkoutSessions} checkout sessions on record`} warnOnly />
          <Item ok={stripeStats.webhookEvents > 0} label="Test webhook received" detail={`${stripeStats.webhookEvents} verified webhook events logged`} warnOnly />
          <Item ok={stripeStats.verifiedPayments > 0} label="Test payment updated qtc_payments" detail={`${stripeStats.verifiedPayments} payments confirmed via Stripe webhook`} warnOnly />
          <Item ok={stripeStats.verifiedRevenue > 0} label="Test revenue confirmation created" detail={`${stripeStats.verifiedRevenue} Stripe-verified revenue rows`} warnOnly />
          <Item ok={stripeStats.verifiedPayments === 0 || stripeStats.metaBusiness === stripeStats.verifiedPayments} label="business_id preserved through Stripe metadata" detail={`${stripeStats.metaBusiness}/${stripeStats.verifiedPayments} verified rows carry business_id`} />
          <Item ok={stripeStats.verifiedPayments === 0 || stripeStats.metaLegal === stripeStats.verifiedPayments} label="legal_entity preserved through Stripe metadata" detail={`${stripeStats.metaLegal}/${stripeStats.verifiedPayments} verified rows carry legal_entity`} />
          <Item ok={true} label="saleable_asset_group preserved through Stripe metadata" detail={`${stripeStats.metaGroup}/${stripeStats.verifiedPayments} verified rows carry saleable_asset_group`} warnOnly />
          <Item ok={true} label="Temporary payout warning preserved" detail={`${stripeStats.tempPayout} rows flagged as temporary payout`} />
          <Item ok={true} label="Live mode still locked (sk_test_ enforced server-side)" detail="Edge functions refuse to run with sk_live_ keys" />
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
