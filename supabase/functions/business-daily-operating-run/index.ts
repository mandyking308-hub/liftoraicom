import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const CONFIRM = "RUN BUSINESS DAILY OPERATING LOOP";

function j(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), {
    status: s,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function classifyAction(a: any): { class: string; reason?: string } {
  if (a?.external_action_required) return { class: "blocked_external", reason: "external_action_required" };
  const cat = (a?.action_category ?? "").toLowerCase();
  const title = (a?.action_title ?? "").toLowerCase();
  if (/send|publish|charge|invite|apollo|smartlead|metricool|manychat/.test(title)) {
    return { class: "blocked_external", reason: "title_implies_external" };
  }
  if (cat === "compliance") return { class: "needs_founder_review" };
  if (cat === "knowledge") return { class: "missing_context" };
  if (cat === "diagnostics") return { class: "ready_to_work", reason: "diagnostic" };
  if (["drafts","social","support","customer_success","revenue","supplier","approvals","command_centre"].includes(cat)) {
    return { class: "ready_to_work" };
  }
  return { class: "ready_to_work" };
}

function outputForAction(a: any, klass: string): { output_type: string; title: string; summary: string; destination_module: string | null; priority: string; owner_agent: string | null; risk_level: string; } | null {
  const cat = (a?.action_category ?? "").toLowerCase();
  const t = a?.action_title ?? "Action";
  const owner = a?.owner_agent ?? null;
  const base = { priority: a?.priority ?? "normal", owner_agent: owner, risk_level: "low" as const };
  if (klass === "blocked_external") {
    return { output_type: "compliance_warning", title: `Blocked: ${t}`, summary: "Prepare internally; external action requires separate controlled gate.", destination_module: "compliance", risk_level: "high", ...base };
  }
  if (klass === "missing_context") {
    return { output_type: "knowledge_gap", title: `Knowledge gap: ${t}`, summary: "Missing context for this action — fill knowledge before proceeding.", destination_module: "knowledge", ...base };
  }
  switch (cat) {
    case "drafts": return { output_type: "draft_review", title: `Review draft: ${t}`, summary: "Review internal materialised drafts before any external use.", destination_module: "approvals", ...base };
    case "social": return { output_type: "social_draft_recommendation", title: `Social: ${t}`, summary: "Prepare content pack internally; publishing remains locked.", destination_module: "social", ...base };
    case "support": return { output_type: "support_draft_recommendation", title: `Support: ${t}`, summary: "Review support FAQ/reply templates.", destination_module: "support", ...base };
    case "customer_success": return { output_type: "customer_success_recommendation", title: `CS: ${t}`, summary: "Review onboarding/check-in plan.", destination_module: "customer_success", ...base };
    case "revenue": return { output_type: "revenue_recommendation", title: `Revenue: ${t}`, summary: "Review revenue activity plan.", destination_module: "revenue", ...base };
    case "supplier": return { output_type: "supplier_recommendation", title: `Supplier: ${t}`, summary: "Review supplier/delivery readiness.", destination_module: "supplier", ...base };
    case "compliance": return { output_type: "compliance_warning", title: `Compliance: ${t}`, summary: "External action blocked until compliance review.", destination_module: "compliance", risk_level: "high", ...base };
    case "diagnostics": return { output_type: "diagnostic_note", title: `Diagnostic: ${t}`, summary: "Internal diagnostic check.", destination_module: "diagnostics", ...base };
    case "knowledge": return { output_type: "knowledge_gap", title: `Knowledge: ${t}`, summary: "Knowledge gap or update needed.", destination_module: "knowledge", ...base };
    case "approvals": return { output_type: "founder_brief", title: `Approval: ${t}`, summary: "Founder approval pending.", destination_module: "approvals", ...base };
    default: return { output_type: "recommendation", title: t, summary: "Internal recommendation.", destination_module: "command_centre", ...base };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    if (!auth.startsWith("Bearer ")) return j({ ok: false, error: "unauthorized" }, 401);
    const url = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: u } = await userClient.auth.getUser();
    if (!u?.user) return j({ ok: false, error: "unauthorized" }, 401);
    const svc = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: roles } = await svc.from("user_roles").select("role").eq("user_id", u.user.id);
    if (!(roles ?? []).some((r: any) => ["admin", "founder"].includes(r.role))) {
      return j({ ok: false, error: "forbidden" }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const {
      business_id,
      activation_record_id,
      run_date,
      include_brain_summary = true,
      include_agent_recommendations = true,
      create_outputs = true,
      create_founder_review_items = true,
      update_action_statuses = true,
      dry_run = true,
      confirmation_phrase,
      is_test_data = false,
    } = body ?? {};

    if (!business_id) return j({ ok: false, error: "business_id_required" }, 400);
    if (!dry_run && confirmation_phrase !== CONFIRM) {
      return j({ ok: false, error: "confirmation_phrase_required", expected: CONFIRM }, 400);
    }

    const provider_status = Deno.env.get("OPENAI_API_KEY") || Deno.env.get("LOVABLE_API_KEY") ? "configured" : "not_configured";
    const today = (run_date ?? new Date().toISOString().slice(0, 10)) as string;

    const { data: biz } = await svc.from("businesses").select("id,name").eq("id", business_id).maybeSingle();
    if (!biz) return j({ ok: false, error: "business_not_found" }, 404);

    // Activation
    let activation: any = null;
    if (activation_record_id) {
      const { data } = await svc.from("business_internal_activation_records").select("*").eq("id", activation_record_id).maybeSingle();
      activation = data;
    }
    if (!activation) {
      const { data } = await svc.from("business_internal_activation_records")
        .select("*").eq("business_id", business_id)
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      activation = data;
    }

    const missing_context: string[] = [];
    const risk_warnings: string[] = [];
    if (!activation) missing_context.push("no_internal_activation_record");

    // Load today's actions
    const { data: actionsRaw } = await svc.from("business_internal_daily_actions")
      .select("*").eq("business_id", business_id).eq("action_date", today)
      .order("priority", { ascending: false });
    const actions = actionsRaw ?? [];

    // Open runbook items
    const { data: runbookRaw } = await svc.from("business_operating_runbook_items")
      .select("*").eq("business_id", business_id)
      .in("status", ["draft","ready","in_progress"]).limit(200);
    const runbook = runbookRaw ?? [];

    // Context
    const { data: profile } = await svc.from("business_understanding_profiles").select("id").eq("business_id", business_id)
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!profile) missing_context.push("no_understanding_profile");
    const { data: pack } = await svc.from("business_execution_starter_packs").select("id").eq("business_id", business_id)
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!pack) missing_context.push("no_starter_pack");
    const { count: matCount } = await svc.from("starter_pack_materialised_items")
      .select("id", { count: "exact", head: true }).eq("business_id", business_id);
    if ((matCount ?? 0) === 0) missing_context.push("no_materialised_items");

    // Safety leak check
    const { data: leak } = await svc.from("starter_pack_materialised_items")
      .select("id").eq("business_id", business_id).eq("external_send_allowed", true).limit(1);
    if (leak && leak.length > 0) risk_warnings.push("sendable_materialised_items_present");

    // Classify actions and build planned outputs
    let actions_completed = 0, actions_blocked = 0, actions_parked = 0;
    const plannedOutputs: any[] = [];
    const actionUpdates: { id: string; status: string }[] = [];
    for (const a of actions) {
      const k = classifyAction(a);
      const out = outputForAction(a, k.class);
      if (out) plannedOutputs.push({ ...out, source_action_id: a.id, requires_founder_review: out.output_type !== "diagnostic_note" });
      if (k.class === "blocked_external") {
        actions_blocked++;
        if (a.status === "open") actionUpdates.push({ id: a.id, status: "blocked" });
      } else if (k.class === "ready_to_work" && (a.action_category === "diagnostics" || k.reason === "diagnostic")) {
        actions_completed++;
        if (a.status === "open" || a.status === "in_progress") actionUpdates.push({ id: a.id, status: "done" });
      } else if (k.class === "missing_context") {
        if (a.status === "open") actionUpdates.push({ id: a.id, status: "parked" });
        actions_parked++;
      }
    }

    // Deterministic summary
    const summary = [
      `Internal operating summary for ${biz.name} on ${today}.`,
      `Activation: ${activation?.activation_status ?? "none"} (mode: ${activation?.activation_mode ?? "n/a"}).`,
      `Actions: ${actions.length} loaded, ${actions_completed} internal-done, ${actions_blocked} blocked external, ${actions_parked} parked for context.`,
      `Runbook: ${runbook.length} open items.`,
      missing_context.length > 0 ? `Missing context: ${missing_context.join(", ")}.` : "No missing context.",
      `External actions remain locked. No sends, no publishing, no provider mutations.`,
      `Provider: ${provider_status}.`,
    ].join(" ");

    // Brain summary (best-effort, optional)
    let brain_summary: any = null;
    if (include_brain_summary && provider_status === "configured") {
      try {
        const r = await svc.functions.invoke("liftor-brain-chat", {
          body: {
            requested_mode: "business_operator",
            context_type: "selected_business",
            business_id,
            user_message: "Run today's internal operating check for this business. Use only internal Liftor data. Summarise what is ready, what is blocked, what Mandy should review, and what safe internal actions should happen next. Do not send, publish, spend, call providers, enable gates or mark anything externally live.",
          },
          headers: { Authorization: auth },
        });
        brain_summary = r.data ?? null;
      } catch (e) {
        risk_warnings.push(`brain_summary_failed:${String((e as Error).message ?? e)}`);
      }
    }

    const audit = {
      emails_sent: 0, dms_sent: 0, posts_published: 0,
      apollo_calls: 0, smartlead_post_calls: 0, smartlead_campaign_starts: 0,
      metricool_mutations: 0, manychat_mutations: 0,
      payment_mutations: 0, portal_accounts_created: 0, portal_invites_sent: 0,
      surveys_sent: 0, reports_shared: 0, real_data_deleted: 0, secrets_exposed: 0,
      auto_send_changed: "no", cron_changed: "no",
    };

    if (dry_run) {
      return j({
        ok: true,
        status: "previewed",
        business_id,
        activation_record_id: activation?.id ?? null,
        daily_run_id: null,
        run_date: today,
        provider_status,
        actions_loaded: actions.length,
        actions_completed,
        actions_blocked,
        actions_parked,
        runbook_items_loaded: runbook.length,
        outputs_preview: plannedOutputs,
        outputs_created: 0,
        founder_review_items_created: 0,
        missing_context,
        risk_warnings,
        internal_run_summary: summary,
        brain_summary,
        safety_status: audit,
        no_forbidden_action_audit: audit,
        external_go_live: "LOCKED_BY_DESIGN",
      });
    }

    // Persist daily run
    const { data: rec, error: recErr } = await svc.from("business_daily_operating_runs").insert({
      business_id,
      activation_record_id: activation?.id ?? null,
      run_date: today,
      run_status: actions.length === 0 && runbook.length === 0 ? "partial" : "completed",
      provider_status,
      actions_loaded: actions.length,
      actions_completed,
      actions_blocked,
      actions_parked,
      runbook_items_loaded: runbook.length,
      recommendations_created: 0,
      drafts_created: 0,
      founder_review_items_created: 0,
      missing_context_count: missing_context.length,
      risk_warning_count: risk_warnings.length,
      external_actions_locked: true,
      auto_send_enabled: false,
      cron_enabled: false,
      internal_run_summary: summary,
      is_test_data,
      metadata: { brain_summary_present: !!brain_summary },
      no_forbidden_action_audit: audit,
    }).select("*").single();
    if (recErr || !rec) return j({ ok: false, error: recErr?.message ?? "run_insert_failed" }, 500);

    // Create outputs
    let outputs_created = 0, recs = 0, drafts = 0;
    if (create_outputs && plannedOutputs.length > 0) {
      const rows = plannedOutputs.map((o) => ({
        business_id,
        daily_run_id: rec.id,
        activation_record_id: activation?.id ?? null,
        source_action_id: o.source_action_id ?? null,
        output_type: o.output_type,
        output_status: "needs_review",
        title: o.title,
        summary: o.summary,
        destination_module: o.destination_module,
        priority: o.priority,
        risk_level: o.risk_level,
        owner_agent: o.owner_agent,
        requires_founder_review: o.requires_founder_review !== false,
        external_action_required: false,
        external_action_blocked: true,
        is_test_data,
      }));
      const { data: ins, error: iErr } = await svc.from("business_daily_operating_outputs").insert(rows).select("id,output_type");
      if (iErr) risk_warnings.push(`outputs_insert_failed:${iErr.message}`);
      outputs_created = ins?.length ?? 0;
      recs = (ins ?? []).filter((x: any) => x.output_type.includes("recommendation")).length;
      drafts = (ins ?? []).filter((x: any) => x.output_type === "draft_review").length;
    }

    // Add a daily summary output
    if (create_outputs) {
      const { data: sumRow } = await svc.from("business_daily_operating_outputs").insert({
        business_id, daily_run_id: rec.id, activation_record_id: activation?.id ?? null,
        output_type: "daily_summary", output_status: "needs_review",
        title: `Today's internal operating summary for ${biz.name}`,
        summary, body: summary,
        destination_module: "command_centre",
        priority: "normal", risk_level: "low",
        requires_founder_review: true,
        external_action_required: false, external_action_blocked: true,
        is_test_data,
      }).select("id").maybeSingle();
      if (sumRow?.id) outputs_created++;
    }

    // Action status updates (safe only)
    let updated = 0;
    if (update_action_statuses && actionUpdates.length > 0) {
      for (const u of actionUpdates) {
        const { error: uErr } = await svc.from("business_internal_daily_actions")
          .update({ status: u.status }).eq("id", u.id);
        if (!uErr) updated++;
      }
    }

    // Founder review
    let founder_review_items_created = 0;
    if (create_founder_review_items) {
      const { data: rev, error: rErr } = await svc.from("founder_approval_items").insert({
        business_id,
        approval_type: "business_daily_operating_review",
        source_system: "business-daily-operating-run",
        source_table: "business_daily_operating_runs",
        title: `Review daily operating loop for ${biz.name} (${today})`,
        summary: `${actions.length} actions / ${actions_blocked} blocked / ${actions_parked} parked / ${outputs_created} outputs. Provider: ${provider_status}. External actions locked.`,
        recommended_action: "Review daily outputs, runbook items and any blocked external actions. External send remains locked.",
        priority_level: "normal",
        risk_flags: [], compliance_flags: [],
        execution_enabled: false, auto_execute_allowed: false, send_allowed: false,
        metadata: { daily_run_id: rec.id, activation_record_id: activation?.id ?? null, is_test_data },
      }).select("id").maybeSingle();
      if (!rErr && rev?.id) founder_review_items_created = 1;
      else if (rErr) risk_warnings.push(`founder_review_failed:${rErr.message}`);
    }

    // Update counters on the run row
    await svc.from("business_daily_operating_runs").update({
      recommendations_created: recs,
      drafts_created: drafts,
      founder_review_items_created,
      risk_warning_count: risk_warnings.length,
    }).eq("id", rec.id);

    return j({
      ok: true,
      status: "completed",
      business_id,
      activation_record_id: activation?.id ?? null,
      daily_run_id: rec.id,
      run_date: today,
      provider_status,
      actions_loaded: actions.length,
      actions_completed,
      actions_blocked,
      actions_parked,
      runbook_items_loaded: runbook.length,
      outputs_created,
      action_status_updates_applied: updated,
      founder_review_items_created,
      missing_context,
      risk_warnings,
      internal_run_summary: summary,
      safety_status: audit,
      no_forbidden_action_audit: audit,
      external_go_live: "LOCKED_BY_DESIGN",
    });
  } catch (e) {
    return j({ ok: false, status: "failed", error: String((e as Error)?.message ?? e) }, 500);
  }
});