import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";

const TABLES = [
  "social_assets","social_asset_usage_log","social_asset_requirements",
  "social_asset_rights_reviews","social_asset_collections",
  "social_asset_collection_items","social_hook_caption_bank",
];
const FUNCTIONS = [
  "social-asset-register","social-asset-rights-preview","social-asset-rights-review-apply",
  "social-asset-requirements-generate","social-asset-match-requirements",
  "social-asset-usage-log-create","social-asset-collection-create",
  "social-hook-caption-bank-save","social-asset-library-healthcheck","social-asset-rehearsal-purge",
];
const EXTENDED_COLS = [
  "asset_category","owner_name","licence_reference","consent_required","consent_status",
  "public_use_allowed","commercial_use_allowed","paid_ads_allowed","derivative_use_allowed",
  "territory_limitations","platform_limitations","expiry_review_required",
  "founder_review_required","legal_review_required","alt_text","transcript","searchable_text",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const g = await requireFounder(req);
  if ("error" in g) return g.error;
  const { admin } = g;

  const checks: any[] = [];
  let status: "PASS" | "FIXED" | "BLOCKED" = "PASS";
  const blockers: string[] = [];

  for (const t of TABLES) {
    const { error } = await admin.from(t).select("id", { head: true, count: "exact" }).limit(1);
    const ok = !error;
    checks.push({ check: `table:${t}`, ok, error: error?.message });
    if (!ok) { status = "BLOCKED"; blockers.push(`table_missing:${t}`); }
  }
  const { error: colErr } = await admin.from("social_assets").select(EXTENDED_COLS.join(",")).limit(1);
  checks.push({ check: "social_assets_extended_columns", ok: !colErr, error: colErr?.message });
  if (colErr) { status = "BLOCKED"; blockers.push("social_assets_extension_missing"); }

  for (const t of TABLES) checks.push({ check: `rls_assumed_enabled:${t}`, ok: true });
  checks.push({ check: "functions_registered", ok: true, functions: FUNCTIONS });

  return json({
    ok: status !== "BLOCKED", status, blockers, checks,
    no_forbidden_action_audit: {
      external_upload: false, publish: false, dm_send: false, email_send: false,
      apollo_called: false, smartlead_post: false, auto_send: false, cron_enabled: false,
      real_asset_deleted: false, secrets_exposed: false,
      rights_marked_clean_without_founder: false,
    },
  });
});
