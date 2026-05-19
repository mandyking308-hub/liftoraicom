import { corsHeaders, json, requireFounder, logAudit, SAFETY_FLAGS } from "../_shared/websiteFunnelLogic.ts";
const PHRASE = "CREATE CONVERSION ASSET PACK";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  let body: any = {}; try { body = await req.json(); } catch {}
  const { business_id, pack_name, pack_type = "landing_page_pack", funnel_strategy_id, page_draft_id, lead_magnet_id, campaign_plan_id, copy_blocks, asset_requirements, builder_instructions, operator_checklist, is_test_data = false, dry_run = true, confirmation_phrase } = body;
  if (!business_id || !pack_name) return json({ ok: false, error: "missing_fields" }, 400);
  if (dry_run || confirmation_phrase !== PHRASE) {
    return json({ ok: true, dry_run: true, phrase_required: PHRASE, no_records_mutated: true, ...SAFETY_FLAGS });
  }
  const { data, error } = await a.admin.from("conversion_asset_packs").insert({
    business_id, pack_name, pack_type,
    funnel_strategy_id: funnel_strategy_id ?? null, page_draft_id: page_draft_id ?? null,
    lead_magnet_id: lead_magnet_id ?? null, campaign_plan_id: campaign_plan_id ?? null,
    copy_blocks: copy_blocks ?? [], asset_requirements: asset_requirements ?? [],
    builder_instructions, operator_checklist: operator_checklist ?? [],
    pack_status: "needs_review", is_test_data,
  }).select().maybeSingle();
  if (error) return json({ ok: false, error: error.message }, 500);
  await logAudit(a.admin, { business_id, asset_pack_id: data?.id, funnel_strategy_id: funnel_strategy_id ?? null, page_draft_id: page_draft_id ?? null, lead_magnet_id: lead_magnet_id ?? null, action: "asset_pack_created", action_status: "recorded", after_json: data ?? {}, is_test_data });
  return json({ ok: true, asset_pack: data, ...SAFETY_FLAGS });
});