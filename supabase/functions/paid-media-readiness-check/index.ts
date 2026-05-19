import { corsHeaders, json, requireFounder, logAudit, SAFETY_FLAGS } from "../_shared/paidMediaLogic.ts";
const PHRASE = "SAVE PAID MEDIA READINESS CHECK";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  let body: any = {}; try { body = await req.json(); } catch {}
  if (!body.business_id || !body.campaign_plan_id) return json({ ok: false, error: "missing_required_fields" }, 400);
  const { data: plan } = await a.admin.from("paid_media_campaign_plans").select("*").eq("id", body.campaign_plan_id).single();
  const { count: creativeCount } = await a.admin.from("paid_media_creative_variants").select("id", { count: "exact", head: true }).eq("campaign_plan_id", body.campaign_plan_id);
  const { count: audCount } = await a.admin.from("paid_media_audience_segments").select("id", { count: "exact", head: true }).eq("campaign_plan_id", body.campaign_plan_id);
  const { count: guardCount } = await a.admin.from("paid_media_budget_guards").select("id", { count: "exact", head: true }).eq("campaign_plan_id", body.campaign_plan_id);
  const checks = {
    funnel_ready: !!plan?.linked_funnel_strategy_id,
    landing_page_ready: !!plan?.linked_landing_page_id,
    creative_ready: (creativeCount ?? 0) > 0,
    audience_ready: (audCount ?? 0) > 0,
    budget_guard_ready: (guardCount ?? 0) > 0,
    tracking_plan_ready: false, compliance_ready: false, privacy_ready: false,
  };
  const missing = Object.entries(checks).filter(([_, v]) => !v).map(([k]) => k);
  const score = Math.round(((Object.values(checks).filter(Boolean).length) / Object.values(checks).length) * 100);
  const row = {
    business_id: body.business_id, campaign_plan_id: body.campaign_plan_id,
    check_name: body.check_name ?? "Pre-launch readiness",
    check_status: missing.length ? "warning" : "passed_internal",
    readiness_score: score, ...checks,
    missing_items: missing, blockers: missing.filter(m => ["funnel_ready", "landing_page_ready", "budget_guard_ready"].includes(m)),
    warnings: [], recommended_next_actions: missing.map(m => `Fix: ${m}`),
    is_test_data: !!body.is_test_data,
  };
  if (body.dry_run !== false || body.confirmation_phrase !== PHRASE) {
    return json({ ok: true, dry_run: true, no_records_mutated: true, check: row, safety: SAFETY_FLAGS });
  }
  const { data, error } = await a.admin.from("paid_media_readiness_checks").insert(row).select().single();
  if (error) return json({ ok: false, error: error.message }, 500);
  await logAudit(a.admin, { business_id: body.business_id, readiness_check_id: data.id, action: "readiness_check_created", after_json: data });
  return json({ ok: true, check: data, safety: SAFETY_FLAGS });
});
