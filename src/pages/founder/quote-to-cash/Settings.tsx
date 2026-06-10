import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { QTCLayout, QTCSection } from "./_shared";
import { Badge } from "@/components/ui/badge";
import { Lock, ArrowRight, CheckCircle2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function QTCSettings() {
  const [stripe, setStripe] = useState<{ secret_key_configured: boolean; webhook_secret_configured: boolean; mode: string } | null>(null);
  useEffect(() => {
    supabase.functions.invoke("stripe-config-status", { body: {} }).then(({ data }) => {
      if (data && typeof data === "object") setStripe(data as any);
    }).catch(() => setStripe({ secret_key_configured: false, webhook_secret_configured: false, mode: "unknown" }));
  }, []);

  const stripeReady = stripe?.secret_key_configured && stripe?.webhook_secret_configured && stripe?.mode === "test";

  return (
    <QTCLayout title="Settings" subtitle="Provider wiring for invoices and payments. No external mutation is performed by Liftor until a provider is configured and founder approval rules allow.">
      <QTCSection title="Provider status" description="Stripe / invoice / contract / e-signature integrations. Live charging is locked.">
        <div className="space-y-2 text-xs">
          <div className="flex justify-between p-2 rounded border border-border/50">
            <span>Stripe secret key (<code>STRIPE_SECRET_KEY</code>)</span>
            <Badge variant="outline" className={`text-[10px] ${stripe?.secret_key_configured ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-yellow-500/15 text-yellow-300 border-yellow-500/30"}`}>
              {stripe?.secret_key_configured ? `configured (${stripe.mode})` : "not configured"}
            </Badge>
          </div>
          <div className="flex justify-between p-2 rounded border border-border/50">
            <span>Stripe webhook secret (<code>STRIPE_WEBHOOK_SECRET</code>)</span>
            <Badge variant="outline" className={`text-[10px] ${stripe?.webhook_secret_configured ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-yellow-500/15 text-yellow-300 border-yellow-500/30"}`}>
              {stripe?.webhook_secret_configured ? "configured" : "not configured"}
            </Badge>
          </div>
          <div className="flex justify-between p-2 rounded border border-border/50">
            <span>Stripe mode</span>
            <Badge variant="outline" className={`text-[10px] ${stripe?.mode === "test" ? "bg-blue-500/15 text-blue-400 border-blue-500/30" : "bg-muted text-muted-foreground"}`}>
              {stripe?.mode ?? "unknown"} mode
            </Badge>
          </div>
          <div className="flex justify-between p-2 rounded border border-border/50">
            <span>Live charging</span>
            <Badge variant="outline" className="text-[10px] bg-yellow-500/15 text-yellow-300 border-yellow-500/30">
              <Lock size={9} className="mr-1" /> locked
            </Badge>
          </div>
          <div className="flex items-center gap-2 pt-1 text-[11px]">
            {stripeReady
              ? <span className="text-emerald-400 inline-flex items-center gap-1"><CheckCircle2 size={12} /> Stripe is ready in TEST MODE. No live charges possible.</span>
              : <span className="text-yellow-400 inline-flex items-center gap-1"><AlertTriangle size={12} /> Stripe test-mode wiring incomplete — add both secrets.</span>}
          </div>
          {[
            ["Invoice provider", "not configured"],
            ["Contract / e-signature", "not configured"],
          ].map(([k,v]) => (
            <div key={k} className="flex justify-between p-2 rounded border border-border/50">
              <span>{k}</span>
              <Badge variant="outline" className="text-[10px] bg-yellow-500/15 text-yellow-300 border-yellow-500/30"><Lock size={9} className="mr-1" />{v}</Badge>
            </div>
          ))}
          <p className="text-[11px] text-muted-foreground pt-2">Stripe wiring runs through Supabase edge functions only. Frontend never sees the secret key.</p>
        </div>
      </QTCSection>
      <QTCSection title="Approval rules">
        <ul className="text-xs space-y-1 list-disc list-inside text-muted-foreground">
          <li>Quotes default to <code>founder_approval_required = true</code>.</li>
          <li>Proposals default to <code>founder_approval_required = true</code>.</li>
          <li>Invoices default to <code>founder_approval_required = true</code>.</li>
          <li>Payments are confirmed only on real provider webhook or manual founder verification.</li>
          <li>Test rows tagged <code>LIVE_INTERNAL_TEST</code> never create a confirmed revenue row.</li>
        </ul>
      </QTCSection>
      <QTCSection
        title="Payment architecture readiness"
        description="Pre-Stripe data check. Every payment must carry business, legal entity, payout status, gross/tax/fee/net so any individual business can be sold cleanly."
        actions={
          <Link to="/founder/quote-to-cash/payment-architecture-readiness" className="text-[11px] text-primary inline-flex items-center gap-1 hover:underline">
            Open readiness <ArrowRight size={11} />
          </Link>
        }
      >
        <ul className="text-xs space-y-1 list-disc list-inside text-muted-foreground">
          <li>Missing <code>business_id</code> → cannot be marked sale-ready.</li>
          <li>Missing <code>legal_entity</code> → defaults to <code>GSM_LLC</code> with a confirm-entity warning.</li>
          <li><code>temporary_payout_account_used = true</code> → funds flagged for reconciliation/transfer to primary GSM account.</li>
          <li>Test rows are visually marked and excluded from confirmed revenue totals.</li>
          <li>Manual payment confirmation remains available to founder/admin only and is audited.</li>
          <li>No external Stripe mutation occurs in this phase.</li>
        </ul>
      </QTCSection>
    </QTCLayout>
  );
}