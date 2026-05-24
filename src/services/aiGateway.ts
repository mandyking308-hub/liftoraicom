import { supabase } from "@/integrations/supabase/client";
import { routeAIModel, type RouteAIModelInput, type RouteAIModelDecision } from "@/services/aiModelRouter";
import { logAIUsage, type AIModelTier, type LogAIUsageInput } from "@/services/aiUsageLogger";
import { estimateActionCost, flagPricingMissing } from "@/services/aiPricingRegistry";
import { checkBusinessBudget } from "@/services/aiBudgetService";
import { checkAgentCostControl } from "@/services/aiAgentCostService";
import { evaluateStopLoss } from "@/services/aiStopLossService";
import {
  detectSensitiveContent,
  detectPromptInjection,
  redactSensitive,
  raiseSecurityAlert,
  type ContextTrust,
} from "@/services/aiSecurityGuard";
import { requiresHumanApproval, queueApprovalItem } from "@/services/aiApprovalGate";
import { acquireIdempotencyLock } from "@/services/aiQueueControl";
import { recordROISignal } from "@/services/aiRoiEngine";

/**
 * Liftor AI Gateway — central enforcement layer for EVERY AI action.
 *
 * RULE: All AI calls in Liftor MUST go through `aiGateway.execute()`.
 * Direct provider calls (OpenAI/Anthropic/Gemini/fetch ai.gateway.lovable.dev)
 * are NOT permitted because they bypass cost control, audit logging, security
 * checks, budgets, stop-loss, approvals and ROI tracking.
 *
 * Live-first: internal actions run live by default. Approval is required only
 * for genuinely high-risk external/sensitive actions.
 */

export type GatewayContextBlock = {
  source: string;
  trust: ContextTrust;
  content: string;
};

export type AIGatewayInput = {
  business_id?: string | null;
  agent_id?: string | null;
  campaign_id?: string | null;
  task_id?: string | null;
  workflow_id?: string | null;
  user_id?: string | null;
  action_type: string;
  task_category: string;
  requested_model_tier?: AIModelTier | null;
  risk_level?: "low" | "medium" | "high" | "critical" | null;
  requires_external_action?: boolean;
  contains_legal_financial_or_compliance_content?: boolean;
  input_summary: string;
  /** Full prompt — never persisted. */
  prompt_or_instruction: string;
  context_blocks?: GatewayContextBlock[];
  expected_output_type?: "text" | "json" | "tool_call" | "embedding" | "image";
  estimated_value?: number;
  idempotency_key?: string;
  metadata?: Record<string, unknown>;
  /** Provider call performed by the caller. The gateway wraps it. */
  invoke: (args: {
    model_tier: AIModelTier;
    redacted_prompt: string;
    redacted_context: GatewayContextBlock[];
    trace_id: string;
  }) => Promise<{
    output: string;
    output_summary?: string;
    model_provider: string;
    model_used: string;
    prompt_tokens: number;
    completion_tokens: number;
    raw?: unknown;
  }>;
};

export type AIGatewayResult = {
  trace_id: string;
  status: "completed" | "blocked" | "failed" | "approval_required" | "duplicate_prevented";
  selected_model_provider?: string;
  selected_model?: string;
  selected_model_tier?: AIModelTier;
  estimated_cost_before_run: number;
  actual_estimated_cost_after_run: number;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  output?: string;
  output_summary?: string;
  ledger_id?: string;
  approval_required: boolean;
  approval_queue_id?: string;
  blocked: boolean;
  blocked_reason?: string;
  alerts_created: string[];
  routing_reason?: string;
  risk_flags: string[];
  redaction_events: number;
  prompt_injection_detected: boolean;
  audit_metadata: Record<string, unknown>;
};

