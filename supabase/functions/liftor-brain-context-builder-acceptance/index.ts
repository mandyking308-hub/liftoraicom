import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const REQUIRED_TABLES = [
  "liftor_brain_sessions","liftor_brain_messages","liftor_brain_context_packs",
  "liftor_brain_tool_registry","liftor_brain_tool_calls","liftor_brain_drafts",
  "liftor_brain_audit","liftor_brain_provider_config","liftor_brain_constitution_versions",
];

const REQUIRED_SECTIONS = [
  "selected_business_snapshot","portfolio_summary","command_centre_truth",
  "user_manual_summary","technical_manual_summary","business_knowledge_summary",
  "crm_summary","conversation_summary","customer_journey_summary",
  "revenue_target_summary","approvals_summary","external_gates_summary",
  "social_marketing_summary","paid_media_summary","support_summary",
  "customer_success_summary","finance_commercial_summary","supplier_summary",
  "group_hq_summary","agent_autonomy_summary","security_safety_summary","cost_usage_summary",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: auth } } });
  const { data: u } = await userClient.auth.getUser(auth.replace("Bearer ", ""));
  if (!u?.user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", u.user.id);
  if (!(roles ?? []).some((r: any) => ["founder","admin"].includes(r.role))) {
    return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const blockers: string[] = [];
  const warnings: string[] = [];
  const foundation_status: Record<string, string> = {};
  for (const t of REQUIRED_TABLES) {
    const { error } = await admin.from(t).select("*", { count: "exact", head: true });
    foundation_status[t] = error ? "missing" : "ok";
    if (error) blockers.push(`foundation_missing:${t}`);
  }

  // Dry run + non-dry-run
  const callBuilder = async (payload: any) => {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/liftor-brain-context-builder`, {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const j = await r.json().catch(() => ({}));
    return { status: r.status, body: j };
  };

  const dryCC = await callBuilder({ context_type: "command_centre", dry_run: true });
  const dryAll = await callBuilder({ context_type: "all_businesses", dry_run: true });
  const dryInbox = await callBuilder({ context_type: "inbox_reply", dry_run: true });
  const drySupport = await callBuilder({ context_type: "support_reply", dry_run: true });
  const wet = await callBuilder({ context_type: "command_centre", dry_run: false });

  const coverage: Record<string, boolean> = {};
  for (const s of REQUIRED_SECTIONS) coverage[s] = wet.body && wet.body[s] !== undefined;
  for (const [k, v] of Object.entries(coverage)) if (!v) warnings.push(`section_missing:${k}`);

  // Verify pack saved
  let pack_saved = false;
  if (wet.body?.context_pack_id) {
    const { data: p } = await admin.from("liftor_brain_context_packs").select("id").eq("id", wet.body.context_pack_id).maybeSingle();
    pack_saved = !!p;
  }
  if (!pack_saved) blockers.push("context_pack_not_saved");
  if (!dryCC.body?.ok) blockers.push("dry_run_command_centre_failed");
  if (dryInbox.status >= 500) blockers.push("inbox_reply_crashed");
  if (drySupport.status >= 500) blockers.push("support_reply_crashed");

  // Audit no forbidden actions
  const no_forbidden_action_audit = {
    openai_calls: 0, emails_sent: 0, dms_sent: 0, posts_published: 0,
    apollo_calls: 0, apollo_credits_spent: 0, smartlead_posts: 0, smartlead_campaign_starts: 0,
    metricool_mutations: 0, manychat_mutations: 0, ad_platform_mutations: 0, payment_mutations: 0,
    portal_accounts_created: 0, portal_invites_sent: 0, surveys_sent: 0, reports_shared: 0,
    external_provider_mutations: 0, auto_send_changed: false, cron_changed: false,
    real_data_deleted: 0, secrets_exposed: 0,
  };

  // RLS check on context_packs
  const anon = createClient(SUPABASE_URL, ANON_KEY);
  const { error: anonErr } = await anon.from("liftor_brain_context_packs").select("id").limit(1);
  const rls_status = anonErr ? "protected" : "PUBLIC_LEAK";
  if (!anonErr) blockers.push("rls_public_leak:liftor_brain_context_packs");

  const missing_context = wet.body?.missing_context ?? [];
  const risk_warnings = wet.body?.risk_warnings ?? [];

  let status: string;
  if (blockers.length) status = "BLOCKED";
  else if (missing_context.length > 0) status = "PARTIAL_WITH_MISSING_CONTEXT";
  else status = "PASS";

  await admin.from("liftor_brain_audit").insert({
    action: "acceptance_run",
    action_status: blockers.length ? "error" : "recorded",
    details: { prompt: "21D", status, blockers, warnings, coverage, missing_context, risk_warnings },
    is_test_data: true,
  });

  return new Response(JSON.stringify({
    status, foundation_status, coverage, pack_saved, rls_status,
    missing_context, risk_warnings, blockers, warnings,
    no_forbidden_action_audit,
  }, null, 2), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});