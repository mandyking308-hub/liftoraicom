import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";
import { classifyText, PHRASES, SAFETY_FLAGS } from "../_shared/socialInboxLogic.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  const body = await req.json().catch(() => ({}));
  const { business_id, engagement_event_ids, limit = 25, dry_run = true, confirmation_phrase } = body ?? {};
  if (!business_id) return json({ ok: false, error: "business_id required" }, 400);
  if (dry_run !== false) return json({ ok: true, dry_run: true, no_records_mutated: true, ...SAFETY_FLAGS });
  if (confirmation_phrase !== PHRASES.classify) return json({ ok: false, error: "confirmation_phrase_required", expected: PHRASES.classify }, 400);
  let q = (a.admin as any).from("social_engagement_events").select("*").eq("business_id", business_id);
  if (Array.isArray(engagement_event_ids) && engagement_event_ids.length) q = q.in("id", engagement_event_ids);
  else q = q.eq("event_status", "captured").limit(Math.min(100, Number(limit) || 25));
  const { data } = await q;
  let saved = 0;
  for (const e of (data ?? [])) {
    const c = classifyText(e.message_text, e.detected_keyword);
    const { error } = await (a.admin as any).from("social_engagement_classifications").insert({
      business_id, engagement_event_id: e.id, classification_status: "classified",
      detected_intent: c.intent, detected_sentiment: c.sentiment, detected_keyword: e.detected_keyword,
      detected_risk_flags: c.detected_risk_flags, detected_opportunities: c.detected_opportunities,
      recommended_agent: c.recommended_agent, recommended_next_action: c.recommended_next_action,
      confidence_score: c.confidence_score, founder_review_required: true,
      compliance_review_required: c.compliance_review_required, support_review_required: c.support_review_required,
      customer_success_review_required: c.customer_success_review_required, is_test_data: !!e.is_test_data,
    });
    if (!error) {
      saved++;
      await (a.admin as any).from("social_engagement_events").update({ event_status: "classified", intent: c.intent, sentiment: c.sentiment, urgency: c.urgency, risk_level: c.risk_level }).eq("id", e.id);
    }
  }
  await (a.admin as any).from("social_engagement_audit").insert({ business_id, action: "engagement_classified", result_json: { saved, total: (data ?? []).length }, created_by: a.user.id });
  return json({ ok: true, classified: saved, ...SAFETY_FLAGS });
});