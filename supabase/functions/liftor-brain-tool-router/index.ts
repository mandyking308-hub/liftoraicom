import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SAFETY = {
  no_external_action: true,
  no_model_call: true,
  no_forbidden_action_audit: {
    openai_calls: 0, emails_sent: 0, dms_sent: 0, posts_published: 0,
    apollo_calls: 0, apollo_credits_spent: 0, smartlead_posts: 0, smartlead_campaign_starts: 0,
    metricool_mutations: 0, manychat_mutations: 0, ad_platform_mutations: 0, payment_mutations: 0,
    portal_accounts_created: 0, portal_invites_sent: 0, surveys_sent: 0, reports_shared: 0,
    external_provider_mutations: 0, auto_send_changed: false, cron_changed: false,
    real_data_deleted: 0, secrets_exposed: 0,
  },
};

const SECRET_KEYS = ["api_key","apikey","password","token","secret","credential","smtp","imap","webhook_secret","auth","authorization"];
function redact(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(redact);
  if (typeof obj === "object") {
    const out: any = {};
    for (const [k, v] of Object.entries(obj)) {
      if (SECRET_KEYS.some((s) => k.toLowerCase().includes(s))) out[k] = "[REDACTED]";
      else out[k] = redact(v);
    }
    return out;
  }
  return obj;
}

const READ_TO_CONTEXT: Record<string, string> = {
  read_truth_sync: "command_centre",
  read_business_status: "selected_business",
  read_command_centre_summary: "command_centre",
  read_manual_summary: "manual",
  read_business_knowledge: "selected_business",
  read_crm_summary: "selected_business",
  read_customer_journey: "customer_success",
  read_revenue_targets: "revenue_target",
  read_founder_approvals: "selected_business",
  read_external_gates: "selected_business",
  read_social_marketing_summary: "social_marketing",
  read_paid_media_summary: "social_marketing",
  read_support_summary: "support_reply",
  read_customer_success_summary: "customer_success",
  read_group_hq_summary: "all_businesses",
  read_security_summary: "diagnostic",
  read_cost_summary: "diagnostic",
};

const READ_PROJECTION: Record<string, string[]> = {
  read_truth_sync: ["command_centre_truth","external_gates_summary","approvals_summary","missing_context","risk_warnings","compact_context"],
  read_business_status: ["selected_business_snapshot","business_knowledge_summary","crm_summary","approvals_summary","external_gates_summary","missing_context","risk_warnings"],
  read_command_centre_summary: ["command_centre_truth","portfolio_summary","approvals_summary","external_gates_summary","missing_context","risk_warnings","compact_context"],
  read_manual_summary: ["user_manual_summary","technical_manual_summary","missing_context"],
  read_business_knowledge: ["business_knowledge_summary","missing_context"],
  read_crm_summary: ["crm_summary","conversation_summary","missing_context","risk_warnings"],
  read_customer_journey: ["customer_journey_summary","customer_success_summary","missing_context","risk_warnings"],
  read_revenue_targets: ["revenue_target_summary","missing_context","risk_warnings"],
  read_founder_approvals: ["approvals_summary","missing_context"],
  read_external_gates: ["external_gates_summary","security_safety_summary","missing_context","risk_warnings"],
  read_social_marketing_summary: ["social_marketing_summary","paid_media_summary","missing_context","risk_warnings"],
  read_paid_media_summary: ["paid_media_summary","missing_context","risk_warnings"],
  read_support_summary: ["support_summary","missing_context","risk_warnings"],
  read_customer_success_summary: ["customer_success_summary","missing_context","risk_warnings"],
  read_group_hq_summary: ["group_hq_summary","portfolio_summary","missing_context"],
  read_security_summary: ["security_safety_summary","external_gates_summary","missing_context","risk_warnings"],
  read_cost_summary: ["cost_usage_summary","agent_autonomy_summary","missing_context"],
};

const DRAFT_TYPES: Record<string, string> = {
  draft_inbound_email_reply: "inbound_email_reply",
  draft_support_reply: "support_reply",
  draft_customer_success_plan: "customer_success_message",
  draft_social_content_ideas: "social_post",
  draft_revenue_activity_plan: "revenue_plan",
  draft_founder_brief: "founder_brief",
  draft_diagnostic_summary: "diagnostic_summary",
};

