import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const CONFIRMATION_PHRASE = "CREATE BUSINESS LAUNCH PLAN";
const SOURCE_FUNCTION = "business-launch-plan-generate";

function buildSetupSteps(modules: string[], lanes: any) {
  const steps: any[] = [
    { key: "create_business_row", label: "Create business record", required: true, status: "pending" },
    { key: "seed_operating_profile", label: "Seed operating profile", required: true, status: "pending" },
    { key: "seed_modules", label: "Seed operating modules", required: true, status: "pending" },
    { key: "seed_agents", label: "Seed agent assignments", required: true, status: "pending" },
    { key: "founder_brief_review", label: "Founder review of brief & approvals", required: true, status: "pending" },
    { key: "compliance_setup", label: "Compliance & unsubscribe setup", required: true, status: "pending" },
    { key: "crm_setup", label: "CRM model & stages", required: true, status: "pending" },
  ];
  if (modules.includes("apollo_sourcing")) steps.push({ key: "apollo_credentials", label: "Apollo credentials (manual)", required: false, status: "pending", external: true });
  if (lanes?.smartlead) steps.push({ key: "smartlead_setup", label: "Smartlead workspace + sender setup (manual)", required: false, status: "pending", external: true });
  if (lanes?.native_email) steps.push({ key: "native_email_setup", label: "Native email sender + DNS (manual)", required: false, status: "pending", external: true });
  if (modules.includes("proposals")) steps.push({ key: "proposal_template", label: "Proposal template draft", required: true, status: "pending" });
  if (modules.includes("finance")) steps.push({ key: "finance_setup", label: "Finance / invoice model", required: true, status: "pending" });
  if (modules.includes("suppliers")) steps.push({ key: "supplier_setup", label: "Supplier directory", required: false, status: "pending" });
  steps.push({ key: "first_campaign_draft", label: "First internal campaign draft", required: true, status: "pending" });
  steps.push({ key: "dry_run_validation", label: "Dry-run end-to-end validation", required: true, status: "pending" });
  return steps;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const url = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (claimsErr || !claimsData?.claims) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const userId = claimsData.claims.sub as string;
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", userId);
    if (!(roles ?? []).some((r: any) => r.role === "admin" || r.role === "founder")) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json().catch(() => ({} as any));
    const businessName: string = String(body?.business_name ?? "").trim();
    const templateKey: string = String(body?.template_key ?? "").trim();
    const founderBrief: string = String(body?.founder_brief ?? "");
    const dryRun: boolean = body?.dry_run !== false;
    const phrase: string = String(body?.confirmation_phrase ?? "");

    if (!businessName || !templateKey) {
      return new Response(JSON.stringify({ error: "business_name and template_key required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: tpl } = await admin.from("business_launch_templates").select("*").eq("template_key", templateKey).maybeSingle();
    if (!tpl) return new Response(JSON.stringify({ error: `Unknown template_key: ${templateKey}` }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const modules: string[] = Array.isArray(tpl.default_modules) ? tpl.default_modules : [];
    const agents: string[] = Array.isArray(tpl.default_agents) ? tpl.default_agents : [];
    const lanes: any = tpl.default_provider_lanes ?? {};
    const integrations: string[] = [];
    if (lanes.smartlead) integrations.push("smartlead");
    if (lanes.apollo) integrations.push("apollo");
    if (lanes.native_email) integrations.push("native_email");
    const setupSteps = buildSetupSteps(modules, lanes);
    const blockers: string[] = [];
    if (!founderBrief.trim()) blockers.push("Founder brief is empty");
    if (modules.length === 0) blockers.push("Template has no modules");
    const readiness = Math.max(0, Math.min(100, 100 - blockers.length * 25));

    const plan: any = {
      template_id: tpl.id, template_key: tpl.template_key, template_name: tpl.template_name,
      launch_name: businessName, launch_status: "draft",
      founder_brief: founderBrief, selected_modules: modules, selected_agents: agents,
      required_integrations: integrations, setup_steps: setupSteps, blockers,
      readiness_score: readiness, founder_approval_required: true,
      provider_lanes: lanes, compliance_profile: tpl.default_compliance_profile,
      crm_profile: tpl.default_crm_profile, campaign_structure: tpl.default_campaign_structure,
      proposal_structure: tpl.default_proposal_structure, finance_structure: tpl.default_finance_structure,
    };

    if (dryRun || phrase !== CONFIRMATION_PHRASE) {
      return new Response(JSON.stringify({
        ok: true, dry_run: true, blocked: !dryRun,
        reason: !dryRun ? "missing_confirmation_phrase" : null,
        required_phrase: CONFIRMATION_PHRASE,
        plan, plan_id: null,
        emails_sent: 0, apollo_called: false, smartlead_post_called: false,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: inserted, error: insErr } = await admin.from("business_launch_plans").insert({
      template_id: tpl.id, launch_name: businessName, launch_status: "generated",
      founder_brief: founderBrief, selected_modules: modules, selected_agents: agents,
      required_integrations: integrations, setup_steps: setupSteps, blockers,
      readiness_score: readiness, founder_approval_required: true,
      metadata: { template_key: tpl.template_key, provider_lanes: lanes, source_function: SOURCE_FUNCTION },
    }).select("id").maybeSingle();
    if (insErr) return new Response(JSON.stringify({ error: insErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    await admin.from("agent_action_audit_log").insert({
      agent_key: "business_launch_factory", action_type: "plan_generated",
      source_function: SOURCE_FUNCTION, target_table: "business_launch_plans", target_id: inserted?.id ?? null,
      founder_user_id: userId, confirmation_phrase: phrase,
      dry_run: false, action_status: "applied", blocked_reason: null,
      metadata: { template_key: tpl.template_key, business_name: businessName, readiness },
    }).then(() => null);

    return new Response(JSON.stringify({
      ok: true, dry_run: false, blocked: false, plan_id: inserted?.id, plan,
      emails_sent: 0, apollo_called: false, smartlead_post_called: false,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});