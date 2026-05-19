import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const g = await requireFounder(req);
  if ("error" in g) return g.error;
  const { admin } = g;

  const b = await req.json().catch(() => ({}));
  if (!b.business_id || !b.collection_name || !b.collection_type)
    return json({ ok: false, error: "business_id, collection_name, collection_type required" }, 400);
  const dry_run = b.dry_run !== false;

  if (dry_run) return json({
    ok: true, dry_run: true, no_records_mutated: true,
    would_create: { collection_name: b.collection_name, collection_type: b.collection_type, items: (b.asset_ids ?? []).length },
  });
  if (b.confirmation_phrase !== "CREATE SOCIAL ASSET COLLECTION")
    return json({ ok: false, reason: "confirmation_phrase_required", expected: "CREATE SOCIAL ASSET COLLECTION" }, 400);

  const { data: c, error } = await admin.from("social_asset_collections").insert({
    business_id: b.business_id,
    collection_name: b.collection_name,
    collection_type: b.collection_type,
    description: b.description ?? null,
    platform: b.platform ?? null,
    campaign_id: b.campaign_id ?? null,
    is_test_data: !!b.is_test_data,
  }).select("id").maybeSingle();
  if (error) return json({ ok: false, error: error.message }, 500);

  const ids: string[] = b.asset_ids ?? [];
  let inserted = 0;
  if (c && ids.length) {
    const rows = ids.map((aid, i) => ({ business_id: b.business_id, collection_id: c.id, asset_id: aid, sort_order: i }));
    const { data: ins } = await admin.from("social_asset_collection_items").insert(rows).select("id");
    inserted = ins?.length ?? 0;
  }
  return json({ ok: true, collection_id: c?.id, items_inserted: inserted });
});
