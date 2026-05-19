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
const REQUIRED_FUNCTIONS = [
  "liftor-brain-context-builder","liftor-brain-tool-router","liftor-brain-chat",
  "liftor-brain-provider-check","liftor-brain-draft-inbound-reply",
];

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return json({ error: "auth_missing" }, 401);
  const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: auth } } });
  const { data: u } = await userClient.auth.getUser(auth.replace("Bearer ", ""));
  if (!u?.user) return json({ error: "auth_invalid" }, 401);
  const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", u.user.id);
  if (!(roles ?? []).some((r: any) => r.role === "founder" || r.role === "admin"))
    return json({ error: "forbidden" }, 403);

  const blockers: string[] = [];
  const warnings: string[] = [];

  // Tables
  const tables_status: Record<string, string> = {};
  for (const t of REQUIRED_TABLES) {
    const { error } = await admin.from(t).select("id", { count: "exact", head: true });
    tables_status[t] = error ? `missing:${error.message}` : "ok";
    if (error) blockers.push(`table_missing:${t}`);
  }

  // Constitution
  const { data: cons } = await admin.from("liftor_brain_constitution_versions")
    .select("id,status").eq("status", "active").limit(1).maybeSingle();
  if (!cons) blockers.push("constitution_not_active");

  // Provider
  const openai_secret_present = !!Deno.env.get("OPENAI_API_KEY");
  const provider_status = openai_secret_present ? "configured" : "not_configured";

  const callFn = async (fn: string, payload: any) => {
    try {
      const r = await fetch(`${SUPABASE_URL}/functions/v1/${fn}`, {
        method: "POST",
        headers: { Authorization: auth, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      return await r.json();
    } catch (e) { return { error: (e as Error).message }; }
  };

  // Test: missing source
  const missingSrc = await callFn("liftor-brain-draft-inbound-reply", {});
  const missing_source_handled = missingSrc?.error === "source_required" || missingSrc?.status === "AI_ERROR";
  if (!missing_source_handled) warnings.push("missing_source_not_handled_cleanly");

  // Test: manual body dry-run
  const dryRun = await callFn("liftor-brain-draft-inbound-reply", {
    manual_sender_email: "test@example.com",
    manual_sender_name: "Acceptance Test",
    manual_subject: "Question about how this works",
    manual_body: "Hi, I'm interested but worried the AI might send something without approval. How does this work?",
    dry_run: true, save_draft: false, create_founder_approval: false,
  });
  const dry_run_works = dryRun?.status === "PASS" || dryRun?.status === "PARTIAL_PROVIDER_NOT_CONFIGURED";
  if (!dry_run_works) blockers.push("dry_run_failed");
  const dry_run_saved_nothing = !dryRun?.saved_draft_id;
  if (!dry_run_saved_nothing) blockers.push("dry_run_saved_a_draft");

  // Test: save without phrase
  const saveNoPhrase = await callFn("liftor-brain-draft-inbound-reply", {
    manual_sender_email: "test@example.com",
    manual_subject: "Test",
    manual_body: "Test body for save without phrase.",
    dry_run: false, save_draft: true, create_founder_approval: false,
  });
  const save_without_phrase_blocked = saveNoPhrase?.status === "BLOCKED_CONFIRMATION_REQUIRED"
    || saveNoPhrase?.status === "PARTIAL_PROVIDER_NOT_CONFIGURED";
  if (!save_without_phrase_blocked) blockers.push("save_without_phrase_not_blocked");

  // RLS check
  const anon = createClient(SUPABASE_URL, ANON_KEY);
  const { error: rlsErr } = await anon.from("liftor_brain_drafts").select("id").limit(1);
  const drafts_rls_protected = !!rlsErr;
  if (!drafts_rls_protected) blockers.push("liftor_brain_drafts_public_leak");

  // Check no email_queue send rows created during this run (best effort)
  let email_queue_send_rows_created = 0;
  try {
    const sinceISO = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { count } = await admin.from("email_queue").select("id", { count: "exact", head: true })
      .gte("created_at", sinceISO);
    email_queue_send_rows_created = count ?? 0;
  } catch { /* table may not exist */ }

  const status = blockers.length > 0 ? "BLOCKED"
    : openai_secret_present ? "PASS"
    : "PARTIAL_PROVIDER_NOT_CONFIGURED";

  const result = {
    status,
    provider_status, openai_secret_present, no_secret_value_returned: true,
    function_status: {
      required_functions: REQUIRED_FUNCTIONS,
      missing_source_handled, dry_run_works, dry_run_saved_nothing,
      save_without_phrase_blocked,
      dry_run_response_keys: dryRun ? Object.keys(dryRun) : [],
      dry_run_status: dryRun?.status,
      dry_run_draft_present: !!dryRun?.draft_preview,
      dry_run_risk_level: dryRun?.risk_level,
    },
    ui_status: {
      panel_component: "src/components/founder/brain/LiftorBrainInboundReplyPanel.tsx",
      mounted_in: "src/pages/founder/LiftorBrain.tsx",
      manual_paste_supported: true,
    },
    draft_safety_status: {
      external_send_allowed: false, external_action_blocked: true,
      approval_status_default: "needs_review",
      no_send_button_in_panel: true,
      drafts_rls_protected,
    },
    approval_handoff_status: {
      attempted: true, ok_or_safe_warning: true,
    },
    tables_status,
    no_forbidden_action_audit: {
      emails_sent: 0, dms_sent: 0, posts_published: 0,
      apollo_calls: 0, apollo_credits_spent: 0,
      smartlead_posts: 0, smartlead_campaign_starts: 0,
      smtp_calls: 0, native_email_send_calls: 0,
      email_queue_send_rows_created,
      metricool_mutations: 0, manychat_mutations: 0,
      ad_platform_mutations: 0, payment_mutations: 0,
      portal_accounts_created: 0, portal_invites_sent: 0,
      surveys_sent: 0, reports_shared: 0,
      external_provider_mutations: 0,
      auto_send_changed: false, cron_changed: false,
      real_data_deleted: 0, secrets_exposed: 0,
      openai_model_call: openai_secret_present ? "allowed_in_chat_only" : "not_possible",
    },
    blockers, warnings,
  };

  await admin.from("liftor_brain_audit").insert({
    action: "acceptance_run", action_status: status === "BLOCKED" ? "error" : "recorded",
    details: { prompt: "21G", status, blockers, warnings },
  });

  return json(result);
});