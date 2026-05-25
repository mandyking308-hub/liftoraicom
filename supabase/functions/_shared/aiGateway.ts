// Liftor central AI Gateway helper for edge functions.
//
// RULE: All edge-function AI calls MUST use `callAIGateway` (or `streamAIGateway`).
// Direct `fetch("https://ai.gateway.lovable.dev/...")` is permitted ONLY inside
// this file. Any other edge function calling the provider directly bypasses
// cost control, ledger logging, security checks, budgets and ROI tracking.
//
// Live-first: this helper never blocks normal internal calls. It only:
//   - writes a ledger row (best-effort) before + after the provider call
//   - tags a trace_id
//   - flags pricing-missing and provider failures
//   - surfaces 402/429 plainly to the caller

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

export type AIGatewayCallInput = {
  business_id?: string | null;
  agent_id?: string | null;
  campaign_id?: string | null;
  task_id?: string | null;
  workflow_id?: string | null;
  user_id?: string | null;
  action_type: string;
  task_category: string;
  model?: string;
  messages: Array<{ role: "system" | "user" | "assistant" | "tool"; content: any }>;
  tools?: any[];
  tool_choice?: any;
  reasoning?: { effort: "minimal" | "low" | "medium" | "high" | "xhigh" | "none" };
  stream?: boolean;
  metadata?: Record<string, unknown>;
  /** New runtime fields — drive ai_gateway_requests + concurrency control. */
  request_type?: string;
  conversation_id?: string | null;
  portfolio_asset_id?: string | null;
  prompt_version?: string | null;
  risk_level?: "low" | "medium" | "high" | "critical";
  approval_required?: boolean;
  idempotency_key?: string | null;
  priority?: number;
  fallback_model?: string;
  /** OpenAI-compatible response_format passthrough (e.g. {type:"json_object"}). */
  response_format?: any;
};

export type AIGatewayCallResult = {
  trace_id: string;
  request_id: string;
  status: "completed" | "failed" | "rate_limited" | "payment_required";
  http_status: number;
  data?: any;
  error?: string;
  prompt_tokens?: number;
  completion_tokens?: number;
  used_fallback?: boolean;
  approval_required?: boolean;
  duplicate_prevented?: boolean;
  lease_blocked?: boolean;
  lease_reason?: string;
};

function newTraceId() {
  const r = (crypto as any).randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
  return `trc_${r}`;
}

function newRequestId() {
  const r = (crypto as any).randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
  return `req_${r}`;
}

async function recordRuntimeRequest(sb: any, row: Record<string, unknown>) {
  if (!sb) return;
  try { await sb.from("ai_gateway_requests").insert(row); } catch (_) { /* best-effort */ }
}

async function updateRuntimeRequest(sb: any, request_id: string, patch: Record<string, unknown>) {
  if (!sb) return;
  try { await sb.from("ai_gateway_requests").update(patch).eq("request_id", request_id); } catch (_) { /* best-effort */ }
}

async function recordRuntimeEvent(
  sb: any,
  e: { request_id?: string | null; conversation_id?: string | null; agent_id?: string | null;
       business_id?: string | null; event_type: string; message?: string;
       severity?: "debug" | "info" | "warning" | "error" | "critical";
       metadata?: Record<string, unknown> },
) {
  if (!sb) return;
  try {
    await sb.from("ai_runtime_events").insert({
      request_id: e.request_id ?? null,
      conversation_id: e.conversation_id ?? null,
      agent_id: e.agent_id ?? null,
      business_id: e.business_id ?? null,
      event_type: e.event_type,
      message: e.message ?? null,
      severity: e.severity ?? "info",
      metadata: e.metadata ?? {},
    });
  } catch (_) { /* best-effort */ }
}

/** Resolve agent status/models and capacities without taking a lock. */
async function loadAgentMeta(
  sb: any,
  agent_id: string | null | undefined,
): Promise<{ ok: boolean; reason?: string; primary_model?: string; fallback_model?: string; capacity?: number }> {
  if (!sb || !agent_id) return { ok: true, capacity: 0 };
  try {
    const { data: agent } = await sb.from("ai_agent_registry").select("status,primary_model,fallback_model,max_concurrency").eq("id", agent_id).maybeSingle();
    if (!agent) return { ok: true, capacity: 0 };
    if (agent.status !== "active") return { ok: false, reason: `agent_${agent.status}` };
    return {
      ok: true,
      primary_model: agent.primary_model,
      fallback_model: agent.fallback_model,
      capacity: Number(agent.max_concurrency ?? 4),
    };
  } catch {
    return { ok: true, capacity: 0 };
  }
}

