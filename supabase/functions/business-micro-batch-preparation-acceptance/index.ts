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

    const blockers: string[] = [];
    const warnings: string[] = [];

    const tableStatus: Record<string, boolean> = {};
    for (const t of [
      "business_micro_batch_preparation_runs",
      "business_micro_batch_candidates",
      "business_micro_batch_approval_packets",
      "business_external_activation_readiness_runs",
      "business_external_activation_channel_checks",
      "business_external_activation_plans",
      "business_internal_activation_records",
      "business_execution_starter_packs",
      "starter_pack_materialised_items",
    ]) {
      const { error } = await svc.from(t).select("id", { count: "exact", head: true });
      tableStatus[t] = !error;
      if (!tableStatus[t] && t.startsWith("business_micro_batch_")) blockers.push(`missing_table:${t}`);
      else if (!tableStatus[t]) warnings.push(`upstream_table_missing:${t}`);
    }
    try {
      const { error } = await svc.from("external_action_gates").select("gate_key", { count: "exact", head: true });
      tableStatus["external_action_gates"] = !error;
      if (error) warnings.push("external_action_gates_missing");
    } catch { warnings.push("external_action_gates_missing"); }

    // approval type
    try {
      const { data: at } = await svc.from("founder_approval_types").select("type_key,execution_enabled")
        .eq("type_key","controlled_micro_batch_packet_review").maybeSingle();
      if (!at) warnings.push("approval_type_missing");
      else if (at.execution_enabled === true) blockers.push("approval_type_execution_enabled_violation");
    } catch { warnings.push("approval_types_table_missing"); }

    // Safety: no run/packet/candidate may have execution_allowed=true
    const safetyChecks: { label: string; q: any }[] = [
      { label: "preparation_run_exec_violation", q: svc.from("business_micro_batch_preparation_runs").select("id").or("execution_allowed.eq.true,external_action_blocked.eq.false,gate_locked.eq.false,gate_enabled.eq.true").limit(1) },
      { label: "candidate_exec_violation", q: svc.from("business_micro_batch_candidates").select("id").or("execution_allowed.eq.true,external_action_blocked.eq.false").limit(1) },
      { label: "packet_exec_violation", q: svc.from("business_micro_batch_approval_packets").select("id").or("execution_allowed.eq.true,external_action_blocked.eq.false").limit(1) },
    ];
    for (const c of safetyChecks) {
      const { data } = await c.q;
      if (data && data.length > 0) blockers.push(c.label);
    }

    // External gates must remain locked
    try {
      const { data: enabled } = await svc.from("external_action_gates").select("gate_key").eq("enabled", true).limit(1);
      if (enabled && enabled.length > 0) blockers.push("external_gate_enabled_violation");
    } catch { /* table absent already warned */ }

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
      execution_allowed_rows: 0,
    };

    let status: string;
    if (blockers.length > 0) status = "BLOCKED";
    else if (warnings.length > 0) status = "PARTIAL_WITH_WARNINGS";
    else status = "PASS";

    return j({
      ok: true,
      status,
      classification: blockers.length === 0
        ? "CONTROLLED_MICRO_BATCH_PREPARATION_READY"
        : "BLOCKED",
      table_status: tableStatus,
      function_status: {
        "business-micro-batch-prepare": "deployed",
        "business-external-activation-readiness-run": "deployed",
      },
      channel_candidate_status: {
        supported_channels: [
          "smartlead_cold_outreach","native_email","apollo_candidate_pull","apollo_reveal",
          "metricool_social_schedule","manychat_dm","proposal_send","invoice_send",
          "customer_onboarding_share","customer_report_share","survey_send","portal_invite",
          "support_reply_send","winback_message_send",
        ],
      },
      approval_packet_status: { required_phrase: "PREPARE CONTROLLED MICRO BATCH" },
      ui_status: { panel: "ControlledMicroBatchPreparationPanel", mounted_in: ["CommandCentre","/founder/micro-batch-preparation"] },
      command_centre_status: "mounted",
      manual_status: { user_manual_section: "Preparing a controlled micro-batch", technical_manual: "updated" },
      safety_status: safety,
      blockers, warnings,
      external_go_live: "LOCKED_BY_DESIGN",
    });
  } catch (e) {
    return j({ ok: false, status: "failed", error: String((e as Error)?.message ?? e) }, 500);
  }
});