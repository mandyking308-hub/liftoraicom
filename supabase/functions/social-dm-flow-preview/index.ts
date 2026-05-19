import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";
import {
  defaultPublicReply, defaultDmOpening, defaultFollowUp, defaultButton,
  defaultStopConditions, defaultEscalationRules, defaultRoutingRules,
  defaultQualificationQuestions, complianceWarnings, SAFETY_FLAGS, FlowType,
} from "../_shared/socialEngagementLogic.ts";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  let body: any = {}; try { body = await req.json(); } catch {}
  const { business_id, flow_type = "lead_magnet", platform, keyword_rule_id, campaign_plan_id, primary_goal, target_audience, button_url } = body;
  if (!business_id || !platform) return json({ ok: false, error: "missing_fields" }, 400);
  const { data: profile } = await a.admin.from("social_brain_profiles").select("*").eq("business_id", business_id).maybeSingle();
  const brand = profile?.brand_name ?? profile?.business_name ?? "us";
  const ft = flow_type as FlowType;
  const preview = {
    flow_type: ft, platform,
    public_reply_text: defaultPublicReply(ft, brand),
    dm_opening_text: defaultDmOpening(ft, brand, button_url),
    button: defaultButton(ft, button_url),
    follow_up_question: defaultFollowUp(ft),
    qualification_questions: defaultQualificationQuestions(ft),
    routing_rules: defaultRoutingRules(ft),
    escalation_rules: defaultEscalationRules(ft),
    stop_conditions: defaultStopConditions(),
    compliance_warnings: complianceWarnings(ft, profile),
    primary_goal: primary_goal ?? null,
    target_audience: target_audience ?? profile?.primary_audience ?? null,
    keyword_rule_id: keyword_rule_id ?? null,
    campaign_plan_id: campaign_plan_id ?? null,
  };
  return json({ ok: true, dry_run: true, preview, no_records_mutated: true, ...SAFETY_FLAGS });
});