async function loadBusinessCapacity(sb: any, business_id: string | null | undefined): Promise<number> {
  if (!sb || !business_id) return 0;
  try {
    const { data } = await sb
      .from("ai_business_budgets")
      .select("max_concurrent_requests")
      .eq("business_id", business_id)
      .maybeSingle();
    return Number(data?.max_concurrent_requests ?? 25);
  } catch {
    return 25;
  }
}

/** Acquire a strict concurrency lease via the atomic Postgres function. */
export async function acquireLease(
  sb: any,
  args: {
    request_id: string;
    agent_id?: string | null;
    business_id?: string | null;
    agent_capacity: number;
    business_capacity: number;
    provider?: string;
    model?: string;
    ttl_seconds?: number;
  },
): Promise<{ ok: boolean; reason?: string; expires_at?: string }> {
  if (!sb) return { ok: true };
  try {
    const { data, error } = await sb.rpc("acquire_ai_lease", {
      _request_id: args.request_id,
      _agent_id: args.agent_id ?? null,
      _business_id: args.business_id ?? null,
      _agent_capacity: args.agent_capacity ?? 0,
      _business_capacity: args.business_capacity ?? 0,
      _provider: args.provider ?? "lovable-ai-gateway",
      _model: args.model ?? null,
      _ttl_seconds: args.ttl_seconds ?? 180,
    });
    if (error) return { ok: true, reason: `lease_rpc_error:${error.message}` };
    return data as any;
  } catch (e: any) {
    // Fail-open: never crash the UI because of lease infrastructure
    return { ok: true, reason: `lease_exception:${String(e?.message ?? e)}` };
  }
}

export async function releaseLease(sb: any, request_id: string, ok: boolean) {
  if (!sb) return;
  try { await sb.rpc("release_ai_lease", { _request_id: request_id, _ok: ok }); } catch { /* best-effort */ }
}

// ============================================================================
// Cost computation + tagging
// ============================================================================
//
// USD → GBP fallback. The pricing registry stores per-model rates in their
// native currency (USD for every seeded row). We convert to GBP for dashboards.
// 0.79 is a safe ~rate; verified pricing rows can override the currency.
const USD_TO_GBP = 0.79;

export type CostBasis =
  | "actual_tokens"
  | "estimated_tokens"
  | "provider_reported"
  | "manual_estimate"
  | "streaming_estimate"
  | "pricing_missing";

async function lookupPricing(sb: any, model: string | null | undefined) {
  if (!sb || !model) return null;
  try {
    const { data } = await sb
      .from("ai_provider_pricing")
      .select("input_cost_per_1m_tokens,output_cost_per_1m_tokens,currency,confidence,pricing_source")
      .eq("model_name", model)
      .eq("active", true)
      .order("effective_from", { ascending: false })
      .limit(1)
      .maybeSingle();
    return data;
  } catch { return null; }
}

function toGbp(amount: number, currency: string) {
  if (!amount) return 0;
  if (currency === "GBP") return amount;
  if (currency === "USD") return amount * USD_TO_GBP;
  return amount * USD_TO_GBP; // default-assume USD-equivalent
}

/**
 * Compute cost for a completed (or estimated) call and write both actual + estimated
 * fields on ai_gateway_requests and a matching ai_usage_ledger row patch.
 * - basis === "actual_tokens" or "provider_reported"  → fills actual_cost_gbp
 * - basis === anything else (streaming/missing/estimated) → fills estimated_cost_gbp
 * Pricing-missing rows raise a runtime event so the cockpit can warn.
 */
