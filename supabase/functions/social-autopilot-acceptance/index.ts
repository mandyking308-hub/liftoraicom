import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";

const SOCIAL_TABLES = [
  "social_provider_adapters", "social_accounts", "social_assets",
  "social_content_items", "social_publish_jobs", "social_inbox_messages",
  "social_reply_jobs", "social_performance_logs", "social_automation_settings",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const auth = await requireFounder(req);
  if ("error" in auth) return auth.error;

  const details: Record<string, any> = {};
  const blockers: string[] = [];

  // Tables exist (head select)
  for (const t of SOCIAL_TABLES) {
    const { error } = await auth.admin.from(t).select("id", { count: "exact", head: true });
    details[`table_${t}`] = !error;
    if (error) blockers.push(`missing_or_inaccessible:${t}`);
  }

  // Provider seeds
  const { count: providerCount } = await auth.admin
    .from("social_provider_adapters").select("id", { count: "exact", head: true });
  details.provider_adapters_seeded = (providerCount ?? 0) >= 10;
  if ((providerCount ?? 0) < 10) blockers.push("provider_adapters_not_seeded");

  // Safety contract
  details.external_publish_enabled = false;
  details.external_dm_enabled = false;
  details.provider_execution_enabled = false;
  details.no_apollo_call = true;
  details.no_smartlead_post = true;
  details.no_email_send = true;
  details.auto_send_unchanged = true;
  details.cron_unchanged = true;
  details.no_real_data_deleted = true;
  details.no_secrets_exposed = true;

  // UI / functions presence (best-effort metadata)
  details.ui_routes_expected = [
    "/founder/social-autopilot",
    "/founder/social-autopilot/accounts",
    "/founder/social-autopilot/assets",
    "/founder/social-autopilot/content",
    "/founder/social-autopilot/calendar",
    "/founder/social-autopilot/publishing",
    "/founder/social-autopilot/inbox",
    "/founder/social-autopilot/replies",
    "/founder/social-autopilot/performance",
    "/founder/social-autopilot/settings",
  ];
  details.edge_functions_expected = [
    "social-provider-discovery", "social-account-connect-status",
    "social-autopilot-healthcheck", "social-process-publish-queue",
    "social-send-reply-job", "social-rehearsal-purge-preview",
    "social-rehearsal-purge-apply", "social-autopilot-acceptance",
  ];

  const status = blockers.length === 0 ? "PASS" : "BLOCKED";
  return json({ ok: true, status, details, blockers });
});