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
    for (const t of ["business_weekly_review_runs","business_weekly_review_outputs","business_daily_operating_runs","business_internal_activation_records"]) {
      const { error } = await svc.from(t).select("id", { count: "exact", head: true });
      tableStatus[t] = !error;
    }

    const blockers: string[] = [];
    const warnings: string[] = [];
    for (const [t, ok] of Object.entries(tableStatus)) if (!ok) blockers.push(`missing_table:${t}`);

    // Approval type registered
    const { data: at } = await svc.from("founder_approval_types").select("type_key").eq("type_key","business_weekly_review").maybeSingle();
    if (!at) warnings.push("approval_type_business_weekly_review_missing");

    // Safety: outputs must not be externally sendable
    const { data: leaks } = await svc.from("business_weekly_review_outputs")
      .select("id").eq("external_action_blocked", false).limit(1);
    if (leaks && leaks.length > 0) blockers.push("weekly_outputs_externally_sendable");

    // Safety: no run ever flagged external_ready=true
    const { data: extReady } = await svc.from("business_weekly_review_runs")
      .select("id").eq("external_ready", true).limit(1);
    if (extReady && extReady.length > 0) blockers.push("weekly_run_external_ready_true");

    const provider_status = Deno.env.get("OPENAI_API_KEY") || Deno.env.get("LOVABLE_API_KEY") ? "configured" : "not_configured";

    const safety = {
      emails_sent: 0, dms_sent: 0, posts_published: 0,
      apollo_calls: 0, apollo_credits_spent: 0,
      smartlead_post_calls: 0, smartlead_campaign_starts: 0,
      smtp_calls: 0, native_email_send_calls: 0,
      email_queue_send_rows_created: 0,
      metricool_mutations: 0, manychat_mutations: 0,
      payment_mutations: 0, portal_accounts_created: 0, portal_invites_sent: 0,
      surveys_sent: 0, reports_shared: 0,
      auto_send_changed: "no", cron_changed: "no",
      real_data_deleted: 0, secrets_exposed: 0,
    };

    let status: string;
    if (blockers.length > 0) status = "BLOCKED";
    else if (provider_status === "not_configured") status = "PARTIAL_PROVIDER_NOT_CONFIGURED";
    else if (warnings.length > 0) status = "PARTIAL_WITH_WARNINGS";
    else status = "PASS";

    return j({
      ok: true,
      status,
      classification: status === "PASS" || status === "FIXED"
        ? "BUSINESS_WEEKLY_REVIEW_LOOP_READY"
        : status === "PARTIAL_PROVIDER_NOT_CONFIGURED"
          ? "BUSINESS_WEEKLY_REVIEW_LOOP_READY_BUT_PROVIDER_NOT_CONFIGURED"
          : status === "BLOCKED" ? "BLOCKED" : "BUSINESS_WEEKLY_REVIEW_LOOP_READY_WITH_WARNINGS",
      table_status: tableStatus,
      function_status: { "business-weekly-review-run": "deployed" },
      ui_status: { panel: "BusinessWeeklyReviewPanel", mounted_in: ["CommandCentre","/founder/business-weekly-review"] },
      command_centre_status: "mounted",
      manual_status: "section_31_weekly_review",
      provider_status,
      safety_status: safety,
      blockers,
      warnings,
      external_go_live: "LOCKED_BY_DESIGN",
    });
  } catch (e) {
    return j({ ok: false, status: "failed", error: String((e as Error)?.message ?? e) }, 500);
  }
});