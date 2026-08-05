import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";
import {
  VIRAL_CONFIRMATIONS, VIRAL_SAFETY_FLAGS, confirmationAccepted, dedupeSignals, signalIdempotencyKey,
} from "../_shared/socialViralLogic.ts";
import { getViralProvider, sanitiseProviderMessage } from "../_shared/socialViralProvider.ts";

const MAX_ROWS = 200;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  const ad = a.admin as any;
  const b = await req.json().catch(() => ({} as any));
  const business_id = b.business_id;
  if (!business_id) return json({ ok: false, error: "business_id_required" }, 400);

  const provider_slug = String(b.provider_slug ?? "manual_import");
  const dry_run = b.dry_run !== false;
  const provider = getViralProvider(provider_slug);

  // Watchlist must belong to this business.
  let watchlist: any = null;
  if (b.watchlist_id) {
    const { data } = await ad.from("social_viral_watchlists")
      .select("*").eq("id", b.watchlist_id).eq("business_id", business_id).maybeSingle();
    if (!data) return json({ ok: false, error: "watchlist_not_found_for_business" }, 404);
    watchlist = data;
  }

  let rows: unknown[] = Array.isArray(b.rows) ? b.rows : [];
  if (typeof b.rows_json === "string" && b.rows_json.trim()) {
    try {
      const parsed = JSON.parse(b.rows_json);
      rows = Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      return json({ ok: false, error: "rows_json_invalid" }, 400);
    }
  }
  if (rows.length > MAX_ROWS) return json({ ok: false, error: `too_many_rows_max_${MAX_ROWS}` }, 400);

  const result = await provider.fetchSignals({
    business_id,
    watchlist_id: watchlist?.id ?? null,
    keywords: watchlist?.keywords ?? [],
    platforms: watchlist?.platforms ?? [],
    competitor_handles: watchlist?.competitor_handles ?? [],
    rows,
  });
  if (!result.ok) {
    return json({
      ok: false, blocked: true, provider_slug, code: result.code,
      error: sanitiseProviderMessage(result.message ?? "provider_unavailable"),
      provider_calls: result.provider_calls, no_records_mutated: true, ...VIRAL_SAFETY_FLAGS,
    }, 409);
  }

  const { unique, duplicates } = dedupeSignals(business_id, result.signals as any[]);

  // Existing rows in DB (idempotency across imports).
  const keys = unique.map((s: any) => signalIdempotencyKey(business_id, s.provider_slug ?? provider_slug, s.platform, s.external_id));
  const { data: existing } = await ad.from("social_viral_signals")
    .select("id, provider_slug, platform, external_id")
    .eq("business_id", business_id)
    .in("external_id", unique.map((s: any) => s.external_id).slice(0, MAX_ROWS));
  const existingKeys = new Set((existing ?? []).map((e: any) =>
    signalIdempotencyKey(business_id, e.provider_slug, e.platform, e.external_id)));
  const fresh = unique.filter((_s: any, i: number) => !existingKeys.has(keys[i]));
  const alreadyStored = unique.length - fresh.length;

  if (dry_run) {
    return json({
      ok: true, dry_run: true, no_records_mutated: true,
      provider_slug, provider_calls: result.provider_calls,
      parsed_count: rows.length,
      valid_count: fresh.length,
      duplicate_in_batch: duplicates.length,
      already_stored: alreadyStored,
      rejected: result.errors,
      warnings: result.warnings.slice(0, 40),
      sample: fresh.slice(0, 10),
      phrase_required: VIRAL_CONFIRMATIONS.import_signals,
      ...VIRAL_SAFETY_FLAGS,
    });
  }

  if (!confirmationAccepted(b.confirmation_phrase, VIRAL_CONFIRMATIONS.import_signals)) {
    return json({ ok: false, error: `confirmation_phrase_required:${VIRAL_CONFIRMATIONS.import_signals}` }, 400);
  }

  const is_test_data = !!b.is_test_data;
  const { data: run } = await ad.from("social_viral_sync_runs").insert({
    business_id, watchlist_id: watchlist?.id ?? null, provider_slug,
    run_mode: provider_slug === "manual_import" ? "manual_import" : "provider_sync",
    run_status: "running", requested_count: rows.length,
    provider_calls: result.provider_calls, is_test_data,
  }).select().maybeSingle();

  const toInsert = fresh.map((s: any) => ({
    business_id,
    watchlist_id: watchlist?.id ?? null,
    sync_run_id: run?.id ?? null,
    provider_slug: s.provider_slug ?? provider_slug,
    source_type: s.source_type ?? "manual",
    platform: s.platform,
    external_id: s.external_id,
    canonical_url: s.canonical_url ?? null,
    title: s.title ?? null,
    topic: s.topic ?? null,
    creator_handle: s.creator_handle ?? null,
    language: s.language ?? null,
    geography: s.geography ?? null,
    metrics: s.metrics ?? {},
    observed_at: s.observed_at,
    published_at: s.published_at,
    freshness_deadline: s.freshness_deadline,
    signal_status: "normalised",
    sanitised_payload: { imported_by: "founder", provider_slug, note: "metrics and provenance only — no copyrighted media stored" },
    evidence_level: s.evidence_level ?? "manual_unverified",
    is_test_data,
  }));

  let inserted: any[] = [];
  if (toInsert.length) {
    const { data, error } = await ad.from("social_viral_signals")
      .upsert(toInsert, { onConflict: "business_id,provider_slug,platform,external_id", ignoreDuplicates: true })
      .select("id, external_id, platform");
    if (error) {
      await ad.from("social_viral_sync_runs").update({
        run_status: "failed", error_summary: sanitiseProviderMessage(error.message), finished_at: new Date().toISOString(),
      }).eq("id", run?.id).eq("business_id", business_id);
      return json({ ok: false, error: sanitiseProviderMessage(error.message) }, 500);
    }
    inserted = data ?? [];
  }

  await ad.from("social_viral_sync_runs").update({
    run_status: "completed",
    accepted_count: inserted.length,
    duplicate_count: duplicates.length + alreadyStored,
    rejected_count: result.errors.length,
    finished_at: new Date().toISOString(),
  }).eq("id", run?.id).eq("business_id", business_id);

  await ad.from("social_viral_audit").insert({
    business_id, actor_user_id: a.user.id, action: "signals_imported",
    entity_type: "sync_run", entity_id: run?.id ?? null,
    provider_calls: result.provider_calls,
    after_json: { accepted: inserted.length, duplicates: duplicates.length + alreadyStored, rejected: result.errors.length },
    is_test_data,
  });

  return json({
    ok: true, run_id: run?.id ?? null, accepted_count: inserted.length,
    duplicate_count: duplicates.length + alreadyStored, rejected: result.errors,
    signals: inserted, provider_calls: result.provider_calls, ...VIRAL_SAFETY_FLAGS,
  });
});