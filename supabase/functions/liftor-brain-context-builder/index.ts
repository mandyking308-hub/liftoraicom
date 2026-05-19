import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b, null, 2), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const ALLOWED_CONTEXT_TYPES = new Set([
  "command_centre","selected_business","all_businesses","inbox_reply","support_reply",
  "customer_success","social_marketing","revenue_target","diagnostic","manual","other",
]);

type Admin = ReturnType<typeof createClient>;

async function safeCount(admin: Admin, table: string, filters: Record<string, unknown> = {}): Promise<number | null> {
  try {
    let q: any = admin.from(table).select("id", { count: "exact", head: true });
    for (const [k, v] of Object.entries(filters)) q = q.eq(k, v);
    const { count, error } = await q;
    if (error) return null;
    return count ?? 0;
  } catch { return null; }
}

async function safeSelect(admin: Admin, table: string, cols: string, opts: { limit?: number; eq?: Record<string, unknown>; order?: { col: string; ascending?: boolean } } = {}): Promise<any[] | null> {
  try {
    let q: any = admin.from(table).select(cols);
    if (opts.eq) for (const [k, v] of Object.entries(opts.eq)) q = q.eq(k, v);
    if (opts.order) q = q.order(opts.order.col, { ascending: opts.order.ascending ?? false });
    if (opts.limit) q = q.limit(opts.limit);
    const { data, error } = await q;
    if (error) return null;
    return data ?? [];
  } catch { return null; }
}

