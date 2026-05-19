import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const g = await requireFounder(req);
  if ("error" in g) return g.error;
  const { admin } = g;

  const b = await req.json().catch(() => ({}));
  if (!b.business_id || !b.asset_id || !b.usage_context)
    return json({ ok: false, error: "business_id, asset_id, usage_context required" }, 400);
  const dry_run = b.dry_run !== false;

  const row = {
    business_id: b.business_id, asset_id: b.asset_id,
    content_item_id: b.content_item_id ?? null, publish_job_id: b.publish_job_id ?? null,
    usage_context: b.usage_context, platform: b.platform ?? null,
    campaign_id: b.campaign_id ?? null,
    usage_status: b.usage_status ?? "planned",
    notes: b.notes ?? null, is_test_data: !!b.is_test_data,
  };

  if (dry_run) return json({ ok: true, dry_run: true, no_records_mutated: true, would_log: row, no_provider_call: true });
  if (b.confirmation_phrase !== "LOG SOCIAL ASSET USAGE")
    return json({ ok: false, reason: "confirmation_phrase_required", expected: "LOG SOCIAL ASSET USAGE" }, 400);

  const { data, error } = await admin.from("social_asset_usage_log").insert(row).select("id").maybeSingle();
  if (error) return json({ ok: false, error: error.message }, 500);

  if (!row.is_test_data && row.usage_status === "used") {
    const { data: a } = await admin.from("social_assets").select("usage_count").eq("id", b.asset_id).maybeSingle();
    await admin.from("social_assets").update({
      usage_count: ((a?.usage_count ?? 0) + 1),
      last_used_at: new Date().toISOString(),
    }).eq("id", b.asset_id);
  }
  return json({ ok: true, log_id: data?.id, no_provider_call: true });
});
