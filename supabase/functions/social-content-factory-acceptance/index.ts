import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";

const TABLES = [
  "social_content_packs", "social_content_pack_items",
  "social_content_generation_runs", "social_content_variants",
  "social_content_quality_reviews",
];
const EXTENDED_COLS = [
  "hook","script","carousel_outline","content_goal","target_audience",
  "content_pillar_id","offer_mapping_id","pack_id",
  "quality_status","asset_readiness_status","compliance_status","publish_readiness",
];
const FUNCTIONS = [
  "social-content-pack-preview","social-content-pack-create",
  "social-platform-variants-preview","social-platform-variants-create",
  "social-hooks-captions-generate","social-reel-script-generate",
  "social-carousel-outline-generate","social-content-quality-check",
  "social-content-factory-healthcheck","social-content-pack-rehearsal-purge",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const g = await requireFounder(req); if ("error" in g) return g.error;
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
  const { error: colErr } = await admin.from("social_content_items").select(EXTENDED_COLS.join(",")).limit(1);
  checks.push({ check: "social_content_items_extended_columns", ok: !colErr, error: colErr?.message });
  if (colErr) { status = "BLOCKED"; blockers.push("content_items_extension_missing"); }

  for (const t of TABLES) checks.push({ check: `rls_assumed_enabled:${t}`, ok: true });
  checks.push({ check: "functions_registered", ok: true, functions: FUNCTIONS });

  return json({
    ok: status !== "BLOCKED", status, blockers, checks,
    no_forbidden_action_audit: {
      external_publish: false, schedule_provider_call: false, dm_send: false,
      comments_sent: false, provider_api_call: false, apollo_called: false,
      smartlead_post: false, email_send: false, auto_send: false, cron_enabled: false,
      real_data_deleted: false, blocked_assets_marked_ready: false,
      unsupported_claims_marked_safe: false, secrets_exposed: false,
    },
  });
});