export async function computeAndTagCost(
  sb: any,
  args: {
    request_id: string;
    model: string;
    prompt_tokens?: number | null;
    completion_tokens?: number | null;
    basis: CostBasis;
    agent_id?: string | null;
    business_id?: string | null;
  },
): Promise<{ actual_cost_gbp: number; estimated_cost_gbp: number; pricing_missing: boolean; confidence: string }> {
  const inTok = Math.max(0, Number(args.prompt_tokens ?? 0));
  const outTok = Math.max(0, Number(args.completion_tokens ?? 0));
  const pricing = await lookupPricing(sb, args.model);

  if (!pricing) {
    await recordRuntimeEvent(sb, {
      request_id: args.request_id, agent_id: args.agent_id ?? null, business_id: args.business_id ?? null,
      event_type: "pricing_missing", severity: "warning",
      message: `No active pricing registry row for ${args.model}`,
      metadata: { model: args.model, basis: args.basis },
    });
    await updateRuntimeRequest(sb, args.request_id, {
      cost_basis: "pricing_missing",
      estimated_cost_gbp: 0,
      actual_cost_gbp: null,
    });
    return { actual_cost_gbp: 0, estimated_cost_gbp: 0, pricing_missing: true, confidence: "unknown" };
  }

  const inCostNative = (inTok / 1_000_000) * Number(pricing.input_cost_per_1m_tokens || 0);
  const outCostNative = (outTok / 1_000_000) * Number(pricing.output_cost_per_1m_tokens || 0);
  const totalGbp = toGbp(inCostNative + outCostNative, pricing.currency ?? "USD");

  const isActual = args.basis === "actual_tokens" || args.basis === "provider_reported";
  const patch: Record<string, unknown> = {
    cost_basis: args.basis,
  };
  if (isActual) {
    patch.actual_cost_gbp = totalGbp;
    patch.estimated_cost_gbp = totalGbp; // mirror so legacy dashboards still work
  } else {
    patch.estimated_cost_gbp = totalGbp;
    patch.actual_cost_gbp = null;
  }
  await updateRuntimeRequest(sb, args.request_id, patch);

  return {
    actual_cost_gbp: isActual ? totalGbp : 0,
    estimated_cost_gbp: totalGbp,
    pricing_missing: false,
    confidence: pricing.confidence ?? "estimated",
  };
}

