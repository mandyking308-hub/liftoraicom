import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { beginGatewayLog, endGatewayLog } from "../_shared/aiGateway.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const NO_FORBIDDEN_AUDIT = {
  emails_sent: 0, dms_sent: 0, posts_published: 0,
  apollo_calls: 0, apollo_credits_spent: 0,
  smartlead_posts: 0, smartlead_campaign_starts: 0,
  metricool_mutations: 0, manychat_mutations: 0,
  ad_platform_mutations: 0, payment_mutations: 0,
  portal_accounts_created: 0, portal_invites_sent: 0,
  surveys_sent: 0, reports_shared: 0,
  auto_send_changed: false, cron_changed: false,
  real_data_deleted: 0, secrets_exposed: 0,
};

const ALLOWED_MODES = new Set([
  "answer","what_should_i_do_now","explain_blocker","diagnostic_summary",
  "draft_founder_brief","draft_social_content","draft_revenue_plan",
  "draft_support_reply","draft_customer_success_plan","manual_question",
  "business_operator","other",
]);

const SAFE_INTERNAL_TOOLS = new Set([
  "build_context_pack","generate_internal_next_actions","create_internal_ai_note",
  "create_founder_approval_item","create_manual_export_pack",
  "draft_founder_brief","draft_social_post","draft_campaign_copy","draft_revenue_plan",
  "draft_support_reply","draft_customer_success_message","draft_diagnostic_summary",
  "draft_manual_update_suggestion","draft_inbound_email_reply",
]);

const ALLOWED_DRAFT_TYPES = new Set([
  "founder_brief","social_post","campaign_copy","revenue_plan","support_reply",
  "customer_success_message","diagnostic_summary","manual_update_suggestion","other",
]);

const EXTERNAL_INTENT_RX =
  /\b(send|email it|publish|schedule|spend|charge|invoice|push to|start campaign|invite|reveal|launch)\b/i;

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

