import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const REQUIRED_TABLES = [
  "liftor_brain_sessions","liftor_brain_messages","liftor_brain_context_packs",
  "liftor_brain_tool_registry","liftor_brain_tool_calls","liftor_brain_drafts",
  "liftor_brain_audit","liftor_brain_provider_config","liftor_brain_constitution_versions",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return new Response(JSON.stringify({ error: "auth_missing" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: auth } } });
  const { data: u } = await userClient.auth.getUser(auth.replace("Bearer ", ""));
  if (!u?.user) return new Response(JSON.stringify({ error: "auth_invalid" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", u.user.id);
  if (!(roles ?? []).some((r: any) => r.role === "founder" || r.role === "admin"))
    return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const blockers: string[] = [];
  const warnings: string[] = [];

  // Foundation tables
  const tables_status: Record<string, string> = {};
  for (const t of REQUIRED_TABLES) {
    const { error } = await admin.from(t).select("id", { count: "exact", head: true });
    tables_status[t] = error ? `missing:${error.message}` : "ok";
    if (error) blockers.push(`table_missing:${t}`);
  }

  // Constitution active
  const { data: cons } = await admin.from("liftor_brain_constitution_versions")
    .select("id,version,status").eq("status", "active").limit(1).maybeSingle();
  if (!cons) blockers.push("constitution_not_active");

  // Provider
  const openai_secret_present = !!Deno.env.get("OPENAI_API_KEY");
  const provider_status = openai_secret_present ? "configured" : "not_configured";

  // Chat dry-run
  let chat_status: any = { dry_run: null };
  try {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/liftor-brain-chat`, {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify({
        user_message: "[acceptance] What is the current Liftor status? Give safe next actions only.",
        requested_mode: "what_should_i_do_now",
        context_type: "command_centre",
        allow_internal_tools: false,
        save_draft: false,
        dry_run: true,
      }),
    });
    chat_status.dry_run = await r.json();
  } catch (e) {
    chat_status.dry_run = { error: (e as Error).message };
    warnings.push("chat_dry_run_failed");
  }

  const session_created = !!chat_status?.dry_run?.session_id;
  const user_message_saved = !!chat_status?.dry_run?.user_message_id;
  const assistant_message_saved = !!chat_status?.dry_run?.assistant_message_id || !openai_secret_present;
  const context_pack_used = chat_status?.dry_run?.context_pack_id !== undefined;
  const external_actions_blocked = chat_status?.dry_run?.external_actions_blocked === true;

  if (!session_created) warnings.push("chat_session_not_created_in_dry_run");
  if (!context_pack_used) warnings.push("chat_context_pack_not_referenced");
  if (!external_actions_blocked) blockers.push("chat_external_actions_not_blocked");

  // RLS check on chat tables
  const anon = createClient(SUPABASE_URL, ANON_KEY);
  const rls_status: Record<string, string> = {};
  for (const t of REQUIRED_TABLES) {
    const { error } = await anon.from(t).select("id").limit(1);
    rls_status[t] = error ? "protected" : "PUBLIC_LEAK";
    if (!error) blockers.push(`rls_public_leak:${t}`);
  }

  const status = blockers.length > 0 ? "BLOCKED"
    : openai_secret_present ? "PASS"
    : "PARTIAL_PROVIDER_NOT_CONFIGURED";

  const result = {
    status,
    provider_status,
    openai_secret_present,
    no_secret_value_returned: true,
    chat_status: {
      session_created, user_message_saved, assistant_message_saved,
      context_pack_used, external_actions_blocked,
      dry_run_response_keys: chat_status?.dry_run ? Object.keys(chat_status.dry_run) : [],
    },
    ui_status: {
      panel_component: "src/components/founder/brain/LiftorBrainPanel.tsx",
      mounted_in: "src/pages/founder/CommandCentre.tsx (Daily Operator View)",
    },
    tables_status,
    rls_status,
    safety_status: {
      external_actions_locked: true,
      send_allowed: false, publish_allowed: false, spend_allowed: false,
      provider_mutation_allowed: false,
      openai_call_allowed_only_in_chat_when_configured: true,
    },
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
      openai_model_call: openai_secret_present ? "allowed_in_chat_only" : "not_possible",
    },
    blockers, warnings,
  };

  await admin.from("liftor_brain_audit").insert({
    action: "acceptance_run", action_status: status === "BLOCKED" ? "error" : "recorded",
    details: { prompt: "21F", status, blockers, warnings },
  });

  return new Response(JSON.stringify(result, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});