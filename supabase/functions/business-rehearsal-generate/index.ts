import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STAGES_BY_TYPE: Record<string, { stage: string; title: string; agent: string; output: string }[]> = {
  full_customer_journey: [
    { stage: "prospecting", title: "Identify test prospect", agent: "prospecting_agent", output: "test_prospect_record" },
    { stage: "CRM_capture", title: "Capture into CRM memory", agent: "crm_agent", output: "crm_record" },
    { stage: "outreach_draft", title: "Draft outreach (no send)", agent: "outreach_agent", output: "draft_email" },
    { stage: "fake_reply", title: "Simulate prospect reply", agent: "rehearsal_simulator", output: "test_inbound_reply" },
    { stage: "AI_response", title: "Draft AI response", agent: "reply_agent", output: "draft_reply" },
    { stage: "founder_approval", title: "Founder approval gate", agent: "approval_agent", output: "approval_pending" },
    { stage: "proposal", title: "Draft proposal", agent: "proposal_agent", output: "draft_proposal" },
    { stage: "demo", title: "Draft demo plan", agent: "demo_agent", output: "draft_demo_plan" },
    { stage: "deal", title: "Draft deal record", agent: "deal_agent", output: "draft_deal" },
    { stage: "invoice", title: "Draft invoice (no send)", agent: "invoice_agent", output: "draft_invoice" },
    { stage: "onboarding", title: "Draft onboarding plan", agent: "onboarding_agent", output: "draft_onboarding" },
    { stage: "support", title: "Draft support response", agent: "support_agent", output: "draft_support_reply" },
    { stage: "survey", title: "Draft survey request", agent: "survey_agent", output: "draft_survey" },
    { stage: "complaint", title: "Draft complaint recovery", agent: "complaints_agent", output: "draft_complaint_plan" },
    { stage: "recovery", title: "Draft recovery plan", agent: "recovery_agent", output: "draft_recovery_plan" },
    { stage: "winback", title: "Draft win-back plan", agent: "winback_agent", output: "draft_winback" },
    { stage: "quarterly_report", title: "Draft quarterly report", agent: "report_agent", output: "draft_report" },
    { stage: "retention", title: "Draft retention plan", agent: "retention_agent", output: "draft_retention" },
  ],
  sales_only: [
    { stage: "prospecting", title: "Identify test prospect", agent: "prospecting_agent", output: "test_prospect_record" },
    { stage: "outreach_draft", title: "Draft outreach", agent: "outreach_agent", output: "draft_email" },
    { stage: "fake_reply", title: "Simulate reply", agent: "rehearsal_simulator", output: "test_reply" },
    { stage: "AI_response", title: "Draft response", agent: "reply_agent", output: "draft_reply" },
    { stage: "proposal", title: "Draft proposal", agent: "proposal_agent", output: "draft_proposal" },
    { stage: "demo", title: "Draft demo plan", agent: "demo_agent", output: "draft_demo" },
    { stage: "deal", title: "Draft deal", agent: "deal_agent", output: "draft_deal" },
  ],
  support_only: [
    { stage: "support", title: "Draft support response", agent: "support_agent", output: "draft_reply" },
    { stage: "survey", title: "Draft satisfaction survey", agent: "survey_agent", output: "draft_survey" },
  ],
  complaint_recovery: [
    { stage: "complaint", title: "Draft complaint acknowledgement", agent: "complaints_agent", output: "draft_ack" },
    { stage: "recovery", title: "Draft recovery plan", agent: "recovery_agent", output: "draft_plan" },
    { stage: "founder_approval", title: "Founder approval gate", agent: "approval_agent", output: "approval_pending" },
  ],
  onboarding: [
    { stage: "onboarding", title: "Draft onboarding plan", agent: "onboarding_agent", output: "draft_plan" },
    { stage: "survey", title: "Draft post-onboarding survey", agent: "survey_agent", output: "draft_survey" },
  ],
  social_content: [
    { stage: "outreach_draft", title: "Draft social content pack", agent: "social_agent", output: "draft_social_pack" },
  ],
  proposal_demo_deal: [
    { stage: "proposal", title: "Draft proposal", agent: "proposal_agent", output: "draft_proposal" },
    { stage: "demo", title: "Draft demo plan", agent: "demo_agent", output: "draft_demo" },
    { stage: "deal", title: "Draft deal record", agent: "deal_agent", output: "draft_deal" },
  ],
  winback_retention: [
    { stage: "winback", title: "Draft win-back outreach", agent: "winback_agent", output: "draft_winback" },
    { stage: "retention", title: "Draft retention plan", agent: "retention_agent", output: "draft_retention" },
  ],
  quarterly_report: [
    { stage: "quarterly_report", title: "Draft quarterly report", agent: "report_agent", output: "draft_report" },
  ],
  business_activation: [
    { stage: "CRM_capture", title: "Verify CRM memory", agent: "crm_agent", output: "verification" },
    { stage: "outreach_draft", title: "Verify outreach drafts", agent: "outreach_agent", output: "draft" },
    { stage: "founder_approval", title: "Verify approval gate", agent: "approval_agent", output: "gate_check" },
  ],
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } }
    );
    const { data: auth } = await supabase.auth.getUser();
    const user = auth?.user;
    if (!user) return json({ error: "unauthorized" }, 401);
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
    const allowed = (roles ?? []).some((r: any) => r.role === "admin" || r.role === "founder");
    if (!allowed) return json({ error: "forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const { business_id, rehearsal_type = "full_customer_journey", confirm, dry_run = true } = body;
    if (!business_id) return json({ error: "business_id required" }, 400);
    const stages = STAGES_BY_TYPE[rehearsal_type] ?? STAGES_BY_TYPE.full_customer_journey;

    if (dry_run || confirm !== "CREATE BUSINESS REHEARSAL") {
      return json({
        dry_run: true,
        rehearsal_type,
        planned_scenarios: stages.length,
        external_actions: "locked",
        confirmation_required: "CREATE BUSINESS REHEARSAL",
      });
    }

    const adminClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: run, error: runErr } = await adminClient
      .from("business_rehearsal_runs")
      .insert({
        business_id,
        rehearsal_name: `Rehearsal ${rehearsal_type} ${new Date().toISOString().slice(0, 16)}`,
        rehearsal_type,
        rehearsal_status: "ready",
        scenario_pack: rehearsal_type,
        test_data_only: true,
      })
      .select()
      .single();
    if (runErr) throw runErr;

    const scenarios = stages.map((s) => ({
      business_id,
      rehearsal_run_id: run.id,
      scenario_key: `${rehearsal_type}.${s.stage}`,
      scenario_title: s.title,
      scenario_stage: s.stage,
      expected_agent_key: s.agent,
      expected_output: s.output,
      scenario_status: "pending",
    }));
    const { error: insErr } = await adminClient.from("business_rehearsal_scenarios").insert(scenarios);
    if (insErr) throw insErr;

    // Register every test record in the rehearsal_data_registry for safe reset later
    const { data: insertedScenarios } = await adminClient
      .from("business_rehearsal_scenarios")
      .select("id, scenario_title")
      .eq("rehearsal_run_id", run.id);
    const registry = [
      {
        rehearsal_run_id: run.id,
        business_id,
        source_table: "business_rehearsal_runs",
        source_id: run.id,
        record_label: run.rehearsal_name,
        data_type: "rehearsal_run",
        purge_action: "delete",
      },
      ...((insertedScenarios ?? []) as any[]).map((s) => ({
        rehearsal_run_id: run.id,
        business_id,
        source_table: "business_rehearsal_scenarios",
        source_id: s.id,
        record_label: s.scenario_title,
        data_type: "rehearsal_scenario",
        purge_action: "delete",
      })),
    ];
    await adminClient.from("rehearsal_data_registry").insert(registry);

    return json({
      rehearsal_run_id: run.id,
      scenarios_created: scenarios.length,
      registry_entries: registry.length,
      external_actions: "locked",
    });
  } catch (e: any) {
    return json({ error: e?.message ?? "error" }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}