import { corsHeaders, json, requireFounder, logAudit, SAFETY_FLAGS } from "../_shared/websiteFunnelLogic.ts";
const PHRASE = "CREATE WEBSITE LEAD MAGNET";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  let body: any = {}; try { body = await req.json(); } catch {}
  const { business_id, lead_magnet_name, lead_magnet_type = "guide", target_audience, promised_outcome, delivery_method = "manual", title, outline, opt_in_copy, thank_you_copy, funnel_strategy_id, campaign_plan_id, is_test_data = false, dry_run = true, confirmation_phrase } = body;
  if (!business_id || !lead_magnet_name) return json({ ok: false, error: "missing_fields" }, 400);
  if (dry_run || confirmation_phrase !== PHRASE) {
    return json({ ok: true, dry_run: true, phrase_required: PHRASE, no_records_mutated: true, ...SAFETY_FLAGS });
  }
  const { data, error } = await a.admin.from("lead_magnet_assets").insert({
    business_id, funnel_strategy_id: funnel_strategy_id ?? null, campaign_plan_id: campaign_plan_id ?? null,
    lead_magnet_name, lead_magnet_type, target_audience, promised_outcome, delivery_method,
    title: title ?? lead_magnet_name, outline: outline ?? [], opt_in_copy, thank_you_copy,
    approval_status: "needs_review", is_test_data,
  }).select().maybeSingle();
  if (error) return json({ ok: false, error: error.message }, 500);
  await logAudit(a.admin, { business_id, lead_magnet_id: data?.id, action: "lead_magnet_created", action_status: "recorded", after_json: data ?? {}, is_test_data });
  return json({ ok: true, lead_magnet: data, ...SAFETY_FLAGS });
});