import { corsHeaders, json, requireFounder, SUPPORT_SAFETY } from "../_shared/supportAgentLogic.ts";
const TYPES = new Set(["founder_review","customer_success","technical_support","complaint","dispute","refund_review","billing_review","legal_review","compliance_review","privacy_review","urgent_risk","ops_review","other"]);
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  const { business_id, question_intake_id, escalation_type, reason, priority = "normal", recommended_action, assigned_to, dry_run = true, confirmation_phrase } = await req.json().catch(() => ({}));
  if (!business_id || !escalation_type) return json({ ok: false, error: "business_id, escalation_type required", safety: SUPPORT_SAFETY }, 400);
  if (!TYPES.has(escalation_type)) return json({ ok: false, error: "invalid escalation_type", safety: SUPPORT_SAFETY }, 400);
  if (dry_run !== false) return json({ ok: true, dry_run: true, would_create: { escalation_type, reason }, safety: SUPPORT_SAFETY });
  if (confirmation_phrase !== "CREATE SUPPORT ESCALATION") return json({ ok: false, blocked: true, reason: "confirmation_phrase_required", safety: SUPPORT_SAFETY }, 400);
  const { data, error } = await a.admin.from("support_escalations").insert({
    business_id, question_intake_id, escalation_type, escalation_status: "open",
    priority, reason, recommended_action, assigned_to,
  }).select().single();
  if (error) return json({ ok: false, error: error.message, safety: SUPPORT_SAFETY }, 500);
  await a.admin.from("support_audit").insert({ business_id, escalation_id: data.id, question_intake_id, action: "escalation_created", after_json: data });
  return json({ ok: true, created: data, safety: SUPPORT_SAFETY });
});