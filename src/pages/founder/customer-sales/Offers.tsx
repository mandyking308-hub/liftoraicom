import { useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { CSLayout, CSEmptyState } from "./_shared";

type Offer = Record<string, any>;

function envelopeFromOffer(offer: Offer) {
  return {
    approved_price_amount: String(offer.approved_price_amount ?? offer.price_amount ?? ""),
    approved_currency: String(offer.approved_currency ?? offer.price_currency ?? "GBP").toUpperCase(),
    max_discount_percent: String(offer.max_discount_percent ?? 0),
    stripe_product_id: String(offer.stripe_product_id ?? ""),
    stripe_price_id: String(offer.stripe_price_id ?? ""),
    stripe_price_recurrence: String(offer.stripe_price_recurrence ?? ""),
    customer_segment_rules: JSON.stringify(offer.customer_segment_rules ?? {}, null, 2),
  };
}

export default function Offers() {
  const qc = useQueryClient();
  const sb: any = supabase;
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const { data: offers = [], isLoading } = useQuery({
    queryKey: ["customer-sales-standard-offers"],
    queryFn: async () => {
      const { data, error } = await sb.from("customer_sales_offers").select("*").order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  function beginEdit(offer: Offer) {
    setEditingId(offer.id);
    setDraft(envelopeFromOffer(offer));
  }

  async function approve(offer: Offer) {
    const amount = Number(draft.approved_price_amount);
    const maxDiscount = Number(draft.max_discount_percent);
    let segmentRules: unknown;
    try { segmentRules = JSON.parse(draft.customer_segment_rules || "{}"); }
    catch { toast.error("Customer segment rules must be valid JSON"); return; }
    if (!offer.business_id || !offer.product_id || !Number.isFinite(amount) || amount <= 0 ||
        !/^[A-Z]{3}$/.test(draft.approved_currency) || !Number.isFinite(maxDiscount) || maxDiscount < 0 || maxDiscount >= 100 ||
        !draft.stripe_product_id.trim() || !draft.stripe_price_id.trim()) {
      toast.error("Complete the approved price, currency, Stripe product and Stripe price first");
      return;
    }
    if (maxDiscount > 0 && offer.discount_allowed !== true) {
      toast.error("Enable discounts on this offer before approving a discount ceiling");
      return;
    }
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) { toast.error("A signed-in founder or admin is required"); return; }

    setSaving(true);
    const { error } = await sb.from("customer_sales_offers").update({
      approval_status: "approved",
      approved_at: new Date().toISOString(),
      approved_by: user.id,
      approved_price_amount: amount,
      approved_currency: draft.approved_currency,
      max_discount_percent: maxDiscount,
      customer_segment_rules: segmentRules,
      stripe_product_id: draft.stripe_product_id.trim(),
      stripe_price_id: draft.stripe_price_id.trim(),
      stripe_price_recurrence: draft.stripe_price_recurrence || null,
      standard_checkout_enabled: true,
      requires_founder_approval: false,
      offer_stage: "approved",
      active: true,
    }).eq("id", offer.id).eq("business_id", offer.business_id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    const otherApprovedOffers = await sb.from("customer_sales_offers").select("id", { count: "exact", head: true })
      .eq("business_id", offer.business_id).eq("approval_status", "approved")
      .eq("standard_checkout_enabled", true).neq("id", offer.id);
    let policyCurrencyReady = true;
    if (!otherApprovedOffers.error && (otherApprovedOffers.count ?? 0) === 0) {
      const policyCurrencyUpdate = await sb.from("customer_success_execution_policies")
        .update({ policy_currency: draft.approved_currency }).eq("business_id", offer.business_id)
        .select("business_id").maybeSingle();
      policyCurrencyReady = !policyCurrencyUpdate.error && !!policyCurrencyUpdate.data;
    } else if (otherApprovedOffers.error) {
      policyCurrencyReady = false;
    }
    if (policyCurrencyReady) toast.success("Standard checkout approved within this offer envelope");
    else toast.warning("Offer approved, but Customer Success policy currency could not be synchronized; cross-currency actions will escalate until corrected.");
    setEditingId(null);
    qc.invalidateQueries({ queryKey: ["customer-sales-standard-offers"] });
    qc.invalidateQueries({ queryKey: ["cs-list", "customer_sales_offers"] });
  }

  async function pause(offer: Offer) {
    const { error } = await sb.from("customer_sales_offers").update({
      approval_status: "paused",
      standard_checkout_enabled: false,
      requires_founder_approval: true,
      offer_stage: "paused",
      active: false,
    }).eq("id", offer.id).eq("business_id", offer.business_id);
    if (error) { toast.error(error.message); return; }
    toast.success("Standard checkout paused");
    qc.invalidateQueries({ queryKey: ["customer-sales-standard-offers"] });
    qc.invalidateQueries({ queryKey: ["cs-list", "customer_sales_offers"] });
  }

  return (
    <CSLayout
      title="Offers"
      subtitle="Founder-approved server-side checkout envelopes. Buyers cannot supply Stripe prices, amounts, currencies or return URLs."
    >
      {isLoading ? <p className="text-xs text-muted-foreground">Loading offers…</p> : offers.length === 0 ? (
        <CSEmptyState title="No offers configured" hint="Add an offer and product first, then approve its Stripe mapping and commercial limits here." />
      ) : (
        <div className="space-y-3">
          {offers.map((offer: Offer) => {
            const isApproved = offer.approval_status === "approved" && offer.standard_checkout_enabled === true;
            return (
              <Card key={offer.id} className="tech-card">
                <CardHeader className="pb-2">
                  <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span>{offer.offer_name || "(untitled offer)"}</span>
                    <Badge variant="outline" className={isApproved ? "border-emerald-500/40 text-emerald-400" : ""}>
                      {isApproved ? "approved checkout" : offer.approval_status ?? "draft"}
                    </Badge>
                  </CardTitle>
                  <p className="text-[11px] text-muted-foreground">Business {offer.business_id ?? "missing"} · Product {offer.product_id ?? "missing"}</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-4">
                    <div>Approved price: {offer.approved_price_amount ?? "—"} {offer.approved_currency ?? ""}</div>
                    <div>Discount ceiling: {offer.max_discount_percent ?? 0}%</div>
                    <div>Stripe price: {offer.stripe_price_id ?? "—"}</div>
                    <div>Stripe product: {offer.stripe_product_id ?? "—"}</div>
                  </div>
                  {editingId === offer.id ? (
                    <div className="grid gap-3 border-t border-border/50 pt-3 md:grid-cols-2">
                      <Field label="Approved amount"><Input type="number" min="0.01" step="0.01" value={draft.approved_price_amount ?? ""} onChange={e => setDraft({ ...draft, approved_price_amount: e.target.value })} /></Field>
                      <Field label="Approved currency"><Input maxLength={3} value={draft.approved_currency ?? ""} onChange={e => setDraft({ ...draft, approved_currency: e.target.value.toUpperCase() })} /></Field>
                      <Field label="Maximum discount (%)"><Input type="number" min="0" max="99.99" step="0.01" value={draft.max_discount_percent ?? "0"} onChange={e => setDraft({ ...draft, max_discount_percent: e.target.value })} /></Field>
                      <Field label="Stripe price ID"><Input value={draft.stripe_price_id ?? ""} onChange={e => setDraft({ ...draft, stripe_price_id: e.target.value })} placeholder="price_…" /></Field>
                      <Field label="Stripe product ID"><Input value={draft.stripe_product_id ?? ""} onChange={e => setDraft({ ...draft, stripe_product_id: e.target.value })} placeholder="prod_…" /></Field>
                      <Field label="Stripe recurrence"><Input value={draft.stripe_price_recurrence ?? ""} onChange={e => setDraft({ ...draft, stripe_price_recurrence: e.target.value })} placeholder="Leave empty for one-time; month, year, week or day" /></Field>
                      <Field label="Customer segment rules (JSON)" full>
                        <Textarea rows={4} value={draft.customer_segment_rules ?? "{}"} onChange={e => setDraft({ ...draft, customer_segment_rules: e.target.value })} />
                      </Field>
                      <div className="flex flex-wrap gap-2 md:col-span-2">
                        <Button size="sm" disabled={saving} onClick={() => approve(offer)}>{saving ? "Saving…" : "Approve standard checkout"}</Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2 border-t border-border/50 pt-3">
                      <Button size="sm" variant="outline" onClick={() => beginEdit(offer)}>{isApproved ? "Edit approved envelope" : "Configure approval"}</Button>
                      {isApproved && <Button size="sm" variant="destructive" onClick={() => pause(offer)}>Pause checkout</Button>}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </CSLayout>
  );
}

function Field({ label, children, full = false }: { label: string; children: ReactNode; full?: boolean }) {
  return <div className={full ? "space-y-1 md:col-span-2" : "space-y-1"}><Label className="text-[11px]">{label}</Label>{children}</div>;
}
