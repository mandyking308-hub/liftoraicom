import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";
import { ALLOWED_EVENT_TYPES, ALLOWED_PLATFORMS, classifyText, isLikelyDuplicate, normalizeHandle, SAFETY_FLAGS } from "../_shared/socialInboxLogic.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  const { business_id, import_name, platform, rows, is_test_data } = await req.json().catch(() => ({}));
  if (!business_id || !import_name || !Array.isArray(rows)) return json({ ok: false, error: "business_id, import_name, rows required" }, 400);
  const { data: recent } = await (a.admin as any).from("social_engagement_events")
    .select("id, platform, external_event_id, social_handle, message_text").eq("business_id", business_id).limit(500);
  const valid: any[] = []; const blocked: any[] = []; const duplicates: any[] = [];
  for (const r of rows) {
    const norm = {
      platform: r.platform ?? platform ?? "manual",
      event_type: r.event_type ?? "comment",
      message_text: r.message_text ?? "",
      social_handle: normalizeHandle(r.social_handle),
      external_event_id: r.external_event_id ?? null,
      detected_keyword: r.detected_keyword ? String(r.detected_keyword).toUpperCase() : null,
      is_test_data: !!is_test_data,
    };
    if (!ALLOWED_PLATFORMS.includes(norm.platform)) { blocked.push({ row: r, reason: "invalid_platform" }); continue; }
    if (!ALLOWED_EVENT_TYPES.includes(norm.event_type)) { blocked.push({ row: r, reason: "invalid_event_type" }); continue; }
    if (!norm.message_text) { blocked.push({ row: r, reason: "missing_message" }); continue; }
    if ((recent ?? []).some((x: any) => isLikelyDuplicate(norm as any, x as any))) { duplicates.push(norm); continue; }
    const c = classifyText(norm.message_text, norm.detected_keyword);
    valid.push({ ...norm, classification: c });
  }
  return json({ ok: true, no_records_mutated: true, valid_count: valid.length, blocked_count: blocked.length, duplicate_count: duplicates.length, valid_sample: valid.slice(0, 25), blocked, duplicates_sample: duplicates.slice(0, 25), ...SAFETY_FLAGS });
});