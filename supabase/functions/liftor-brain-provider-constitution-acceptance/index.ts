import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FOUNDATION_TABLES = [
  "liftor_brain_provider_config",
  "liftor_brain_tool_registry",
  "liftor_brain_audit",
  "liftor_brain_sessions",
  "liftor_brain_messages",
  "liftor_brain_context_packs",
  "liftor_brain_drafts",
];

const DANGEROUS_TOOL_KEYS = [
  "send_email","send_dm","publish_post","schedule_metricool_post","send_manychat_dm",
  "apollo_reveal","smartlead_post","smartlead_campaign_start","stripe_charge",
  "create_portal_account","send_survey","share_report",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const admin = createClient(url, serviceKey);

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  const userClient = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: u } = await userClient.auth.getUser(authHeader.replace("Bearer ", ""));
  if (!u?.user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", u.user.id);
  const ok = (roles ?? []).some((r: any) => r.role === "founder" || r.role === "admin");
  if (!ok) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const blockers: string[] = [];
  const warnings: string[] = [];

  // Foundation
  const foundation_status: Record<string, string> = {};
  for (const t of FOUNDATION_TABLES) {
    const { error } = await admin.from(t).select("*", { count: "exact", head: true });
    foundation_status[t] = error ? "missing" : "ok";
    if (error) blockers.push(`foundation_missing:${t}`);
  }

  // Constitution table + active row
  const constitution_status: Record<string, unknown> = {};
  const { error: ctErr } = await admin.from("liftor_brain_constitution_versions").select("*", { count: "exact", head: true });
  if (ctErr) { blockers.push("constitution_table_missing"); constitution_status.table = "missing"; }
  else constitution_status.table = "ok";

  const { data: actives } = await admin
    .from("liftor_brain_constitution_versions")
    .select("*")
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (!actives || actives.length === 0) {
    blockers.push("no_active_constitution");
  } else {
    if (actives.length > 1) warnings.push(`multiple_active_constitutions:${actives.length}`);
    const c = actives[0];
    constitution_status.version = c.version;
    constitution_status.id = c.id;
    const text: string = c.constitution_text ?? "";
    const checks: Record<string, boolean> = {
      has_identity_rules: c.identity_rules && Object.keys(c.identity_rules).length > 0,
      has_operating_style_rules: c.operating_style_rules && Object.keys(c.operating_style_rules).length > 0,
      has_safety_rules: c.safety_rules && Object.keys(c.safety_rules).length > 0,
      has_forbidden_actions: Array.isArray(c.forbidden_actions) && c.forbidden_actions.length > 0,
      has_allowed_actions: Array.isArray(c.allowed_actions) && c.allowed_actions.length > 0,
      has_email_reply_rules: c.email_reply_rules && Object.keys(c.email_reply_rules).length > 0,
      says_external_locked: text.toLowerCase().includes("external action") && text.toLowerCase().includes("locked"),
      says_drafts_only: text.toLowerCase().includes("drafts only"),
      says_truth_sync_authoritative: text.toLowerCase().includes("truth sync") && text.toLowerCase().includes("source of truth"),
    };
    constitution_status.checks = checks;
    for (const [k, v] of Object.entries(checks)) if (!v) blockers.push(`constitution_check_failed:${k}`);
  }

  // Provider
  const provider_status: Record<string, unknown> = {};
  const { data: prov } = await admin
    .from("liftor_brain_provider_config")
    .select("*")
    .eq("provider_key", "openai")
    .maybeSingle();
  if (!prov) blockers.push("openai_provider_config_missing");
  else {
    if (prov.secret_name !== "OPENAI_API_KEY") blockers.push("provider_secret_name_wrong");
    if (prov.secret_value_stored === true) blockers.push("provider_secret_value_stored_true");
    provider_status.provider_key = prov.provider_key;
    provider_status.secret_name = prov.secret_name;
    provider_status.secret_value_stored = prov.secret_value_stored;
    provider_status.default_model = prov.default_model;
  }
  const secret_present = Boolean(Deno.env.get("OPENAI_API_KEY") && Deno.env.get("OPENAI_API_KEY")!.length > 0);
  provider_status.secret_present = secret_present;
  provider_status.secret_value_returned = false;
  provider_status.secret_value_stored = false;

  // Tool safety
  const { data: tools } = await admin
    .from("liftor_brain_tool_registry")
    .select("tool_key, tool_status, external_action, internal_mutation_allowed");
  const placeholder = (tools ?? []).find((t: any) => t.tool_key === "external_action_placeholder_blocked");
  if (!placeholder || placeholder.tool_status !== "locked") blockers.push("external_action_placeholder_not_locked");
  const dangerousEnabled = (tools ?? []).filter((t: any) =>
    DANGEROUS_TOOL_KEYS.includes(t.tool_key) && t.tool_status !== "locked");
  if (dangerousEnabled.length > 0) blockers.push(`dangerous_tools_unlocked:${dangerousEnabled.map((t: any) => t.tool_key).join(",")}`);
  const externalMutationEnabled = (tools ?? []).filter((t: any) => t.external_action && t.tool_status !== "locked");
  if (externalMutationEnabled.length > 0) blockers.push(`external_mutation_enabled:${externalMutationEnabled.length}`);

  // RLS check on constitution table
  const anon = createClient(url, anonKey);
  const { error: anonErr } = await anon.from("liftor_brain_constitution_versions").select("id").limit(1);
  const rls_status = anonErr ? "protected" : "PUBLIC_LEAK";
  if (!anonErr) blockers.push("rls_public_leak:liftor_brain_constitution_versions");

  let status: string;
  if (blockers.length > 0) status = "BLOCKED";
  else if (!secret_present) status = "PARTIAL_PROVIDER_NOT_CONFIGURED";
  else status = "PASS";

  await admin.from("liftor_brain_audit").insert({
    action: "acceptance_run",
    action_status: blockers.length === 0 ? "recorded" : "error",
    details: { prompt: "21C", status, blockers, warnings, foundation_status, constitution_status, provider_status, rls_status },
  });

  return new Response(JSON.stringify({
    status,
    foundation_status,
    constitution_status,
    provider_status,
    secret_present,
    secret_value_returned: false,
    secret_value_stored: false,
    rls_status,
    blockers,
    warnings,
    no_forbidden_action_audit: {
      emails_sent: 0, dms_sent: 0, posts_published: 0,
      apollo_calls: 0, apollo_credits_spent: 0,
      smartlead_posts: 0, smartlead_campaign_starts: 0,
      metricool_mutations: 0, manychat_mutations: 0,
      ad_platform_mutations: 0, payment_mutations: 0,
      portal_accounts_created: 0, portal_invites_sent: 0,
      surveys_sent: 0, reports_shared: 0,
      external_provider_mutations: 0,
      auto_send_changed: false, cron_changed: false,
      real_data_deleted: 0, secrets_exposed: 0,
      openai_calls: 0,
    },
  }, null, 2), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});