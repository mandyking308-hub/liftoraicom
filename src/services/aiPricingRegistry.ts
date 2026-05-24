import { supabase } from "@/integrations/supabase/client";

export type ProviderPricing = {
  id: string;
  provider_name: string;
  model_name: string;
  model_tier: "cheap" | "standard" | "premium" | null;
  input_cost_per_1m_tokens: number;
  output_cost_per_1m_tokens: number;
  currency: string;
  effective_from: string;
  effective_to: string | null;
  active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type EstimateInput = {
  provider_name: string;
  model_name: string;
  estimated_input_tokens: number;
  estimated_output_tokens: number;
  currency_preference?: string;
};

export type ActualCostInput = {
  provider_name: string;
  model_name: string;
  prompt_tokens: number;
  completion_tokens: number;
  currency_preference?: string;
};

export type CostBreakdown = {
  estimated_input_cost: number;
  estimated_output_cost: number;
  estimated_total_cost: number;
  pricing_rule_used: ProviderPricing | null;
  currency: string;
  display_currency: string;
  display_total_cost: number;
  fx_converted: boolean;
  pricing_missing: boolean;
  warning?: string;
};

/**
 * Conservative FX defaults (provider currency → GBP).
 * If a real FX feed is not configured, we fall back to these so cost is never
 * silently zeroed. When a rate is missing we mark the result as unconverted.
 */
const FX_TO_GBP: Record<string, number> = {
  GBP: 1,
  USD: 0.79,
  EUR: 0.85,
};

function convert(amount: number, from: string, to: string): { value: number; converted: boolean } {
  const f = (from || "USD").toUpperCase();
  const t = (to || "GBP").toUpperCase();
  if (f === t) return { value: amount, converted: true };
  const fromRate = FX_TO_GBP[f];
  const toRate = FX_TO_GBP[t];
  if (!fromRate || !toRate) return { value: amount, converted: false };
  // amount in `from` → GBP → `to`
  const gbp = amount * fromRate;
  return { value: gbp / toRate, converted: true };
}

export async function findActivePricing(
  provider_name: string,
  model_name: string,
): Promise<ProviderPricing | null> {
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supabase
    .from("ai_provider_pricing")
    .select("*")
    .eq("provider_name", provider_name)
    .eq("model_name", model_name)
    .eq("active", true)
    .lte("effective_from", today)
    .order("effective_from", { ascending: false })
    .limit(5);
  if (!data || data.length === 0) return null;
  // Prefer rows whose effective_to is null or >= today.
  const valid = (data as ProviderPricing[]).filter(
    (r) => !r.effective_to || r.effective_to >= today,
  );
  return valid[0] ?? null;
}

function emptyCost(provider: string, model: string, currency: string, warning: string): CostBreakdown {
  return {
    estimated_input_cost: 0,
    estimated_output_cost: 0,
    estimated_total_cost: 0,
    pricing_rule_used: null,
    currency,
    display_currency: currency,
    display_total_cost: 0,
    fx_converted: false,
    pricing_missing: true,
    warning,
  };
}

export async function estimateAICost(input: EstimateInput): Promise<CostBreakdown> {
  const target = (input.currency_preference || "GBP").toUpperCase();
  const pricing = await findActivePricing(input.provider_name, input.model_name);
  if (!pricing) {
    return emptyCost(
      input.provider_name,
      input.model_name,
      target,
      `No active pricing for ${input.provider_name}/${input.model_name}. Add pricing in the Provider Pricing registry before re-running.`,
    );
  }
  const inTok = Math.max(0, Math.floor(input.estimated_input_tokens || 0));
  const outTok = Math.max(0, Math.floor(input.estimated_output_tokens || 0));
  const inCost = (inTok / 1_000_000) * Number(pricing.input_cost_per_1m_tokens || 0);
  const outCost = (outTok / 1_000_000) * Number(pricing.output_cost_per_1m_tokens || 0);
  const total = inCost + outCost;
  const fx = convert(total, pricing.currency, target);
  return {
    estimated_input_cost: inCost,
    estimated_output_cost: outCost,
    estimated_total_cost: total,
    pricing_rule_used: pricing,
    currency: pricing.currency,
    display_currency: fx.converted ? target : pricing.currency,
    display_total_cost: fx.value,
    fx_converted: fx.converted,
    pricing_missing: false,
  };
}

export async function calculateActualAICost(input: ActualCostInput): Promise<CostBreakdown> {
  return estimateAICost({
    provider_name: input.provider_name,
    model_name: input.model_name,
    estimated_input_tokens: input.prompt_tokens,
    estimated_output_tokens: input.completion_tokens,
    currency_preference: input.currency_preference,
  });
}

/**
 * Raise an ai_cost_alert when pricing is missing for a model that the
 * platform is being asked to run. Caller is responsible for blocking or
 * routing the action to founder approval — this only records the alert.
 */
export async function flagPricingMissing(opts: {
  provider_name: string;
  model_name: string;
  business_id?: string | null;
  agent_id?: string | null;
}) {
  try {
    await supabase.from("ai_cost_alerts").insert({
      alert_type: "pricing_missing",
      severity: "warning",
      business_id: opts.business_id ?? null,
      agent_id: opts.agent_id ?? null,
      title: `AI pricing missing for ${opts.provider_name}/${opts.model_name}`,
      description:
        "Liftor was asked to run a model with no active pricing record. The action was flagged pricing_missing. Add pricing in /founder/ai-cost/pricing before repeat use.",
      recommended_action: "review",
      status: "open",
    } as any);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn("[aiPricingRegistry] failed to record pricing_missing alert", e);
  }
}

export async function listPricing(): Promise<ProviderPricing[]> {
  const { data } = await supabase
    .from("ai_provider_pricing")
    .select("*")
    .order("provider_name", { ascending: true })
    .order("model_name", { ascending: true })
    .order("effective_from", { ascending: false });
  return (data ?? []) as ProviderPricing[];
}

export async function upsertPricing(row: Partial<ProviderPricing> & { id?: string }) {
  if (row.id) {
    const { error } = await supabase
      .from("ai_provider_pricing")
      .update({
        provider_name: row.provider_name,
        model_name: row.model_name,
        model_tier: row.model_tier ?? null,
        input_cost_per_1m_tokens: row.input_cost_per_1m_tokens ?? 0,
        output_cost_per_1m_tokens: row.output_cost_per_1m_tokens ?? 0,
        currency: row.currency ?? "USD",
        effective_from: row.effective_from,
        effective_to: row.effective_to ?? null,
        active: row.active ?? true,
        notes: row.notes ?? null,
      } as any)
      .eq("id", row.id);
    if (error) throw error;
    return;
  }
  const { error } = await supabase.from("ai_provider_pricing").insert({
    provider_name: row.provider_name!,
    model_name: row.model_name!,
    model_tier: row.model_tier ?? null,
    input_cost_per_1m_tokens: row.input_cost_per_1m_tokens ?? 0,
    output_cost_per_1m_tokens: row.output_cost_per_1m_tokens ?? 0,
    currency: row.currency ?? "USD",
    effective_from: row.effective_from ?? new Date().toISOString().slice(0, 10),
    effective_to: row.effective_to ?? null,
    active: row.active ?? true,
    notes: row.notes ?? null,
  } as any);
  if (error) throw error;
}

export async function deactivatePricing(id: string) {
  const { error } = await supabase
    .from("ai_provider_pricing")
    .update({ active: false } as any)
    .eq("id", id);
  if (error) throw error;
}

/**
 * Models that have appeared in the ledger but have no active pricing.
 * Powers the "Models without pricing" panel.
 */
export async function findLedgerModelsWithoutPricing(): Promise<
  Array<{ provider_name: string; model_name: string; usage_count: number }>
> {
  const { data: ledger } = await supabase
    .from("ai_usage_ledger")
    .select("model_provider, model_used")
    .not("model_used", "is", null)
    .limit(1000);
  if (!ledger) return [];
  const counts = new Map<string, { provider_name: string; model_name: string; usage_count: number }>();
  for (const r of ledger as any[]) {
    const provider = r.model_provider || "unknown";
    const model = r.model_used || "unknown";
    const key = `${provider}::${model}`;
    const prev = counts.get(key);
    if (prev) prev.usage_count += 1;
    else counts.set(key, { provider_name: provider, model_name: model, usage_count: 1 });
  }
  const { data: pricing } = await supabase
    .from("ai_provider_pricing")
    .select("provider_name, model_name, active");
  const known = new Set<string>(
    ((pricing ?? []) as any[])
      .filter((p) => p.active)
      .map((p) => `${p.provider_name}::${p.model_name}`),
  );
  return Array.from(counts.values()).filter(
    (m) => !known.has(`${m.provider_name}::${m.model_name}`),
  );
}

/**
 * Check estimated cost against limits. Caller passes the limit cap (£ in display currency).
 * Returns whether the action should be blocked or require approval.
 */
export function checkCostAgainstLimit(
  estimate: CostBreakdown,
  maxCostPerAction: number | null | undefined,
): { allowed: boolean; requires_approval: boolean; reason?: string } {
  if (estimate.pricing_missing) {
    return {
      allowed: false,
      requires_approval: true,
      reason: "Pricing missing — founder approval required before this model can run.",
    };
  }
  if (maxCostPerAction == null) return { allowed: true, requires_approval: false };
  if (estimate.display_total_cost > maxCostPerAction) {
    return {
      allowed: false,
      requires_approval: true,
      reason: `Estimated cost ${estimate.display_total_cost.toFixed(4)} ${estimate.display_currency} exceeds max ${maxCostPerAction} per action.`,
    };
  }
  return { allowed: true, requires_approval: false };
}