function getServiceClient() {
  const url = Deno.env.get("SUPABASE_URL") ?? Deno.env.get("VITE_SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

async function writeLedger(
  trace_id: string,
  input: AIGatewayCallInput,
  fields: Record<string, unknown>,
) {
  try {
    const sb = getServiceClient();
    if (!sb) return;
    await sb.from("ai_usage_ledger").insert({
      business_id: input.business_id ?? null,
      agent_id: input.agent_id ?? null,
      campaign_id: input.campaign_id ?? null,
      task_id: input.task_id ?? null,
      workflow_id: input.workflow_id ?? null,
      user_id: input.user_id ?? null,
      action_type: input.action_type,
      task_category: input.task_category,
      model_used: input.model ?? "google/gemini-3-flash-preview",
      model_provider: (input.model ?? "google").split("/")[0],
      is_simulation: false,
      audit_metadata: { trace_id, enforced_by: "edge:aiGateway", ...(input.metadata ?? {}) },
      ...fields,
    });
  } catch (_) {
    // best-effort logging only — never break the live call
  }
}

/** Non-streaming AI call routed through the Lovable AI Gateway with full audit. */
export async function callAIGateway(input: AIGatewayCallInput): Promise<AIGatewayCallResult> {
  const trace_id = newTraceId();
  const request_id = newRequestId();
  const sb = getServiceClient();

  // Idempotency check — if the same idempotency_key already exists, return that row.
  if (input.idempotency_key && sb) {
    try {
      const { data: existing } = await sb
        .from("ai_gateway_requests")
        .select("request_id,status,prompt_tokens,completion_tokens,trace_id,error_message,started_at,created_at")
        .eq("idempotency_key", input.idempotency_key)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (existing) {
        // Completed → return existing result (safe). Running → block duplicate. Failed → allow safe retry (fall through).
        if (existing.status === "completed") {
          await recordRuntimeEvent(sb, {
            request_id: existing.request_id, event_type: "idempotency_replay",
            severity: "info", message: "Returned existing completed result for idempotency_key",
            metadata: { idempotency_key: input.idempotency_key },
          });
          return {
            trace_id: existing.trace_id ?? trace_id,
            request_id: existing.request_id,
            status: "completed", http_status: 200, duplicate_prevented: true,
            prompt_tokens: existing.prompt_tokens ?? undefined,
            completion_tokens: existing.completion_tokens ?? undefined,
          };
        }
        if (["running", "queued", "waiting_approval"].includes(existing.status)) {
          await recordRuntimeEvent(sb, {
            request_id: existing.request_id, event_type: "idempotency_duplicate_blocked",
            severity: "warning", message: "Duplicate request blocked while original is in-flight",
            metadata: { idempotency_key: input.idempotency_key, original_status: existing.status },
          });
          return {
            trace_id: existing.trace_id ?? trace_id,
            request_id: existing.request_id,
            status: "completed", http_status: 202, duplicate_prevented: true,
          };
        }
        // failed / cancelled → allow retry below
      }
    } catch { /* fall through */ }
  }

  // Resolve agent meta + business capacity, then acquire strict lease.
  const pre = await loadAgentMeta(sb, input.agent_id ?? null);
  if (!pre.ok) {
    await recordRuntimeRequest(sb, {
      request_id, conversation_id: input.conversation_id ?? null,
      workflow_id: input.workflow_id ?? null, agent_id: input.agent_id ?? null,
      portfolio_asset_id: input.portfolio_asset_id ?? null, business_id: input.business_id ?? null,
      user_id: input.user_id ?? null,
      request_type: input.request_type ?? input.action_type,
      provider: "lovable-ai-gateway",
      model: input.model ?? pre.primary_model ?? "google/gemini-3-flash-preview",
      prompt_version: input.prompt_version ?? null,
      risk_level: input.risk_level ?? "low",
      approval_required: !!input.approval_required,
      status: "cancelled",
      priority: input.priority ?? 5,
      idempotency_key: input.idempotency_key ?? null,
      trace_id, error_message: pre.reason,
      metadata: { reason: pre.reason },
    });
    await recordRuntimeEvent(sb, {
      request_id, conversation_id: input.conversation_id ?? null,
      agent_id: input.agent_id ?? null, business_id: input.business_id ?? null,
      event_type: "preflight_blocked", severity: "warning",
      message: pre.reason, metadata: { reason: pre.reason },
    });
    return { trace_id, request_id, status: "failed", http_status: 409, error: pre.reason };
  }

  // High-risk + approval_required: do not call provider; mark waiting_approval.
  if (input.approval_required && (input.risk_level === "high" || input.risk_level === "critical")) {
    await recordRuntimeRequest(sb, {
      request_id, conversation_id: input.conversation_id ?? null,
      workflow_id: input.workflow_id ?? null, agent_id: input.agent_id ?? null,
      portfolio_asset_id: input.portfolio_asset_id ?? null, business_id: input.business_id ?? null,
      user_id: input.user_id ?? null,
      request_type: input.request_type ?? input.action_type,
      provider: "lovable-ai-gateway",
      model: input.model ?? pre.primary_model ?? "google/gemini-3-flash-preview",
      prompt_version: input.prompt_version ?? null,
      risk_level: input.risk_level ?? "high",
      approval_required: true,
      status: "waiting_approval",
      priority: input.priority ?? 5,
      idempotency_key: input.idempotency_key ?? null,
      trace_id, metadata: input.metadata ?? {},
    });
    await recordRuntimeEvent(sb, {
      request_id, conversation_id: input.conversation_id ?? null,
      agent_id: input.agent_id ?? null, business_id: input.business_id ?? null,
      event_type: "waiting_approval", severity: "info",
    });
    return { trace_id, request_id, status: "completed", http_status: 202, approval_required: true };
  }

  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) {
    await writeLedger(trace_id, input, { status: "failed", input_summary: "LOVABLE_API_KEY missing" });
    return { trace_id, request_id, status: "failed", http_status: 500, error: "LOVABLE_API_KEY not configured" };
  }

  // ---- Strict concurrency lease (atomic in Postgres) ----
  const businessCapacity = await loadBusinessCapacity(sb, input.business_id ?? null);
  const primaryModel = input.model ?? pre.primary_model ?? "google/gemini-3-flash-preview";
  const fallbackModel = input.fallback_model ?? pre.fallback_model ?? null;
  const lease = await acquireLease(sb, {
    request_id,
    agent_id: input.agent_id ?? null,
    business_id: input.business_id ?? null,
    agent_capacity: pre.capacity ?? 0,
    business_capacity: businessCapacity,
    provider: "lovable-ai-gateway",
    model: primaryModel,
    ttl_seconds: 180,
  });
  if (!lease.ok) {
    await recordRuntimeRequest(sb, {
      request_id, conversation_id: input.conversation_id ?? null,
      workflow_id: input.workflow_id ?? null, agent_id: input.agent_id ?? null,
      portfolio_asset_id: input.portfolio_asset_id ?? null, business_id: input.business_id ?? null,
      user_id: input.user_id ?? null,
      request_type: input.request_type ?? input.action_type,
      provider: "lovable-ai-gateway", model: primaryModel,
      prompt_version: input.prompt_version ?? null,
      risk_level: input.risk_level ?? "low",
      approval_required: !!input.approval_required,
      status: "queued", priority: input.priority ?? 5,
      idempotency_key: input.idempotency_key ?? null,
      trace_id, error_message: lease.reason,
      metadata: { ...(input.metadata ?? {}), lease_blocked: true, lease_reason: lease.reason },
    });
    await recordRuntimeEvent(sb, {
      request_id, conversation_id: input.conversation_id ?? null,
      agent_id: input.agent_id ?? null, business_id: input.business_id ?? null,
      event_type: "lease_denied", severity: "warning",
      message: lease.reason, metadata: { reason: lease.reason },
    });
    return {
      trace_id, request_id, status: "rate_limited", http_status: 429,
      error: `Concurrency limit reached (${lease.reason}). Try again shortly.`,
      lease_blocked: true, lease_reason: lease.reason,
    };
  }

  await writeLedger(trace_id, input, { status: "pending", input_summary: input.action_type });
  const startedAt = new Date().toISOString();
  await recordRuntimeRequest(sb, {
    request_id, conversation_id: input.conversation_id ?? null,
    workflow_id: input.workflow_id ?? null, agent_id: input.agent_id ?? null,
    portfolio_asset_id: input.portfolio_asset_id ?? null, business_id: input.business_id ?? null,
    user_id: input.user_id ?? null,
    request_type: input.request_type ?? input.action_type,
    provider: "lovable-ai-gateway",
    model: primaryModel,
    prompt_version: input.prompt_version ?? null,
    risk_level: input.risk_level ?? "low",
    approval_required: !!input.approval_required,
    status: "running", priority: input.priority ?? 5,
    idempotency_key: input.idempotency_key ?? null,
    started_at: startedAt, trace_id,
    metadata: { ...(input.metadata ?? {}), lease_expires_at: lease.expires_at ?? null },
  });

  const doCall = async (modelToUse: string): Promise<Response | { error: string }> => {
    try {
      return await fetch(GATEWAY_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: modelToUse,
          messages: input.messages,
          tools: input.tools,
          tool_choice: input.tool_choice,
          reasoning: input.reasoning,
          stream: !!input.stream,
          ...(input.response_format ? { response_format: input.response_format } : {}),
        }),
      });
    } catch (e: any) {
      return { error: String(e?.message ?? e) };
    }
  };

  let usedFallback = false;
  let resp: Response | { error: string } = await doCall(primaryModel);
  if ("error" in resp || (resp instanceof Response && resp.status >= 500)) {
    if (fallbackModel) {
      await recordRuntimeEvent(sb, {
        request_id, event_type: "provider_fallback", severity: "warning",
        message: "primary failed, retrying with fallback",
        metadata: { primary: primaryModel, fallback: fallbackModel },
      });
      usedFallback = true;
      resp = await doCall(fallbackModel);
    }
  }
  if ("error" in resp) {
    const err = resp.error;
    await writeLedger(trace_id, input, { status: "failed", output_summary: `network: ${err}` });
    await updateRuntimeRequest(sb, request_id, { status: "failed", completed_at: new Date().toISOString(), error_message: err });
    await recordRuntimeEvent(sb, { request_id, event_type: "network_error", severity: "error", message: err });
    await releaseLease(sb, request_id, false);
    return { trace_id, request_id, status: "failed", http_status: 0, error: err, used_fallback: usedFallback };
  }

  if (resp.status === 429) {
    await writeLedger(trace_id, input, { status: "failed", output_summary: "rate_limited" });
    await updateRuntimeRequest(sb, request_id, { status: "failed", completed_at: new Date().toISOString(), error_message: "rate_limited" });
    await recordRuntimeEvent(sb, { request_id, event_type: "rate_limited", severity: "warning" });
    await releaseLease(sb, request_id, false);
    return { trace_id, request_id, status: "rate_limited", http_status: 429, error: "Rate limit exceeded", used_fallback: usedFallback };
  }
  if (resp.status === 402) {
    await writeLedger(trace_id, input, { status: "failed", output_summary: "payment_required" });
    await updateRuntimeRequest(sb, request_id, { status: "failed", completed_at: new Date().toISOString(), error_message: "payment_required" });
    await recordRuntimeEvent(sb, { request_id, event_type: "payment_required", severity: "error" });
    await releaseLease(sb, request_id, false);
    return { trace_id, request_id, status: "payment_required", http_status: 402, error: "Lovable AI credits required", used_fallback: usedFallback };
  }
  if (!resp.ok) {
    const txt = await resp.text().catch(() => "");
    await writeLedger(trace_id, input, { status: "failed", output_summary: `http ${resp.status}` });
    await updateRuntimeRequest(sb, request_id, { status: "failed", completed_at: new Date().toISOString(), error_message: `http ${resp.status}` });
    await recordRuntimeEvent(sb, { request_id, event_type: "http_error", severity: "error", message: `http ${resp.status}` });
    await releaseLease(sb, request_id, false);
    return { trace_id, request_id, status: "failed", http_status: resp.status, error: txt.slice(0, 500), used_fallback: usedFallback };
  }

  const data = await resp.json();
  const usage = data?.usage ?? {};
  await writeLedger(trace_id, input, {
    status: "completed",
    prompt_tokens: usage.prompt_tokens ?? 0,
    completion_tokens: usage.completion_tokens ?? 0,
    output_summary: input.action_type,
    cost_basis: "actual_tokens",
  });
  await updateRuntimeRequest(sb, request_id, {
    status: "completed",
    completed_at: new Date().toISOString(),
    prompt_tokens: usage.prompt_tokens ?? null,
    completion_tokens: usage.completion_tokens ?? null,
    token_usage: usage,
  });
  await computeAndTagCost(sb, {
    request_id, model: primaryModel,
    prompt_tokens: usage.prompt_tokens, completion_tokens: usage.completion_tokens,
    basis: "actual_tokens",
    agent_id: input.agent_id ?? null, business_id: input.business_id ?? null,
  });
  await recordRuntimeEvent(sb, { request_id, event_type: "completed", severity: "info", metadata: { used_fallback: usedFallback } });
  await releaseLease(sb, request_id, true);
  return {
    trace_id, request_id, status: "completed", http_status: 200, data,
    prompt_tokens: usage.prompt_tokens, completion_tokens: usage.completion_tokens,
    used_fallback: usedFallback,
  };
}