const DRAFT_CONFIRM: Record<string, string> = {
  draft_inbound_email_reply: "CREATE INBOUND EMAIL REPLY DRAFT",
  draft_support_reply: "CREATE SUPPORT REPLY DRAFT",
  draft_customer_success_plan: "CREATE CUSTOMER SUCCESS PLAN DRAFT",
  draft_social_content_ideas: "CREATE SOCIAL CONTENT DRAFT",
  draft_revenue_activity_plan: "CREATE REVENUE PLAN DRAFT",
  draft_founder_brief: "CREATE FOUNDER BRIEF DRAFT",
  draft_diagnostic_summary: "CREATE DIAGNOSTIC SUMMARY DRAFT",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return json({ status: "blocked", blocked_reason: "auth_missing", ...SAFETY }, 401);
  }
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
  const { data: u } = await userClient.auth.getUser(authHeader.replace("Bearer ", ""));
  if (!u?.user) return json({ status: "blocked", blocked_reason: "auth_invalid", ...SAFETY }, 401);
  const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", u.user.id);
  if (!(roles ?? []).some((r: any) => ["founder","admin"].includes(r.role))) {
    return json({ status: "blocked", blocked_reason: "forbidden", ...SAFETY }, 403);
  }

  let body: any = {};
  try { body = await req.json(); } catch {}
  const tool_key = String(body?.tool_key ?? "").trim();
  const dry_run = body?.dry_run !== false;
  const business_id = body?.business_id ?? null;
  const session_id = body?.session_id ?? null;
  const source_message_id = body?.source_message_id ?? null;
  const confirmation_phrase = body?.confirmation_phrase ? String(body.confirmation_phrase) : "";
  const payload = body?.payload && typeof body.payload === "object" ? body.payload : {};
  const is_test = body?.is_test === true || dry_run === true;

  if (!tool_key) {
    return await respond(admin, { tool_key: "", session_id, message_id: source_message_id, business_id, status: "blocked", reason: "missing_tool_key", dry_run, is_test });
  }

  // Load registry
  const { data: tool } = await admin.from("liftor_brain_tool_registry").select("*").eq("tool_key", tool_key).maybeSingle();
  if (!tool) {
    return await respond(admin, { tool_key, session_id, message_id: source_message_id, business_id, status: "blocked", reason: "unknown_tool", dry_run, is_test });
  }
  if (tool.tool_status !== "enabled") {
    return await respond(admin, { tool_key, session_id, message_id: source_message_id, business_id, status: "blocked", reason: `tool_status_${tool.tool_status}`, dry_run, is_test, tool });
  }
  if (tool.external_action) {
    return await respond(admin, { tool_key, session_id, message_id: source_message_id, business_id, status: "blocked", reason: "external_action_blocked", dry_run, is_test, tool });
  }

  // Confirmation phrase check for mutating tools
  const needsPhrase = tool.requires_confirmation_phrase && !dry_run;
  if (needsPhrase) {
    const required = tool.confirmation_phrase || DRAFT_CONFIRM[tool_key] || "";
    if (!required || confirmation_phrase !== required) {
      return await respond(admin, { tool_key, session_id, message_id: source_message_id, business_id, status: "blocked", reason: "missing_confirmation_phrase", dry_run, is_test, tool, result: { required_phrase: required } });
    }
  }

  // Dispatch
  try {
    let result: any = {};
    if (tool_key === "external_action_placeholder_blocked") {
      return await respond(admin, { tool_key, session_id, message_id: source_message_id, business_id, status: "blocked", reason: "external_action_blocked", dry_run, is_test, tool, result: { message: "Liftor Brain cannot execute external actions. Use Controlled External Action Gates with founder approval and confirmation phrase." } });
    } else if (READ_TO_CONTEXT[tool_key]) {
      result = await handleRead(authHeader, SUPABASE_URL, tool_key, { business_id, session_id });
    } else if (tool_key === "build_context_pack") {
      result = await handleContext(authHeader, SUPABASE_URL, { business_id, session_id, dry_run, payload });
    } else if (DRAFT_TYPES[tool_key]) {
      result = await handleDraft(admin, tool_key, { business_id, session_id, source_message_id, payload, dry_run });
    } else if (tool_key === "create_internal_ai_note") {
      result = await handleInternalNote(admin, { business_id, session_id, payload, dry_run, user_id: u.user.id });
    } else if (tool_key === "create_founder_approval_item") {
      result = await handleApprovalItem(admin, { business_id, session_id, payload, dry_run });
    } else if (tool_key === "create_manual_export_pack") {
      result = await handleExportPack(admin, { business_id, session_id, payload, dry_run });
    } else if (tool_key === "generate_internal_next_actions") {
      result = await handleNextActions(authHeader, SUPABASE_URL, admin, { business_id, session_id, dry_run });
    } else {
      return await respond(admin, { tool_key, session_id, message_id: source_message_id, business_id, status: "blocked", reason: "no_handler", dry_run, is_test, tool });
    }
    return await respond(admin, { tool_key, session_id, message_id: source_message_id, business_id, status: "executed", dry_run, is_test, tool, result, payload });
  } catch (e: any) {
    return await respond(admin, { tool_key, session_id, message_id: source_message_id, business_id, status: "failed", reason: e?.message ?? "handler_error", dry_run, is_test, tool, payload });
  }
});

