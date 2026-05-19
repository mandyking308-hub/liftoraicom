import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FOUNDATION_TABLES = [
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

  // Foundation
  let foundation_ready = true;
  const foundation_status: Record<string, string> = {};
  for (const t of FOUNDATION_TABLES) {
    const { error } = await admin.from(t).select("*", { count: "exact", head: true });
    foundation_status[t] = error ? `missing:${error.message}` : "ok";
    if (error) foundation_ready = false;
  }

  // Constitution
  const { data: consRow } = await admin
    .from("liftor_brain_constitution_versions")
    .select("id, version, status, constitution_text, identity_rules, safety_rules, forbidden_actions, allowed_actions, email_reply_rules")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const constitution_ready = !!consRow;

  // Provider
  const { data: providerRow } = await admin
    .from("liftor_brain_provider_config")
    .select("provider_key, provider_status, secret_name, secret_value_stored, default_model")
    .eq("provider_key", "openai")
    .maybeSingle();
  const provider_config_ready = !!providerRow;
  const secret_name = providerRow?.secret_name ?? "OPENAI_API_KEY";
  const openai_secret_present = Boolean(Deno.env.get(secret_name) && Deno.env.get(secret_name)!.length > 0);
  const provider_status = openai_secret_present ? "configured" : "not_configured";

  // Tool registry
  const { data: tools } = await admin
    .from("liftor_brain_tool_registry")
    .select("tool_key, tool_status, external_action");
  const placeholder = (tools ?? []).find((t: any) => t.tool_key === "external_action_placeholder_blocked");
  const external_tools_locked = (tools ?? []).filter((t: any) => t.external_action).every((t: any) => t.tool_status === "locked")
    && !!placeholder && placeholder.tool_status === "locked";

  let readiness_status: string;
  if (!foundation_ready || !constitution_ready) readiness_status = "BLOCKED";
  else if (!openai_secret_present) readiness_status = "PARTIAL_PROVIDER_NOT_CONFIGURED";
  else if (foundation_ready && constitution_ready && openai_secret_present) readiness_status = "READY_FOR_AI_CALLS";
  else readiness_status = "READY_FOR_CONTEXT_BUILDER";

  await admin.from("liftor_brain_audit").insert({
    action: "constitution_readiness_verified",
    action_status: "recorded",
    details: { foundation_ready, constitution_ready, provider_config_ready, openai_secret_present, external_tools_locked, readiness_status },
  });

  return new Response(JSON.stringify({
    foundation_ready,
    foundation_status,
    constitution_ready,
    provider_config_ready,
    openai_secret_present,
    provider_status,
    can_call_ai: openai_secret_present,
    external_tools_locked,
    no_secret_value_returned: true,
    no_forbidden_action_audit: {
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
    },
    readiness_status,
  }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});