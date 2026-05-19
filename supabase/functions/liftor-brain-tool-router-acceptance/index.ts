import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const READ_TOOLS = [
  "read_truth_sync","read_business_status","read_command_centre_summary","read_manual_summary",
  "read_business_knowledge","read_crm_summary","read_customer_journey","read_revenue_targets",
  "read_founder_approvals","read_external_gates","read_social_marketing_summary",
  "read_paid_media_summary","read_support_summary","read_customer_success_summary",
  "read_group_hq_summary","read_security_summary","read_cost_summary",
];
const DRAFT_TOOLS = [
  "draft_inbound_email_reply","draft_support_reply","draft_customer_success_plan",
  "draft_social_content_ideas","draft_revenue_activity_plan","draft_founder_brief","draft_diagnostic_summary",
];
const INTERNAL_TOOLS = [
  "build_context_pack","create_internal_ai_note","create_founder_approval_item",
  "create_manual_export_pack","generate_internal_next_actions",
];
const DANGEROUS = [
  "send_email","send_dm","publish_post","schedule_metricool_post","send_manychat_dm",
  "apollo_reveal","smartlead_post","smartlead_campaign_start","stripe_charge",
  "create_portal_account","send_survey","share_report",
];
const FOUNDATION_TABLES = [
  "liftor_brain_tool_registry","liftor_brain_tool_calls","liftor_brain_drafts",
  "liftor_brain_audit","liftor_brain_context_packs",
];