async function handleRead(auth: string, base: string, tool_key: string, opts: { business_id: any; session_id: any }) {
  const ctxType = READ_TO_CONTEXT[tool_key];
  const r = await fetch(`${base}/functions/v1/liftor-brain-context-builder`, {
    method: "POST",
    headers: { Authorization: auth, "Content-Type": "application/json" },
    body: JSON.stringify({ business_id: opts.business_id, session_id: opts.session_id, context_type: ctxType, dry_run: true }),
  });
  const ctx = await r.json().catch(() => ({}));
  const keys = READ_PROJECTION[tool_key] ?? [];
  const out: any = { source: "context_builder", context_type: ctxType };
  for (const k of keys) if (ctx && ctx[k] !== undefined) out[k] = ctx[k];
  if (!Object.keys(out).some((k) => k !== "source" && k !== "context_type")) {
    out.missing_context = ["context_builder_returned_empty"];
  }
  return out;
}

async function handleContext(auth: string, base: string, opts: { business_id: any; session_id: any; dry_run: boolean; payload: any }) {
  const r = await fetch(`${base}/functions/v1/liftor-brain-context-builder`, {
    method: "POST",
    headers: { Authorization: auth, "Content-Type": "application/json" },
    body: JSON.stringify({
      business_id: opts.business_id,
      session_id: opts.session_id,
      context_type: opts.payload?.context_type ?? "command_centre",
      source_object_type: opts.payload?.source_object_type ?? null,
      source_object_id: opts.payload?.source_object_id ?? null,
      dry_run: opts.dry_run,
    }),
  });
  const ctx = await r.json().catch(() => ({}));
  return {
    context_pack_id: ctx?.context_pack_id ?? null,
    compact_context: ctx?.compact_context ?? null,
    missing_context: ctx?.missing_context ?? [],
    risk_warnings: ctx?.risk_warnings ?? [],
  };
}

async function handleDraft(admin: any, tool_key: string, opts: { business_id: any; session_id: any; source_message_id: any; payload: any; dry_run: boolean }) {
  const body = opts.payload?.body ?? opts.payload?.draft_body ?? "";
  if (!body || typeof body !== "string") throw new Error("missing_payload_body");
  const draft_type = DRAFT_TYPES[tool_key];
  const row = {
    business_id: opts.business_id,
    session_id: opts.session_id,
    source_message_id: opts.source_message_id,
    draft_type,
    draft_status: "needs_review",
    title: opts.payload?.title ?? null,
    subject: opts.payload?.subject ?? null,
    body,
    rationale: opts.payload?.rationale ?? null,
    source_object_type: opts.payload?.source_object_type ?? null,
    source_object_id: opts.payload?.source_object_id ?? null,
    crm_contact_id: opts.payload?.crm_contact_id ?? null,
    conversation_id: opts.payload?.conversation_id ?? null,
    approval_status: "needs_review",
    external_send_allowed: false,
    external_action_blocked: true,
    risk_warnings: opts.payload?.risk_warnings ?? [],
    missing_context: opts.payload?.missing_context ?? [],
    is_test_data: opts.dry_run === true,
    metadata: { tool_key, dry_run: opts.dry_run },
  };
  if (opts.dry_run) {
    return { preview: true, draft_type, would_insert: redact(row), external_send_allowed: false, external_action_blocked: true };
  }
  const { data, error } = await admin.from("liftor_brain_drafts").insert(row).select("id, draft_type, approval_status, external_send_allowed, external_action_blocked").maybeSingle();
  if (error) throw new Error(error.message);
  return { draft_id: data?.id, ...data };
}

