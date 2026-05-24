import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const CONFIRM = "RUN BUSINESS WEEKLY REVIEW";

function j(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), {
    status: s,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isoDate(d: Date) { return d.toISOString().slice(0, 10); }

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
      week_start,
      week_end,
      include_brain_summary = true,
      create_outputs = true,
      create_founder_review_items = true,
      dry_run = true,
      confirmation_phrase,
      is_test_data = false,
    } = body ?? {};

    if (!business_id) return j({ ok: false, error: "business_id_required" }, 400);
    if (!dry_run && confirmation_phrase !== CONFIRM) {
      return j({ ok: false, error: "confirmation_phrase_required", expected: CONFIRM }, 400);
    }

    const provider_status = Deno.env.get("OPENAI_API_KEY") || Deno.env.get("LOVABLE_API_KEY") ? "configured" : "not_configured";

    const now = new Date();
    const wEnd = week_end ? new Date(week_end) : now;
    const wStart = week_start ? new Date(week_start) : new Date(wEnd.getTime() - 6 * 86400000);
    const weekStartStr = isoDate(wStart);
    const weekEndStr = isoDate(wEnd);

    const { data: biz } = await svc.from("businesses").select("id,name").eq("id", business_id).maybeSingle();
    if (!biz) return j({ ok: false, error: "business_not_found" }, 404);

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

    // Load daily runs in week
    const { data: dailyRuns } = await svc.from("business_daily_operating_runs")
      .select("id,run_date,run_status,actions_loaded,actions_completed,actions_blocked,actions_parked,recommendations_created,founder_review_items_created,missing_context_count,risk_warning_count")
      .eq("business_id", business_id)
      .gte("run_date", weekStartStr).lte("run_date", weekEndStr)
      .order("run_date", { ascending: true });
    const runs = dailyRuns ?? [];
    if (runs.length === 0) missing_context.push("no_daily_runs_in_week");

    const runIds = runs.map((r: any) => r.id);
    let outputs: any[] = [];
    if (runIds.length > 0) {
      const { data: outs } = await svc.from("business_daily_operating_outputs")
        .select("id,output_type,output_status,priority,risk_level,destination_module")
        .in("daily_run_id", runIds).limit(1000);
      outputs = outs ?? [];
    }

    const { data: actionsRaw } = await svc.from("business_internal_daily_actions")
      .select("id,action_date,status,priority,action_category,external_action_required")
      .eq("business_id", business_id)
      .gte("action_date", weekStartStr).lte("action_date", weekEndStr)
      .limit(1000);
    const actions = actionsRaw ?? [];

    const { data: runbookRaw } = await svc.from("business_operating_runbook_items")
      .select("id,status,recurrence,owner_agent")
      .eq("business_id", business_id).limit(500);
    const runbook = runbookRaw ?? [];

    const { data: profile } = await svc.from("business_understanding_profiles").select("id").eq("business_id", business_id)
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!profile) missing_context.push("no_understanding_profile");
    const { data: pack } = await svc.from("business_execution_starter_packs").select("id").eq("business_id", business_id)
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!pack) missing_context.push("no_starter_pack");
    const { count: matCount } = await svc.from("starter_pack_materialised_items")
      .select("id", { count: "exact", head: true }).eq("business_id", business_id);
    if ((matCount ?? 0) === 0) missing_context.push("no_materialised_items");

    // Founder approvals open
    const { data: openApprovals } = await svc.from("founder_approval_items")
      .select("id,status,approval_type")
      .contains("metadata", { is_test_data: false } as any).limit(500).then((r: any) => r).catch(() => ({ data: [] as any[] }));
    let founder_reviews_open = 0;
    try {
      const { count } = await svc.from("founder_approval_items").select("id", { count: "exact", head: true })
        .eq("status", "pending");
      founder_reviews_open = count ?? 0;
    } catch {}

    // Safety leak
    const { data: leak } = await svc.from("starter_pack_materialised_items")
      .select("id").eq("business_id", business_id).eq("external_send_allowed", true).limit(1);
    if (leak && leak.length > 0) risk_warnings.push("sendable_materialised_items_present");

    // Aggregates
    const completed_actions = runs.reduce((s: number, r: any) => s + (r.actions_completed ?? 0), 0)
      + actions.filter((a: any) => a.status === "done").length;
    const blocked_actions = runs.reduce((s: number, r: any) => s + (r.actions_blocked ?? 0), 0)
      + actions.filter((a: any) => a.status === "blocked").length;
    const parked_actions = runs.reduce((s: number, r: any) => s + (r.actions_parked ?? 0), 0)
      + actions.filter((a: any) => a.status === "parked").length;
    const missing_context_count_total = runs.reduce((s: number, r: any) => s + (r.missing_context_count ?? 0), 0) + missing_context.length;
    const risk_warning_count_total = runs.reduce((s: number, r: any) => s + (r.risk_warning_count ?? 0), 0) + risk_warnings.length;

    // Scoring
    const hasProfile = !!profile;
    const hasPack = !!pack;
    const hasMat = (matCount ?? 0) > 0;
    const criticalMissing = missing_context.filter((m) => m.startsWith("no_") && (m.includes("activation") || m.includes("profile") || m.includes("starter"))).length;

    const score_knowledge =
      (hasProfile ? 20 : 0) +
      (hasPack ? 20 : 0) +
      (missing_context_count_total <= 3 ? 20 : 0) +
      (outputs.some((o) => o.output_type === "knowledge_gap" && o.output_status !== "draft") || outputs.filter((o) => o.output_type === "knowledge_gap").length === 0 ? 20 : 0) +
      (criticalMissing === 0 ? 20 : 0);

    const hasSocial = outputs.some((o) => o.output_type?.includes("social"));
    const hasSupport = outputs.some((o) => o.output_type?.includes("support") || o.output_type?.includes("customer_success"));
    const hasRevenue = outputs.some((o) => o.output_type?.includes("revenue"));
    const drafts = outputs.filter((o) => o.output_type === "draft_review");
    const draftsReviewed = drafts.filter((o) => o.output_status !== "draft").length;
    const score_content =
      (hasSocial ? 25 : 0) +
      (hasSupport ? 25 : 0) +
      (hasRevenue ? 25 : 0) +
      (drafts.length === 0 || draftsReviewed > 0 ? 25 : 0);

    const score_customer =
      (hasMat ? 25 : 0) +
      (hasSupport ? 25 : 0) +
      (outputs.some((o) => o.output_type === "customer_success_recommendation") ? 25 : 0) +
      (outputs.filter((o) => o.risk_level === "critical" && o.destination_module === "customer_success").length === 0 ? 25 : 0);

    const score_revenue =
      (hasRevenue ? 25 : 0) +
      (outputs.some((o) => o.output_type === "revenue_recommendation") ? 25 : 0) +
      (outputs.some((o) => o.output_type === "supplier_recommendation") || hasPack ? 25 : 0) +
      (outputs.filter((o) => o.risk_level === "critical").length === 0 ? 25 : 0);

    const score_operations =
      (activation ? 20 : 0) +
      (runbook.length > 0 ? 20 : 0) +
      (actions.length > 0 ? 20 : 0) +
      (runs.length > 0 ? 20 : 0) +
      20; // external gates locked by design

    const score_readiness = Math.round((score_knowledge + score_content + score_customer + score_revenue + score_operations) / 5);
    const founderHygiene = founder_reviews_open <= 5 ? 100 : Math.max(0, 100 - (founder_reviews_open - 5) * 10);
    const noForbidden = 100;
    const score_overall = Math.round(score_readiness * 0.7 + noForbidden * 0.2 + founderHygiene * 0.1);

    const internal_ready = score_overall >= 80 && criticalMissing === 0;

    // Brain summary
    let brain_summary: any = null;
    if (include_brain_summary && provider_status === "configured") {
      try {
        const r = await svc.functions.invoke("liftor-brain-chat", {
          body: {
            requested_mode: "diagnostic_summary",
            context_type: "selected_business",
            business_id,
            include_diagnostics: true,
            user_message: "Run this business's weekly internal review. Use only internal Liftor data. Summarise progress, blockers, repeated missing context, draft/review quality, readiness, and safe internal next actions for next week. Do not send, publish, spend, call providers, enable gates, mark anything externally live, or invent missing data.",
          },
          headers: { Authorization: auth },
        });
        brain_summary = r.data ?? null;
      } catch (e) {
        risk_warnings.push(`brain_summary_failed:${String((e as Error).message ?? e)}`);
      }
    }

    const weekly_summary = [
      `Weekly internal review for ${biz.name} (${weekStartStr} → ${weekEndStr}).`,
      `${runs.length} daily runs, ${actions.length} daily actions, ${outputs.length} outputs reviewed.`,
      `Completed ${completed_actions} / blocked ${blocked_actions} / parked ${parked_actions}.`,
      `Scorecard: overall ${score_overall}, readiness ${score_readiness}, knowledge ${score_knowledge}, content ${score_content}, customer ${score_customer}, revenue ${score_revenue}, operations ${score_operations}.`,
      missing_context.length > 0 ? `Missing context: ${missing_context.join(", ")}.` : "No new missing context this week.",
      `Internal ready: ${internal_ready}. External actions remain LOCKED_BY_DESIGN.`,
      `Provider: ${provider_status}.`,
    ].join(" ");

    // Build planned outputs
    const plannedOutputs: any[] = [];
    plannedOutputs.push({
      output_type: "weekly_summary",
      title: `Weekly internal summary for ${biz.name} (${weekStartStr} → ${weekEndStr})`,
      summary: weekly_summary,
      destination_module: "command_centre",
      priority: "normal",
      risk_level: "low",
      requires_founder_review: true,
    });
    plannedOutputs.push({
      output_type: "next_week_plan",
      title: `Next week's internal plan for ${biz.name}`,
      summary: `Continue daily operating loop. Close ${blocked_actions} blocked actions internally where possible. Fill missing context. Review ${drafts.length} draft items. External activation remains locked.`,
      destination_module: "command_centre",
      priority: "normal",
      risk_level: "low",
      requires_founder_review: true,
    });
    if (missing_context.length > 0) {
      plannedOutputs.push({
        output_type: "knowledge_gap",
        title: `Repeated knowledge gaps for ${biz.name}`,
        summary: `Gaps: ${missing_context.join(", ")}.`,
        destination_module: "knowledge",
        priority: "high",
        risk_level: criticalMissing > 0 ? "high" : "normal",
        requires_founder_review: true,
      });
    }
    if (blocked_actions > 0) {
      plannedOutputs.push({
        output_type: "readiness_gap",
        title: `${blocked_actions} blocked actions this week for ${biz.name}`,
        summary: `Repeated blockers prevented internal progress. Review reasons and unblock safely.`,
        destination_module: "command_centre",
        priority: "high",
        risk_level: "normal",
        requires_founder_review: true,
      });
    }
    if (score_revenue < 75) plannedOutputs.push({
      output_type: "revenue_recommendation", title: `Improve revenue readiness for ${biz.name}`,
      summary: `Revenue score ${score_revenue}/100. Strengthen revenue plan, proposal/demo path and supplier readiness.`,
      destination_module: "revenue", priority: "normal", risk_level: "low", requires_founder_review: true,
    });
    if (score_content < 75) plannedOutputs.push({
      output_type: "social_content_recommendation", title: `Improve content/social readiness for ${biz.name}`,
      summary: `Content score ${score_content}/100. Produce more internal drafts; publishing remains locked.`,
      destination_module: "social", priority: "normal", risk_level: "low", requires_founder_review: true,
    });
    if (score_customer < 75) {
      plannedOutputs.push({
        output_type: "support_recommendation", title: `Improve support readiness for ${biz.name}`,
        summary: `Customer score ${score_customer}/100. Build support FAQ and reply templates internally.`,
        destination_module: "support", priority: "normal", risk_level: "low", requires_founder_review: true,
      });
      plannedOutputs.push({
        output_type: "customer_success_recommendation", title: `Improve customer success readiness for ${biz.name}`,
        summary: `Develop onboarding/check-in plan internally.`,
        destination_module: "customer_success", priority: "normal", risk_level: "low", requires_founder_review: true,
      });
      plannedOutputs.push({
        output_type: "crm_memory_gap", title: `CRM/customer memory gaps for ${biz.name}`,
        summary: `Review CRM/customer memory completeness internally.`,
        destination_module: "crm", priority: "normal", risk_level: "low", requires_founder_review: true,
      });
    }
    if (risk_warnings.length > 0) plannedOutputs.push({
      output_type: "compliance_warning", title: `Compliance/risk warnings this week for ${biz.name}`,
      summary: risk_warnings.join("; "),
      destination_module: "compliance", priority: "high", risk_level: "high", requires_founder_review: true,
    });
    plannedOutputs.push({
      output_type: "optimisation_recommendation",
      title: `Optimisation recommendations for ${biz.name}`,
      summary: `Focus next week on raising readiness from ${score_overall} → ≥80 internally. No external action.`,
      destination_module: "command_centre", priority: "normal", risk_level: "low", requires_founder_review: true,
    });
    plannedOutputs.push({
      output_type: "founder_decision_needed",
      title: `Founder weekly decision for ${biz.name}`,
      summary: `Decide next-week internal priorities and which blockers Mandy will personally clear. External go-live remains locked.`,
      destination_module: "approvals", priority: "high", risk_level: "low", requires_founder_review: true,
    });
    if (runs.length === 0) plannedOutputs.push({
      output_type: "diagnostic_note", title: `No daily runs found this week for ${biz.name}`,
      summary: "No daily runs found for this week; run Business Daily Operating Loop first.",
      destination_module: "diagnostics", priority: "high", risk_level: "normal", requires_founder_review: false,
    });

    const audit = {
      emails_sent: 0, dms_sent: 0, posts_published: 0,
      apollo_calls: 0, apollo_credits_spent: 0,
      smartlead_post_calls: 0, smartlead_campaign_starts: 0,
      metricool_mutations: 0, manychat_mutations: 0,
      payment_mutations: 0, portal_accounts_created: 0, portal_invites_sent: 0,
      surveys_sent: 0, reports_shared: 0, smtp_calls: 0, native_email_send_calls: 0,
      email_queue_send_rows_created: 0,
      real_data_deleted: 0, secrets_exposed: 0,
      auto_send_changed: "no", cron_changed: "no",
    };

    const baseResp = {
      ok: true,
      business_id,
      activation_record_id: activation?.id ?? null,
      week_start: weekStartStr,
      week_end: weekEndStr,
      provider_status,
      daily_runs_reviewed: runs.length,
      daily_actions_reviewed: actions.length,
      outputs_reviewed: outputs.length,
      completed_actions, blocked_actions, parked_actions,
      founder_reviews_open,
      missing_context, risk_warnings,
      scorecard: { score_overall, score_readiness, score_knowledge, score_content, score_customer, score_revenue, score_operations },
      weekly_summary,
      internal_ready,
      external_ready: false,
      external_actions_locked: true,
      safety_status: audit,
      no_forbidden_action_audit: audit,
      brain_summary,
      external_go_live: "LOCKED_BY_DESIGN",
    };

    if (dry_run) {
      return j({
        ...baseResp,
        status: "previewed",
        weekly_review_run_id: null,
        outputs_preview: plannedOutputs,
        outputs_created: 0,
        founder_review_items_created: 0,
      });
    }

    // Persist
    const { data: rec, error: recErr } = await svc.from("business_weekly_review_runs").insert({
      business_id,
      activation_record_id: activation?.id ?? null,
      week_start: weekStartStr,
      week_end: weekEndStr,
      run_status: runs.length === 0 ? "partial" : "completed",
      provider_status,
      daily_runs_reviewed: runs.length,
      daily_actions_reviewed: actions.length,
      outputs_reviewed: outputs.length,
      completed_actions, blocked_actions, parked_actions,
      founder_reviews_open,
      missing_context_count: missing_context_count_total,
      risk_warning_count: risk_warning_count_total,
      recommendations_created: 0,
      score_overall, score_readiness, score_knowledge, score_content, score_customer, score_revenue, score_operations,
      internal_ready,
      external_ready: false,
      external_actions_locked: true,
      weekly_summary,
      is_test_data,
      metadata: { brain_summary_present: !!brain_summary },
      no_forbidden_action_audit: audit,
    }).select("*").single();
    if (recErr || !rec) return j({ ok: false, error: recErr?.message ?? "weekly_run_insert_failed" }, 500);

    let outputs_created = 0, recs = 0;
    if (create_outputs && plannedOutputs.length > 0) {
      const rows = plannedOutputs.map((o) => ({
        business_id,
        weekly_review_run_id: rec.id,
        activation_record_id: activation?.id ?? null,
        output_type: o.output_type,
        output_status: o.output_type === "diagnostic_note" ? "needs_review" : "needs_review",
        title: o.title,
        summary: o.summary,
        destination_module: o.destination_module,
        priority: o.priority,
        risk_level: o.risk_level,
        requires_founder_review: o.requires_founder_review !== false,
        external_action_required: false,
        external_action_blocked: true,
        is_test_data,
      }));
      const { data: ins, error: iErr } = await svc.from("business_weekly_review_outputs").insert(rows).select("id,output_type");
      if (iErr) risk_warnings.push(`outputs_insert_failed:${iErr.message}`);
      outputs_created = ins?.length ?? 0;
      recs = (ins ?? []).filter((x: any) => x.output_type.includes("recommendation")).length;
    }

    let founder_review_items_created = 0;
    if (create_founder_review_items) {
      const { data: rev, error: rErr } = await svc.from("founder_approval_items").insert({
        business_id,
        approval_type: "business_weekly_review",
        source_system: "business-weekly-review-run",
        source_table: "business_weekly_review_runs",
        title: `Review weekly business summary for ${biz.name}`,
        summary: `Week ${weekStartStr} → ${weekEndStr}. Score overall ${score_overall}, readiness ${score_readiness}. Blockers ${blocked_actions}, missing context ${missing_context_count_total}, recommendations ${outputs_created}. External actions locked.`,
        recommended_action: "Review weekly scorecard, blockers and next-week internal plan. External send remains locked.",
        priority_level: score_overall < 60 ? "high" : "normal",
        risk_flags: [], compliance_flags: [],
        execution_enabled: false, auto_execute_allowed: false, send_allowed: false,
        metadata: { weekly_review_run_id: rec.id, activation_record_id: activation?.id ?? null, week_start: weekStartStr, week_end: weekEndStr, is_test_data },
      }).select("id").maybeSingle();
      if (!rErr && rev?.id) founder_review_items_created = 1;
      else if (rErr) risk_warnings.push(`founder_review_failed:${rErr.message}`);
    }

    await svc.from("business_weekly_review_runs").update({
      recommendations_created: recs,
      risk_warning_count: risk_warnings.length + (risk_warning_count_total - risk_warnings.length),
    }).eq("id", rec.id);

    return j({
      ...baseResp,
      status: "completed",
      weekly_review_run_id: rec.id,
      outputs_created,
      founder_review_items_created,
    });
  } catch (e) {
    return j({ ok: false, status: "failed", error: String((e as Error)?.message ?? e) }, 500);
  }
});