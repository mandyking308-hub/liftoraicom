import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";
import { PHRASES, SAFETY_FLAGS } from "../_shared/socialInboxLogic.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  const { business_id, engagement_event_id, escalation_type, priority, reason, recommended_action, assigned_agent, assigned_to, dry_run = true, confirmation_phrase } = await req.json().catch(() => ({}));
  if (!business_id || !engagement_event_id || !escalation_type) return json({ ok: false, error: "missing_required" }, 400);
  if (dry_run !== false) return json({ ok: true, dry_run: true, no_records_mutated: true, ...SAFETY_FLAGS });
  if (confirmation_phrase !== PHRASES.escalation) return json({ ok: false, error: "confirmation_phrase_required", expected: PHRASES.escalation }, 400);
  const { data, error } = await (a.admin as any).from("social_engagement_escalations").insert({
    business_id, engagement_event_id, escalation_type, priority: priority ?? "normal",
    reason: reason ?? null, recommended_action: recommended_action ?? null,
    assigned_agent: assigned_agent ?? null, assigned_to: assigned_to ?? null,
    founder_review_required: true,
  }).select().maybeSingle();
  if (error) return json({ ok: false, error: error.message }, 500);
  await (a.admin as any).from("social_engagement_events").update({ event_status: "escalated" }).eq("id", engagement_event_id);
  await (a.admin as any).from("social_engagement_audit").insert({ business_id, engagement_event_id, action: "escalation_created", after_json: data ?? {}, created_by: a.user.id });
  return json({ ok: true, escalation: data, ...SAFETY_FLAGS });
});