import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";
import { SAFETY_FLAGS } from "../_shared/socialInboxLogic.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  const { business_id, engagement_event_id, limit = 25 } = await req.json().catch(() => ({}));
  if (!business_id) return json({ ok: false, error: "business_id required" }, 400);
  let q = (a.admin as any).from("social_engagement_events").select("*").eq("business_id", business_id);
  if (engagement_event_id) q = q.eq("id", engagement_event_id);
  else q = q.eq("crm_match_status", "unmatched").limit(Math.min(100, Number(limit) || 25));
  const { data } = await q;
  const previews: any[] = [];
  for (const e of (data ?? [])) {
    let match_status = "unmatched", crm_contact_id: string | null = null, confidence = 0, reason = "no_signal", matched_fields: string[] = [];
    if (e.contact_email) {
      const { data: c } = await (a.admin as any).from("crm_contacts").select("id").eq("business_id", business_id).ilike("email", e.contact_email).maybeSingle();
      if (c) { match_status = "matched_existing"; crm_contact_id = c.id; confidence = 95; reason = "email_match"; matched_fields = ["email"]; }
      else { match_status = "new_contact_review"; confidence = 60; reason = "unseen_email"; }
    } else if (e.phone) {
      const { data: c } = await (a.admin as any).from("crm_contacts").select("id").eq("business_id", business_id).ilike("phone", e.phone).maybeSingle();
      if (c) { match_status = "matched_existing"; crm_contact_id = c.id; confidence = 90; reason = "phone_match"; matched_fields = ["phone"]; }
    } else if (e.social_handle) {
      match_status = "possible_match"; confidence = 35; reason = "handle_only_requires_review"; matched_fields = ["social_handle"];
    }
    previews.push({ engagement_event_id: e.id, match_status, crm_contact_id, match_confidence: confidence, match_reason: reason, matched_fields, founder_review_required: true });
  }
  return json({ ok: true, no_records_mutated: true, previews, ...SAFETY_FLAGS });
});