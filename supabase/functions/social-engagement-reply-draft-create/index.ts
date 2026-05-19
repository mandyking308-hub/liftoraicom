import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";
import { classifyText, draftReply, PHRASES, SAFETY_FLAGS } from "../_shared/socialInboxLogic.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  const { business_id, engagement_event_id, draft_payload, dry_run = true, confirmation_phrase } = await req.json().catch(() => ({}));
  if (!business_id || !engagement_event_id) return json({ ok: false, error: "missing_required" }, 400);
  if (dry_run !== false) return json({ ok: true, dry_run: true, no_records_mutated: true, ...SAFETY_FLAGS });
  if (confirmation_phrase !== PHRASES.reply_draft) return json({ ok: false, error: "confirmation_phrase_required", expected: PHRASES.reply_draft }, 400);
  const { data: e } = await (a.admin as any).from("social_engagement_events").select("*").eq("id", engagement_event_id).maybeSingle();
  if (!e) return json({ ok: false, error: "event_not_found" }, 404);
  const { data: biz } = await (a.admin as any).from("businesses").select("name").eq("id", business_id).maybeSingle();
  const intent = e.intent ?? classifyText(e.message_text, e.detected_keyword).intent;
  const d = draft_payload ?? draftReply(intent, biz?.name ?? "us", !!e.crm_contact_id);
  const { data: row, error } = await (a.admin as any).from("social_engagement_reply_drafts").insert({
    business_id, engagement_event_id, draft_type: d.draft_type, platform: e.platform ?? e.platform_key,
    reply_channel: d.reply_channel, draft_text: d.draft_text, suggested_tone: d.suggested_tone ?? null,
    risk_flags: d.risk_flags ?? [], compliance_warnings: d.compliance_warnings ?? [],
    founder_review_required: true, external_send_allowed: false, is_test_data: !!e.is_test_data,
  }).select().maybeSingle();
  if (error) return json({ ok: false, error: error.message }, 500);
  await (a.admin as any).from("social_engagement_events").update({ event_status: "draft_reply_ready" }).eq("id", engagement_event_id);
  await (a.admin as any).from("social_engagement_audit").insert({ business_id, engagement_event_id, action: "reply_draft_created", after_json: row ?? {}, created_by: a.user.id });
  return json({ ok: true, draft: row, ...SAFETY_FLAGS });
});