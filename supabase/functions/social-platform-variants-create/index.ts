import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";
import { pickAllowedRecord } from "../_shared/writeFieldAllowlist.ts";
const VARIANT_FIELDS = ['content_item_id','pack_id','platform','variant_type','title','hook','caption','script','carousel_outline','hashtags','cta','link_url','asset_id','risk_flags','missing_requirements','metadata'] as const;

const CONFIRM = "CREATE SOCIAL PLATFORM VARIANTS";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const g = await requireFounder(req); if ("error" in g) return g.error;
  const { admin } = g;
  const body = await req.json().catch(() => ({}));
  const { business_id, content_item_id, pack_id, variants } = body;
  const dry_run = body.dry_run !== false;
  if (!business_id || !variants?.length) return json({ ok: false, error: "business_id_and_variants_required" }, 400);
  if (!dry_run && body.confirmation_phrase !== CONFIRM)
    return json({ ok: false, error: `confirmation_phrase_required:${CONFIRM}` }, 400);

  if (!Array.isArray(variants) || variants.length > 200) return json({ ok: false, error: "variants_must_be_array_max_200" }, 400);
  const rows: Record<string, any>[] = [];
  for (const v of variants) {
    const picked = pickAllowedRecord(v, VARIANT_FIELDS);
    if (!picked.ok) return json({ ok: false, error: picked.error, rejected_fields: picked.rejected_fields }, 400);
    rows.push({
      ...picked.record, business_id,
      content_item_id: picked.record.content_item_id || content_item_id,
      pack_id: picked.record.pack_id || pack_id,
      approval_status: "draft",
      is_test_data: !!body.is_test_data,
    });
  }
  if (dry_run) return json({ ok: true, dry_run: true, would_insert: rows.length, sample: rows.slice(0, 3) });

  const { data, error } = await admin.from("social_content_variants").insert(rows).select("*");
  if (error) return json({ ok: false, error: error.message }, 500);
  return json({ ok: true, inserted: data?.length ?? 0, rows: data });
});