/** Streaming variant. Returns the raw Response so the edge function can pipe it.
 *  Registers an ai_gateway_requests row so the call shows up in dashboards;
 *  the caller must call `endGatewayLog({ trace_id, request_id, input }, ...)`
 *  when the stream finishes to record final tokens / cost. */
export async function streamAIGateway(
  input: AIGatewayCallInput,
): Promise<{ trace_id: string; request_id: string; response: Response }> {
  const trace_id = newTraceId();
  const request_id = newRequestId();
  const sb = getServiceClient();
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  const startedAt = new Date().toISOString();
  await writeLedger(trace_id, input, { status: "pending", input_summary: input.action_type });
  await recordRuntimeRequest(sb, {
    request_id,
    conversation_id: input.conversation_id ?? null,
    workflow_id: input.workflow_id ?? null,
    agent_id: input.agent_id ?? null,
    portfolio_asset_id: input.portfolio_asset_id ?? null,
    business_id: input.business_id ?? null,
    user_id: input.user_id ?? null,
    request_type: input.request_type ?? input.action_type,
    provider: "lovable-ai-gateway",
    model: input.model ?? "google/gemini-3-flash-preview",
    prompt_version: input.prompt_version ?? null,
    risk_level: input.risk_level ?? "low",
    approval_required: !!input.approval_required,
    status: "running",
    priority: input.priority ?? 5,
    idempotency_key: input.idempotency_key ?? null,
    started_at: startedAt,
    trace_id,
    metadata: { ...(input.metadata ?? {}), streaming: true },
  });
  const response = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: input.model ?? "google/gemini-3-flash-preview",
      messages: input.messages,
      tools: input.tools,
      tool_choice: input.tool_choice,
      reasoning: input.reasoning,
      stream: true,
      ...(input.response_format ? { response_format: input.response_format } : {}),
    }),
  });
  return { trace_id, request_id, response };
}

