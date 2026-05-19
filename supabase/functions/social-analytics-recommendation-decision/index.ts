import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";
import { SAFETY_FLAGS } from "../_shared/socialAnalyticsLogic.ts";

const PHRASE = "APPLY SOCIAL ANALYTICS DECISION";
const DECISIONS = ["approve_internal","reject","mark_actioned","park"];
const STATUS_MAP: Record<string, string> = {
  approve_internal: "approved_internal",
  reject: "rejected",
  mark_actioned: "actioned",
  park: "draft",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  const body = await req.json().catch(() => ({} as any));
  const { business_id, recommendation_id, decision, founder_notes } = body;
  if (!business_id || !recommendation_id || !decision) return json({ ok: false, error: "missing_fields" }, 400);
  if (!DECISIONS.includes(decision)) return json({ ok: false, error: "invalid_decision" }, 400);
  const dry_run = body.dry_run !== false;
  if (dry_run) return json({ ok: true, dry_run: true, will_set_status: STATUS_MAP[decision], no_external_action: true, ...SAFETY_FLAGS });
  if (body.confirmation_phrase !== PHRASE) return json({ ok: false, error: "confirmation_phrase_required", required: PHRASE }, 400);

  const { data, error } = await a.admin.from("social_strategy_recommendations").update({
    recommendation_status: STATUS_MAP[decision],
    approval_status: STATUS_MAP[decision],
    metadata: founder_notes ? { founder_notes } : undefined,
    updated_at: new Date().toISOString(),
  }).eq("id", recommendation_id).eq("business_id", business_id).select("*").single();
  if (error) return json({ ok: false, error: error.message }, 500);

  await a.admin.from("social_analytics_audit").insert({
    business_id, recommendation_id, action: decision === "approve_internal" ? "recommendation_approved" : decision === "reject" ? "recommendation_rejected" : "strategy_update_suggested",
    action_status: "recorded", result_json: { decision, status: STATUS_MAP[decision] },
  });
  return json({ ok: true, recommendation: data, no_external_action: true, ...SAFETY_FLAGS });
});