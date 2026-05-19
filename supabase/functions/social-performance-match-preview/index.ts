import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";
import { SAFETY_FLAGS } from "../_shared/socialAnalyticsLogic.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  const body = await req.json().catch(() => ({} as any));
  const business_id = body.business_id;
  if (!business_id) return json({ ok: false, error: "business_id_required" }, 400);
  const limit = Math.min(200, Number(body.limit ?? 50));

  let q: any = a.admin.from("social_performance_metrics").select("*").eq("business_id", business_id).limit(limit);
  if (body.metric_id) q = q.eq("id", body.metric_id);
  if (body.import_batch_id) q = q.eq("import_batch_id", body.import_batch_id);
  const { data: metrics } = await q;
  const list = (metrics ?? []) as any[];

  const candidates: any[] = [];
  for (const m of list) {
    const cand: any = { metric_id: m.id, platform: m.platform ?? m.platform_key, matches: [], confidence: "low", needs_review: true };
    if (m.content_item_id || m.campaign_plan_id || m.calendar_item_id || m.asset_id) {
      cand.confidence = "already_linked"; cand.needs_review = false;
      candidates.push(cand); continue;
    }
    if (m.external_post_id) {
      const { data: pj } = await a.admin.from("social_publish_jobs").select("id,content_item_id,calendar_item_id")
        .eq("business_id", business_id).eq("external_post_id", m.external_post_id).limit(3);
      (pj ?? []).forEach((p: any) => cand.matches.push({ source: "publish_job", target_type: "content_item", target_id: p.content_item_id, confidence: "high" }));
    }
    if (m.caption_snippet) {
      const snippet = String(m.caption_snippet).slice(0, 40);
      const { data: ci } = await a.admin.from("social_content_items").select("id,hook,caption")
        .eq("business_id", business_id).ilike("caption", `%${snippet}%`).limit(3);
      (ci ?? []).forEach((c: any) => cand.matches.push({ source: "caption_fuzzy", target_type: "content_item", target_id: c.id, confidence: "low" }));
    }
    if (cand.matches.some((x: any) => x.confidence === "high")) cand.confidence = "high";
    else if (cand.matches.length) cand.confidence = "low";
    candidates.push(cand);
  }

  return json({ ok: true, business_id, evaluated: list.length, candidates, no_records_mutated: true, ...SAFETY_FLAGS });
});