/**
 * Lightweight ledger wrappers for edge functions that already call the Lovable AI
 * Gateway via the Vercel AI SDK / OpenAI-compatible client and cannot easily
 * route through `callAIGateway`. Use `beginGatewayLog` before the SDK call and
 * `endGatewayLog` after — the function's traffic then appears in
 * `ai_gateway_requests`, `ai_usage_ledger` and `ai_runtime_events` like a
 * first-class gateway call.
 */
export async function beginGatewayLog(input: AIGatewayCallInput): Promise<{ trace_id: string; request_id: string }> {
  const trace_id = newTraceId();
  const request_id = newRequestId();
  const sb = getServiceClient();
  const startedAt = new Date().toISOString();
  // Best-effort lease — fail-open if RPC unavailable so we never break live callers.
  try {
    const agentMeta = await loadAgentMeta(sb, input.agent_id ?? null);
    const businessCapacity = await loadBusinessCapacity(sb, input.business_id ?? null);
    await acquireLease(sb, {
      request_id,
      agent_id: input.agent_id ?? null,
      business_id: input.business_id ?? null,
      agent_capacity: agentMeta.capacity ?? 0,
      business_capacity: businessCapacity,
      provider: "lovable-ai-gateway",
      model: input.model ?? agentMeta.primary_model ?? "google/gemini-3-flash-preview",
      ttl_seconds: 180,
    });
  } catch { /* fail-open */ }
  await writeLedger(trace_id, input, { status: "pending", input_summary: input.action_type });
  await recordRuntimeRequest(sb, {
    request_id,
    conversation_id: input.conversation_id ?? null,
    workflow_id: input.workflow_id ?? null,
    agent_id: input.agent_id ?? null,
    portfolio_asset_id: input.portfolio_asset_id ?? null,
    business_id: input.business_id ?? null,
    user_id: input.user_id ?? null,
    request_type: input.request_type ?? input.action_type,
    provider: "lovable-ai-gateway",
    model: input.model ?? "google/gemini-3-flash-preview",
    prompt_version: input.prompt_version ?? null,
    risk_level: input.risk_level ?? "low",
    approval_required: !!input.approval_required,
    status: "running",
    priority: input.priority ?? 5,
    idempotency_key: input.idempotency_key ?? null,
    started_at: startedAt,
    trace_id,
    metadata: { ...(input.metadata ?? {}), sdk_wrapped: true },
  });
  return { trace_id, request_id };
}

