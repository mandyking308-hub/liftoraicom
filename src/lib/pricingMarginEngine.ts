import { supabase } from "@/integrations/supabase/client";

export type MarginStatus = "healthy" | "watch" | "poor" | "loss_making" | "unknown";

export const MARGIN_STATUS_META: Record<MarginStatus, { label: string; cls: string }> = {
  healthy: { label: "Healthy", cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  watch: { label: "Watch", cls: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30" },
  poor: { label: "Poor", cls: "bg-orange-500/15 text-orange-300 border-orange-500/30" },
  loss_making: { label: "Loss-making", cls: "bg-red-500/15 text-red-400 border-red-500/30" },
  unknown: { label: "Unknown", cls: "bg-muted text-muted-foreground border-border/50" },
};

export type MarginProfile = {
  id: string;
  business_id: string;
  product_id: string | null;
  offer_id: string | null;
  price_amount: number | null;
  currency: string;
  direct_cost_estimate: number | null;
  ai_cost_estimate: number | null;
  human_cost_estimate: number | null;
  payment_fee_estimate: number | null;
  support_cost_estimate: number | null;
  delivery_cost_estimate: number | null;
  refund_risk_estimate: number | null;
  gross_margin_amount: number | null;
  gross_margin_percent: number | null;
  margin_status: MarginStatus;
  created_at: string;
  updated_at: string;
};

export type DiscountRule = {
  id: string;
  business_id: string;
  product_id: string | null;
  offer_id: string | null;
  discount_name: string;
  max_discount_percent: number;
  discount_requires_approval: boolean;
  allowed_conditions: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type BreakevenModel = {
  id: string;
  business_id: string;
  product_id: string | null;
  fixed_costs: number;
  variable_cost_per_sale: number;
  price_per_sale: number;
  breakeven_units: number | null;
  breakeven_revenue: number | null;
  created_at: string;
  updated_at: string;
};

const sb = () => supabase as any;

export async function fetchMarginProfiles(): Promise<MarginProfile[]> {
  const { data, error } = await sb().from("product_margin_profiles").select("*").order("updated_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
export async function fetchDiscountRules(): Promise<DiscountRule[]> {
  const { data, error } = await sb().from("discount_rules").select("*").order("updated_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
export async function fetchBreakevenModels(): Promise<BreakevenModel[]> {
  const { data, error } = await sb().from("breakeven_models").select("*").order("updated_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/** Compute total cost & margin for a profile (excluding price). */
export function totalCost(p: MarginProfile): number {
  return (
    (p.direct_cost_estimate ?? 0) +
    (p.ai_cost_estimate ?? 0) +
    (p.human_cost_estimate ?? 0) +
    (p.payment_fee_estimate ?? 0) +
    (p.support_cost_estimate ?? 0) +
    (p.delivery_cost_estimate ?? 0) +
    (p.refund_risk_estimate ?? 0)
  );
}

export function computeMargin(p: MarginProfile): { amount: number; percent: number; status: MarginStatus } {
  const price = p.price_amount ?? 0;
  if (!price) return { amount: 0, percent: 0, status: "unknown" };
  const cost = totalCost(p);
  const amount = price - cost;
  const percent = (amount / price) * 100;
  let status: MarginStatus;
  if (amount <= 0) status = "loss_making";
  else if (percent < 15) status = "poor";
  else if (percent < 35) status = "watch";
  else status = "healthy";
  return { amount, percent, status };
}

export function computeBreakeven(m: BreakevenModel): { units: number | null; revenue: number | null } {
  const contribution = m.price_per_sale - m.variable_cost_per_sale;
  if (contribution <= 0) return { units: null, revenue: null };
  const units = m.fixed_costs / contribution;
  return { units, revenue: units * m.price_per_sale };
}

/** Effect of applying a discount % to a profile. */
export function discountedMargin(p: MarginProfile, discountPct: number): { amount: number; percent: number; status: MarginStatus } {
  if (!p.price_amount) return { amount: 0, percent: 0, status: "unknown" };
  const adjustedPrice = p.price_amount * (1 - discountPct / 100);
  const adjusted: MarginProfile = { ...p, price_amount: adjustedPrice };
  return computeMargin(adjusted);
}

export function summarize(profiles: MarginProfile[], rules: DiscountRule[], breakevens: BreakevenModel[]) {
  const counts: Record<MarginStatus, number> = { healthy: 0, watch: 0, poor: 0, loss_making: 0, unknown: 0 };
  for (const p of profiles) counts[p.margin_status]++;
  const businessIds = new Set(profiles.map(p => p.business_id));
  return {
    profiles_total: profiles.length,
    healthy: counts.healthy,
    watch: counts.watch,
    poor: counts.poor,
    loss_making: counts.loss_making,
    unknown: counts.unknown,
    businesses: businessIds.size,
    discount_rules: rules.length,
    risky_discounts: rules.filter(r => r.active && r.max_discount_percent >= 30).length,
    breakeven_models: breakevens.length,
  };
}

export type Recommendation = {
  id: string;
  severity: "info" | "warn" | "block";
  business_id: string;
  product_id: string | null;
  offer_id: string | null;
  action: "increase_price" | "reduce_cost" | "reduce_support" | "pause_offer" | "review_discount" | "set_breakeven";
  message: string;
};

export function diagnose(profiles: MarginProfile[], rules: DiscountRule[], breakevens: BreakevenModel[]): Recommendation[] {
  const out: Recommendation[] = [];
  for (const p of profiles) {
    const m = computeMargin(p);
    if (m.status === "loss_making") {
      out.push({
        id: p.id, severity: "block", business_id: p.business_id, product_id: p.product_id, offer_id: p.offer_id,
        action: "pause_offer",
        message: `Offer is loss-making (margin ${m.amount.toFixed(2)} ${p.currency}). Pause, raise price or cut cost.`,
      });
    } else if (m.status === "poor") {
      out.push({
        id: p.id, severity: "warn", business_id: p.business_id, product_id: p.product_id, offer_id: p.offer_id,
        action: "increase_price",
        message: `Margin only ${m.percent.toFixed(1)}% — recommend price increase or cost reduction.`,
      });
      if ((p.support_cost_estimate ?? 0) > (p.price_amount ?? 0) * 0.2) {
        out.push({
          id: p.id, severity: "warn", business_id: p.business_id, product_id: p.product_id, offer_id: p.offer_id,
          action: "reduce_support",
          message: `Support cost exceeds 20% of price — reduce support load.`,
        });
      }
    }
  }
  for (const r of rules.filter(r => r.active)) {
    const profile = profiles.find(p => (r.offer_id && p.offer_id === r.offer_id) || (!r.offer_id && r.product_id && p.product_id === r.product_id));
    if (!profile) continue;
    const after = discountedMargin(profile, r.max_discount_percent);
    if (after.status === "loss_making") {
      out.push({
        id: r.id, severity: "block", business_id: r.business_id, product_id: r.product_id, offer_id: r.offer_id,
        action: "review_discount",
        message: `Discount "${r.discount_name}" (${r.max_discount_percent}%) breaks margin — turns offer loss-making.`,
      });
    } else if (after.status === "poor") {
      out.push({
        id: r.id, severity: "warn", business_id: r.business_id, product_id: r.product_id, offer_id: r.offer_id,
        action: "review_discount",
        message: `Discount "${r.discount_name}" reduces margin to ${after.percent.toFixed(1)}% — review.`,
      });
    }
  }
  const productIdsWithBreakeven = new Set(breakevens.map(b => b.product_id));
  for (const p of profiles) {
    if (p.product_id && !productIdsWithBreakeven.has(p.product_id)) {
      out.push({
        id: p.id, severity: "info", business_id: p.business_id, product_id: p.product_id, offer_id: p.offer_id,
        action: "set_breakeven",
        message: `No break-even model for this product — add fixed/variable costs.`,
      });
    }
  }
  return out;
}