import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";
import { PHRASES, SAFETY_FLAGS } from "../_shared/socialInboxLogic.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  const { business_id, engagement_event_id, crm_contact_id, match_status, match_reason, dry_run = true, confirmation_phrase } = await req.json().catch(() => ({}));
  if (!business_id || !engagement_event_id) return json({ ok: false, error: "missing_required" }, 400);
  if (dry_run !== false) return json({ ok: true, dry_run: true, no_records_mutated: true, ...SAFETY_FLAGS });
  if (confirmation_phrase !== PHRASES.crm_apply) return json({ ok: false, error: "confirmation_phrase_required", expected: PHRASES.crm_apply }, 400);
  const status = crm_contact_id ? "applied" : (match_status ?? "new_contact_review");
  const { data, error } = await (a.admin as any).from("social_engagement_crm_matches").insert({
    business_id, engagement_event_id, crm_contact_id: crm_contact_id ?? null,
    match_status: status, applied_to_crm: !!crm_contact_id, applied_at: crm_contact_id ? new Date().toISOString() : null,
    match_reason: match_reason ?? null, founder_review_required: true,
  }).select().maybeSingle();
  if (error) return json({ ok: false, error: error.message }, 500);
  await (a.admin as any).from("social_engagement_events").update({
    crm_contact_id: crm_contact_id ?? null, crm_match_status: crm_contact_id ? "matched_existing" : status,
  }).eq("id", engagement_event_id);
  await (a.admin as any).from("social_engagement_audit").insert({ business_id, engagement_event_id, action: "crm_match_applied", result_json: data ?? {}, crm_records_created: 0, created_by: a.user.id });
  return json({ ok: true, match: data, ...SAFETY_FLAGS });
});