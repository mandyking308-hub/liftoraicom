import { corsHeaders, json, requireFounder, logAudit, SAFETY_FLAGS } from "../_shared/websiteFunnelLogic.ts";
const PHRASE_BUILT = "CONFIRM WEBSITE ASSET MANUALLY BUILT";
const PHRASE_LIVE = "CONFIRM WEBSITE ASSET IS LIVE";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  let body: any = {}; try { body = await req.json(); } catch {}
  const { business_id, funnel_strategy_id, page_draft_id, lead_magnet_id, asset_pack_id, external_url, confirmation_notes, mark_live = false, dry_run = true, confirmation_phrase, live_confirmation_phrase, is_test_data = false } = body;
  if (!business_id) return json({ ok: false, error: "missing_business_id" }, 400);
  if (dry_run || confirmation_phrase !== PHRASE_BUILT) {
    return json({ ok: true, dry_run: true, phrase_required: PHRASE_BUILT, live_phrase_required: PHRASE_LIVE, no_records_mutated: true, ...SAFETY_FLAGS });
  }
  if (mark_live && live_confirmation_phrase !== PHRASE_LIVE) {
    return json({ ok: false, error: "live_phrase_required", live_phrase_required: PHRASE_LIVE }, 400);
  }
  const newStatus = mark_live ? "live_confirmed_external" : "manually_built";
  if (page_draft_id) await a.admin.from("website_landing_page_drafts").update({ page_status: newStatus, page_url_intended: external_url ?? undefined }).eq("id", page_draft_id);
  if (lead_magnet_id) await a.admin.from("lead_magnet_assets").update({ lead_magnet_status: newStatus }).eq("id", lead_magnet_id);
  if (funnel_strategy_id) await a.admin.from("website_funnel_strategies").update({ strategy_status: newStatus }).eq("id", funnel_strategy_id);
  if (asset_pack_id) await a.admin.from("conversion_asset_packs").update({ pack_status: newStatus }).eq("id", asset_pack_id);
  await logAudit(a.admin, { business_id, funnel_strategy_id: funnel_strategy_id ?? null, page_draft_id: page_draft_id ?? null, lead_magnet_id: lead_magnet_id ?? null, asset_pack_id: asset_pack_id ?? null, action: "live_confirmation_recorded", action_status: "recorded", result_json: { newStatus, external_url, confirmation_notes }, is_test_data });
  return json({ ok: true, new_status: newStatus, ...SAFETY_FLAGS });
});