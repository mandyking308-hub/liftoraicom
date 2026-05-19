import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";
import { operatorChecklist, validateFlow, SAFETY_FLAGS } from "../_shared/socialEngagementLogic.ts";
const PHRASE = "CREATE MANYCHAT MANUAL SETUP EXPORT";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  let body: any = {}; try { body = await req.json(); } catch {}
  const { business_id, flow_id, keyword_rule_id, export_name, dry_run = true, confirmation_phrase, is_test_data = false } = body;
  if (!business_id || !flow_id || !export_name) return json({ ok: false, error: "missing_fields" }, 400);
  const { data: flow } = await a.admin.from("social_dm_flow_blueprints").select("*").eq("id", flow_id).eq("business_id", business_id).maybeSingle();
  if (!flow) return json({ ok: false, error: "flow_not_found" }, 404);
  const { data: steps } = await a.admin.from("social_dm_flow_steps").select("*").eq("flow_id", flow_id).order("step_order");
  const { data: kw } = keyword_rule_id
    ? await a.admin.from("social_keyword_trigger_rules").select("*").eq("id", keyword_rule_id).maybeSingle()
    : { data: null as any };
  const validation = validateFlow(flow, steps ?? [], true);
  const copy_blocks = [
    { type: "keyword", value: kw?.keyword ?? null },
    { type: "public_reply", value: flow.public_reply_text },
    { type: "dm_opening", value: flow.dm_opening_text },
    { type: "button", value: { label: flow.button_label, url: flow.button_url } },
    { type: "follow_up", value: flow.follow_up_question },
    { type: "qualification", value: flow.qualification_questions ?? [] },
    { type: "opt_out", value: "Reply STOP to opt out." },
  ];
  const payload = {
    business_id, export_name, export_status: "ready", platform: flow.platform,
    flow_id, keyword_rule_id: keyword_rule_id ?? null,
    export_payload: { flow, steps, keyword: kw },
    setup_instructions: "Manual setup pack — see copy_blocks + checklist.",
    copy_blocks, checklist: operatorChecklist(),
    validation_status: validation.status, validation_errors: validation.errors, validation_warnings: validation.warnings,
    manual_setup_status: "ready_for_operator", is_test_data,
  };
  if (dry_run || confirmation_phrase !== PHRASE) {
    return json({ ok: true, dry_run: true, would_create: payload, phrase_required: PHRASE, no_records_mutated: true, ...SAFETY_FLAGS });
  }
  const { data, error } = await a.admin.from("social_manychat_manual_exports").insert(payload).select().maybeSingle();
  if (error) return json({ ok: false, error: error.message }, 500);
  await a.admin.from("social_engagement_flow_audit").insert({
    business_id, flow_id, export_id: data?.id, keyword_rule_id: keyword_rule_id ?? null,
    action: "manual_export_created", action_status: "recorded",
    after_json: { export_id: data?.id }, ...SAFETY_FLAGS, is_test_data,
  });
  return json({ ok: true, export: data, ...SAFETY_FLAGS });
});