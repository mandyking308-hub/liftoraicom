import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";
import { evaluateContentItem, evaluateCalendarItem } from "../_shared/socialPublishLogic.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  let body: any = {}; try { body = await req.json(); } catch {}
  const { business_id, calendar_id, calendar_item_ids, content_item_ids, content_pack_id, campaign_plan_id, platform, provider } = body;
  if (!business_id) return json({ ok: false, error: "business_id_required" }, 400);

  let contentQ = a.admin.from("social_content_items").select("*").eq("business_id", business_id);
  if (content_item_ids?.length) contentQ = contentQ.in("id", content_item_ids);
  else if (content_pack_id) contentQ = contentQ.eq("pack_id", content_pack_id);
  else if (campaign_plan_id) contentQ = contentQ.eq("campaign_plan_id", campaign_plan_id);
  else contentQ = contentQ.eq("publish_readiness", "approved_internal");
  if (platform) contentQ = contentQ.eq("platform", platform);
  if (provider) contentQ = contentQ.eq("provider", provider);
  const { data: items } = await contentQ.limit(500);

  let calQ = a.admin.from("social_calendar_items").select("*, content_item:social_content_items(*)").eq("business_id", business_id);
  if (calendar_item_ids?.length) calQ = calQ.in("id", calendar_item_ids);
  else if (calendar_id) calQ = calQ.eq("calendar_id", calendar_id);
  else calQ = calQ.eq("queue_readiness", "ready_for_queue");
  if (platform) calQ = calQ.eq("platform", platform);
  if (provider) calQ = calQ.eq("provider", provider);
  const { data: calItems } = await calQ.limit(500);

  const evals = [
    ...(items || []).map(evaluateContentItem),
    ...(calItems || []).map((r: any) => evaluateCalendarItem(r, r.content_item)),
  ];
  const eligible = evals.filter((e) => e.eligible);
  const blocked = evals.filter((e) => !e.eligible);

  return json({
    ok: true, no_records_mutated: true,
    eligible_count: eligible.length, blocked_count: blocked.length,
    eligible, blocked,
    provider_recommendation: provider || (eligible[0]?.provider ?? null),
    platform_recommendation: platform || (eligible[0]?.platform ?? null),
  });
});