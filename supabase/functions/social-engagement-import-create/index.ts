import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";
import { ALLOWED_EVENT_TYPES, ALLOWED_PLATFORMS, classifyText, isLikelyDuplicate, normalizeHandle, PHRASES, SAFETY_FLAGS } from "../_shared/socialInboxLogic.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  const body = await req.json().catch(() => ({}));
  const { business_id, import_name, import_type = "manual", platform, rows, is_test_data, dry_run = true, confirmation_phrase, source_notes } = body ?? {};
  if (!business_id || !import_name || !Array.isArray(rows)) return json({ ok: false, error: "missing_required" }, 400);
  if (dry_run !== false) return json({ ok: true, dry_run: true, would_import: rows.length, no_records_mutated: true, ...SAFETY_FLAGS });
  if (confirmation_phrase !== PHRASES.import) return json({ ok: false, error: "confirmation_phrase_required", expected: PHRASES.import }, 400);

  const { data: recent } = await (a.admin as any).from("social_engagement_events").select("id, platform, external_event_id, social_handle, message_text").eq("business_id", business_id).limit(1000);
  let imported = 0, blocked = 0, dup = 0;
  const errors: string[] = []; const warnings: string[] = [];

  const { data: batch, error: be } = await (a.admin as any).from("social_engagement_import_batches").insert({
    business_id, import_name, import_type, platform: platform ?? null,
    row_count: rows.length, import_status: "draft", is_test_data: !!is_test_data, source_notes: source_notes ?? null,
  }).select().maybeSingle();
  if (be) return json({ ok: false, error: be.message }, 500);

  for (const r of rows) {
    const norm = {
      platform: r.platform ?? platform ?? "manual",
      event_type: r.event_type ?? "comment",
      message_text: r.message_text ?? "",
      social_handle: normalizeHandle(r.social_handle),
      external_event_id: r.external_event_id ?? null,
      detected_keyword: r.detected_keyword ? String(r.detected_keyword).toUpperCase() : null,
      display_name: r.display_name ?? null,
      contact_email: r.contact_email ?? null,
      parent_post_url: r.parent_post_url ?? null,
    };
    if (!ALLOWED_PLATFORMS.includes(norm.platform) || !ALLOWED_EVENT_TYPES.includes(norm.event_type) || !norm.message_text) { blocked++; errors.push("invalid_row"); continue; }
    if ((recent ?? []).some((x: any) => isLikelyDuplicate(norm as any, x as any))) { dup++; warnings.push("duplicate_skipped"); continue; }
    const c = classifyText(norm.message_text, norm.detected_keyword);
    const insert: any = {
      business_id, platform: norm.platform, platform_key: norm.platform, event_type: norm.event_type,
      message_text: norm.message_text, social_handle: norm.social_handle, display_name: norm.display_name,
      contact_email: norm.contact_email, parent_post_url: norm.parent_post_url,
      external_event_id: norm.external_event_id, detected_keyword: norm.detected_keyword,
      source_type: import_type === "csv" ? "csv_import" : import_type === "operator" ? "operator_import" : "manual",
      intent: c.intent, sentiment: c.sentiment, urgency: c.urgency, risk_level: c.risk_level,
      event_status: "captured", founder_review_required: true,
      is_test_data: !!is_test_data, metadata: { classification: c, import_batch_id: batch?.id },
    };
    const { error } = await (a.admin as any).from("social_engagement_events").insert(insert);
    if (error) { blocked++; errors.push(error.message); } else { imported++; }
  }

  const status = blocked === 0 && dup === 0 ? "imported" : imported === 0 ? "failed" : "partially_imported";
  await (a.admin as any).from("social_engagement_import_batches").update({ import_status: status, imported_count: imported, blocked_count: blocked, duplicate_count: dup, validation_errors: errors.slice(0, 50), validation_warnings: warnings.slice(0, 50) }).eq("id", batch?.id);
  await (a.admin as any).from("social_engagement_audit").insert({ business_id, import_batch_id: batch?.id, action: "engagement_imported", action_status: status, result_json: { imported, blocked, dup }, is_test_data: !!is_test_data, created_by: a.user.id });

  return json({ ok: true, batch_id: batch?.id, imported, blocked, duplicates: dup, status, ...SAFETY_FLAGS });
});