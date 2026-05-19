import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";
import { classifyText, draftReply, SAFETY_FLAGS } from "../_shared/socialInboxLogic.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  const { business_id, engagement_event_id } = await req.json().catch(() => ({}));
  if (!business_id || !engagement_event_id) return json({ ok: false, error: "missing_required" }, 400);
  const { data: e } = await (a.admin as any).from("social_engagement_events").select("*").eq("id", engagement_event_id).maybeSingle();
  if (!e) return json({ ok: false, error: "event_not_found" }, 404);
  const { data: biz } = await (a.admin as any).from("businesses").select("name").eq("id", business_id).maybeSingle();
  const intent = e.intent ?? classifyText(e.message_text, e.detected_keyword).intent;
  const draft = draftReply(intent, biz?.name ?? "us", !!e.crm_contact_id);
  return json({ ok: true, no_records_mutated: true, external_send_allowed: false, founder_review_required: true, draft, ...SAFETY_FLAGS });
});