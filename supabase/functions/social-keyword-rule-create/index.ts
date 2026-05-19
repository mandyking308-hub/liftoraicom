import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";
import { normalizeKeyword, SAFETY_FLAGS } from "../_shared/socialEngagementLogic.ts";
const PHRASE = "CREATE SOCIAL KEYWORD RULE";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  let body: any = {}; try { body = await req.json(); } catch {}
  const { business_id, dry_run = true, confirmation_phrase, is_test_data = false, ...rest } = body;
  if (!business_id || !rest.keyword || !rest.platform || !rest.rule_name) return json({ ok: false, error: "missing_fields" }, 400);
  const payload: any = {
    business_id,
    rule_name: rest.rule_name,
    keyword: rest.keyword,
    keyword_normalized: normalizeKeyword(rest.keyword),
    platform: rest.platform,
    trigger_type: rest.trigger_type ?? "comment_keyword",
    rule_status: rest.rule_status ?? "draft",
    campaign_plan_id: rest.campaign_plan_id ?? null,
    content_item_id: rest.content_item_id ?? null,
    calendar_item_id: rest.calendar_item_id ?? null,
    flow_id: rest.flow_id ?? null,
    public_reply_required: rest.public_reply_required ?? true,
    dm_flow_required: rest.dm_flow_required ?? true,
    founder_approval_required: rest.founder_approval_required ?? true,
    compliance_review_required: rest.compliance_review_required ?? false,
    risk_level: rest.risk_level ?? "low",
    notes: rest.notes ?? null,
    is_test_data,
    metadata: rest.metadata ?? {},
  };
  if (dry_run || confirmation_phrase !== PHRASE) {
    return json({ ok: true, dry_run: true, would_create: payload, phrase_required: PHRASE, no_records_mutated: true, ...SAFETY_FLAGS });
  }
  const { data, error } = await a.admin.from("social_keyword_trigger_rules").insert(payload).select().maybeSingle();
  if (error) return json({ ok: false, error: error.message }, 500);
  await a.admin.from("social_engagement_flow_audit").insert({
    business_id, keyword_rule_id: data?.id, action: "keyword_rule_created", action_status: "recorded",
    after_json: data ?? {}, ...SAFETY_FLAGS, is_test_data,
  });
  return json({ ok: true, keyword_rule: data, ...SAFETY_FLAGS });
});