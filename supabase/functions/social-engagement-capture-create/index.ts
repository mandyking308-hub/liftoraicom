import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";
import { ALLOWED_EVENT_TYPES, ALLOWED_PLATFORMS, classifyText, normalizeHandle, PHRASES, SAFETY_FLAGS } from "../_shared/socialInboxLogic.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  const body = await req.json().catch(() => ({}));
  const { business_id, platform, event_type, message_text, social_handle, display_name, contact_email, phone, parent_post_url, parent_post_id, message_url, media_url, detected_keyword, external_event_id, external_thread_id, external_user_id, source_type, content_item_id, calendar_item_id, campaign_plan_id, keyword_rule_id, dm_flow_id, is_test_data, dry_run = true, confirmation_phrase } = body ?? {};
  if (!business_id || !platform || !event_type || !message_text) return json({ ok: false, error: "missing_required" }, 400);
  if (!ALLOWED_PLATFORMS.includes(platform)) return json({ ok: false, error: "invalid_platform" }, 400);
  if (!ALLOWED_EVENT_TYPES.includes(event_type)) return json({ ok: false, error: "invalid_event_type" }, 400);
  const c = classifyText(message_text, detected_keyword);
  if (dry_run !== false) return json({ ok: true, dry_run: true, classification_preview: c, no_records_mutated: true, ...SAFETY_FLAGS });
  if (confirmation_phrase !== PHRASES.capture) return json({ ok: false, error: "confirmation_phrase_required", expected: PHRASES.capture }, 400);

  const insert = {
    business_id, platform, platform_key: platform, event_type,
    message_text, social_handle: normalizeHandle(social_handle), display_name: display_name ?? null,
    contact_email: contact_email ?? null, phone: phone ?? null,
    parent_post_url: parent_post_url ?? null, parent_post_id: parent_post_id ?? null,
    message_url: message_url ?? null, media_url: media_url ?? null,
    detected_keyword: detected_keyword ? String(detected_keyword).toUpperCase() : null,
    external_event_id: external_event_id ?? null, external_thread_id: external_thread_id ?? null, external_user_id: external_user_id ?? null,
    source_type: source_type ?? "manual",
    content_item_id: content_item_id ?? null, calendar_item_id: calendar_item_id ?? null,
    campaign_plan_id: campaign_plan_id ?? null, keyword_rule_id: keyword_rule_id ?? null, dm_flow_id: dm_flow_id ?? null,
    intent: c.intent, sentiment: c.sentiment, urgency: c.urgency, risk_level: c.risk_level,
    event_status: "captured", founder_review_required: true,
    ai_reply_allowed: false, external_reply_allowed: false,
    is_test_data: !!is_test_data,
    metadata: { classification: c },
  };
  const { data: row, error } = await (a.admin as any).from("social_engagement_events").insert(insert).select().maybeSingle();
  if (error) return json({ ok: false, error: error.message }, 500);

  // bump counters
  if (keyword_rule_id) await (a.admin as any).from("social_keyword_trigger_rules").update({ engagement_count: (row as any).engagement_count ?? undefined, last_engagement_at: new Date().toISOString() }).eq("id", keyword_rule_id);
  if (dm_flow_id) await (a.admin as any).from("social_dm_flow_blueprints").update({ last_engagement_at: new Date().toISOString() }).eq("id", dm_flow_id);
  if (content_item_id) await (a.admin as any).from("social_content_items").update({ last_social_engagement_at: new Date().toISOString() }).eq("id", content_item_id);
  if (calendar_item_id) await (a.admin as any).from("social_calendar_items").update({ last_social_engagement_at: new Date().toISOString() }).eq("id", calendar_item_id);

  await (a.admin as any).from("social_engagement_audit").insert({ business_id, engagement_event_id: row?.id, action: "engagement_captured", action_status: "recorded", after_json: row ?? {}, is_test_data: !!is_test_data, created_by: a.user.id });

  return json({ ok: true, event: row, ...SAFETY_FLAGS });
});