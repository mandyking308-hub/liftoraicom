import { routeAIModel, type RouteAIModelInput, type RouteAIModelDecision } from "@/services/aiModelRouter";
import { logAIUsage, type AIModelTier, type LogAIUsageInput } from "@/services/aiUsageLogger";
import { estimateAICost, flagPricingMissing } from "@/services/aiPricingRegistry";
import { checkAIBudgetBeforeAction } from "@/services/aiBudgetService";
import { checkAgentCostControlBeforeAction } from "@/services/aiAgentCostService";
import { evaluateAIStopLoss } from "@/services/aiStopLossService";
import {
  classifySensitive,
  detectPromptInjection,
  redactSensitive,
  raiseSecurityAlert,
  type ContextTrust,
} from "@/services/aiSecurityGuard";
import { requiresHumanApproval, createApprovalRequest, type RiskLevel as ApprovalRiskLevel } from "@/services/aiApprovalGate";

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

export type AIGatewayRiskLevel = "low" | "medium" | "high" | "critical";

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
  risk_level?: AIGatewayRiskLevel | null;
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
  const g: any = globalThis as any;
  if (g.crypto?.randomUUID) return `trc_${g.crypto.randomUUID()}`;
  return `trc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function tierToProviderModel(tier: AIModelTier): { provider: string; model: string } {
  switch (tier) {
    case "premium": return { provider: "google", model: "google/gemini-2.5-pro" };
    case "standard": return { provider: "google", model: "google/gemini-3-flash-preview" };
    case "cheap": return { provider: "google", model: "google/gemini-2.5-flash-lite" };
    case "human_required": return { provider: "human", model: "human/required" };
    case "no_ai": return { provider: "none", model: "none" };
    default: return { provider: "google", model: "google/gemini-3-flash-preview" };
  }
}

function mapRisk(level: AIGatewayRiskLevel | null | undefined): ApprovalRiskLevel {
  if (level === "critical") return "critical";
  if (level === "high") return "high";
  if (level === "low") return "low";
  return "standard";
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

  const tier: AIModelTier =
    input.requested_model_tier && routing.selected_model_tier !== "human_required"
      ? input.requested_model_tier
      : routing.selected_model_tier;

  // 2. Security: redact + injection detection
  const promptRedaction = redactSensitive(input.prompt_or_instruction);
  const redactedPrompt = promptRedaction.redacted ?? "";
  const redactedContext: GatewayContextBlock[] = (input.context_blocks ?? []).map((b) => {
    const r = redactSensitive(b.content);
    return { source: b.source, trust: b.trust, content: r.redacted ?? "" };
  });
  let redaction_events = promptRedaction.changed ? 1 : 0;
  redaction_events += redactedContext.reduce((n, b, i) => {
    const original = input.context_blocks?.[i]?.content ?? "";
    return n + (b.content !== original ? 1 : 0);
  }, 0);
  if (redaction_events) risk_flags.push("redaction_applied");

  const classification = classifySensitive(input.prompt_or_instruction);
  if (classification.findings.length) {
    risk_flags.push("sensitive_content_detected");
    audit_metadata.sensitive = classification.findings.map((f) => f.category);
  }

  let prompt_injection_detected = false;
  for (const u of (input.context_blocks ?? []).filter((b) => b.trust === "untrusted_external")) {
    const inj = detectPromptInjection(u.content);
    if (inj.detected) {
      prompt_injection_detected = true;
      risk_flags.push("prompt_injection_in_untrusted_context");
      await raiseSecurityAlert({
        alert_type: "prompt_injection_detected",
        severity: "high",
        business_id: input.business_id ?? null,
        agent_id: input.agent_id ?? null,
        metadata: { trace_id, source: u.source, action_type: input.action_type },
      }).catch(() => {});
      alerts.push("prompt_injection_detected");
      break;
    }
  }

  // 3. Estimate cost
  const { provider, model } = tierToProviderModel(tier);
  const promptTokensEstimate = Math.max(1, Math.ceil(input.prompt_or_instruction.length / 4));
  let estimated_cost_before_run = 0;
  try {
    const est = await estimateAICost({
      provider_name: provider,
      model_name: model,
      estimated_input_tokens: promptTokensEstimate,
      estimated_output_tokens: 400,
    });
    estimated_cost_before_run = Number(est.estimated_total_cost ?? 0);
    if (est.pricing_missing) {
      alerts.push("pricing_missing");
      risk_flags.push("pricing_missing");
      await flagPricingMissing({ provider_name: provider, model_name: model, business_id: input.business_id ?? null, agent_id: input.agent_id ?? null }).catch(() => {});
    }
  } catch (_) {
    alerts.push("pricing_missing");
    risk_flags.push("pricing_missing");
  }

  // 4. Budget check (business)
  if (input.business_id) {
    const budget = await checkAIBudgetBeforeAction({
      business_id: input.business_id,
      agent_id: input.agent_id ?? null,
      campaign_id: input.campaign_id ?? null,
      estimated_action_cost: estimated_cost_before_run,
      task_category: input.task_category,
    }).catch(() => null);
    if (budget) {
      if (budget.status === "near_limit" || budget.status === "watch") {
        alerts.push("budget_warning");
        risk_flags.push("budget_warning");
      }
      if (!budget.allowed) {
        return blockedResult(trace_id, `budget_hard_stop:${budget.status}`, {
          tier, provider, model, estimated_cost_before_run, alerts, risk_flags,
          redaction_events, prompt_injection_detected, audit_metadata,
        });
      }
    }
  }

  // 5. Agent cap
  if (input.agent_id) {
    const agentCap = await checkAgentCostControlBeforeAction({
      agent_id: input.agent_id,
      business_id: input.business_id ?? null,
      task_category: input.task_category,
      estimated_action_cost: estimated_cost_before_run,
      requested_model_tier: tier,
    }).catch(() => null);
    if (agentCap && !agentCap.allowed) {
      return blockedResult(trace_id, `agent_hard_cap:${agentCap.blocked_reason ?? "capped"}`, {
        tier, provider, model, estimated_cost_before_run, alerts, risk_flags,
        redaction_events, prompt_injection_detected, audit_metadata,
      });
    }
  }

  // 6. Stop-loss
  const stop = await evaluateAIStopLoss({
    business_id: input.business_id ?? null,
    agent_id: input.agent_id ?? null,
    campaign_id: input.campaign_id ?? null,
    task_id: input.task_id ?? null,
    task_category: input.task_category,
    estimated_action_cost: estimated_cost_before_run,
  }).catch(() => null);
  if (stop && stop.stop_loss_triggered && !stop.action_allowed) {
    alerts.push(`stop_loss:${stop.trigger_type ?? "unknown"}`);
    return blockedResult(trace_id, `stop_loss:${stop.trigger_type ?? "unknown"}`, {
      tier, provider, model, estimated_cost_before_run, alerts, risk_flags,
      redaction_events, prompt_injection_detected, audit_metadata,
    });
  }

  // 7. Approval requirement
  const needsApproval =
    routing.requires_human_approval ||
    requiresHumanApproval(input.task_category, mapRisk(input.risk_level)) ||
    !!input.requires_external_action ||
    !!input.contains_legal_financial_or_compliance_content;

  if (needsApproval) {
    const ledger = await logAIUsage({
      ...baseLedgerInput(input, tier, provider, model, trace_id),
      estimated_cost: estimated_cost_before_run,
      status: "human_review_required",
    }).catch(() => ({ id: undefined } as any));
    const queued = await createApprovalRequest({
      business_id: input.business_id ?? null,
      agent_id: input.agent_id ?? null,
      campaign_id: input.campaign_id ?? null,
      task_id: input.task_id ?? null,
      ai_usage_ledger_id: ledger?.id ?? null,
      approval_type: input.task_category,
      risk_level: mapRisk(input.risk_level),
      title: input.action_type,
      summary: input.input_summary,
      estimated_cost: estimated_cost_before_run,
      value_at_stake: input.estimated_value ?? null,
    }).catch(() => ({ id: "" } as any));
    return {
      trace_id, status: "approval_required",
      selected_model_provider: provider, selected_model: model, selected_model_tier: tier,
      estimated_cost_before_run, actual_estimated_cost_after_run: 0,
      prompt_tokens: 0, completion_tokens: 0, total_tokens: 0,
      ledger_id: ledger?.id, approval_required: true,
      approval_queue_id: queued?.id || undefined,
      blocked: false, alerts_created: alerts,
      routing_reason: routing.routing_reason,
      risk_flags, redaction_events, prompt_injection_detected,
      audit_metadata: { ...audit_metadata, approval_queue_id: queued?.id ?? null },
    };
  }

  // 8. Run provider call
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
      risk_flags: [...risk_flags, "provider_failure"],
      redaction_events, prompt_injection_detected,
      audit_metadata: { ...audit_metadata, error: String(e?.message ?? e) },
    };
  }

  const prompt_tokens = providerResult.prompt_tokens ?? 0;
  const completion_tokens = providerResult.completion_tokens ?? 0;

  // 9. Actual cost
  let actual_estimated_cost_after_run = estimated_cost_before_run;
  try {
    const actual = await estimateAICost({
      provider_name: providerResult.model_provider,
      model_name: providerResult.model_used,
      estimated_input_tokens: prompt_tokens,
      estimated_output_tokens: completion_tokens,
    });
    actual_estimated_cost_after_run = Number(actual.estimated_total_cost ?? estimated_cost_before_run);
  } catch (_) { /* keep estimate */ }

  // 10. Final ledger row
  const ledger = await logAIUsage({
    ...baseLedgerInput(input, tier, providerResult.model_provider, providerResult.model_used, trace_id),
    prompt_tokens, completion_tokens,
    estimated_cost: actual_estimated_cost_after_run,
    output_summary: providerResult.output_summary ?? input.input_summary,
    status: "completed",
  }).catch(() => ({ id: undefined } as any));

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
  ctx: {
    tier: AIModelTier; provider: string; model: string; estimated_cost_before_run: number;
    alerts: string[]; risk_flags: string[]; redaction_events: number;
    prompt_injection_detected: boolean; audit_metadata: Record<string, unknown>;
  },
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