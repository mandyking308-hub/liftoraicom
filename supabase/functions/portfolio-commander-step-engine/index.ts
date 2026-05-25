// Portfolio Commander Step Engine
//
// Drives ai_workflow_runs by executing the next eligible ai_workflow_step
// through the central AI Gateway. Internal analysis runs live; only high-risk
// or irreversible steps wait for founder approval (no provider call is made
// for those — they sit at status=waiting_approval until released).
//
// Actions:
//   POST { action: "create", workflow_type, business_id?, portfolio_asset_id?, priority?, metadata? }
//   POST { action: "tick",   run_id? }                          // advance one run (or pick top queued)
//   POST { action: "tick_all", max?: number }                   // round-robin advance up to N runs
//   POST { action: "retry",  step_id }                          // safely retry a failed step
//   POST { action: "cancel", run_id, reason? }                  // cancel a run
//   POST { action: "approve_step", step_id }                    // mark a waiting_approval step ok-to-run
//
// Live-first: no external sending, no spend, no buyer/investor contact.
// All such actions are routed to waiting_approval via the AI Gateway's
// (risk=high|critical + approval_required) short-circuit.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { callAIGateway } from "../_shared/aiGateway.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

// ---------- Workflow templates ----------

type RiskLevel = "low" | "medium" | "high" | "critical";
type StepDef = {
  name: string;
  agent: string;            // ai_agent_registry.agent_name
  risk: RiskLevel;
  approval?: boolean;       // requires founder approval before provider call
  prompt: string;           // instruction for the agent
  completion_criteria: string;
};