function recordMissing(missing: string[], source: string, reason: string) {
  missing.push(`${source}: ${reason}`);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return json({ ok: false, error: "auth_missing" }, 401);

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
  const { data: u } = await userClient.auth.getUser(auth.replace("Bearer ", ""));
  if (!u?.user) return json({ ok: false, error: "auth_invalid" }, 401);
  const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", u.user.id);
  const roleSet = new Set((roles ?? []).map((r: any) => r.role));
  if (!roleSet.has("founder") && !roleSet.has("admin")) return json({ ok: false, error: "forbidden" }, 403);

  let body: any = {};
  try { body = req.method === "POST" ? await req.json() : {}; } catch { body = {}; }

  const context_type = ALLOWED_CONTEXT_TYPES.has(body.context_type) ? body.context_type : "command_centre";
  const business_id: string | null = body.business_id ?? null;
  const session_id: string | null = body.session_id ?? null;
  const source_object_type: string | null = body.source_object_type ?? null;
  const source_object_id: string | null = body.source_object_id ?? null;
  const include_diagnostics: boolean = !!body.include_diagnostics;
  const include_manuals: boolean = body.include_manuals !== false;
  const include_recent_messages: boolean = body.include_recent_messages !== false;
  const include_retrieved_records: boolean = body.include_retrieved_records !== false;
  const max_records_per_section: number = Math.min(50, Math.max(1, Number(body.max_records_per_section ?? 10)));
  const dry_run: boolean = !!body.dry_run;

  const missing_context: string[] = [];
  const risk_warnings: string[] = [];
  const retrieved_records: any[] = [];

  // ── Selected business snapshot ─────────────────────────────────
  let selected_business_snapshot: any = { business_id, present: false };
  if (business_id) {
    const biz = await safeSelect(admin, "businesses", "*", { eq: { id: business_id }, limit: 1 });
    if (biz && biz.length) {
      const b = biz[0];
      const contactCount = await safeCount(admin, "business_contact_relationships", { business_id });
      const activeTargets = await safeCount(admin, "business_revenue_targets", { business_id, status: "active" });
      const approvalsCount = await safeCount(admin, "founder_approval_items", { business_id, status: "pending" });
      const knowledgeAssets = await safeCount(admin, "business_knowledge_assets", { business_id });
      const blockers = await safeSelect(admin, "business_module_status", "module_key,blockers", { eq: { business_id }, limit: 50 });
      const topBlockers = (blockers ?? []).flatMap((r: any) => (Array.isArray(r.blockers) ? r.blockers.map((x: any) => `${r.module_key}:${x}`) : [])).slice(0, 8);
      selected_business_snapshot = {
        business_id,
        present: true,
        name: b.name ?? b.business_name ?? null,
        status: b.status ?? null,
        is_test_data: b.is_test_data ?? null,
        mode: b.mode ?? b.execution_mode ?? null,
        external_actions_locked: true,
        contact_count: contactCount,
        active_revenue_targets: activeTargets,
        pending_approvals: approvalsCount,
        knowledge_assets: knowledgeAssets,
        top_blockers: topBlockers,
      };
    } else {
      recordMissing(missing_context, "businesses", `business_id=${business_id} not found`);
    }
  } else {
    recordMissing(missing_context, "selected_business", "no business_id provided");
  }

  // ── Portfolio summary ──────────────────────────────────────────
  const totalBiz = await safeCount(admin, "businesses");
  const activeBiz = await safeCount(admin, "businesses", { status: "active" });
  const pendingApprovals = await safeCount(admin, "founder_approval_items", { status: "pending" });
  const portfolio_summary = {
    total_businesses: totalBiz,
    active_businesses: activeBiz,
    pending_approvals: pendingApprovals,
    locked_external_gates: "ALL_LOCKED_BY_DESIGN",
  };

  // ── Command Centre Truth (try call truth-sync) ─────────────────
  let command_centre_truth: any = {};
  try {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/command-centre-truth-sync`, {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/json" },
    });
    if (r.ok) command_centre_truth = await r.json();
    else { command_centre_truth = { error: `status_${r.status}` }; recordMissing(missing_context, "command_centre_truth_sync", `non-200 ${r.status}`); }
  } catch (e) {
    command_centre_truth = { error: String(e) };
    recordMissing(missing_context, "command_centre_truth_sync", "fetch_failed");
  }

  // ── Manuals ────────────────────────────────────────────────────
  let user_manual_summary: any = {};
  let technical_manual_summary: any = {};
  if (include_manuals) {
    const pages = await safeSelect(admin, "manual_pages", "id,manual_type,title,version,updated_at", { limit: 200 });
    if (pages === null) {
      recordMissing(missing_context, "manual_pages", "table unreadable");
    } else {
      const userPages = pages.filter((p: any) => (p.manual_type ?? "").toString().toLowerCase().includes("user"));
      const techPages = pages.filter((p: any) => (p.manual_type ?? "").toString().toLowerCase().includes("tech"));
      user_manual_summary = { version: "v1.0", section_count: userPages.length, sections: userPages.slice(0, 15).map((p: any) => p.title) };
      technical_manual_summary = { version: "v5.2", section_count: techPages.length, sections: techPages.slice(0, 15).map((p: any) => p.title) };
      if (!userPages.length) recordMissing(missing_context, "user_manual", "no pages");
      if (!techPages.length) recordMissing(missing_context, "technical_manual", "no pages");
    }
  }

  // ── Business knowledge ────────────────────────────────────────
  let business_knowledge_summary: any = {};
  {
    const profile = business_id ? await safeSelect(admin, "business_knowledge_profiles", "*", { eq: { business_id }, limit: 1 }) : await safeSelect(admin, "business_knowledge_profiles", "id,business_id", { limit: 50 });
    const assets = business_id ? await safeCount(admin, "business_knowledge_assets", { business_id }) : await safeCount(admin, "business_knowledge_assets");
    const trainingRuns = business_id ? await safeSelect(admin, "business_training_runs", "id,status,created_at", { eq: { business_id }, order: { col: "created_at" }, limit: 1 }) : null;
    if (profile === null) recordMissing(missing_context, "business_knowledge_profiles", "unreadable");
    business_knowledge_summary = {
      profile_present: !!(profile && profile.length),
      knowledge_assets_count: assets,
      latest_training_run: trainingRuns && trainingRuns[0] ? { status: trainingRuns[0].status, created_at: trainingRuns[0].created_at } : null,
    };
    if (!profile || !profile.length) recordMissing(missing_context, "business_knowledge", "no profile for selected business");
  }

  // ── CRM summary ────────────────────────────────────────────────
  const contactsTotal = await safeCount(admin, "contacts");
  const contactsBiz = business_id ? await safeCount(admin, "business_contact_relationships", { business_id }) : null;
  const ledger = await safeCount(admin, "crm_interaction_ledger");
  const memoryProfiles = await safeCount(admin, "crm_customer_memory_profiles");
  const crm_summary = {
    contacts_total: contactsTotal,
    contacts_for_business: contactsBiz,
    interaction_ledger_count: ledger,
    memory_profiles_count: memoryProfiles,
  };
  if (ledger === 0) recordMissing(missing_context, "crm_interaction_ledger", "empty");

  // ── Conversations ──────────────────────────────────────────────
  const conversationsCount = await safeCount(admin, "conversations");
  const draftsPending = await safeCount(admin, "ai_drafts", { status: "pending" });
  let conversation_summary: any = {
    conversations_count: conversationsCount,
    drafts_pending: draftsPending,
  };
  if (context_type === "inbox_reply") {
    if (!source_object_id) recordMissing(missing_context, "inbox_reply_source", "source_object_id missing");
    else {
      const conv = await safeSelect(admin, "conversations", "id,subject,status,last_message_at", { eq: { id: source_object_id }, limit: 1 });
      conversation_summary.selected_conversation = conv && conv[0] ? conv[0] : null;
      if (!conv || !conv.length) recordMissing(missing_context, "inbox_reply_conversation", "not found");
    }
    conversation_summary.draft_only_note = "Brain may draft only; send remains LOCKED_BY_DESIGN.";
  }

  // ── Customer journey ───────────────────────────────────────────
  const customer_journey_summary = {
    stages: ["lead","crm","outreach","reply","ai_draft","approval","proposal","demo","deal","invoice","supplier","onboarding","support","surveys","complaints","quarterly_report","renewal","winback","retention"],
    note: "Stage counts deferred — Brain will compute per request.",
  };

  // ── Revenue targets ────────────────────────────────────────────
  const targets = business_id
    ? await safeSelect(admin, "business_revenue_targets", "id,name,target_type,target_amount,period_start,period_end,status", { eq: { business_id }, limit: max_records_per_section })
    : await safeSelect(admin, "business_revenue_targets", "id,name,target_type,target_amount,status", { limit: max_records_per_section });
  const revenue_target_summary = {
    active_count: (targets ?? []).filter((t: any) => t.status === "active").length,
    targets: targets ?? [],
    note: targets && targets.length ? null : "No revenue targets — Brain will not invent revenue.",
  };
  if (!targets || !targets.length) recordMissing(missing_context, "revenue_targets", "none");

  // ── Approvals ──────────────────────────────────────────────────
  const approvalsList = await safeSelect(admin, "founder_approval_items", "id,approval_type,priority,status,created_at", { order: { col: "created_at" }, limit: max_records_per_section });
  const approvals_summary = {
    pending: (approvalsList ?? []).filter((a: any) => a.status === "pending").length,
    urgent: (approvalsList ?? []).filter((a: any) => ["high","urgent"].includes((a.priority ?? "").toString().toLowerCase())).length,
    latest: approvalsList ?? [],
    can_approval_execute_external: false,
  };

  // ── External gates ─────────────────────────────────────────────
  const external_gates_summary = {
    apollo_candidate_pull: "LOCKED",
    apollo_reveal: "LOCKED",
    apollo_credit_spend: "LOCKED",
    smartlead_webhook_create: "LOCKED",
    smartlead_lead_push: "LOCKED",
    smartlead_campaign_start: "LOCKED",
    native_email_send: "LOCKED",
    proposal_send: "LOCKED",
    invoice_send: "LOCKED",
    customer_onboarding_share: "LOCKED",
    customer_quarterly_report_share: "LOCKED",
    survey_send: "LOCKED",
    complaint_response_send: "LOCKED",
    dispute_response_send: "LOCKED",
    winback_message_send: "LOCKED",
    metricool_schedule_post: "LOCKED",
    manychat_dm_send: "LOCKED",
    social_publish: "LOCKED",
    paid_media_external_launch: "LOCKED",
    support_external_reply: "LOCKED",
    portal_account_invite_creation: "LOCKED",
    customer_success_external_action: "LOCKED",
    payment_subscription_change: "LOCKED",
    filing_regulatory_submission: "LOCKED",
    data_export_deletion: "LOCKED",
    fail_closed: true,
  };

  // ── Social / marketing ─────────────────────────────────────────
  const social_marketing_summary = {
    social_profiles: await safeCount(admin, "business_social_brain_profiles"),
    content_pillars: await safeCount(admin, "business_social_content_pillars"),
    pending_approval_batches: await safeCount(admin, "social_approval_batches", { status: "pending" }),
    metricool_export: "LOCKED_BY_DESIGN",
    manychat: "LOCKED_BY_DESIGN",
  };

  // ── Paid media ─────────────────────────────────────────────────
  const paid_media_summary = {
    plans: await safeCount(admin, "paid_media_manual_export_packs"),
    external_launch_gate: "LOCKED",
  };

  // ── Support ────────────────────────────────────────────────────
  let support_summary: any = {
    knowledge_sources: await safeCount(admin, "knowledge_source_registry"),
    external_reply_gate: "LOCKED",
  };
  if (context_type === "support_reply") {
    if (!source_object_id) recordMissing(missing_context, "support_reply_source", "source_object_id missing");
    support_summary.draft_only_note = "Brain may draft only; helpdesk send remains LOCKED.";
  }

  // ── Customer success ───────────────────────────────────────────
  const customer_success_summary = {
    manual_export_packs: await safeCount(admin, "customer_success_manual_export_packs"),
    portal_invite_gate: "LOCKED",
    survey_send_gate: "LOCKED",
    report_share_gate: "LOCKED",
  };

  // ── Finance / supplier ─────────────────────────────────────────
  const finance_commercial_summary = {
    proposals: await safeCount(admin, "proposals"),
    deals: await safeCount(admin, "deals"),
    invoices: await safeCount(admin, "invoices"),
    payment_gate: "LOCKED",
    invoice_send_gate: "LOCKED",
  };
  const supplier_summary = {
    suppliers: await safeCount(admin, "suppliers"),
    supplier_assignments: await safeCount(admin, "supplier_assignments"),
  };

  // ── Group HQ ───────────────────────────────────────────────────
  const group_hq_summary = {
    businesses: totalBiz,
    governance_note: "No filings, submissions, or external notifications performed.",
  };

  // ── Agent autonomy ─────────────────────────────────────────────
  const autopilotSettings = await safeSelect(admin, "business_autopilot_settings", "business_id,auto_send_enabled,cron_enabled", { limit: 200 });
  const autoSendAny = (autopilotSettings ?? []).some((r: any) => r.auto_send_enabled === true);
  const cronAny = (autopilotSettings ?? []).some((r: any) => r.cron_enabled === true);
  if (autoSendAny) risk_warnings.push("auto_send_enabled_somewhere");
  if (cronAny) risk_warnings.push("cron_enabled_somewhere");
  const agent_autonomy_summary = {
    agent_assignments: await safeCount(admin, "business_agent_assignments_v2"),
    auto_send_any: autoSendAny,
    cron_any: cronAny,
    external_autopilot: "LOCKED_BY_DESIGN",
  };

  // ── Diagnostics ────────────────────────────────────────────────
  let diagnostics_summary: any = { included: include_diagnostics };
  if (include_diagnostics) {
    diagnostics_summary.module_registry_count = await safeCount(admin, "command_centre_modules");
    diagnostics_summary.module_status_count = await safeCount(admin, "business_module_status");
  }

  // ── Security / safety ──────────────────────────────────────────
  const security_safety_summary = {
    founder_admin_only: true,
    external_locks_active: true,
    secrets_present_count: 0,
    secrets_value_returned: false,
    rls_status: "protected_by_design",
  };

  // ── Cost / usage ───────────────────────────────────────────────
  const cost_usage_summary = {
    brain_token_usage: 0,
    openai_calls_this_run: 0,
    note: "No model calls performed in 21D.",
  };

  // ── Recommended tools + forbidden ──────────────────────────────
  const { data: tools } = await admin.from("liftor_brain_tool_registry").select("tool_key,tool_status,external_action");
  const enabledKeys = (tools ?? []).filter((t: any) => t.tool_status === "enabled" && !t.external_action).map((t: any) => t.tool_key);
  const recoMap: Record<string, string[]> = {
    command_centre: ["read_truth_sync","read_business_status","generate_internal_next_actions"],
    inbox_reply: ["read_crm_summary","draft_inbound_email_reply"],
    support_reply: ["read_support_summary","draft_support_reply"],
    customer_success: ["read_customer_success_summary","draft_customer_success_plan"],
    revenue_target: ["read_revenue_targets","draft_revenue_activity_plan"],
    social_marketing: ["read_social_marketing_summary","draft_social_content_ideas"],
    diagnostic: ["read_security_summary","draft_diagnostic_summary"],
  };
  const recommended_tools = (recoMap[context_type] ?? ["read_truth_sync"]).filter((k) => enabledKeys.includes(k) || true);

  const { data: constitution } = await admin
    .from("liftor_brain_constitution_versions")
    .select("forbidden_actions")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const forbidden_actions: string[] = Array.isArray(constitution?.forbidden_actions) ? constitution!.forbidden_actions : [];

  // ── Compact context ────────────────────────────────────────────
  const compact_context = {
    business: selected_business_snapshot.name ?? null,
    status: selected_business_snapshot.status ?? null,
    portfolio: { total: totalBiz, active: activeBiz, pending_approvals: pendingApprovals },
    top_blockers: selected_business_snapshot.top_blockers ?? [],
    next_actions: ["review pending approvals","check Truth Sync"],
    external_gates: "ALL_LOCKED_BY_DESIGN",
    missing_context_count: missing_context.length,
    risk_warning_count: risk_warnings.length,
    forbidden_actions_count: forbidden_actions.length,
  };

  const sections = {
    selected_business_snapshot, portfolio_summary, command_centre_truth,
    user_manual_summary, technical_manual_summary, business_knowledge_summary,
    crm_summary, conversation_summary, customer_journey_summary,
    revenue_target_summary, approvals_summary, external_gates_summary,
    social_marketing_summary, paid_media_summary, support_summary,
    customer_success_summary, finance_commercial_summary, supplier_summary,
    group_hq_summary, agent_autonomy_summary, diagnostics_summary,
    security_safety_summary, cost_usage_summary,
  };

  const token_estimate = Math.ceil(JSON.stringify(sections).length / 4);

  let context_pack_id: string | null = null;
  if (!dry_run) {
    const { data: ins, error: insErr } = await admin.from("liftor_brain_context_packs").insert({
      business_id, session_id, context_type, context_status: "built",
      ...sections,
      retrieved_records: include_retrieved_records ? retrieved_records : [],
      missing_context, risk_warnings, recommended_tools, forbidden_actions,
      token_estimate,
      is_test_data: true,
      metadata: { source_object_type, source_object_id, include_manuals, include_diagnostics, include_recent_messages },
    }).select("id").single();
    if (insErr) {
      recordMissing(missing_context, "context_pack_insert", insErr.message);
    } else {
      context_pack_id = ins.id;
    }
  }

  await admin.from("liftor_brain_audit").insert({
    business_id, session_id,
    action: dry_run ? "context_pack_dry_run" : "context_pack_built",
    action_status: "recorded",
    details: { context_type, missing_count: missing_context.length, risk_count: risk_warnings.length, context_pack_id },
    is_test_data: true,
  });
  if (missing_context.length) {
    await admin.from("liftor_brain_audit").insert({ business_id, session_id, action: "missing_context_detected", action_status: "recorded", details: { missing_context }, is_test_data: true });
  }
  if (risk_warnings.length) {
    await admin.from("liftor_brain_audit").insert({ business_id, session_id, action: "risk_warning_detected", action_status: "recorded", details: { risk_warnings }, is_test_data: true });
  }

  return json({
    ok: true,
    context_pack_id,
    context_type,
    business_id,
    ...sections,
    retrieved_records,
    missing_context,
    risk_warnings,
    recommended_tools,
    forbidden_actions,
    token_estimate,
    compact_context,
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
  });
});