async function handleInternalNote(admin: any, opts: { business_id: any; session_id: any; payload: any; dry_run: boolean; user_id: string }) {
  const note = {
    title: opts.payload?.title ?? null,
    note_body: opts.payload?.note_body ?? opts.payload?.body ?? "",
    tags: opts.payload?.tags ?? [],
    source_object_type: opts.payload?.source_object_type ?? null,
    source_object_id: opts.payload?.source_object_id ?? null,
    created_by_user: opts.user_id,
  };
  if (opts.dry_run) return { preview: true, would_log_as: "internal_ai_note_created", note: redact(note) };
  const { data, error } = await admin.from("liftor_brain_audit").insert({
    business_id: opts.business_id, session_id: opts.session_id,
    action: "internal_ai_note_created", action_status: "recorded",
    details: redact(note), is_test_data: false,
  }).select("id").maybeSingle();
  if (error) throw new Error(error.message);
  return { audit_id: data?.id, stored_in: "liftor_brain_audit", no_external_action: true };
}

async function handleApprovalItem(admin: any, opts: { business_id: any; session_id: any; payload: any; dry_run: boolean }) {
  const item = {
    title: opts.payload?.title ?? "Brain Approval Item",
    description: opts.payload?.description ?? null,
    approval_type: opts.payload?.approval_type ?? "brain_recommendation",
    priority: opts.payload?.priority ?? "normal",
    source_object_type: opts.payload?.source_object_type ?? null,
    source_object_id: opts.payload?.source_object_id ?? null,
    draft_id: opts.payload?.draft_id ?? null,
    recommended_decision: opts.payload?.recommended_decision ?? null,
    risk_warnings: opts.payload?.risk_warnings ?? [],
    execution_allowed: false,
    external_action_locked: true,
  };
  if (opts.dry_run) return { preview: true, would_log_as: "founder_approval_item_created", item: redact(item) };
  // Fall back to audit log to avoid touching unknown founder approval tables unsafely.
  const { data, error } = await admin.from("liftor_brain_audit").insert({
    business_id: opts.business_id, session_id: opts.session_id,
    action: "founder_approval_item_created", action_status: "recorded",
    details: { ...redact(item), note: "Founder approval table pattern unclear; approval item not created outside Brain audit." },
    is_test_data: false,
  }).select("id").maybeSingle();
  if (error) throw new Error(error.message);
  return { audit_id: data?.id, stored_in: "liftor_brain_audit", execution_allowed: false, external_action_locked: true, warning: "Founder approval table pattern unclear; approval item not created outside Brain audit." };
}

async function handleExportPack(admin: any, opts: { business_id: any; session_id: any; payload: any; dry_run: boolean }) {
  const pack = {
    title: opts.payload?.title ?? "Manual Export Pack",
    body: opts.payload?.body ?? opts.payload?.contents ?? "",
    pack_type: opts.payload?.pack_type ?? "manual_export",
    source_object_type: opts.payload?.source_object_type ?? null,
    source_object_id: opts.payload?.source_object_id ?? null,
  };
  if (opts.dry_run) return { preview: true, would_log_as: "manual_export_pack_created", pack: redact(pack), external_send: false };
  const { data, error } = await admin.from("liftor_brain_drafts").insert({
    business_id: opts.business_id, session_id: opts.session_id,
    draft_type: "manual_update_suggestion", draft_status: "needs_review",
    title: pack.title, body: pack.body,
    source_object_type: pack.source_object_type, source_object_id: pack.source_object_id,
    approval_status: "needs_review", external_send_allowed: false, external_action_blocked: true,
    is_test_data: false, metadata: { pack_type: pack.pack_type, tool_key: "create_manual_export_pack" },
  }).select("id").maybeSingle();
  if (error) throw new Error(error.message);
  return { draft_id: data?.id, stored_in: "liftor_brain_drafts", external_send_allowed: false, external_action_blocked: true };
}

