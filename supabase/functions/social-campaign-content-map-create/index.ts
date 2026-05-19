import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";

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

  const rows = mappings.map((m: any) => ({
    ...m, business_id, campaign_plan_id, is_test_data: !!body.is_test_data,
  }));
  if (dry_run) return json({ ok: true, dry_run: true, would_insert: rows.length, sample: rows.slice(0, 3) });

  const { data, error } = await admin.from("social_campaign_content_map").insert(rows).select("id");
  if (error) return json({ ok: false, error: error.message }, 500);
  return json({ ok: true, inserted: data?.length ?? 0 });
});