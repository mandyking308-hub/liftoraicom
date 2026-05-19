import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";
import { buildStepsFromBlueprint, SAFETY_FLAGS } from "../_shared/socialEngagementLogic.ts";
const PHRASE = "CREATE SOCIAL DM FLOW BLUEPRINT";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  let body: any = {}; try { body = await req.json(); } catch {}
  const { business_id, dry_run = true, confirmation_phrase, is_test_data = false, steps, ...rest } = body;
  if (!business_id || !rest.flow_name || !rest.flow_type || !rest.platform) return json({ ok: false, error: "missing_fields" }, 400);
  const bp: any = {
    business_id,
    flow_name: rest.flow_name,
    flow_type: rest.flow_type,
    flow_status: rest.flow_status ?? "draft",
    platform: rest.platform,
    keyword_rule_id: rest.keyword_rule_id ?? null,
    campaign_plan_id: rest.campaign_plan_id ?? null,
    primary_goal: rest.primary_goal ?? null,
    target_audience: rest.target_audience ?? null,
    public_reply_text: rest.public_reply_text ?? null,
    dm_opening_text: rest.dm_opening_text ?? null,
    button_label: rest.button_label ?? null,
    button_url: rest.button_url ?? null,
    follow_up_question: rest.follow_up_question ?? null,
    qualification_questions: rest.qualification_questions ?? [],
    routing_rules: rest.routing_rules ?? {},
    escalation_rules: rest.escalation_rules ?? {},
    stop_conditions: rest.stop_conditions ?? {},
    compliance_warnings: rest.compliance_warnings ?? [],
    risk_flags: rest.risk_flags ?? [],
    approval_status: rest.approval_status ?? "draft",
    founder_notes: rest.founder_notes ?? null,
    is_test_data, metadata: rest.metadata ?? {},
  };
  if (dry_run || confirmation_phrase !== PHRASE) {
    return json({ ok: true, dry_run: true, would_create: bp, phrase_required: PHRASE, no_records_mutated: true, ...SAFETY_FLAGS });
  }
  const { data: flow, error } = await a.admin.from("social_dm_flow_blueprints").insert(bp).select().maybeSingle();
  if (error || !flow) return json({ ok: false, error: error?.message ?? "flow_failed" }, 500);
  const stepRows = (steps && Array.isArray(steps) && steps.length ? steps : buildStepsFromBlueprint(flow))
    .map((s: any) => ({ ...s, business_id, flow_id: flow.id, is_test_data }));
  if (stepRows.length) await a.admin.from("social_dm_flow_steps").insert(stepRows);
  if (bp.keyword_rule_id) {
    await a.admin.from("social_keyword_trigger_rules").update({ flow_id: flow.id }).eq("id", bp.keyword_rule_id);
  }
  await a.admin.from("social_engagement_flow_audit").insert({
    business_id, flow_id: flow.id, action: "dm_flow_created", action_status: "recorded",
    after_json: { flow, steps: stepRows.length }, ...SAFETY_FLAGS, is_test_data,
  });
  return json({ ok: true, flow, steps_created: stepRows.length, ...SAFETY_FLAGS });
});