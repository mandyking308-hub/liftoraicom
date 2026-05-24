import { supabase } from "@/integrations/supabase/client";

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
    estimated_cost: input.estimated_cost ?? 0,
    currency: input.currency ?? "GBP",
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
    audit_metadata: input.audit_metadata ?? {},
    completed_at:
      (input.status ?? "completed") === "completed" || input.status === "failed"
        ? new Date().toISOString()
        : null,
  };

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