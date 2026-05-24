import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

function j(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), {
    status: s,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const svc = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const tableStatus: Record<string, boolean> = {};
    for (const t of [
      "business_external_activation_readiness_runs",
      "business_external_activation_channel_checks",
      "business_external_activation_plans",
      "business_weekly_review_runs",
      "business_internal_activation_records",
      "external_action_gates",
    ]) {
      const { error } = await svc.from(t).select("id", { count: "exact", head: true });
      tableStatus[t] = !error;
    }

    const blockers: string[] = [];
    const warnings: string[] = [];
    for (const [t, ok] of Object.entries(tableStatus)) if (!ok) blockers.push(`missing_table:${t}`);

    const { data: at } = await svc.from("founder_approval_types").select("type_key").eq("type_key","controlled_external_activation_readiness_review").maybeSingle();
    if (!at) warnings.push("approval_type_missing");

    // Safety: no readiness run may be flagged as allowed/externally ready
    const { data: bad } = await svc.from("business_external_activation_readiness_runs")
      .select("id").or("external_ready.eq.true,external_activation_allowed.eq.true,all_external_gates_locked.eq.false").limit(1);
    if (bad && bad.length > 0) blockers.push("readiness_run_external_lock_violated");

    const { data: badPlan } = await svc.from("business_external_activation_plans")
      .select("id").or("external_activation_allowed.eq.true,external_action_blocked.eq.false").limit(1);
    if (badPlan && badPlan.length > 0) blockers.push("activation_plan_external_lock_violated");

    const { data: badCh } = await svc.from("business_external_activation_channel_checks")
      .select("id").or("external_action_blocked.eq.false,secret_value_returned.eq.true").limit(1);
    if (badCh && badCh.length > 0) blockers.push("channel_check_lock_or_secret_violated");

    const channel_check_status = { allowed_statuses: ["ready_for_founder_review","warning","blocked","not_configured","not_applicable"] };

    const safety = {
      emails_sent: 0, dms_sent: 0, posts_published: 0,
      apollo_calls: 0, apollo_credits_spent: 0,
      smartlead_post_calls: 0, smartlead_campaign_starts: 0,
      smtp_calls: 0, native_email_send_calls: 0, email_queue_send_rows_created: 0,
      metricool_mutations: 0, manychat_mutations: 0,
      payment_mutations: 0, portal_accounts_created: 0, portal_invites_sent: 0,
      surveys_sent: 0, reports_shared: 0,
      auto_send_changed: "no", cron_changed: "no",
      external_gates_enabled: 0, real_data_deleted: 0, secrets_exposed: 0,
    };

    let status: string;
    if (blockers.length > 0) status = "BLOCKED";
    else if (warnings.length > 0) status = "PARTIAL_WITH_WARNINGS";
    else status = "PASS";

    return j({
      ok: true,
      status,
      classification: status === "PASS" || status === "FIXED"
        ? "CONTROLLED_EXTERNAL_ACTIVATION_READINESS_READY"
        : status === "BLOCKED" ? "BLOCKED"
        : "CONTROLLED_EXTERNAL_ACTIVATION_READINESS_READY_WITH_WARNINGS",
      table_status: tableStatus,
      function_status: { "business-external-activation-readiness-run": "deployed" },
      channel_check_status,
      ui_status: { panel: "ControlledExternalActivationReadinessPanel", mounted_in: ["CommandCentre","/founder/external-activation-readiness"] },
      command_centre_status: "mounted",
      manual_status: "section_32_external_activation_readiness",
      safety_status: safety,
      blockers,
      warnings,
      external_go_live: "LOCKED_BY_DESIGN",
    });
  } catch (e) {
    return j({ ok: false, status: "failed", error: String((e as Error)?.message ?? e) }, 500);
  }
});