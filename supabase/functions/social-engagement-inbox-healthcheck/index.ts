import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";
import { SAFETY_FLAGS } from "../_shared/socialInboxLogic.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  const url = new URL(req.url);
  let business_id = url.searchParams.get("business_id");
  if (!business_id && req.method === "POST") { try { const b = await req.json(); business_id = b.business_id ?? null; } catch {} }
  const where = (q: any) => business_id ? q.eq("business_id", business_id) : q;
  const cnt = async (table: string, extra?: (q: any) => any) => {
    let q: any = (a.admin as any).from(table).select("id", { count: "exact", head: true });
    q = where(q); if (extra) q = extra(q);
    const { count } = await q; return count ?? 0;
  };
  const engagement_events_total = await cnt("social_engagement_events");
  const unclassified_count = await cnt("social_engagement_events", q => q.eq("event_status", "captured"));
  const unmatched_count = await cnt("social_engagement_events", q => q.eq("crm_match_status", "unmatched"));
  const possible_crm_matches = await cnt("social_engagement_crm_matches", q => q.eq("match_status", "possible_match"));
  const reply_drafts_count = await cnt("social_engagement_reply_drafts");
  const escalations_open = await cnt("social_engagement_escalations", q => q.eq("escalation_status", "open"));
  const complaints_detected = await cnt("social_engagement_events", q => q.eq("intent", "complaint"));
  const support_detected = await cnt("social_engagement_events", q => q.eq("intent", "customer_support"));
  const creator_interest_detected = await cnt("social_engagement_events", q => q.eq("intent", "creator_interest"));
  const lead_interest_detected = await cnt("social_engagement_events", q => q.eq("intent", "lead_interest"));
  const spam_abuse_count = await cnt("social_engagement_events", q => q.in("intent", ["spam","abuse"]));
  const test_data_count = await cnt("social_engagement_events", q => q.eq("is_test_data", true));
  return json({
    ok: true, engagement_events_total, unclassified_count, unmatched_count, possible_crm_matches,
    reply_drafts_count, escalations_open, complaints_detected, support_detected,
    creator_interest_detected, lead_interest_detected, spam_abuse_count, test_data_count,
    provider_calls_total: 0, dms_sent_total: 0, comments_sent_total: 0, external_actions_total: 0,
    no_external_action: true, ...SAFETY_FLAGS,
  });
});