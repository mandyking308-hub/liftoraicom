import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const CONFIRM = "ACTIVATE BUSINESS INTERNAL MODE";

function j(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), {
    status: s,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

type Runbook = {
  item_type: string;
  cadence: string;
  title: string;
  description?: string;
  owner_agent?: string | null;
  owner_role?: string | null;
  priority?: string;
  requires_founder_review?: boolean;
  route_hint?: string | null;
  source_module?: string | null;
};

const DAILY_RUNBOOK: Runbook[] = [
  { item_type: "daily_check", cadence: "daily", title: "Check Command Centre Truth / business status", owner_agent: "founder_copilot_agent", priority: "high", route_hint: "/founder/command-centre" },
  { item_type: "daily_check", cadence: "daily", title: "Review Today's Actions", owner_agent: "priority_agent", priority: "high", route_hint: "/founder/business-internal-activation" },
  { item_type: "draft_review", cadence: "daily", title: "Review founder approvals", owner_agent: "founder_copilot_agent", priority: "high", route_hint: "/founder/approvals" },
  { item_type: "draft_review", cadence: "daily", title: "Review internal drafts", owner_agent: "ai_engagement_agent", priority: "normal", route_hint: "/founder/brain-drafts" },
  { item_type: "support_review", cadence: "daily", title: "Review support/customer success items", owner_agent: "support_agent", priority: "normal" },
  { item_type: "revenue_review", cadence: "daily", title: "Review revenue/commercial items", owner_agent: "finance_agent", priority: "normal" },
  { item_type: "social_review", cadence: "daily", title: "Review social/content drafts", owner_agent: "social_media_manager_agent", priority: "normal" },
  { item_type: "compliance_review", cadence: "daily", title: "Review compliance/risk warnings", owner_agent: "compliance_agent", priority: "high" },
  { item_type: "system_check", cadence: "daily", title: "Confirm external gates remain locked", owner_agent: "ops_agent", priority: "critical", requires_founder_review: false },
];

const WEEKLY_RUNBOOK: Runbook[] = [
  { item_type: "knowledge_gap", cadence: "weekly", title: "Review business knowledge gaps", owner_agent: "knowledge_agent", priority: "normal" },
  { item_type: "weekly_check", cadence: "weekly", title: "Review performance/learning signals", owner_agent: "priority_agent", priority: "normal" },
  { item_type: "social_review", cadence: "weekly", title: "Review content plan", owner_agent: "social_media_manager_agent", priority: "normal" },
  { item_type: "customer_success_review", cadence: "weekly", title: "Review CRM/customer memory", owner_agent: "crm_agent", priority: "normal" },
  { item_type: "revenue_review", cadence: "weekly", title: "Review revenue target/progress", owner_agent: "finance_agent", priority: "high" },
  { item_type: "supplier_review", cadence: "weekly", title: "Review supplier/delivery readiness", owner_agent: "supplier_agent", priority: "normal" },
  { item_type: "compliance_review", cadence: "weekly", title: "Review risks/security/costs", owner_agent: "compliance_agent", priority: "high" },
  { item_type: "knowledge_gap", cadence: "weekly", title: "Update starter pack if business changed", owner_agent: "business_onboarding_agent", priority: "normal" },
];

const EVENT_RUNBOOK: Runbook[] = [
  { item_type: "draft_review", cadence: "event_based", title: "New inbound message → draft reply internally", owner_agent: "inbox_agent", priority: "high" },
  { item_type: "customer_success_review", cadence: "event_based", title: "New customer/prospect → check CRM and compliance", owner_agent: "crm_agent", priority: "high" },
  { item_type: "social_review", cadence: "event_based", title: "New content asset → register asset and draft usage plan", owner_agent: "social_media_manager_agent", priority: "normal" },
  { item_type: "knowledge_gap", cadence: "event_based", title: "New offer/pricing change → update business knowledge", owner_agent: "knowledge_agent", priority: "high" },
  { item_type: "founder_review", cadence: "event_based", title: "Founder approval pending → review before action", owner_agent: "founder_copilot_agent", priority: "urgent" },
];

function dayPlan(day: number): { action_title: string; action_category: string; owner_agent: string; priority?: string; }[] {
  switch (day) {
    case 1: return [
      { action_title: "Confirm Truth Sync / business state", action_category: "command_centre", owner_agent: "founder_copilot_agent", priority: "high" },
      { action_title: "Fix critical missing context", action_category: "knowledge", owner_agent: "knowledge_agent", priority: "high" },
      { action_title: "Review starter pack", action_category: "drafts", owner_agent: "business_onboarding_agent" },
      { action_title: "Review materialised items", action_category: "drafts", owner_agent: "ai_engagement_agent" },
      { action_title: "Verify external locks", action_category: "compliance", owner_agent: "compliance_agent", priority: "critical" },
    ];
    case 2: return [
      { action_title: "Refine email/social/support drafts", action_category: "drafts", owner_agent: "ai_engagement_agent" },
      { action_title: "Review compliance / forbidden claims", action_category: "compliance", owner_agent: "compliance_agent", priority: "high" },
    ];
    case 3: return [
      { action_title: "Review revenue activity plan", action_category: "revenue", owner_agent: "finance_agent" },
      { action_title: "Identify internal proposal/demo needs", action_category: "revenue", owner_agent: "proposal_agent" },
    ];
    case 4: return [
      { action_title: "Review CRM/customer memory readiness", action_category: "customer_success", owner_agent: "crm_agent" },
      { action_title: "Prepare inbound reply process", action_category: "drafts", owner_agent: "inbox_agent" },
    ];
    case 5: return [
      { action_title: "Review support/customer success readiness", action_category: "support", owner_agent: "support_agent" },
      { action_title: "Prepare onboarding plan", action_category: "customer_success", owner_agent: "customer_success_agent" },
    ];
    case 6: return [
      { action_title: "Review social/content schedule internally", action_category: "social", owner_agent: "social_media_manager_agent" },
      { action_title: "Prepare manual export packs if needed", action_category: "drafts", owner_agent: "ops_agent" },
    ];
    case 7: return [
      { action_title: "Readiness review", action_category: "command_centre", owner_agent: "founder_copilot_agent", priority: "high" },
      { action_title: "Decide internal-only vs future controlled external activation plan", action_category: "compliance", owner_agent: "founder_copilot_agent", priority: "high" },
    ];
    default: return [
      { action_title: `Day ${day} internal operating check`, action_category: "command_centre", owner_agent: "founder_copilot_agent" },
    ];
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
      factory_run_id,
      activation_mode = "internal_only",
      create_runbook = true,
      create_daily_actions = true,
      create_founder_review = true,
      plan_days = 7,
      dry_run = true,
      confirmation_phrase,
      is_test_data = false,
    } = body ?? {};

    if (!business_id) return j({ ok: false, error: "business_id_required" }, 400);
    if (!dry_run && confirmation_phrase !== CONFIRM) {
      return j({ ok: false, error: "confirmation_phrase_required", expected: CONFIRM }, 400);
    }

    const allowedModes = ["sandbox","internal_only","founder_review","limited_external_locked","paused"];
    if (!allowedModes.includes(activation_mode)) {
      return j({ ok: false, error: "invalid_activation_mode" }, 400);
    }

    // Verify business
    const { data: biz } = await svc.from("businesses").select("id,name").eq("id", business_id).maybeSingle();
    if (!biz) return j({ ok: false, error: "business_not_found" }, 404);

    const missing_context: string[] = [];
    const risk_warnings: string[] = [];
    const blockers: string[] = [];

    // Latest factory run
    let factory: any = null;
    if (factory_run_id) {
      const { data } = await svc.from("business_onboarding_factory_runs").select("*").eq("id", factory_run_id).maybeSingle();
      factory = data;
    }
    if (!factory) {
      const { data } = await svc.from("business_onboarding_factory_runs")
        .select("*").eq("business_id", business_id)
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      factory = data;
    }
    if (!factory) missing_context.push("no_factory_run");

    // Latest profile
    const { data: profile } = await svc.from("business_understanding_profiles")
      .select("id").eq("business_id", business_id)
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!profile) missing_context.push("no_understanding_profile");

    // Latest starter pack
    const { data: pack } = await svc.from("business_execution_starter_packs")
      .select("id").eq("business_id", business_id)
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!pack) missing_context.push("no_starter_pack");

    // Latest materialisation
    const { data: mat } = await svc.from("starter_pack_materialisation_runs")
      .select("id").eq("business_id", business_id)
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!mat) missing_context.push("no_materialisation_run");

    const { count: matItems } = await svc.from("starter_pack_materialised_items")
      .select("id", { count: "exact", head: true }).eq("business_id", business_id);
    if ((matItems ?? 0) === 0) missing_context.push("no_materialised_items");

    // Safety: any sendable rows?
    const { data: leak } = await svc.from("starter_pack_materialised_items")
      .select("id").eq("business_id", business_id).eq("external_send_allowed", true).limit(1);
    if (leak && leak.length > 0) blockers.push("sendable_items_present");

    // Source fidelity gate — a critical-field contradiction between the registered
    // source manifest and Liftor's derived understanding blocks internal activation.
    const { data: manifestRows } = await svc.from("business_knowledge_uploads")
      .select("id,metadata").eq("business_id", business_id).eq("upload_type", "source_manifest")
      .order("created_at", { ascending: false });
    const currentManifest = (manifestRows ?? []).find((m: any) => m?.metadata?.superseded !== true)
      ?? (manifestRows ?? [])[0];
    const fidelity = (currentManifest as any)?.metadata?.fidelity ?? null;
    if (!currentManifest) {
      missing_context.push("no_source_manifest");
    } else if (!fidelity) {
      missing_context.push("source_fidelity_not_checked");
    } else if (fidelity.verdict === "FIDELITY_FAIL") {
      blockers.push("source_fidelity_fail");
      risk_warnings.push(
        `Source fidelity FAIL — critical field contradictions: ${(fidelity.mismatches ?? [])
          .map((m: any) => m.field).join(", ")}`,
      );
    } else if (fidelity.verdict === "FIDELITY_REVIEW") {
      risk_warnings.push("source_fidelity_review_recommended");
    }

    if (!dry_run && blockers.includes("source_fidelity_fail")) {
      return j({
        ok: false,
        blocked: true,
        error: "source_fidelity_fail",
        business_id,
        fidelity,
        next_step: "Founder review required: reconcile source manifest vs derived understanding, then rerun business-source-fidelity-check.",
      }, 409);
    }



    // Readiness score
    let score = 0;
    if (factory) score += 25;
    if (profile) score += 15;
    if (pack) score += 20;
    if (mat) score += 15;
    if ((matItems ?? 0) > 0) score += 15;
    if (missing_context.length === 0) score += 10;
    score = Math.max(0, Math.min(100, score));

    const internal_ready = score >= 70 && blockers.length === 0;

    const runbookPlan = [...DAILY_RUNBOOK, ...WEEKLY_RUNBOOK, ...EVENT_RUNBOOK];
    const dailyPlan: { day: number; action_date: string; items: ReturnType<typeof dayPlan>; }[] = [];
    const today = new Date();
    for (let d = 1; d <= Math.max(1, Math.min(31, plan_days)); d++) {
      const dt = new Date(today.getTime() + (d - 1) * 86400000);
      const iso = dt.toISOString().slice(0, 10);
      dailyPlan.push({ day: d, action_date: iso, items: dayPlan(d) });
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
        activation_record_id: null,
        activation_status: "previewed",
        activation_mode,
        readiness_score: score,
        internal_ready,
        external_ready: false,
        runbook_items: runbookPlan.length,
        runbook_preview: runbookPlan,
        daily_actions: dailyPlan.reduce((n, p) => n + p.items.length, 0),
        daily_actions_preview: dailyPlan,
        founder_review_ids: [],
        missing_context,
        risk_warnings,
        blockers,
        safety_status: audit,
        no_forbidden_action_audit: audit,
        external_go_live: "LOCKED_BY_DESIGN",
      });
    }

    if (blockers.length > 0) {
      return j({ ok: false, status: "blocked", blockers, missing_context, risk_warnings }, 400);
    }

    // Insert activation record
    const { data: rec, error: recErr } = await svc.from("business_internal_activation_records").insert({
      business_id,
      activation_status: internal_ready ? "internally_active" : "draft",
      activation_mode,
      activation_source: "business_onboarding_factory",
      factory_run_id: factory?.id ?? null,
      onboarding_run_id: factory?.metadata?.onboarding_run_id ?? null,
      starter_pack_id: pack?.id ?? null,
      materialisation_run_id: mat?.id ?? null,
      readiness_score: score,
      internal_ready,
      external_ready: false,
      missing_context_count: missing_context.length,
      risk_warning_count: risk_warnings.length,
      blocker_count: blockers.length,
      founder_review_required: true,
      founder_review_status: "pending",
      external_actions_locked: true,
      auto_send_enabled: false,
      cron_enabled: false,
      operating_start_date: new Date().toISOString().slice(0, 10),
      is_test_data,
      metadata: { plan_days, daily_plan_summary: dailyPlan.map((d) => ({ day: d.day, count: d.items.length })) },
    }).select("*").single();
    if (recErr || !rec) return j({ ok: false, error: recErr?.message ?? "activation_insert_failed" }, 500);

    // Runbook
    const runbookRows: any[] = [];
    if (create_runbook) {
      for (const r of runbookPlan) {
        runbookRows.push({
          business_id,
          activation_record_id: rec.id,
          item_type: r.item_type,
          cadence: r.cadence,
          title: r.title,
          description: r.description ?? null,
          owner_agent: r.owner_agent ?? null,
          owner_role: r.owner_role ?? "founder",
          priority: r.priority ?? "normal",
          status: "ready",
          route_hint: r.route_hint ?? null,
          source_module: "business-internal-activate",
          requires_founder_review: r.requires_founder_review ?? true,
          external_action_required: false,
          external_action_blocked: true,
          is_test_data,
        });
      }
      if (runbookRows.length > 0) {
        const { error: rbErr } = await svc.from("business_operating_runbook_items").insert(runbookRows);
        if (rbErr) risk_warnings.push(`runbook_insert_failed:${rbErr.message}`);
      }
    }

    // Daily actions
    const dailyRows: any[] = [];
    if (create_daily_actions) {
      for (const d of dailyPlan) {
        for (const it of d.items) {
          dailyRows.push({
            business_id,
            activation_record_id: rec.id,
            action_date: d.action_date,
            action_title: it.action_title,
            action_category: it.action_category,
            owner_agent: it.owner_agent ?? null,
            priority: it.priority ?? "normal",
            status: "open",
            source_type: "business-internal-activate",
            source_id: rec.id,
            founder_review_required: true,
            external_action_required: false,
            external_action_blocked: true,
            is_test_data,
          });
        }
      }
      if (dailyRows.length > 0) {
        const { error: daErr } = await svc.from("business_internal_daily_actions").insert(dailyRows);
        if (daErr) risk_warnings.push(`daily_actions_insert_failed:${daErr.message}`);
      }
    }

    // Founder review
    const founder_review_ids: string[] = [];
    if (create_founder_review) {
      const { data: rev, error: revErr } = await svc.from("founder_approval_items").insert({
        business_id,
        approval_type: "business_internal_activation_review",
        source_system: "business-internal-activate",
        source_table: "business_internal_activation_records",
        title: `Review internal activation for ${biz.name}`,
        summary: `Readiness ${score}/100. Mode: ${activation_mode}. Runbook items: ${runbookRows.length}. Daily actions: ${dailyRows.length}. Missing context: ${missing_context.length}. Blockers: ${blockers.length}. External actions locked.`,
        recommended_action: "Review runbook + first 7-day plan. External send remains locked.",
        priority_level: "normal",
        risk_flags: [], compliance_flags: [],
        execution_enabled: false, auto_execute_allowed: false, send_allowed: false,
        metadata: {
          activation_record_id: rec.id,
          factory_run_id: factory?.id ?? null,
          starter_pack_id: pack?.id ?? null,
          materialisation_run_id: mat?.id ?? null,
          is_test_data,
        },
      }).select("id").maybeSingle();
      if (!revErr && rev?.id) {
        founder_review_ids.push(rev.id);
      } else if (revErr) {
        risk_warnings.push(`founder_review_failed:${revErr.message}`);
      }
    }

    return j({
      ok: true,
      status: internal_ready ? "internally_active" : "draft",
      business_id,
      activation_record_id: rec.id,
      activation_status: rec.activation_status,
      activation_mode,
      readiness_score: score,
      internal_ready,
      external_ready: false,
      runbook_items: runbookRows.length,
      daily_actions: dailyRows.length,
      founder_review_ids,
      missing_context,
      risk_warnings,
      blockers,
      safety_status: audit,
      no_forbidden_action_audit: audit,
      external_go_live: "LOCKED_BY_DESIGN",
    });
  } catch (e) {
    return j({ ok: false, status: "failed", error: String((e as Error)?.message ?? e) }, 500);
  }
});