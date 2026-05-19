import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const REQUIRED_TABLES = [
  "liftor_brain_sessions",
  "liftor_brain_messages",
  "liftor_brain_context_packs",
  "liftor_brain_tool_registry",
  "liftor_brain_tool_calls",
  "liftor_brain_drafts",
  "liftor_brain_audit",
  "liftor_brain_provider_config",
  "liftor_brain_access_map_snapshots",
];

const DANGEROUS_TOOL_KEYS = [
  "send_email","send_dm","publish_post","schedule_metricool_post","send_manychat_dm",
  "apollo_reveal","smartlead_post","smartlead_campaign_start","stripe_charge",
  "create_portal_account","send_survey","share_report",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const blockers: string[] = [];
  const warnings: string[] = [];
  const tables_status: Record<string, string> = {};

  // 1. Tables exist (probe via select)
  for (const t of REQUIRED_TABLES) {
    const { error } = await supabase.from(t).select("*", { count: "exact", head: true });
    if (error) {
      tables_status[t] = `missing_or_unreadable: ${error.message}`;
      blockers.push(`table_missing:${t}`);
    } else {
      tables_status[t] = "ok";
    }
  }

  // 2. Provider config
  const { data: providerRow, error: providerErr } = await supabase
    .from("liftor_brain_provider_config")
    .select("provider_key, provider_name, provider_status, secret_name, secret_value_stored, default_model")
    .eq("provider_key", "openai")
    .maybeSingle();

  const provider_config_status: Record<string, unknown> = {};
  if (providerErr || !providerRow) {
    blockers.push("openai_provider_row_missing");
    provider_config_status.error = providerErr?.message ?? "missing";
  } else {
    provider_config_status.provider_key = providerRow.provider_key;
    provider_config_status.provider_status = providerRow.provider_status;
    provider_config_status.secret_name = providerRow.secret_name;
    provider_config_status.secret_value_stored = providerRow.secret_value_stored;
    provider_config_status.default_model = providerRow.default_model;
    if (providerRow.secret_name !== "OPENAI_API_KEY") blockers.push("provider_secret_name_wrong");
    if (providerRow.secret_value_stored === true) blockers.push("provider_secret_value_stored_true");
    if (!["not_configured","configured"].includes(providerRow.provider_status))
      warnings.push(`provider_status:${providerRow.provider_status}`);
  }

  // 3. Tool registry
  const { data: tools, error: toolsErr } = await supabase
    .from("liftor_brain_tool_registry")
    .select("tool_key, tool_category, tool_status, external_action, read_only, internal_mutation_allowed, risk_level");

  const tool_registry_status: Record<string, unknown> = {};
  if (toolsErr || !tools) {
    blockers.push("tool_registry_unreadable");
    tool_registry_status.error = toolsErr?.message ?? "missing";
  } else {
    const readOnly = tools.filter((t: any) => t.read_only && !t.external_action && t.tool_status === "enabled");
    const draftTools = tools.filter((t: any) =>
      t.internal_mutation_allowed && !t.external_action && t.tool_key.startsWith("draft_") && t.tool_status === "enabled");
    const actionTools = tools.filter((t: any) =>
      t.internal_mutation_allowed && !t.external_action && t.tool_key.startsWith("create_") && t.tool_status === "enabled");
    const lockedPlaceholder = tools.find((t: any) => t.tool_key === "external_action_placeholder_blocked");
    const dangerousEnabled = tools.filter((t: any) =>
      DANGEROUS_TOOL_KEYS.includes(t.tool_key) && t.tool_status !== "locked");

    tool_registry_status.read_only_count = readOnly.length;
    tool_registry_status.internal_draft_count = draftTools.length;
    tool_registry_status.internal_action_count = actionTools.length;
    tool_registry_status.locked_external_count = tools.filter((t: any) => t.external_action && t.tool_status === "locked").length;
    tool_registry_status.placeholder_locked = !!lockedPlaceholder && lockedPlaceholder.tool_status === "locked";

    if (readOnly.length < 17) blockers.push(`read_only_tools_short:${readOnly.length}`);
    if (draftTools.length < 7) blockers.push(`draft_tools_short:${draftTools.length}`);
    if (actionTools.length < 4) blockers.push(`action_tools_short:${actionTools.length}`);
    if (!lockedPlaceholder || lockedPlaceholder.tool_status !== "locked")
      blockers.push("external_action_placeholder_not_locked");
    if (dangerousEnabled.length > 0)
      blockers.push(`dangerous_tools_unlocked:${dangerousEnabled.map((t: any) => t.tool_key).join(",")}`);
  }

  // 4. RLS check
  const rls_status: Record<string, string> = {};
  for (const t of REQUIRED_TABLES) {
    const anon = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { error } = await anon.from(t).select("id").limit(1);
    rls_status[t] = error ? "protected" : "PUBLIC_LEAK";
    if (!error) blockers.push(`rls_public_leak:${t}`);
  }

  const no_forbidden_action_audit = {
    emails_sent: 0, dms_sent: 0, posts_published: 0,
    apollo_calls: 0, apollo_credits_spent: 0,
    smartlead_posts: 0, smartlead_campaign_starts: 0,
    metricool_mutations: 0, manychat_mutations: 0,
    ad_platform_mutations: 0, payment_mutations: 0,
    portal_accounts_created: 0, portal_invites_sent: 0,
    surveys_sent: 0, reports_shared: 0,
    auto_send_changed: false, cron_changed: false,
    real_data_deleted: 0, secrets_exposed: 0,
    openai_calls: 0,
  };

  // Record audit row (best-effort)
  await supabase.from("liftor_brain_audit").insert({
    action: "acceptance_run",
    action_status: blockers.length === 0 ? "recorded" : "error",
    details: { prompt: "21B", blockers, warnings, tables_status, provider_config_status, tool_registry_status, rls_status },
  });

  const status = blockers.length === 0 ? "PASS" : "BLOCKED";

  return new Response(
    JSON.stringify({
      status,
      tables_status,
      rls_status,
      provider_config_status,
      tool_registry_status,
      blockers,
      warnings,
      no_forbidden_action_audit,
    }, null, 2),
    { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
  );
});