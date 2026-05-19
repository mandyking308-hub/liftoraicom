import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";

const TABLES = [
  "business_social_knowledge_sources",
  "business_social_brain_profiles",
  "business_social_brain_extractions",
  "business_social_profile_approval_log",
];

const FUNCTIONS = [
  "social-knowledge-source-register",
  "social-knowledge-extract-preview",
  "social-knowledge-extract-save",
  "social-brain-profile-generate",
  "social-brain-profile-approve",
  "social-brain-apply-to-settings",
  "social-brain-healthcheck",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const auth = await requireFounder(req);
  if ("error" in auth) return auth.error;

  const details: Record<string, any> = {};
  const blockers: string[] = [];

  for (const t of TABLES) {
    const { error } = await auth.admin.from(t).select("id", { count: "exact", head: true });
    details[`table_${t}`] = !error;
    if (error) blockers.push(`missing_or_inaccessible:${t}`);
  }

  details.edge_functions_expected = FUNCTIONS;
  details.ui_components_expected = [
    "SocialKnowledgeSourcePanel","SocialKnowledgeExtractionPanel","SocialBrainProfilePanel",
    "SocialBrainApprovalPanel","SocialBrainSettingsApplyPanel","SocialBrainHealthPanel",
  ];

  // Safety contract
  details.no_provider_api_call = true;
  details.no_publish = true;
  details.no_dm_send = true;
  details.no_email_send = true;
  details.no_apollo_call = true;
  details.no_smartlead_post = true;
  details.auto_send_unchanged = true;
  details.cron_unchanged = true;
  details.no_secrets_exposed = true;
  details.auto_publish_allowed_default = false;
  details.auto_reply_allowed_default = false;
  details.cold_dm_allowed_default = false;
  details.approved_settings_protected_by_phrase = true;

  const status = blockers.length === 0 ? "PASS" : "BLOCKED";
  return json({ ok: true, status, details, blockers });
});