async function handleNextActions(auth: string, base: string, admin: any, opts: { business_id: any; session_id: any; dry_run: boolean }) {
  // Pull context once
  const r = await fetch(`${base}/functions/v1/liftor-brain-context-builder`, {
    method: "POST",
    headers: { Authorization: auth, "Content-Type": "application/json" },
    body: JSON.stringify({ business_id: opts.business_id, session_id: opts.session_id, context_type: "command_centre", dry_run: true }),
  });
  const ctx = await r.json().catch(() => ({}));
  const missing = new Set<string>(ctx?.missing_context ?? []);
  const risks: string[] = ctx?.risk_warnings ?? [];
  const actions: any[] = [];
  const push = (priority: string, title: string, reason: string, route?: string) =>
    actions.push({ title, priority, reason, related_route: route ?? null, safety_status: "internal_only" });

  if (missing.has("command_centre_truth")) push("high", "Confirm Truth Sync", "Truth Sync not confirmed", "/founder/command-centre");
  if (missing.has("business_knowledge_summary")) push("high", "Upload/update business knowledge", "Business knowledge missing");
  if (missing.has("revenue_target_summary")) push("high", "Set revenue target", "No active revenue target");
  if ((ctx?.approvals_summary?.pending ?? 0) > 0) push("high", "Review Founder Approvals", "Pending approvals exist", "/founder/approvals");
  if (risks.some((w: string) => w.toLowerCase().includes("gate"))) push("urgent", "Review External Gates immediately", "Unexpected gate state detected", "/founder/external-gates");
  if (missing.has("social_marketing_summary")) push("normal", "Generate social content pack", "Social marketing context missing");
  if (missing.has("support_summary")) push("normal", "Generate support FAQ/knowledge pack", "Support context missing");
  if (missing.has("customer_success_summary")) push("normal", "Create onboarding/customer success plan", "Customer success context missing");
  if (missing.has("crm_summary")) push("normal", "Run CRM interaction capture/backfill preview", "CRM ledger empty");

  if (actions.length === 0) push("low", "Run diagnostic summary", "No blocking gaps detected; review system diagnostics");

  if (opts.dry_run) return { preview: true, next_actions: actions, count: actions.length };
  const { data } = await admin.from("liftor_brain_audit").insert({
    business_id: opts.business_id, session_id: opts.session_id,
    action: "internal_next_actions_generated", action_status: "recorded",
    details: { next_actions: actions }, is_test_data: false,
  }).select("id").maybeSingle();
  return { audit_id: data?.id, next_actions: actions, count: actions.length };
}

async function respond(admin: any, p: {
  tool_key: string; session_id: any; message_id: any; business_id: any;
  status: "executed" | "blocked" | "failed"; reason?: string; dry_run: boolean; is_test: boolean;
  tool?: any; result?: any; payload?: any;
}) {
  const tool_status = p.status === "executed" ? "executed" : p.status;
  const external = p.tool?.external_action === true;
  const founder_required = p.tool?.requires_founder_approval === true;
  const conf_required = p.tool?.requires_confirmation_phrase === true;
  const risk_level = p.tool?.risk_level ?? "unknown";

  // tool_call log
  const { data: tc } = await admin.from("liftor_brain_tool_calls").insert({
    session_id: p.session_id, message_id: p.message_id, business_id: p.business_id,
    tool_key: p.tool_key || "unknown", tool_status,
    request_payload: redact({ dry_run: p.dry_run, payload: p.payload ?? null }),
    response_payload: redact({ status: p.status, reason: p.reason ?? null, result: p.result ?? null }),
    risk_level, external_action: external,
    external_action_blocked: external || (p.reason === "external_action_blocked"),
    founder_approval_required: founder_required, confirmation_phrase_required: conf_required,
    error_message: p.status === "failed" ? (p.reason ?? null) : null,
    is_test_data: p.is_test,
  }).select("id").maybeSingle();

  const { data: au } = await admin.from("liftor_brain_audit").insert({
    business_id: p.business_id, session_id: p.session_id,
    action: p.status === "executed" ? "tool_call_executed" : "tool_call_blocked",
    action_status: p.status === "failed" ? "error" : "recorded",
    details: { tool_key: p.tool_key, reason: p.reason ?? null, dry_run: p.dry_run },
    error_message: p.status === "failed" ? (p.reason ?? null) : null,
    is_test_data: p.is_test,
  }).select("id").maybeSingle();

  return json({
    status: p.status,
    tool_key: p.tool_key,
    dry_run: p.dry_run,
    business_id: p.business_id,
    result: p.result ?? null,
    blocked_reason: p.status === "blocked" ? (p.reason ?? "blocked") : null,
    confirmation_required: conf_required,
    founder_approval_required: founder_required,
    external_action_blocked: external || p.reason === "external_action_blocked",
    tool_call_id: tc?.id ?? null,
    audit_id: au?.id ?? null,
    ...SAFETY,
  });
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}