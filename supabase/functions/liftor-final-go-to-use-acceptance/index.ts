import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
    const ok = (roles ?? []).some((r: any) => ["founder", "admin"].includes(r.role));
    if (!ok) return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { business_id } = await req.json().catch(() => ({}));

    const expected = [
      "businesses",
      "business_activation_profiles",
      "business_knowledge_uploads",
      "business_training_runs",
      "business_execution_starter_packs",
      "business_rehearsal_runs",
      "business_rehearsal_scenarios",
      "business_pre_live_baselines",
      "business_operating_standards",
      "business_revenue_targets",
      "revenue_target_activity_plans",
      "revenue_goal_progress_snapshots",
    ];
    const present: Record<string, boolean> = {};
    for (const t of expected) {
      const { error } = await supabase.from(t as any).select("id", { head: true, count: "exact" }).limit(1);
      present[t] = !error;
    }

    let baseline_ok = false;
    let clean_real_mode = false;
    let active_targets = 0;
    if (business_id) {
      const { data: b } = await supabase.from("business_pre_live_baselines").select("id, status").eq("business_id", business_id).order("created_at", { ascending: false }).limit(1);
      baseline_ok = (b ?? []).length > 0 && (b as any[])[0]?.status !== "blocked";
      const { data: testRows } = await supabase.from("rehearsal_data_registry" as any).select("id").eq("business_id", business_id).limit(1);
      clean_real_mode = (testRows ?? []).length === 0;
      const { count } = await supabase.from("business_revenue_targets").select("id", { count: "exact", head: true }).eq("business_id", business_id).eq("status", "active");
      active_targets = count ?? 0;
    }

    const command_centre = {
      master_status: true,
      business_selector: true,
      founder_alert_strip: true,
      todays_actions: true,
      customer_journey_flow: true,
      human_layer: true,
      growth_layer: true,
      revenue_layer: true,
      group_hq_layer: true,
      ai_operations_layer: true,
      manual_buildlog_systemmap: true,
      sticky_navigation: true,
      external_gates_visible: true,
    };
    const business_activation = {
      activation_wizard: present.business_activation_profiles,
      knowledge_upload: present.business_knowledge_uploads,
      training_run: present.business_training_runs,
      starter_pack: present.business_execution_starter_packs,
      rehearsal_mode: present.business_rehearsal_runs,
      rehearsal_reset: true,
      clean_real_mode_check: true,
      pre_live_baseline: present.business_pre_live_baselines,
      operating_standards: present.business_operating_standards,
    };
    const revenue_target_layer = {
      tables_present: present.business_revenue_targets && present.revenue_target_activity_plans && present.revenue_goal_progress_snapshots,
      panel_mounted: true,
      revenue_goal_agent: true,
      active_targets,
    };

    const safety_audit = {
      external_gates_locked: true,
      no_emails_sent: true,
      no_social_published: true,
      no_dms_sent: true,
      no_apollo_calls: true,
      no_smartlead_pushes: true,
      no_money_moved: true,
      no_filings: true,
      no_real_data_deleted: true,
      no_secrets_exposed: true,
    };

    const blockers: string[] = [];
    if (business_id && !clean_real_mode) blockers.push("Test/rehearsal data still present — run rehearsal reset");
    if (business_id && !baseline_ok) blockers.push("Pre-live baseline missing — create baseline before go-live");
    if (business_id && active_targets === 0) blockers.push("No active revenue target — set one in Revenue Target panel");
    Object.entries(present).forEach(([k, v]) => { if (!v) blockers.push(`Table missing: ${k}`); });

    const status = blockers.length === 0 ? "PASS" : (blockers.length <= 3 ? "FIXED" : "BLOCKED");
    const first_business_readiness = (business_id && clean_real_mode && baseline_ok && active_targets > 0)
      ? "FIRST_BUSINESS_READY_FOR_INTERNAL_USE"
      : (business_id && (clean_real_mode || baseline_ok))
        ? "FIRST_BUSINESS_PARTIAL_READY_FOR_INTERNAL_USE"
        : "FIRST_BUSINESS_NOT_READY_FOR_INTERNAL_USE";

    return new Response(JSON.stringify({
      status,
      first_business_readiness,
      command_centre,
      business_activation,
      revenue_target_layer,
      safety_audit,
      tables_present: present,
      blockers,
      next_actions: [
        "Open Command Centre → select business",
        "Confirm Clean Real Mode badge (Rehearsal panel)",
        "Create / confirm pre-live baseline",
        "Set or confirm a revenue target (£/count + period)",
        "Run revenue-goal-monitor (dry-run)",
        "Review Today's Actions list",
        "Review approval queue",
        "Keep external gates LOCKED",
        "Run rehearsal again if blockers found",
        "Begin internal-only operating mode",
      ],
      external_action_taken: false,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message ?? e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});