const TEMPLATES: Record<string, StepDef[]> = {
  portfolio_weekly_review: [
    { name: "Aggregate portfolio metrics", agent: "portfolio_commander_agent", risk: "low",
      prompt: "Aggregate metrics across portfolio assets for the past 7 days. Use only internal data already accessible to Liftor. Return a compact summary.",
      completion_criteria: "Metrics summary written to output_summary." },
    { name: "Score asset performance", agent: "portfolio_commander_agent", risk: "low",
      prompt: "Score each portfolio asset by growth, revenue, risk and attention. Return a ranked list with one-line reasoning per asset.",
      completion_criteria: "Ranked list returned." },
    { name: "Surface attention items", agent: "portfolio_commander_agent", risk: "low",
      prompt: "Identify portfolio assets needing founder attention this week. Cite the trigger (blocker, declining revenue, overdue invoices, missing data).",
      completion_criteria: "Attention list with triggers." },
    { name: "Draft weekly briefing", agent: "reporting_agent", risk: "low",
      prompt: "Draft an internal weekly portfolio briefing for the founder. Bullets only. Do not send anywhere.",
      completion_criteria: "Briefing draft saved in output_summary." },
  ],
  asset_exit_review: [
    { name: "Refresh valuation inputs", agent: "ma_intelligence_agent", risk: "low",
      prompt: "Refresh valuation inputs for the asset using internal financials and any cached comparables. Note any missing inputs.",
      completion_criteria: "Inputs refreshed and gaps noted." },
    { name: "Score exit readiness", agent: "ma_intelligence_agent", risk: "low",
      prompt: "Score exit readiness across operability, data room, founder dependency, revenue durability. Return scores and weaknesses.",
      completion_criteria: "Exit readiness scorecard." },
    { name: "Identify buyer archetypes", agent: "ma_intelligence_agent", risk: "low",
      prompt: "Identify buyer archetypes likely to value this asset. Internal analysis only — do not contact anyone.",
      completion_criteria: "Archetypes listed with fit rationale." },
    { name: "Recommend next exit action", agent: "portfolio_commander_agent", risk: "medium",
      prompt: "Recommend the next exit action (warm_buyers, sell, park, iterate). Justify in 3 bullets. Do not commit to any irreversible action.",
      completion_criteria: "Recommendation with justification." },
    { name: "Start formal sale process", agent: "portfolio_commander_agent", risk: "critical", approval: true,
      prompt: "Founder approval required before any sale process kickoff. This step does not run automatically.",
      completion_criteria: "Founder approval recorded." },
  ],
  quarterly_build_selection: [
    { name: "Score backlog opportunities", agent: "portfolio_commander_agent", risk: "low",
      prompt: "Score backlog opportunities using ICE scoring (impact/confidence/effort). Return a ranked list.",
      completion_criteria: "Ranked backlog." },
    { name: "Compare capital allocation", agent: "portfolio_commander_agent", risk: "low",
      prompt: "Compare proposed capital allocation across assets vs current spend. Highlight imbalances.",
      completion_criteria: "Allocation comparison." },
    { name: "Draft quarterly build plan", agent: "reporting_agent", risk: "low",
      prompt: "Draft an internal quarterly build plan. Do not publish or send externally.",
      completion_criteria: "Build plan draft." },
    { name: "Approve build/kill decisions", agent: "founder_approval_agent", risk: "high", approval: true,
      prompt: "Founder approval required before any build/kill decision is committed.",
      completion_criteria: "Approval recorded." },
  ],
  buyer_warmup_plan: [
    { name: "Identify warmup-ready buyers", agent: "buyer_warmup_agent", risk: "low",
      prompt: "From internal buyer signals, identify warmup-ready buyers for the asset. Do not contact anyone.",
      completion_criteria: "Buyer shortlist." },
    { name: "Score buyer fit", agent: "buyer_warmup_agent", risk: "low",
      prompt: "Score buyer fit by strategic value, capacity and historical activity. Internal only.",
      completion_criteria: "Fit scores." },
    { name: "Draft warmup sequence", agent: "buyer_warmup_agent", risk: "low",
      prompt: "Draft a warmup sequence (subject + body) for the founder to review. Do not send.",
      completion_criteria: "Sequence drafted." },
    { name: "Send warmup outreach", agent: "buyer_warmup_agent", risk: "critical", approval: true,
      prompt: "Founder approval required before any external outreach. This step does not run automatically.",
      completion_criteria: "Approval recorded." },
  ],
  data_room_cleanup: [
    { name: "Audit data room completeness", agent: "data_room_agent", risk: "low",
      prompt: "Audit data room completeness against the standard exit checklist. List present and missing items.",
      completion_criteria: "Audit table." },
    { name: "Detect missing/stale documents", agent: "data_room_agent", risk: "low",
      prompt: "Detect stale or out-of-date documents (>180 days where freshness matters). Return items + reason.",
      completion_criteria: "Stale doc list." },
    { name: "Generate cleanup tasks", agent: "data_room_agent", risk: "low",
      prompt: "Generate internal cleanup tasks. Assign owner agent where appropriate.",
      completion_criteria: "Task list." },
    { name: "Export data room pack", agent: "data_room_agent", risk: "high", approval: true,
      prompt: "Founder approval required before exporting or sharing the data room pack.",
      completion_criteria: "Approval recorded." },
  ],
  valuation_refresh: [
    { name: "Pull comparable transactions", agent: "ma_intelligence_agent", risk: "low",
      prompt: "Pull comparable transactions from internal/cached M&A intelligence only.",
      completion_criteria: "Comparables summary." },
    { name: "Recompute valuation range", agent: "ma_intelligence_agent", risk: "low",
      prompt: "Recompute the valuation range using multiple methods. State assumptions.",
      completion_criteria: "Valuation range." },
    { name: "Write valuation note", agent: "reporting_agent", risk: "low",
      prompt: "Write an internal valuation note for the founder. Do not publish.",
      completion_criteria: "Valuation note." },
  ],
  execution_target_generation: [
    { name: "Scan portfolio for targets", agent: "portfolio_commander_agent", risk: "low",
      prompt: "Scan portfolio for execution targets needing action this week.",
      completion_criteria: "Target candidates." },
    { name: "Score execution priority", agent: "portfolio_commander_agent", risk: "low",
      prompt: "Score execution priority. Output top 10 actions.",
      completion_criteria: "Priority scored list." },
    { name: "Assign owner agent", agent: "portfolio_commander_agent", risk: "low",
      prompt: "Assign the most appropriate owner agent per target. Internal routing only.",
      completion_criteria: "Owner assignments." },
  ],
  competitor_investor_scan: [
    { name: "Scan competitor movements", agent: "ma_intelligence_agent", risk: "low",
      prompt: "Summarise recent competitor movements observed in internal/cached intelligence.",
      completion_criteria: "Competitor summary." },
    { name: "Scan investor signals", agent: "ma_intelligence_agent", risk: "low",
      prompt: "Summarise investor signals (fundings, exits, themes) from internal intelligence.",
      completion_criteria: "Investor signal summary." },
    { name: "Compile intelligence brief", agent: "reporting_agent", risk: "low",
      prompt: "Compile a single internal intelligence brief. Do not publish.",
      completion_criteria: "Brief drafted." },
  ],
};

