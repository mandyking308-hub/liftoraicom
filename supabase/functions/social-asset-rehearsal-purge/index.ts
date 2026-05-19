import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const g = await requireFounder(req);
  if ("error" in g) return g.error;
  const { admin } = g;

  const b = await req.json().catch(() => ({}));
  if (!b.business_id) return json({ ok: false, error: "business_id required" }, 400);
  const dry_run = b.dry_run !== false;

  const tables = [
    "social_asset_usage_log","social_asset_collection_items","social_asset_requirements",
    "social_asset_rights_reviews","social_asset_collections","social_hook_caption_bank","social_assets",
  ];

  const counts: Record<string, number> = {};
  for (const t of tables) {
    const { count } = await admin.from(t).select("id", { count: "exact", head: true })
      .eq("business_id", b.business_id).eq("is_test_data", true);
    counts[t] = count ?? 0;
  }

  if (dry_run) return json({ ok: true, dry_run: true, no_records_mutated: true, would_delete: counts });
  if (b.confirmation_phrase !== "PURGE SOCIAL ASSET TEST DATA")
    return json({ ok: false, reason: "confirmation_phrase_required", expected: "PURGE SOCIAL ASSET TEST DATA" }, 400);

  const deleted: Record<string, number> = {};
  for (const t of tables) {
    const { count } = await admin.from(t).delete({ count: "exact" })
      .eq("business_id", b.business_id).eq("is_test_data", true);
    deleted[t] = count ?? 0;
  }
  return json({ ok: true, dry_run: false, deleted, safety: { real_assets_protected: true } });
});
