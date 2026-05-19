import { corsHeaders, json, requireFounder, logAudit, SAFETY_FLAGS } from "../_shared/websiteFunnelLogic.ts";
const PHRASE = "CREATE CONVERSION CTA MAP";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  let body: any = {}; try { body = await req.json(); } catch {}
  const { business_id, map_name, source_type = "social_content", source_id, platform, campaign_plan_id, content_item_id, calendar_item_id, keyword_rule_id, funnel_strategy_id, page_draft_id, lead_magnet_id, cta_text, cta_url, destination_type, is_test_data = false, dry_run = true, confirmation_phrase } = body;
  if (!business_id || !map_name) return json({ ok: false, error: "missing_fields" }, 400);
  if (dry_run || confirmation_phrase !== PHRASE) {
    return json({ ok: true, dry_run: true, phrase_required: PHRASE, no_records_mutated: true, ...SAFETY_FLAGS });
  }
  const { data, error } = await a.admin.from("conversion_cta_maps").insert({
    business_id, map_name, source_type, source_id: source_id ?? null, platform,
    campaign_plan_id: campaign_plan_id ?? null, content_item_id: content_item_id ?? null,
    calendar_item_id: calendar_item_id ?? null, keyword_rule_id: keyword_rule_id ?? null,
    funnel_strategy_id: funnel_strategy_id ?? null, page_draft_id: page_draft_id ?? null,
    lead_magnet_id: lead_magnet_id ?? null, cta_text, cta_url,
    destination_type: destination_type ?? (lead_magnet_id ? "lead_magnet" : page_draft_id ? "landing_page" : "website_page"),
    destination_status: page_draft_id || lead_magnet_id ? "draft" : "needs_build",
    is_test_data,
  }).select().maybeSingle();
  if (error) return json({ ok: false, error: error.message }, 500);
  // Best-effort link updates (ignore failures if column missing)
  if (content_item_id) { try { await a.admin.from("social_content_items").update({ cta_map_id: data?.id, funnel_destination_status: "mapped" }).eq("id", content_item_id); } catch (_) {} }
  if (calendar_item_id) { try { await a.admin.from("social_calendar_items").update({ cta_map_id: data?.id, funnel_destination_status: "mapped" }).eq("id", calendar_item_id); } catch (_) {} }
  await logAudit(a.admin, { business_id, cta_map_id: data?.id, funnel_strategy_id: funnel_strategy_id ?? null, page_draft_id: page_draft_id ?? null, lead_magnet_id: lead_magnet_id ?? null, action: "cta_map_created", action_status: "recorded", after_json: data ?? {}, is_test_data });
  return json({ ok: true, cta_map: data, ...SAFETY_FLAGS });
});