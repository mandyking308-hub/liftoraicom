import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";
import { pickAllowedRecord } from "../_shared/writeFieldAllowlist.ts";
const MAP_FIELDS = ['content_pack_id','content_item_id','content_variant_id','asset_id','map_role','funnel_stage','customer_journey_stage','platform','priority_score','notes','metadata'] as const;

const CONFIRM = "CREATE SOCIAL CAMPAIGN CONTENT MAP";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const g = await requireFounder(req); if ("error" in g) return g.error;
  const { admin } = g;
  const body = await req.json().catch(() => ({}));
  const { business_id, campaign_plan_id, mappings } = body;
  const dry_run = body.dry_run !== false;
  if (!business_id || !campaign_plan_id || !mappings?.length)
    return json({ ok: false, error: "business_id_campaign_plan_id_mappings_required" }, 400);
  if (!dry_run && body.confirmation_phrase !== CONFIRM)
    return json({ ok: false, error: `confirmation_phrase_required:${CONFIRM}` }, 400);

  if (!Array.isArray(mappings) || mappings.length > 500) return json({ ok: false, error: "mappings_must_be_array_max_500" }, 400);
  const rows: Record<string, any>[] = [];
  for (const m of mappings) {
    const picked = pickAllowedRecord(m, MAP_FIELDS);
    if (!picked.ok) return json({ ok: false, error: picked.error, rejected_fields: picked.rejected_fields }, 400);
    rows.push({ ...picked.record, business_id, campaign_plan_id, status: "planned", is_test_data: !!body.is_test_data });
  }
  if (dry_run) return json({ ok: true, dry_run: true, would_insert: rows.length, sample: rows.slice(0, 3) });

  const { data, error } = await admin.from("social_campaign_content_map").insert(rows).select("id");
  if (error) return json({ ok: false, error: error.message }, 500);
  return json({ ok: true, inserted: data?.length ?? 0 });
});