// ---------- Helpers ----------

async function logEvent(admin: any, e: {
  workflow_id?: string | null; agent_id?: string | null; business_id?: string | null;
  event_type: string; severity?: string; message?: string; metadata?: Record<string, unknown>;
}) {
  try {
    await admin.from("ai_runtime_events").insert({
      agent_id: e.agent_id ?? null,
      business_id: e.business_id ?? null,
      event_type: e.event_type,
      severity: e.severity ?? "info",
      message: e.message ?? null,
      metadata: { ...(e.metadata ?? {}), workflow_id: e.workflow_id ?? null },
    });
  } catch {/* best-effort */}
}

async function logAudit(admin: any, user_id: string | null, action: string, details: Record<string, unknown>) {
  try {
    await admin.from("agent_action_audit_log").insert({
      agent_key: "portfolio_commander_agent",
      action_type: action,
      source_function: "portfolio-commander-step-engine",
      founder_user_id: user_id,
      dry_run: false,
      action_status: "ok",
      external_provider_called: false,
      email_sent: false,
      metadata: details,
    });
  } catch {/* best-effort */}
}

async function getAgentMap(admin: any): Promise<Record<string, string>> {
  const { data } = await admin.from("ai_agent_registry").select("id, agent_name");
  const map: Record<string, string> = {};
  for (const r of data ?? []) map[r.agent_name] = r.id;
  return map;
}

function newWorkflowId() {
  const r = (crypto as any).randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
  return `wf_${r}`;
}

// ---------- Actions ----------

async function createWorkflow(admin: any, body: any, user_id: string | null) {
  const wf_type = String(body?.workflow_type ?? "");
  const template = TEMPLATES[wf_type];
  if (!template) return { error: `unknown workflow_type: ${wf_type}` };

  const agentMap = await getAgentMap(admin);
  const workflow_id = newWorkflowId();

  const { data: run, error: runErr } = await admin.from("ai_workflow_runs").insert({
    workflow_id, workflow_type: wf_type,
    business_id: body?.business_id ?? null,
    portfolio_asset_id: body?.portfolio_asset_id ?? null,
    initiated_by: user_id,
    status: "queued", current_step: 0, total_steps: template.length,
    priority: body?.priority ?? 5,
    metadata: body?.metadata ?? {},
  }).select("*").maybeSingle();
  if (runErr || !run) return { error: runErr?.message ?? "could not create run" };

  const rows = template.map((s, i) => ({
    workflow_run_id: run.id,
    step_index: i,
    step_name: s.name,
    agent_id: agentMap[s.agent] ?? null,
    status: "queued",
    approval_required: !!s.approval,
    input_summary: s.prompt,
    metadata: {
      agent_key: s.agent,
      risk_level: s.risk,
      completion_criteria: s.completion_criteria,
    },
  }));
  await admin.from("ai_workflow_steps").insert(rows);

  await logEvent(admin, { workflow_id, event_type: "workflow_created", message: wf_type,
    metadata: { total_steps: template.length, business_id: body?.business_id ?? null, portfolio_asset_id: body?.portfolio_asset_id ?? null } });
  await logAudit(admin, user_id, "create_workflow", { workflow_id, workflow_type: wf_type });

  return { ok: true, run, total_steps: template.length };
}

