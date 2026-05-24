import { supabase } from "@/integrations/supabase/client";
import { calculateActualAICost, flagPricingMissing } from "@/services/aiPricingRegistry";
import { sanitiseForPersistence, raiseSecurityAlert } from "@/services/aiSecurityGuard";

export type AIModelTier = "no_ai" | "cheap" | "standard" | "premium" | "human_required";
export type AIUsageStatus =
  | "pending"
  | "completed"
  | "failed"
  | "skipped"
  | "blocked"
  | "human_review_required";

export type LogAIUsageInput = {
  business_id?: string | null;
  agent_id?: string | null;
  task_id?: string | null;
  campaign_id?: string | null;
  workflow_id?: string | null;
  user_id?: string | null;
  action_type?: string | null;
  task_category?: string | null;
  model_used?: string | null;
  model_provider?: string | null;
  model_tier?: AIModelTier | null;
  prompt_tokens?: number;
  completion_tokens?: number;
  estimated_cost?: number;
  currency?: string;
  prompt_purpose?: string | null;
  /** SUMMARY ONLY — never store full confidential prompt text. */
  input_summary?: string | null;
  /** SUMMARY ONLY — never store full AI output text. */
  output_summary?: string | null;
  status?: AIUsageStatus;
  human_approved?: boolean;
  revenue_linked_amount?: number;
  pipeline_linked_amount?: number;
  time_saved_minutes?: number;
  human_equivalent_cost?: number;
  confidence_score?: number | null;
  error_message?: string | null;
  audit_metadata?: Record<string, unknown>;
};

function clipSummary(value: string | null | undefined, max = 500): string | null {
  if (!value) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  return trimmed.length > max ? trimmed.slice(0, max) + "…" : trimmed;
}

/**
 * Append a row to ai_usage_ledger. Safe by design:
 * - only summaries are stored; never full prompt or output text
 * - total_tokens is calculated from prompt + completion tokens
 * - currency defaults to GBP but is preserved if provided
 */
export async function logAIUsage(input: LogAIUsageInput) {
  const prompt = Math.max(0, Math.floor(input.prompt_tokens ?? 0));
  const completion = Math.max(0, Math.floor(input.completion_tokens ?? 0));

  // Auto-cost from the pricing registry when caller did not supply a cost
  // and we know the provider+model. This keeps the ledger honest even when
  // upstream code forgets to compute cost.
  let estimatedCost = input.estimated_cost;
  let currency = input.currency ?? "GBP";
  const auditExtras: Record<string, unknown> = {};
  if (
    (estimatedCost == null || estimatedCost === 0) &&
    input.model_provider &&
    input.model_used &&
    (prompt > 0 || completion > 0)
  ) {
    try {
      const cost = await calculateActualAICost({
        provider_name: input.model_provider,
        model_name: input.model_used,
        prompt_tokens: prompt,
        completion_tokens: completion,
        currency_preference: currency,
      });
      if (cost.pricing_missing) {
        auditExtras.pricing_missing = true;
        auditExtras.pricing_warning = cost.warning;
        await flagPricingMissing({
          provider_name: input.model_provider,
          model_name: input.model_used,
          business_id: input.business_id ?? null,
          agent_id: input.agent_id ?? null,
        });
      } else {
        estimatedCost = cost.display_total_cost;
        currency = cost.display_currency;
        auditExtras.pricing_rule_id = cost.pricing_rule_used?.id ?? null;
        auditExtras.pricing_provider_currency = cost.currency;
        auditExtras.pricing_native_total_cost = cost.estimated_total_cost;
        auditExtras.fx_converted = cost.fx_converted;
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn("[aiUsageLogger] pricing lookup failed", e);
    }
  }

  const row = {
    business_id: input.business_id ?? null,
    agent_id: input.agent_id ?? null,
    task_id: input.task_id ?? null,
    campaign_id: input.campaign_id ?? null,
    workflow_id: input.workflow_id ?? null,
    user_id: input.user_id ?? null,
    action_type: input.action_type ?? null,
    task_category: input.task_category ?? null,
    model_used: input.model_used ?? null,
    model_provider: input.model_provider ?? null,
    model_tier: input.model_tier ?? null,
    prompt_tokens: prompt,
    completion_tokens: completion,
    total_tokens: prompt + completion,
    estimated_cost: estimatedCost ?? 0,
    currency,
    prompt_purpose: input.prompt_purpose ?? null,
    input_summary: clipSummary(input.input_summary),
    output_summary: clipSummary(input.output_summary),
    status: input.status ?? "completed",
    human_approved: input.human_approved ?? false,
    revenue_linked_amount: input.revenue_linked_amount ?? 0,
    pipeline_linked_amount: input.pipeline_linked_amount ?? 0,
    time_saved_minutes: input.time_saved_minutes ?? 0,
    human_equivalent_cost: input.human_equivalent_cost ?? 0,
    confidence_score: input.confidence_score ?? null,
    error_message: input.error_message ?? null,
    audit_metadata: { ...(input.audit_metadata ?? {}), ...auditExtras },
    completed_at:
      (input.status ?? "completed") === "completed" || input.status === "failed"
        ? new Date().toISOString()
        : null,
  };

  // PII / secret redaction — never write raw sensitive content to the ledger.
  const sanitised = sanitiseForPersistence({
    input_summary: row.input_summary,
    output_summary: row.output_summary,
    error_message: row.error_message,
    audit_metadata: row.audit_metadata as Record<string, unknown>,
  });
  row.input_summary = sanitised.payload.input_summary ?? null;
  row.output_summary = sanitised.payload.output_summary ?? null;
  row.error_message = sanitised.payload.error_message ?? null;
  row.audit_metadata = sanitised.payload.audit_metadata as any;

  if (sanitised.flags.has_secrets) {
    // fire-and-forget: do not block logging on alert insert
    raiseSecurityAlert({
      alert_type: "secret_detected_in_prompt",
      severity: "high",
      business_id: row.business_id, agent_id: row.agent_id,
      metadata: { categories: sanitised.flags.has_secrets ? ["secret"] : [] },
    }).catch(() => {});
  }
  if (sanitised.redaction_changed && !sanitised.flags.has_secrets) {
    raiseSecurityAlert({
      alert_type: "sensitive_data_blocked_from_logging",
      severity: "warning",
      business_id: row.business_id, agent_id: row.agent_id,
      metadata: { categories: sanitised.flags },
    }).catch(() => {});
  }

  const { data, error } = await supabase
    .from("ai_usage_ledger")
    .insert(row as any)
    .select("id")
    .single();

  if (error) {
    // Logging must never break the caller — surface to console only.
    // eslint-disable-next-line no-console
    console.warn("[aiUsageLogger] failed to log:", error.message);
    return { id: null, error };
  }
  return { id: data?.id ?? null, error: null };
}

export function formatGBP(amount: number | null | undefined): string {
  const n = Number(amount ?? 0);
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(n) ? n : 0);
}