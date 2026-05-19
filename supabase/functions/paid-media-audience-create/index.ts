import { corsHeaders, json, requireFounder, logAudit, requirePhrase, SAFETY_FLAGS } from "../_shared/paidMediaLogic.ts";
const PHRASE = "CREATE PAID MEDIA AUDIENCE PLAN";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  let body: any = {}; try { body = await req.json(); } catch {}
  const block = requirePhrase(body, PHRASE); if (block) return block;
  if (!body.business_id) return json({ ok: false, error: "missing_business_id" }, 400);
  const segments = Array.isArray(body.segments) ? body.segments : [];
  if (body.dry_run !== false) return json({ ok: true, dry_run: true, no_records_mutated: true, preview: segments, safety: SAFETY_FLAGS });
  const rows = segments.map((s: any) => ({
    business_id: body.business_id, campaign_plan_id: body.campaign_plan_id ?? null,
    segment_name: s.segment_name, segment_type: s.segment_type, platform: s.platform ?? null,
    audience_description: s.audience_description ?? null,
    inclusion_criteria: s.inclusion_criteria ?? [], exclusion_criteria: s.exclusion_criteria ?? [],
    geo_targets: s.geo_targets ?? [], age_range: s.age_range ?? null,
    interests: s.interests ?? [], behaviours: s.behaviours ?? [], keywords: s.keywords ?? [],
    retargeting_source: s.retargeting_source ?? null, lookalike_source: s.lookalike_source ?? null,
    customer_list_required: !!s.customer_list_required,
    risk_warnings: s.risk_warnings ?? [], privacy_warnings: s.privacy_warnings ?? [],
    is_test_data: !!body.is_test_data,
  }));
  const { data, error } = await a.admin.from("paid_media_audience_segments").insert(rows).select();
  if (error) return json({ ok: false, error: error.message }, 500);
  await logAudit(a.admin, { business_id: body.business_id, campaign_plan_id: body.campaign_plan_id ?? null, action: "audience_plan_created", result_json: { count: data.length } });
  return json({ ok: true, segments: data, safety: SAFETY_FLAGS });
});
