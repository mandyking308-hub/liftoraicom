import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";
import { ALLOWED_EVENT_TYPES, ALLOWED_PLATFORMS, classifyText, isLikelyDuplicate, normalizeHandle, SAFETY_FLAGS } from "../_shared/socialInboxLogic.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  const body = await req.json().catch(() => ({}));
  const { business_id, platform, event_type, message_text, social_handle, display_name, parent_post_url, detected_keyword, is_test_data, external_event_id } = body ?? {};
  if (!business_id || !platform || !event_type || !message_text) return json({ ok: false, error: "business_id, platform, event_type, message_text required" }, 400);
  if (!ALLOWED_PLATFORMS.includes(platform)) return json({ ok: false, error: "invalid_platform" }, 400);
  if (!ALLOWED_EVENT_TYPES.includes(event_type)) return json({ ok: false, error: "invalid_event_type" }, 400);

  const normalized = {
    business_id, platform, event_type, message_text,
    social_handle: normalizeHandle(social_handle),
    display_name: display_name ?? null,
    parent_post_url: parent_post_url ?? null,
    detected_keyword: detected_keyword ? String(detected_keyword).toUpperCase() : null,
    external_event_id: external_event_id ?? null,
    is_test_data: !!is_test_data,
  };
  const classification = classifyText(message_text, normalized.detected_keyword);
  const { data: recent } = await (a.admin as any).from("social_engagement_events")
    .select("id, platform, external_event_id, social_handle, message_text, created_at")
    .eq("business_id", business_id).order("created_at", { ascending: false }).limit(50);
  const duplicates = (recent ?? []).filter((r: any) => isLikelyDuplicate(normalized as any, r as any));

  let crm_preview: any = { match_status: "unmatched", reason: "no_email_or_phone_provided" };
  if (body?.contact_email) {
    const { data: c } = await (a.admin as any).from("crm_contacts").select("id,email,full_name").eq("business_id", business_id).ilike("email", String(body.contact_email)).limit(1).maybeSingle();
    if (c) crm_preview = { match_status: "matched_existing", crm_contact_id: c.id };
  }

  return json({
    ok: true, no_records_mutated: true,
    normalized, classification, duplicates,
    duplicate_warning: duplicates.length > 0,
    crm_preview, ...SAFETY_FLAGS,
  });
});