function safeJsonParse(s: string): any | null {
  if (!s) return null;
  try { return JSON.parse(s); } catch {}
  const m = s.match(/```json\s*([\s\S]*?)```/) ?? s.match(/```\s*([\s\S]*?)```/);
  if (m) { try { return JSON.parse(m[1]); } catch {} }
  const first = s.indexOf("{"); const last = s.lastIndexOf("}");
  if (first >= 0 && last > first) { try { return JSON.parse(s.slice(first, last + 1)); } catch {} }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return json({ ok: false, error: "auth_missing" }, 401);

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false },
  });
  const { data: u } = await userClient.auth.getUser(auth.replace("Bearer ", ""));
  if (!u?.user) return json({ ok: false, error: "auth_invalid" }, 401);
  const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", u.user.id);
  const roleSet = new Set((roles ?? []).map((r: any) => r.role));
  if (!roleSet.has("founder") && !roleSet.has("admin")) {
    return json({ ok: false, error: "forbidden" }, 403);
  }

  let body: any = {};
  try { body = await req.json(); } catch { body = {}; }

  const session_id_in: string | null = body.session_id ?? null;
  const business_id: string | null = body.business_id ?? null;
  const user_message: string = (body.user_message ?? "").toString().trim();
  const requested_mode: string = ALLOWED_MODES.has(body.requested_mode) ? body.requested_mode : "answer";
  const context_type: string = body.context_type ?? "command_centre";
  const source_object_type: string | null = body.source_object_type ?? null;
  const source_object_id: string | null = body.source_object_id ?? null;
  const include_diagnostics: boolean = !!body.include_diagnostics;
  const allow_internal_tools: boolean = body.allow_internal_tools !== false;
  const save_draft: boolean = !!body.save_draft;
  const draft_type_in: string | null = body.draft_type ?? null;
  const dry_run: boolean = !!body.dry_run;

  if (!user_message) return json({ ok: false, error: "user_message_required" }, 400);

  // --- Provider check (no secret value returned) ---
  let providerCheck: any = null;
  try {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/liftor-brain-provider-check`, {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify({ provider_key: "openai", write_audit: false }),
    });
    providerCheck = await r.json();
  } catch { providerCheck = { provider_status: "error", can_call_ai: false, secret_present: false }; }

  const can_call_ai = !!providerCheck?.can_call_ai;
  const provider_status = providerCheck?.provider_status ?? "not_configured";
  const default_model = providerCheck?.default_model ?? "gpt-5.5";

  // --- Session create/load ---
  const session_type =
    requested_mode === "business_operator" ? "business_operator" :
    requested_mode === "manual_question" ? "manual" :
    requested_mode === "diagnostic_summary" ? "diagnostic" :
    requested_mode.startsWith("draft_") ? "command_centre" :
    context_type === "selected_business" ? "business_operator" : "command_centre";
  const selected_scope = business_id ? "current_business" : "all_businesses";

  let session: any = null;
  if (session_id_in) {
    const { data } = await admin.from("liftor_brain_sessions").select("*").eq("id", session_id_in).maybeSingle();
    session = data;
  }
  if (!session) {
    const { data, error } = await admin.from("liftor_brain_sessions").insert({
      business_id, founder_user_id: u.user.id,
      session_name: `Brain · ${requested_mode}`,
      session_type, selected_scope,
      model_provider: "openai", model_name: default_model,
      external_actions_allowed: false,
      metadata: { context_type, requested_mode },
    }).select("*").maybeSingle();
    if (error || !data) return json({ ok: false, error: "session_create_failed", details: error?.message }, 500);
    session = data;
    await admin.from("liftor_brain_audit").insert({
      business_id, session_id: session.id,
      action: "brain_chat_session_created", action_status: "recorded",
      details: { requested_mode, context_type, scope: selected_scope },
    });
  }

  // --- Build context pack ---
  let context: any = null;
  try {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/liftor-brain-context-builder`, {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify({
        business_id, context_type, source_object_type, source_object_id,
        session_id: session.id, include_diagnostics,
      }),
    });
    context = await r.json();
  } catch (e) { context = { ok: false, error: "context_builder_failed", message: (e as Error).message }; }

  const context_pack_id = context?.context_pack_id ?? null;
  const missing_context: string[] = context?.missing_context ?? [];
  const risk_warnings: string[] = context?.risk_warnings ?? [];

  // --- Read constitution ---
  let constitution: any = null;
  try {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/liftor-brain-constitution-read`, {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify({ include_full_text: false }),
    });
    constitution = await r.json();
  } catch { constitution = null; }

  // --- Save user message ---
  const externalIntent = EXTERNAL_INTENT_RX.test(user_message);
  const { data: userMsg } = await admin.from("liftor_brain_messages").insert({
    session_id: session.id, business_id, role: "user",
    message_text: user_message, message_status: "recorded",
    context_pack_id, source_object_type, source_object_id,
    external_action_requested: externalIntent,
    external_action_blocked: externalIntent,
    metadata: { requested_mode, context_type },
  }).select("id").maybeSingle();
  await admin.from("liftor_brain_audit").insert({
    business_id, session_id: session.id,
    action: "brain_chat_message_recorded", action_status: "recorded",
    details: { role: "user", message_id: userMsg?.id, external_intent: externalIntent },
  });

  // --- Provider missing path: fail-closed ---
  if (!can_call_ai) {
    const failText =
      "Liftor Brain provider is not configured. Add OPENAI_API_KEY as a Supabase Edge Function secret to enable the AI brain. No model call was made.";
    const { data: aMsg } = await admin.from("liftor_brain_messages").insert({
      session_id: session.id, business_id, role: "assistant",
      message_text: failText, message_status: "blocked",
      context_pack_id, external_action_blocked: true,
      metadata: { provider_status, reason: "openai_secret_missing" },
    }).select("id").maybeSingle();
    await admin.from("liftor_brain_sessions").update({
      last_user_message_at: new Date().toISOString(),
      last_ai_message_at: new Date().toISOString(),
      last_context_pack_id: context_pack_id,
      message_count: (session.message_count ?? 0) + 2,
      session_status: "active",
    }).eq("id", session.id);
    await admin.from("liftor_brain_audit").insert({
      business_id, session_id: session.id,
      action: "provider_missing", action_status: "blocked",
      details: { provider_status },
    });
    return json({
      status: "PARTIAL_PROVIDER_NOT_CONFIGURED",
      session_id: session.id,
      user_message_id: userMsg?.id ?? null,
      assistant_message_id: aMsg?.id ?? null,
      context_pack_id,
      answer: failText,
      suggested_actions: [{
        title: "Configure OpenAI provider for Liftor Brain",
        reason: "OPENAI_API_KEY missing — Brain is fail-closed.",
        priority: "high", safe_internal: true, external_action_required: false,
        recommended_route: "/founder/command-centre",
      }],
      missing_context, risk_warnings,
      tool_results: [], created_draft_ids: [],
      provider_status, usage: null,
      external_actions_blocked: true,
      no_forbidden_action_audit: { ...NO_FORBIDDEN_AUDIT, openai_calls: 0 },
    });
  }

  // --- Build prompt ---
  const systemPrompt = [
    "You are Liftor Brain, the central AI operating backbone inside Liftor.",
    "You operate across all Mandy's businesses, not just one.",
    "All external actions are LOCKED. You cannot send email, DM, publish, schedule, charge, invite, reveal, or start campaigns.",
    "You can read internal state, suggest next actions, prepare internal drafts, and explain blockers.",
    "Never claim an external action happened. Never reveal API keys or chain-of-thought.",
    "Be warm, clear, practical and direct. Answer first. State missing context and risks honestly.",
    "Founder remains in command. Drafts only. Founder approval is required for anything that would mutate the world.",
    "If asked to perform an external action, convert it to a safe internal preparation step instead.",
    "",
    "CONSTITUTION (summary):",
    JSON.stringify({
      identity_rules: constitution?.identity_rules ?? null,
      safety_rules: constitution?.safety_rules ?? null,
      forbidden_actions: (constitution?.forbidden_actions ?? []).slice(0, 30),
      allowed_actions: (constitution?.allowed_actions ?? []).slice(0, 20),
      output_style_rules: constitution?.output_style_rules ?? null,
    }),
    "",
    "CONTEXT_PACK (compact):",
    JSON.stringify(context?.compact_context ?? {}),
    "",
    include_diagnostics ? `CONTEXT_PACK (full): ${JSON.stringify({
      command_centre_truth: context?.command_centre_truth,
      selected_business_snapshot: context?.selected_business_snapshot,
      crm_summary: context?.crm_summary,
      revenue_target_summary: context?.revenue_target_summary,
      external_gates_summary: context?.external_gates_summary,
      approvals_summary: context?.approvals_summary,
      portfolio_summary: context?.portfolio_summary,
    })}` : "",
    "",
    `REQUESTED_MODE: ${requested_mode}`,
    `SAVE_DRAFT: ${save_draft}`,
    `ALLOW_INTERNAL_TOOLS: ${allow_internal_tools}`,
    "",
    "OUTPUT CONTRACT: Respond with strict JSON only matching this shape:",
    `{
  "answer": "string",
  "summary": "string",
  "suggested_actions": [{"title":"string","reason":"string","priority":"low|medium|high|critical","safe_internal":true,"external_action_required":false,"recommended_route":"string|null"}],
  "missing_context": ["string"],
  "risk_warnings": ["string"],
  "requested_tool_calls": [{"tool_key":"string","payload":{},"reason":"string"}],
  "draft": {"should_create":false,"draft_type":"string|null","title":"string|null","subject":"string|null","body":"string|null","rationale":"string|null"},
  "safety_status": {"external_actions_blocked":true,"send_allowed":false,"publish_allowed":false,"spend_allowed":false,"provider_mutation_allowed":false}
}`,
    "Do not include any prose outside the JSON. Do not reveal chain-of-thought.",
  ].filter(Boolean).join("\n");

  // --- Load recent thread (last 8 messages) ---
  const { data: recent } = await admin.from("liftor_brain_messages")
    .select("role,message_text,created_at")
    .eq("session_id", session.id)
    .order("created_at", { ascending: false })
    .limit(8);
  const threadMsgs = (recent ?? []).reverse().map((m: any) => ({
    role: m.role === "assistant" ? "assistant" : "user",
    content: m.message_text,
  }));

  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  let assistantText = "";
  let parsed: any = null;
  let usage: any = null;
  let aiError: string | null = null;

  if (dry_run) {
    parsed = {
      answer: "[dry_run] No model call performed.",
      summary: "dry_run",
      suggested_actions: [],
      missing_context, risk_warnings,
      requested_tool_calls: [],
      draft: { should_create: false, draft_type: null, title: null, subject: null, body: null, rationale: null },
      safety_status: { external_actions_blocked: true, send_allowed: false, publish_allowed: false, spend_allowed: false, provider_mutation_allowed: false },
    };
    assistantText = parsed.answer;
  } else {
    try {
      // Migrated: route via approved Lovable AI Gateway (no direct OpenAI call).
      const rawModel = (default_model || "gpt-5.5").trim();
      const model = rawModel.includes("/") ? rawModel : `openai/${rawModel}`;
      const fallback_model = "google/gemini-3-flash-preview";
      const gwInput = {
        action_type: "liftor_brain_chat",
        task_category: "brain_chat",
        business_id,
        user_id: u.user.id,
        model,
        fallback_model,
        risk_level: "medium" as const,
        request_type: "brain_chat",
        conversation_id: session.id,
        messages: [],
        metadata: { requested_mode, context_type },
      };
      const __log = await beginGatewayLog(gwInput);
      let r: Response;
      try {
        r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${lovableKey}` },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: systemPrompt },
              ...threadMsgs,
              { role: "user", content: user_message },
            ],
            response_format: { type: "json_object" },
          }),
        });
      } catch (e) {
        await endGatewayLog({ ...__log, input: gwInput }, { ok: false, error: (e as Error).message });
        throw e;
      }
      const data = await r.json();
      if (!r.ok) {
        aiError = data?.error?.message ?? `gateway_http_${r.status}`;
        await endGatewayLog({ ...__log, input: gwInput }, { ok: false, error: aiError });
        if (r.status === 429) aiError = "Rate limit. Try again shortly.";
        if (r.status === 402) aiError = "AI credits exhausted.";
      } else {
        assistantText = data?.choices?.[0]?.message?.content ?? "";
        usage = data?.usage ?? null;
        parsed = safeJsonParse(assistantText);
        await endGatewayLog({ ...__log, input: gwInput }, {
          ok: true,
          prompt_tokens: usage?.prompt_tokens ?? 0,
          completion_tokens: usage?.completion_tokens ?? 0,
        });
      }
    } catch (e) {
      aiError = (e as Error).message;
    }
  }

  if (aiError) {
    const errText = `Liftor Brain could not reach the model right now. ${aiError}. No external action was taken.`;
    const { data: aMsg } = await admin.from("liftor_brain_messages").insert({
      session_id: session.id, business_id, role: "assistant",
      message_text: errText, message_status: "error",
      context_pack_id, external_action_blocked: true,
      metadata: { error: aiError },
    }).select("id").maybeSingle();
    await admin.from("liftor_brain_audit").insert({
      business_id, session_id: session.id,
      action: "ai_response_error", action_status: "error",
      details: { error: aiError },
    });
    return json({
      status: "AI_ERROR",
      session_id: session.id,
      user_message_id: userMsg?.id ?? null,
      assistant_message_id: aMsg?.id ?? null,
      context_pack_id, answer: errText,
      suggested_actions: [], missing_context, risk_warnings,
      tool_results: [], created_draft_ids: [],
      provider_status, usage: null,
      external_actions_blocked: true,
      no_forbidden_action_audit: NO_FORBIDDEN_AUDIT,
    });
  }

  if (!parsed) {
    parsed = {
      answer: assistantText || "Liftor Brain returned a non-structured response. Treating as plain answer with no tool calls.",
      summary: "fallback_plain_text",
      suggested_actions: [], missing_context, risk_warnings,
      requested_tool_calls: [],
      draft: { should_create: false, draft_type: null, title: null, subject: null, body: null, rationale: null },
      safety_status: { external_actions_blocked: true, send_allowed: false, publish_allowed: false, spend_allowed: false, provider_mutation_allowed: false },
    };
  }

  // --- Force safety overrides ---
  parsed.safety_status = {
    external_actions_blocked: true,
    send_allowed: false, publish_allowed: false,
    spend_allowed: false, provider_mutation_allowed: false,
  };
  parsed.suggested_actions = Array.isArray(parsed.suggested_actions) ? parsed.suggested_actions.map((a: any) => ({
    title: String(a?.title ?? "").slice(0, 200),
    reason: String(a?.reason ?? "").slice(0, 500),
    priority: ["low","medium","high","critical"].includes(a?.priority) ? a.priority : "medium",
    safe_internal: true,
    external_action_required: !!a?.external_action_required,
    recommended_route: a?.recommended_route ?? null,
  })) : [];

  // --- Save assistant message ---
  const founderApprovalNeeded = (parsed.draft?.should_create === true) ||
    (parsed.suggested_actions ?? []).some((a: any) => a.external_action_required);
  const { data: aMsg } = await admin.from("liftor_brain_messages").insert({
    session_id: session.id, business_id, role: "assistant",
    message_text: parsed.answer ?? assistantText ?? "",
    message_status: "generated",
    context_pack_id,
    tokens_prompt: usage?.prompt_tokens ?? 0,
    tokens_completion: usage?.completion_tokens ?? 0,
    external_action_blocked: true,
    founder_approval_required: founderApprovalNeeded,
    metadata: { parsed_summary: parsed.summary, model: default_model },
  }).select("id").maybeSingle();

  await admin.from("liftor_brain_audit").insert({
    business_id, session_id: session.id,
    action: "ai_response_generated", action_status: "recorded",
    details: { message_id: aMsg?.id, has_draft: !!parsed.draft?.should_create, tool_calls: (parsed.requested_tool_calls ?? []).length, usage },
  });

  // --- Tool router calls ---
  const tool_results: any[] = [];
  const created_draft_ids: string[] = [];
  if (allow_internal_tools && Array.isArray(parsed.requested_tool_calls)) {
    for (const call of parsed.requested_tool_calls.slice(0, 6)) {
      const key = String(call?.tool_key ?? "");
      const isDraft = key.startsWith("draft_");
      const allowed = SAFE_INTERNAL_TOOLS.has(key) &&
        (!isDraft || save_draft || requested_mode.startsWith("draft_"));
      if (!allowed) {
        await admin.from("liftor_brain_audit").insert({
          business_id, session_id: session.id,
          action: "tool_call_blocked", action_status: "blocked",
          details: { tool_key: key, reason: "not_allowed_in_this_call" },
        });
        tool_results.push({ tool_key: key, status: "blocked", reason: "not_allowed_in_this_call" });
        continue;
      }
      await admin.from("liftor_brain_audit").insert({
        business_id, session_id: session.id,
        action: "tool_call_requested", action_status: "recorded",
        details: { tool_key: key },
      });
      try {
        const r = await fetch(`${SUPABASE_URL}/functions/v1/liftor-brain-tool-router`, {
          method: "POST",
          headers: { Authorization: auth, "Content-Type": "application/json" },
          body: JSON.stringify({
            tool_key: key,
            payload: call.payload ?? {},
            session_id: session.id,
            business_id,
            source_message_id: aMsg?.id ?? null,
            dry_run: false,
          }),
        });
        const tr = await r.json();
        tool_results.push({ tool_key: key, status: tr?.status ?? (r.ok ? "ok" : "error"), result: tr });
        if (tr?.draft_id) created_draft_ids.push(tr.draft_id);
      } catch (e) {
        tool_results.push({ tool_key: key, status: "error", error: (e as Error).message });
      }
    }
  }

  // --- Draft creation (preview vs save) ---
  let draft_preview: any = null;
  if (parsed.draft?.should_create && parsed.draft?.body) {
    const dtype = String(parsed.draft.draft_type ?? draft_type_in ?? "other");
    const safeType = ALLOWED_DRAFT_TYPES.has(dtype) ? dtype : "other";
    if (save_draft) {
      const { data: dRow } = await admin.from("liftor_brain_drafts").insert({
        business_id, session_id: session.id, source_message_id: aMsg?.id,
        draft_type: safeType,
        title: parsed.draft.title ?? null,
        subject: parsed.draft.subject ?? null,
        body: parsed.draft.body,
        rationale: parsed.draft.rationale ?? null,
        external_send_allowed: false,
        external_action_blocked: true,
        approval_status: "pending_founder_review",
        draft_status: "ready_for_review",
        metadata: { requested_mode },
      }).select("id").maybeSingle();
      if (dRow?.id) {
        created_draft_ids.push(dRow.id);
        await admin.from("liftor_brain_audit").insert({
          business_id, session_id: session.id,
          action: "draft_created_internal", action_status: "recorded",
          details: { draft_id: dRow.id, draft_type: safeType },
        });
      }
    } else {
      draft_preview = { ...parsed.draft, draft_type: safeType };
      await admin.from("liftor_brain_audit").insert({
        business_id, session_id: session.id,
        action: "draft_preview_generated", action_status: "recorded",
        details: { draft_type: safeType },
      });
    }
  }

  // --- Update session ---
  await admin.from("liftor_brain_sessions").update({
    last_user_message_at: new Date().toISOString(),
    last_ai_message_at: new Date().toISOString(),
    last_context_pack_id: context_pack_id,
    message_count: (session.message_count ?? 0) + 2,
    total_prompt_tokens: (session.total_prompt_tokens ?? 0) + (usage?.prompt_tokens ?? 0),
    total_completion_tokens: (session.total_completion_tokens ?? 0) + (usage?.completion_tokens ?? 0),
  }).eq("id", session.id);

  // Merge missing/risk
  const mergedMissing = Array.from(new Set([...(missing_context ?? []), ...((parsed.missing_context ?? []) as string[])]));
  const mergedRisks = Array.from(new Set([...(risk_warnings ?? []), ...((parsed.risk_warnings ?? []) as string[])]));

  return json({
    status: "OK",
    session_id: session.id,
    user_message_id: userMsg?.id ?? null,
    assistant_message_id: aMsg?.id ?? null,
    context_pack_id,
    answer: parsed.answer ?? assistantText,
    summary: parsed.summary ?? null,
    suggested_actions: parsed.suggested_actions ?? [],
    missing_context: mergedMissing,
    risk_warnings: mergedRisks,
    tool_results,
    created_draft_ids,
    draft_preview,
    provider_status,
    usage,
    external_actions_blocked: true,
    no_forbidden_action_audit: NO_FORBIDDEN_AUDIT,
  });
});