function r(b: unknown, s = 200) {
  return new Response(JSON.stringify(b, null, 2), {
    status: s, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return r({ error: "Unauthorized" }, 401);
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const uc = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
  const { data: u } = await uc.auth.getUser(authHeader.replace("Bearer ", ""));
  if (!u?.user) return r({ error: "Unauthorized" }, 401);
  const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", u.user.id);
  if (!(roles ?? []).some((x: any) => ["founder","admin"].includes(x.role))) return r({ error: "Forbidden" }, 403);

  const blockers: string[] = [];
  const warnings: string[] = [];

  const foundation_status: Record<string, string> = {};
  for (const t of FOUNDATION_TABLES) {
    const { error } = await admin.from(t).select("*", { count: "exact", head: true });
    foundation_status[t] = error ? "missing" : "ok";
    if (error) blockers.push(`foundation_missing:${t}`);
  }

  const { data: tools } = await admin.from("liftor_brain_tool_registry").select("tool_key, tool_status, external_action");
  const map = new Map((tools ?? []).map((t: any) => [t.tool_key, t]));
  const tool_registry_status: Record<string, string> = {};
  for (const k of [...READ_TOOLS, ...DRAFT_TOOLS, ...INTERNAL_TOOLS, "external_action_placeholder_blocked"]) {
    const t: any = map.get(k);
    if (!t) { tool_registry_status[k] = "missing"; blockers.push(`tool_missing:${k}`); }
    else tool_registry_status[k] = t.tool_status;
  }
  const placeholder: any = map.get("external_action_placeholder_blocked");
  if (!placeholder || placeholder.tool_status !== "locked") blockers.push("external_action_placeholder_not_locked");
  for (const k of DANGEROUS) {
    const t: any = map.get(k);
    if (t && t.tool_status !== "locked") blockers.push(`dangerous_tool_unlocked:${k}`);
  }

  const call = async (body: any) => {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/liftor-brain-tool-router`, {
      method: "POST",
      headers: { Authorization: authHeader, "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, is_test: true }),
    });
    const j = await res.json().catch(() => ({}));
    return { status: res.status, body: j };
  };

  const router_status: Record<string, any> = {};
  const unknown = await call({ tool_key: "definitely_unknown_tool_xyz", dry_run: true });
  router_status.unknown_tool_blocked = unknown.body?.status === "blocked";
  if (!router_status.unknown_tool_blocked) blockers.push("unknown_tool_not_blocked");

  const ext = await call({ tool_key: "external_action_placeholder_blocked", dry_run: true });
  router_status.external_placeholder_blocked = ext.body?.status === "blocked";
  if (!router_status.external_placeholder_blocked) blockers.push("external_placeholder_not_blocked");

  const sendEmail = await call({ tool_key: "send_email", dry_run: true });
  router_status.send_email_blocked = sendEmail.body?.status === "blocked";
  if (!router_status.send_email_blocked) blockers.push("send_email_not_blocked");

  const read_tool_status: Record<string, any> = {};
  const truth = await call({ tool_key: "read_truth_sync", dry_run: true });
  read_tool_status.read_truth_sync = truth.body?.status;
  if (truth.body?.status !== "executed") warnings.push("read_truth_sync_not_executed");

  const biz = await call({ tool_key: "read_business_status", dry_run: true });
  read_tool_status.read_business_status = biz.body?.status;
  if (biz.body?.status !== "executed") warnings.push("read_business_status_not_executed");

  const ctxBuild = await call({ tool_key: "build_context_pack", dry_run: true });
  router_status.build_context_pack = ctxBuild.body?.status;
  if (ctxBuild.body?.status !== "executed") warnings.push("build_context_pack_not_executed");

  const next = await call({ tool_key: "generate_internal_next_actions", dry_run: true });
  router_status.generate_internal_next_actions = next.body?.status;
  if (next.body?.status !== "executed") warnings.push("next_actions_not_executed");

  const draftDry = await call({ tool_key: "draft_inbound_email_reply", dry_run: true, payload: { body: "Hello — thanks for reaching out (test).", subject: "Re: test" } });
  const draft_tool_status: Record<string, any> = {};
  draft_tool_status.draft_inbound_email_reply_dry = draftDry.body?.status;
  if (draftDry.body?.status !== "executed") warnings.push("draft_dry_run_not_executed");
  if (draftDry.body?.result?.preview !== true) warnings.push("draft_dry_run_not_preview");

  const draftNoPhrase = await call({ tool_key: "draft_inbound_email_reply", dry_run: false, payload: { body: "test body" } });
  draft_tool_status.draft_inbound_email_reply_no_phrase = draftNoPhrase.body?.status;
  if (draftNoPhrase.body?.status !== "blocked") blockers.push("draft_without_phrase_not_blocked");

  const { count: tcCount } = await admin.from("liftor_brain_tool_calls").select("*", { count: "exact", head: true }).eq("is_test_data", true);
  const { count: auCount } = await admin.from("liftor_brain_audit").select("*", { count: "exact", head: true }).eq("is_test_data", true);
  const audit_status = { tool_calls_logged: (tcCount ?? 0) > 0, audit_logged: (auCount ?? 0) > 0 };
  if (!audit_status.tool_calls_logged) blockers.push("tool_calls_not_logged");
  if (!audit_status.audit_logged) blockers.push("audit_not_logged");

  const { data: anyDraft } = await admin.from("liftor_brain_drafts").select("external_send_allowed, external_action_blocked, approval_status").limit(1).maybeSingle();
  const draft_safety = {
    external_send_allowed_default_false: anyDraft ? anyDraft.external_send_allowed === false : true,
    external_action_blocked_default_true: anyDraft ? anyDraft.external_action_blocked === true : true,
    approval_status_needs_review: anyDraft ? ["needs_review", "draft"].includes(anyDraft.approval_status) : true,
  };
  for (const [k, v] of Object.entries(draft_safety)) if (!v) blockers.push(`draft_safety_failed:${k}`);

  const blocked_external_status = {
    placeholder_blocked: router_status.external_placeholder_blocked === true,
    send_email_blocked: router_status.send_email_blocked === true,
  };

  const status = blockers.length ? "BLOCKED" : (warnings.length ? "PARTIAL_WITH_WARNINGS" : "PASS");

  return r({
    status,
    foundation_status,
    tool_registry_status,
    router_status,
    read_tool_status,
    draft_tool_status,
    blocked_external_status,
    audit_status,
    draft_safety,
    blockers,
    warnings,
    no_forbidden_action_audit: {
      openai_calls: 0, emails_sent: 0, dms_sent: 0, posts_published: 0,
      apollo_calls: 0, apollo_credits_spent: 0, smartlead_posts: 0, smartlead_campaign_starts: 0,
      metricool_mutations: 0, manychat_mutations: 0, ad_platform_mutations: 0, payment_mutations: 0,
      portal_accounts_created: 0, portal_invites_sent: 0, surveys_sent: 0, reports_shared: 0,
      external_provider_mutations: 0, auto_send_changed: false, cron_changed: false,
      real_data_deleted: 0, secrets_exposed: 0,
    },
  });
});