async function pickNextRun(admin: any): Promise<any | null> {
  const { data } = await admin.from("ai_workflow_runs")
    .select("*")
    .in("status", ["queued", "running"])
    .order("priority", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return data ?? null;
}

async function loadStep(admin: any, run: any) {
  const { data } = await admin.from("ai_workflow_steps")
    .select("*")
    .eq("workflow_run_id", run.id)
    .eq("step_index", run.current_step)
    .maybeSingle();
  return data ?? null;
}

async function tickRun(admin: any, run_id: string | null) {
  let run = null;
  if (run_id) {
    const { data } = await admin.from("ai_workflow_runs").select("*").eq("id", run_id).maybeSingle();
    run = data;
  } else {
    run = await pickNextRun(admin);
  }
  if (!run) return { ok: true, message: "no eligible run" };

  if (!["queued", "running"].includes(run.status)) {
    return { ok: true, message: `run not eligible (status=${run.status})`, run };
  }

  const step = await loadStep(admin, run);
  if (!step) {
    await admin.from("ai_workflow_runs").update({
      status: "completed", completed_at: new Date().toISOString(),
    }).eq("id", run.id);
    await logEvent(admin, { workflow_id: run.workflow_id, event_type: "workflow_completed" });
    return { ok: true, message: "no further steps; marked completed" };
  }

  if (["completed", "skipped", "cancelled"].includes(step.status)) {
    await admin.from("ai_workflow_runs").update({ current_step: run.current_step + 1, status: "running",
      started_at: run.started_at ?? new Date().toISOString() }).eq("id", run.id);
    return { ok: true, message: "advanced past already-finalised step" };
  }

  if (step.status === "waiting_approval") {
    return { ok: true, message: "step waiting for founder approval", step, run };
  }

  if (step.status === "failed") {
    return { ok: true, message: "step failed — use retry action", step, run };
  }

  const meta = step.metadata ?? {};
  const risk = (meta.risk_level ?? "low") as RiskLevel;

  await admin.from("ai_workflow_steps").update({ status: "running" }).eq("id", step.id);
  if (run.status === "queued") {
    await admin.from("ai_workflow_runs").update({
      status: "running", started_at: run.started_at ?? new Date().toISOString(),
    }).eq("id", run.id);
  }

  // Approval-gated steps: do NOT call provider. Park as waiting_approval.
  if (step.approval_required && (risk === "high" || risk === "critical")) {
    await admin.from("ai_workflow_steps").update({
      status: "waiting_approval",
      output_summary: "Founder approval required before this step can run.",
    }).eq("id", step.id);
    await admin.from("ai_workflow_runs").update({ status: "waiting_approval" }).eq("id", run.id);
    await logEvent(admin, { workflow_id: run.workflow_id, agent_id: step.agent_id,
      business_id: run.business_id, event_type: "step_waiting_approval", severity: "info",
      message: step.step_name, metadata: { step_id: step.id, risk_level: risk } });
    return { ok: true, message: "step parked for founder approval", step, run };
  }

  // ---- Execute step via AI Gateway (live) ----
  const prompt = String(step.input_summary ?? "");
  const context = {
    workflow_id: run.workflow_id, workflow_type: run.workflow_type,
    business_id: run.business_id, portfolio_asset_id: run.portfolio_asset_id,
    step_index: step.step_index, step_name: step.step_name,
    completion_criteria: meta.completion_criteria ?? null,
  };

  try {
    const result = await callAIGateway({
      agent_id: step.agent_id,
      business_id: run.business_id,
      portfolio_asset_id: run.portfolio_asset_id,
      workflow_id: run.workflow_id,
      action_type: `workflow.${run.workflow_type}.${step.step_name}`,
      task_category: "portfolio_commander_workflow",
      request_type: "workflow_step",
      risk_level: risk,
      approval_required: !!step.approval_required,
      priority: run.priority,
      idempotency_key: `wf:${run.workflow_id}:step:${step.step_index}`,
      metadata: context,
      messages: [
        { role: "system", content: "You are a Liftor portfolio agent executing one internal workflow step. Return concise structured output. Do not contact anyone externally. Do not propose spend or irreversible actions." },
        { role: "user", content: `${prompt}\n\nContext:\n${JSON.stringify(context, null, 2)}` },
      ],
    });

    if (result.status === "failed") {
      await admin.from("ai_workflow_steps").update({
        status: "failed", error_message: result.error ?? "gateway failure",
        request_id: result.request_id, completed_at: new Date().toISOString(),
      }).eq("id", step.id);
      const newStatus = (risk === "high" || risk === "critical") ? "failed" : "paused";
      await admin.from("ai_workflow_runs").update({
        status: newStatus, error_message: result.error ?? "step failed",
      }).eq("id", run.id);
      await logEvent(admin, { workflow_id: run.workflow_id, agent_id: step.agent_id,
        business_id: run.business_id, event_type: "step_failed", severity: "error",
        message: step.step_name, metadata: { step_id: step.id, error: result.error } });
      return { ok: false, message: "step failed", step, run, error: result.error };
    }

    // approval_required short-circuit from gateway
    if (result.approval_required) {
      await admin.from("ai_workflow_steps").update({
        status: "waiting_approval", request_id: result.request_id,
        output_summary: "Gateway parked this step for founder approval.",
      }).eq("id", step.id);
      await admin.from("ai_workflow_runs").update({ status: "waiting_approval" }).eq("id", run.id);
      return { ok: true, message: "gateway parked step for approval", step, run };
    }

    const text = result.data?.choices?.[0]?.message?.content ?? "";
    const summary = typeof text === "string" ? text.slice(0, 4000) : JSON.stringify(text).slice(0, 4000);

    await admin.from("ai_workflow_steps").update({
      status: "completed", request_id: result.request_id,
      output_summary: summary, completed_at: new Date().toISOString(),
    }).eq("id", step.id);

    const next = run.current_step + 1;
    if (next >= run.total_steps) {
      await admin.from("ai_workflow_runs").update({
        status: "completed", current_step: next, completed_at: new Date().toISOString(),
      }).eq("id", run.id);
      await logEvent(admin, { workflow_id: run.workflow_id, event_type: "workflow_completed" });
    } else {
      await admin.from("ai_workflow_runs").update({
        status: "running", current_step: next,
      }).eq("id", run.id);
      await logEvent(admin, { workflow_id: run.workflow_id, agent_id: step.agent_id,
        business_id: run.business_id, event_type: "step_completed", message: step.step_name,
        metadata: { step_id: step.id, request_id: result.request_id } });
    }
    return { ok: true, message: "step completed", step_id: step.id, request_id: result.request_id };
  } catch (err: any) {
    await admin.from("ai_workflow_steps").update({
      status: "failed", error_message: String(err?.message ?? err).slice(0, 2000),
      completed_at: new Date().toISOString(),
    }).eq("id", step.id);
    await admin.from("ai_workflow_runs").update({
      status: "paused", error_message: String(err?.message ?? err).slice(0, 2000),
    }).eq("id", run.id);
    await logEvent(admin, { workflow_id: run.workflow_id, agent_id: step.agent_id,
      business_id: run.business_id, event_type: "step_exception", severity: "error",
      message: step.step_name, metadata: { error: String(err) } });
    return { ok: false, message: "exception during step", error: String(err?.message ?? err) };
  }
}

async function retryStep(admin: any, step_id: string, user_id: string | null) {
  const { data: step } = await admin.from("ai_workflow_steps").select("*").eq("id", step_id).maybeSingle();
  if (!step) return { error: "step not found" };
  if (!["failed", "cancelled"].includes(step.status)) return { error: `step status ${step.status} not retryable` };

  // Safety: high-risk approval-gated steps cannot be retried without going through approval again.
  const risk = (step.metadata?.risk_level ?? "low");
  if (step.approval_required && (risk === "high" || risk === "critical")) {
    await admin.from("ai_workflow_steps").update({ status: "waiting_approval", error_message: null }).eq("id", step_id);
    await admin.from("ai_workflow_runs").update({ status: "waiting_approval", error_message: null })
      .eq("id", step.workflow_run_id);
    return { ok: true, message: "high-risk step reset to waiting_approval" };
  }

  await admin.from("ai_workflow_steps").update({ status: "queued", error_message: null }).eq("id", step_id);
  await admin.from("ai_workflow_runs").update({ status: "queued", error_message: null })
    .eq("id", step.workflow_run_id);
  await logAudit(admin, user_id, "retry_step", { step_id });
  return { ok: true, message: "step requeued" };
}

async function cancelRun(admin: any, run_id: string, user_id: string | null, reason?: string) {
  await admin.from("ai_workflow_runs").update({
    status: "cancelled", completed_at: new Date().toISOString(),
    error_message: reason ?? null,
  }).eq("id", run_id);
  await admin.from("ai_workflow_steps").update({ status: "cancelled" })
    .eq("workflow_run_id", run_id).in("status", ["queued", "running", "waiting_approval"]);
  await logAudit(admin, user_id, "cancel_workflow", { run_id, reason });
  return { ok: true };
}

async function approveStep(admin: any, step_id: string, user_id: string | null) {
  const { data: step } = await admin.from("ai_workflow_steps").select("*").eq("id", step_id).maybeSingle();
  if (!step) return { error: "step not found" };
  // Approving a high-risk step means founder authorised it — we still do NOT auto-call provider for
  // external/irreversible actions. We mark the step completed with an approval note. The run advances.
  await admin.from("ai_workflow_steps").update({
    status: "completed",
    output_summary: (step.output_summary ? step.output_summary + "\n" : "") + `Founder approved at ${new Date().toISOString()}.`,
    completed_at: new Date().toISOString(),
  }).eq("id", step_id);
  const { data: run } = await admin.from("ai_workflow_runs").select("*").eq("id", step.workflow_run_id).maybeSingle();
  if (run) {
    const next = (run.current_step ?? 0) + 1;
    const done = next >= run.total_steps;
    await admin.from("ai_workflow_runs").update({
      status: done ? "completed" : "running",
      current_step: next,
      completed_at: done ? new Date().toISOString() : null,
    }).eq("id", run.id);
  }
  await logAudit(admin, user_id, "approve_step", { step_id });
  return { ok: true };
}

// ---------- HTTP entry ----------

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization") || "";
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "unauthenticated" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", user.id);
    const allowed = (roles ?? []).some((r: any) => r.role === "admin" || r.role === "founder");
    if (!allowed) return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action ?? "tick");

    let out: any = {};
    if (action === "create") out = await createWorkflow(admin, body, user.id);
    else if (action === "tick") out = await tickRun(admin, body?.run_id ?? null);
    else if (action === "tick_all") {
      const max = Math.min(10, Number(body?.max ?? 3));
      const results: any[] = [];
      for (let i = 0; i < max; i++) {
        const r = await tickRun(admin, null);
        results.push(r);
        if (r?.message === "no eligible run") break;
      }
      out = { ok: true, results };
    }
    else if (action === "retry") out = await retryStep(admin, String(body?.step_id), user.id);
    else if (action === "cancel") out = await cancelRun(admin, String(body?.run_id), user.id, body?.reason);
    else if (action === "approve_step") out = await approveStep(admin, String(body?.step_id), user.id);
    else out = { error: `unknown action: ${action}` };

    return new Response(JSON.stringify(out), {
      status: out?.error ? 400 : 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: String(err?.message ?? err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});