function newTraceId(): string {
  // RFC4122-ish trace id; safe in browser + edge.
  const g: any = globalThis as any;
  if (g.crypto?.randomUUID) return `trc_${g.crypto.randomUUID()}`;
  return `trc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function mapTierToProviderModel(tier: AIModelTier): { provider: string; model: string } {
  switch (tier) {
    case "premium": return { provider: "google", model: "google/gemini-2.5-pro" };
    case "standard": return { provider: "google", model: "google/gemini-3-flash-preview" };
    case "cheap": return { provider: "google", model: "google/gemini-2.5-flash-lite" };
    case "human_required": return { provider: "human", model: "human/required" };
    case "no_ai": return { provider: "none", model: "none" };
    default: return { provider: "google", model: "google/gemini-3-flash-preview" };
  }
}

/** Single typed entry point. ALL AI actions in Liftor must call this. */
export async function execute(input: AIGatewayInput): Promise<AIGatewayResult> {
  const trace_id = newTraceId();
  const alerts: string[] = [];
  const risk_flags: string[] = [];
  const audit_metadata: Record<string, unknown> = {
    trace_id,
    started_at: new Date().toISOString(),
    enforced_by: "aiGateway.execute",
    metadata: input.metadata ?? {},
  };

  // 1. Routing decision
  const routeInput: RouteAIModelInput = {
    business_id: input.business_id ?? null,
    agent_id: input.agent_id ?? null,
    task_category: input.task_category,
    action_type: input.action_type,
    risk_level: (input.risk_level as any) ?? null,
    estimated_value: input.estimated_value ?? null,
    requires_external_action: !!input.requires_external_action,
    contains_legal_financial_or_compliance_content: !!input.contains_legal_financial_or_compliance_content,
    campaign_id: input.campaign_id ?? null,
    task_id: input.task_id ?? null,
  };
  let routing: RouteAIModelDecision;
  try {
    routing = await routeAIModel(routeInput);
  } catch (e: any) {
    return baseFailure(trace_id, "routing_failed", String(e?.message ?? e), audit_metadata);
  }
  audit_metadata.routing = routing;

  const tier: AIModelTier = (input.requested_model_tier && routing.selected_model_tier !== "human_required")
    ? input.requested_model_tier
    : routing.selected_model_tier;

  // 2. Security: redact prompt + context, detect injection
  const redactedPrompt = redactSensitive(input.prompt_or_instruction);
  const redactedContext: GatewayContextBlock[] = (input.context_blocks ?? []).map((b) => ({
    source: b.source,
    trust: b.trust,
    content: redactSensitive(b.content),
  }));
  const redaction_events =
    (redactedPrompt !== input.prompt_or_instruction ? 1 : 0) +
    redactedContext.filter((b, i) => b.content !== (input.context_blocks?.[i]?.content ?? "")).length;
  if (redaction_events) risk_flags.push("redaction_applied");

  const untrusted = (input.context_blocks ?? []).filter((b) => b.trust === "untrusted_external");
  let prompt_injection_detected = false;
  for (const u of untrusted) {
    if (detectPromptInjection(u.content)) {
      prompt_injection_detected = true;
      risk_flags.push("prompt_injection_in_untrusted_context");
      await raiseSecurityAlert({
        business_id: input.business_id ?? null,
        category: "prompt_injection",
        severity: "high",
        summary: `Prompt injection detected in untrusted context (${u.source}) on ${input.action_type}`,
        metadata: { trace_id, source: u.source },
      }).catch(() => {});
      alerts.push("prompt_injection");
      break;
    }
  }

  const sensitive = detectSensitiveContent(input.prompt_or_instruction);
  if (sensitive.length) {
    risk_flags.push("sensitive_content_detected");
    audit_metadata.sensitive = sensitive.map((s) => s.category);
  }

  // 3. Idempotency
  if (input.idempotency_key) {
    const lock = await acquireIdempotencyLock(input.idempotency_key).catch(() => ({ acquired: true } as any));
    if (!lock.acquired) {
      return {
        trace_id, status: "duplicate_prevented",
        estimated_cost_before_run: 0, actual_estimated_cost_after_run: 0,
        prompt_tokens: 0, completion_tokens: 0, total_tokens: 0,
        approval_required: false, blocked: true, blocked_reason: "duplicate_prevented",
        alerts_created: alerts, risk_flags, redaction_events,
        prompt_injection_detected, audit_metadata,
      };
    }
  }

  // 4. Estimate cost
  const { provider, model } = mapTierToProviderModel(tier);
  const est = await estimateActionCost({
    model_provider: provider,
    model_used: model,
    model_tier: tier,
    prompt_tokens_estimate: Math.ceil(input.prompt_or_instruction.length / 4),
    completion_tokens_estimate: 400,
  }).catch(async (e) => {
    await flagPricingMissing({ model_provider: provider, model_used: model }).catch(() => {});
    alerts.push("pricing_missing");
    risk_flags.push("pricing_missing");
    return { estimated_cost: 0, currency: "GBP" } as any;
  });
  const estimated_cost_before_run = Number(est?.estimated_cost ?? 0);

  // 5. Budget + agent cap + stop-loss
  const budget = await checkBusinessBudget({
    business_id: input.business_id ?? null,
    estimated_cost: estimated_cost_before_run,
  }).catch(() => ({ allowed: true, severity: "ok" } as any));
  if (budget.severity === "warning") { alerts.push("budget_warning"); risk_flags.push("budget_warning"); }
  if (!budget.allowed) {
    return blockedResult(trace_id, "budget_hard_stop", { tier, provider, model, estimated_cost_before_run, alerts, risk_flags, redaction_events, prompt_injection_detected, audit_metadata });
  }

  const agentCap = await checkAgentCostControl({
    agent_id: input.agent_id ?? null,
    estimated_cost: estimated_cost_before_run,
  }).catch(() => ({ allowed: true } as any));
  if (!agentCap.allowed) {
    return blockedResult(trace_id, "agent_hard_cap", { tier, provider, model, estimated_cost_before_run, alerts, risk_flags, redaction_events, prompt_injection_detected, audit_metadata });
  }

  const stop = await evaluateStopLoss({
    business_id: input.business_id ?? null,
    agent_id: input.agent_id ?? null,
    campaign_id: input.campaign_id ?? null,
    task_category: input.task_category,
  }).catch(() => ({ paused: false } as any));
  if (stop.paused) {
    alerts.push("stop_loss_active");
    return blockedResult(trace_id, `stop_loss:${stop.scope ?? "unknown"}`, { tier, provider, model, estimated_cost_before_run, alerts, risk_flags, redaction_events, prompt_injection_detected, audit_metadata });
  }

  // 6. Approval requirement
  const needsApproval =
    routing.requires_human_approval ||
    requiresHumanApproval(input.task_category, (input.risk_level as any) ?? null) ||
    (!!input.requires_external_action) ||
    (!!input.contains_legal_financial_or_compliance_content);

  if (needsApproval) {
    const queued = await queueApprovalItem({
      business_id: input.business_id ?? null,
      agent_id: input.agent_id ?? null,
      category: input.task_category,
      risk_level: (input.risk_level as any) ?? "high",
      summary: input.input_summary,
      trace_id,
      estimated_cost: estimated_cost_before_run,
    }).catch(() => ({ id: null } as any));
    const ledger = await logAIUsage({
      ...baseLedgerInput(input, tier, provider, model, trace_id),
      estimated_cost: estimated_cost_before_run,
      status: "human_review_required",
    }).catch(() => ({ id: undefined } as any));
    return {
      trace_id, status: "approval_required",
      selected_model_provider: provider, selected_model: model, selected_model_tier: tier,
      estimated_cost_before_run, actual_estimated_cost_after_run: 0,
      prompt_tokens: 0, completion_tokens: 0, total_tokens: 0,
      ledger_id: ledger?.id, approval_required: true, approval_queue_id: queued?.id ?? undefined,
      blocked: false, alerts_created: alerts, routing_reason: routing.routing_reason,
      risk_flags, redaction_events, prompt_injection_detected,
      audit_metadata: { ...audit_metadata, approval_queue_id: queued?.id ?? null },
    };
  }

  // 7. Run provider call (caller-supplied invoke)
  let providerResult: Awaited<ReturnType<typeof input.invoke>>;
  try {
    providerResult = await input.invoke({
      model_tier: tier,
      redacted_prompt: redactedPrompt,
      redacted_context: redactedContext,
      trace_id,
    });
  } catch (e: any) {
    await logAIUsage({
      ...baseLedgerInput(input, tier, provider, model, trace_id),
      estimated_cost: estimated_cost_before_run,
      status: "failed",
      output_summary: `error: ${String(e?.message ?? e).slice(0, 200)}`,
    }).catch(() => {});
    alerts.push("provider_failure");
    return {
      trace_id, status: "failed",
      selected_model_provider: provider, selected_model: model, selected_model_tier: tier,
      estimated_cost_before_run, actual_estimated_cost_after_run: 0,
      prompt_tokens: 0, completion_tokens: 0, total_tokens: 0,
      approval_required: false, blocked: false, alerts_created: alerts,
      routing_reason: routing.routing_reason,
      risk_flags: [...risk_flags, "provider_failure"], redaction_events,
      prompt_injection_detected, audit_metadata: { ...audit_metadata, error: String(e?.message ?? e) },
    };
  }

  const prompt_tokens = providerResult.prompt_tokens ?? 0;
  const completion_tokens = providerResult.completion_tokens ?? 0;

  // 8. Actual cost
  const actual = await estimateActionCost({
    model_provider: providerResult.model_provider,
    model_used: providerResult.model_used,
    model_tier: tier,
    prompt_tokens_estimate: prompt_tokens,
    completion_tokens_estimate: completion_tokens,
  }).catch(() => ({ estimated_cost: estimated_cost_before_run } as any));
  const actual_estimated_cost_after_run = Number(actual?.estimated_cost ?? estimated_cost_before_run);

  // 9. Ledger row
  const ledger = await logAIUsage({
    ...baseLedgerInput(input, tier, providerResult.model_provider, providerResult.model_used, trace_id),
    prompt_tokens, completion_tokens,
    estimated_cost: actual_estimated_cost_after_run,
    output_summary: providerResult.output_summary ?? input.input_summary,
    status: "completed",
  }).catch(() => ({ id: undefined } as any));

  // 10. ROI hook (non-blocking)
  recordROISignal({
    ledger_id: ledger?.id,
    business_id: input.business_id ?? null,
    agent_id: input.agent_id ?? null,
    estimated_value: input.estimated_value ?? 0,
    actual_cost: actual_estimated_cost_after_run,
    trace_id,
  }).catch(() => {});

  return {
    trace_id, status: "completed",
    selected_model_provider: providerResult.model_provider,
    selected_model: providerResult.model_used,
    selected_model_tier: tier,
    estimated_cost_before_run,
    actual_estimated_cost_after_run,
    prompt_tokens, completion_tokens, total_tokens: prompt_tokens + completion_tokens,
    output: providerResult.output,
    output_summary: providerResult.output_summary,
    ledger_id: ledger?.id, approval_required: false, blocked: false,
    alerts_created: alerts, routing_reason: routing.routing_reason,
    risk_flags, redaction_events, prompt_injection_detected,
    audit_metadata: { ...audit_metadata, finished_at: new Date().toISOString() },
  };
}

function baseLedgerInput(
  input: AIGatewayInput,
  tier: AIModelTier,
  provider: string,
  model: string,
  trace_id: string,
): LogAIUsageInput {
  return {
    business_id: input.business_id ?? null,
    agent_id: input.agent_id ?? null,
    task_id: input.task_id ?? null,
    campaign_id: input.campaign_id ?? null,
    workflow_id: input.workflow_id ?? null,
    user_id: input.user_id ?? null,
    action_type: input.action_type,
    task_category: input.task_category,
    model_used: model,
    model_provider: provider,
    model_tier: tier,
    input_summary: input.input_summary,
    audit_metadata: { trace_id, enforced_by: "aiGateway" } as any,
  } as LogAIUsageInput;
}

function baseFailure(trace_id: string, reason: string, detail: string, audit_metadata: Record<string, unknown>): AIGatewayResult {
  return {
    trace_id, status: "failed",
    estimated_cost_before_run: 0, actual_estimated_cost_after_run: 0,
    prompt_tokens: 0, completion_tokens: 0, total_tokens: 0,
    approval_required: false, blocked: true, blocked_reason: reason,
    alerts_created: [reason], risk_flags: [reason], redaction_events: 0,
    prompt_injection_detected: false,
    audit_metadata: { ...audit_metadata, error: detail },
  };
}

function blockedResult(
  trace_id: string,
  reason: string,
  ctx: { tier: AIModelTier; provider: string; model: string; estimated_cost_before_run: number;
    alerts: string[]; risk_flags: string[]; redaction_events: number;
    prompt_injection_detected: boolean; audit_metadata: Record<string, unknown> },
): AIGatewayResult {
  return {
    trace_id, status: "blocked",
    selected_model_provider: ctx.provider, selected_model: ctx.model, selected_model_tier: ctx.tier,
    estimated_cost_before_run: ctx.estimated_cost_before_run,
    actual_estimated_cost_after_run: 0,
    prompt_tokens: 0, completion_tokens: 0, total_tokens: 0,
    approval_required: false, blocked: true, blocked_reason: reason,
    alerts_created: ctx.alerts, risk_flags: ctx.risk_flags,
    redaction_events: ctx.redaction_events,
    prompt_injection_detected: ctx.prompt_injection_detected,
    audit_metadata: { ...ctx.audit_metadata, blocked_reason: reason },
  };
}

/** Manifest of edge functions that still call Lovable AI directly. Used by the
 *  Command Centre AI Gateway Health panel to show bypass status until migrated. */
export const KNOWN_DIRECT_AI_CALLERS: Array<{ name: string; status: "pending_migration" }> = [
  { name: "agent-permission-audit", status: "pending_migration" },
  { name: "ai-conversation-engine", status: "pending_migration" },
  { name: "ai-engagement-agent-run", status: "pending_migration" },
  { name: "apollo-qualify", status: "pending_migration" },
  { name: "business-daily-operating-loop-acceptance", status: "pending_migration" },
  { name: "business-daily-operating-run", status: "pending_migration" },
  { name: "business-external-activation-readiness-run", status: "pending_migration" },
  { name: "business-weekly-review-acceptance", status: "pending_migration" },
  { name: "business-weekly-review-run", status: "pending_migration" },
  { name: "founder-copilot", status: "pending_migration" },
  { name: "generate-proposal", status: "pending_migration" },
  { name: "internal-proposal-generate", status: "pending_migration" },
  { name: "lead-fit-classify", status: "pending_migration" },
  { name: "liftor-brain-chat", status: "pending_migration" },
  { name: "ma-intelligence-orchestrator", status: "pending_migration" },
  { name: "multilingual-intake-preview", status: "pending_migration" },
];

export const aiGateway = { execute, KNOWN_DIRECT_AI_CALLERS };
export default aiGateway;