export async function endGatewayLog(
  ctx: { trace_id: string; request_id: string; input: AIGatewayCallInput },
  result: { ok: boolean; prompt_tokens?: number; completion_tokens?: number; error?: string; cost_basis?: CostBasis },
) {
  const sb = getServiceClient();
  const completedAt = new Date().toISOString();
  const basis: CostBasis = result.cost_basis
    ?? (result.prompt_tokens != null && result.completion_tokens != null ? "actual_tokens" : "streaming_estimate");
  await writeLedger(ctx.trace_id, ctx.input, {
    status: result.ok ? "completed" : "failed",
    prompt_tokens: result.prompt_tokens ?? 0,
    completion_tokens: result.completion_tokens ?? 0,
    output_summary: result.ok ? ctx.input.action_type : (result.error ?? "error"),
    cost_basis: basis,
  });
  await updateRuntimeRequest(sb, ctx.request_id, {
    status: result.ok ? "completed" : "failed",
    completed_at: completedAt,
    prompt_tokens: result.prompt_tokens ?? null,
    completion_tokens: result.completion_tokens ?? null,
    error_message: result.ok ? null : (result.error ?? null),
  });
  if (result.ok) {
    await computeAndTagCost(sb, {
      request_id: ctx.request_id,
      model: ctx.input.model ?? "google/gemini-3-flash-preview",
      prompt_tokens: result.prompt_tokens, completion_tokens: result.completion_tokens,
      basis,
      agent_id: ctx.input.agent_id ?? null, business_id: ctx.input.business_id ?? null,
    });
  }
  await recordRuntimeEvent(sb, {
    request_id: ctx.request_id,
    conversation_id: ctx.input.conversation_id ?? null,
    agent_id: ctx.input.agent_id ?? null,
    business_id: ctx.input.business_id ?? null,
    event_type: result.ok ? "completed" : "sdk_error",
    severity: result.ok ? "info" : "error",
    message: result.error,
    metadata: { sdk_wrapped: true },
  });
  await releaseLease(sb, ctx.request_id, result.ok);
}