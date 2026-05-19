import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";

const CONFIRM = "PURGE SOCIAL CONTENT TEST DATA";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const g = await requireFounder(req); if ("error" in g) return g.error;
  const { admin } = g;
  const body = await req.json().catch(() => ({}));
  const { business_id } = body;
  if (!business_id) return json({ ok: false, error: "business_id_required" }, 400);
  const dry_run = body.dry_run !== false;
  if (!dry_run && body.confirmation_phrase !== CONFIRM)
    return json({ ok: false, error: `confirmation_phrase_required:${CONFIRM}` }, 400);

  const tables = [
    "social_content_quality_reviews",
    "social_content_variants",
    "social_content_pack_items",
    "social_content_generation_runs",
    "social_content_packs",
  ];

  if (dry_run) {
    const counts: Record<string, number> = {};
    for (const t of tables) {
      const { count } = await admin.from(t).select("id", { count: "exact", head: true })
        .eq("business_id", business_id).eq("is_test_data", true);
      counts[t] = count ?? 0;
    }
    return json({ ok: true, dry_run: true, would_delete: counts });
  }

  const deleted: Record<string, number> = {};
  for (const t of tables) {
    const { count } = await admin.from(t).delete({ count: "exact" })
      .eq("business_id", business_id).eq("is_test_data", true);
    deleted[t] = count ?? 0;
  }
  const { count: itemCount } = await admin.from("social_content_items").delete({ count: "exact" })
    .eq("business_id", business_id).eq("is_test_data", true);
  deleted["social_content_items"] = itemCount ?? 0;

  return json({ ok: true, deleted, real_data_preserved: true });
});