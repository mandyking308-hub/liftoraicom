import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";
import { SAFETY_FLAGS, normalizeMetricRow } from "../_shared/socialAnalyticsLogic.ts";

const PHRASE = "IMPORT SOCIAL PERFORMANCE METRICS";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  const body = await req.json().catch(() => ({} as any));
  const business_id = body.business_id;
  if (!business_id) return json({ ok: false, error: "business_id_required" }, 400);
  const dry_run = body.dry_run !== false;
  const rows: any[] = Array.isArray(body.rows) ? body.rows : [];
  const normalised = rows.map((r) => normalizeMetricRow({ ...r, platform: r.platform ?? body.platform }));
  const blocked = normalised.filter((n) => n.errors.length > 0);
  const valid = normalised.filter((n) => n.errors.length === 0).map((n) => n.row);

  if (!dry_run && body.confirmation_phrase !== PHRASE) {
    return json({ ok: false, error: "confirmation_phrase_required", required: PHRASE }, 400);
  }
  if (dry_run) {
    return json({ ok: true, dry_run: true, prepared: valid.length, blocked: blocked.length, no_records_mutated: true, ...SAFETY_FLAGS });
  }

  const { data: batch, error: be } = await a.admin.from("social_performance_import_batches").insert({
    business_id,
    import_name: body.import_name ?? "manual import",
    import_type: body.import_type ?? "manual",
    import_source: body.import_source ?? null,
    platform: body.platform ?? null,
    date_range_start: body.date_range_start ?? null,
    date_range_end: body.date_range_end ?? null,
    import_status: "previewed",
    row_count: rows.length,
    blocked_count: blocked.length,
    validation_errors: blocked.flatMap((b) => b.errors).slice(0, 50),
    validation_warnings: normalised.flatMap((n) => n.warnings).slice(0, 50),
    source_notes: body.source_notes ?? null,
    is_test_data: !!body.is_test_data,
  }).select("*").single();
  if (be) return json({ ok: false, error: be.message }, 500);

  let inserted = 0;
  if (valid.length) {
    const payload = valid.map((r) => ({
      business_id,
      import_batch_id: batch.id,
      platform: r.platform,
      platform_key: r.platform_key ?? r.platform,
      provider: r.provider ?? null,
      metric_date: r.metric_date ?? null,
      metric_period_start: r.metric_period_start ?? null,
      metric_period_end: r.metric_period_end ?? null,
      external_post_id: r.external_post_id ?? null,
      post_url: r.post_url ?? null,
      title: r.title ?? null,
      caption_snippet: r.caption_snippet ?? null,
      content_type: r.content_type ?? null,
      views: Number(r.views ?? 0),
      impressions: Number(r.impressions ?? 0),
      reach: Number(r.reach ?? 0),
      likes: Number(r.likes ?? 0),
      comments: Number(r.comments ?? 0),
      shares: Number(r.shares ?? 0),
      saves: Number(r.saves ?? 0),
      clicks: Number(r.clicks ?? 0),
      profile_visits: Number(r.profile_visits ?? 0),
      follows: Number(r.follows ?? 0),
      unsubscribes: Number(r.unsubscribes ?? 0),
      watch_time_seconds: Number(r.watch_time_seconds ?? 0),
      average_watch_seconds: r.average_watch_seconds ?? null,
      completion_rate: r.completion_rate ?? null,
      engagement_rate: r.engagement_rate ?? null,
      click_through_rate: r.click_through_rate ?? null,
      conversion_count: Number(r.conversion_count ?? 0),
      lead_count: Number(r.lead_count ?? 0),
      revenue_attributed: r.revenue_attributed ?? null,
      currency: r.currency ?? "GBP",
      attribution_status: r.attribution_status ?? "unverified",
      metric_confidence: r.metric_confidence ?? "imported_unverified",
      is_test_data: !!body.is_test_data,
    }));
    const { data: ins, error: ie } = await a.admin.from("social_performance_metrics").insert(payload).select("id");
    if (ie) return json({ ok: false, error: ie.message }, 500);
    inserted = ins?.length ?? 0;
  }

  await a.admin.from("social_performance_import_batches").update({
    imported_count: inserted,
    import_status: blocked.length > 0 ? "partially_imported" : "imported",
    updated_at: new Date().toISOString(),
  }).eq("id", batch.id);

  await a.admin.from("social_analytics_audit").insert({
    business_id, import_batch_id: batch.id, action: "metrics_imported", action_status: "recorded",
    result_json: { inserted, blocked: blocked.length }, is_test_data: !!body.is_test_data,
  });

  return json({ ok: true, batch_id: batch.id, inserted, blocked: blocked.length, ...SAFETY_FLAGS });
});