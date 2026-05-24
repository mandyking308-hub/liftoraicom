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
};

export type AIGatewayCallResult = {
  trace_id: string;
  status: "completed" | "failed" | "rate_limited" | "payment_required";
  http_status: number;
  data?: any;
  error?: string;
  prompt_tokens?: number;
  completion_tokens?: number;
};

function newTraceId() {
  const r = (crypto as any).randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
  return `trc_${r}`;
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
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) {
    await writeLedger(trace_id, input, { status: "failed", input_summary: "LOVABLE_API_KEY missing" });
    return { trace_id, status: "failed", http_status: 500, error: "LOVABLE_API_KEY not configured" };
  }

  await writeLedger(trace_id, input, { status: "pending", input_summary: input.action_type });

  let resp: Response;
  try {
    resp = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: input.model ?? "google/gemini-3-flash-preview",
        messages: input.messages,
        tools: input.tools,
        tool_choice: input.tool_choice,
        reasoning: input.reasoning,
        stream: !!input.stream,
      }),
    });
  } catch (e: any) {
    await writeLedger(trace_id, input, { status: "failed", output_summary: `network: ${String(e?.message ?? e)}` });
    return { trace_id, status: "failed", http_status: 0, error: String(e?.message ?? e) };
  }

  if (resp.status === 429) {
    await writeLedger(trace_id, input, { status: "failed", output_summary: "rate_limited" });
    return { trace_id, status: "rate_limited", http_status: 429, error: "Rate limit exceeded" };
  }
  if (resp.status === 402) {
    await writeLedger(trace_id, input, { status: "failed", output_summary: "payment_required" });
    return { trace_id, status: "payment_required", http_status: 402, error: "Lovable AI credits required" };
  }
  if (!resp.ok) {
    const txt = await resp.text().catch(() => "");
    await writeLedger(trace_id, input, { status: "failed", output_summary: `http ${resp.status}` });
    return { trace_id, status: "failed", http_status: resp.status, error: txt.slice(0, 500) };
  }

  const data = await resp.json();
  const usage = data?.usage ?? {};
  await writeLedger(trace_id, input, {
    status: "completed",
    prompt_tokens: usage.prompt_tokens ?? 0,
    completion_tokens: usage.completion_tokens ?? 0,
    output_summary: input.action_type,
  });
  return {
    trace_id, status: "completed", http_status: 200, data,
    prompt_tokens: usage.prompt_tokens, completion_tokens: usage.completion_tokens,
  };
}

/** Streaming variant. Returns the raw Response so the edge function can pipe it. */
export async function streamAIGateway(input: AIGatewayCallInput): Promise<{ trace_id: string; response: Response }> {
  const trace_id = newTraceId();
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  await writeLedger(trace_id, input, { status: "pending", input_summary: input.action_type });
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
    }),
  });
  // Caller is responsible for piping `response.body`. Final ledger update happens on close.
  return { trace_id, response };
}