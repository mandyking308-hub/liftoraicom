import { corsHeaders, json, requireFounder, SAFETY_FLAGS } from "../_shared/paidMediaLogic.ts";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  const cnt = async (t: string, filter?: (q: any) => any) => {
    let q: any = a.admin.from(t).select("id", { count: "exact", head: true });
    if (filter) q = filter(q);
    const { count } = await q; return count ?? 0;
  };
  return json({
    ok: true,
    campaign_plans_total: await cnt("paid_media_campaign_plans"),
    plans_needing_review: await cnt("paid_media_campaign_plans", q => q.eq("approval_status", "needs_review")),
    audience_segments_total: await cnt("paid_media_audience_segments"),
    creative_variants_total: await cnt("paid_media_creative_variants"),
    budget_guards_total: await cnt("paid_media_budget_guards"),
    spend_scenarios_total: await cnt("paid_media_spend_scenarios"),
    readiness_checks_total: await cnt("paid_media_readiness_checks"),
    risk_reviews_total: await cnt("paid_media_risk_reviews"),
    manual_exports_total: await cnt("paid_media_manual_export_packs"),
    export_ready_count: await cnt("paid_media_manual_export_packs", q => q.eq("export_status", "ready")),
    manually_configured_count: await cnt("paid_media_campaign_plans", q => q.eq("manual_launch_status", "manually_configured")),
    manually_launched_external_count: await cnt("paid_media_campaign_plans", q => q.eq("manual_launch_status", "manually_launched_external")),
    blocked_campaigns: await cnt("paid_media_campaign_plans", q => q.eq("campaign_status", "blocked")),
    external_api_calls_total: 0, campaigns_launched_total: 0, ads_created_externally_total: 0,
    money_spent_total: 0, payment_methods_created_total: 0, pixels_created_total: 0, fake_metrics_created_total: 0,
    no_external_action: true, safety: SAFETY_FLAGS,
  });
});
