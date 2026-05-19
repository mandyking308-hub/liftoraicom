import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";
import { buildCampaignPreview } from "../_shared/socialCampaignLogic.ts";

const CONFIRM = "CREATE SOCIAL CAMPAIGN PLAN";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const g = await requireFounder(req); if ("error" in g) return g.error;
  const { admin } = g;
  const body = await req.json().catch(() => ({}));
  const business_id = body.business_id;
  if (!business_id) return json({ ok: false, error: "business_id_required" }, 400);
  const dry_run = body.dry_run !== false;
  if (!dry_run && body.confirmation_phrase !== CONFIRM)
    return json({ ok: false, error: `confirmation_phrase_required:${CONFIRM}` }, 400);

  const campaign_type = body.campaign_type || "awareness";
  const [brain, offers, pillars, rules, assets, risks] = await Promise.all([
    admin.from("business_social_brain_profiles").select("brand_voice,icp_summary").eq("business_id", business_id).maybeSingle(),
    admin.from("business_social_offer_mappings").select("id,offer_name,cta,pain_point").eq("business_id", business_id),
    admin.from("business_social_content_pillars").select("name,funnel_stage").eq("business_id", business_id),
    admin.from("business_social_platform_rules").select("platform,suitability").eq("business_id", business_id),
    admin.from("social_assets").select("id,consent_status").eq("business_id", business_id).limit(50),
    admin.from("business_social_risk_flags").select("severity,category").eq("business_id", business_id),
  ]);
  const preview = buildCampaignPreview({
    inputs: {
      businessId: business_id,
      businessName: body.business_name,
      brain: brain.data as any,
      offers: offers.data || [],
      pillars: pillars.data || [],
      rules: rules.data || [],
      assets: assets.data || [],
      risks: risks.data || [],
    },
    campaign_type,
    payload: body,
  });

  const row = {
    business_id,
    campaign_name: body.campaign_name || `${campaign_type} campaign`,
    campaign_type,
    campaign_status: "draft",
    campaign_goal: body.campaign_goal,
    target_audience: body.target_audience,
    primary_offer: preview.primary_offer,
    secondary_offer: body.secondary_offer,
    linked_revenue_target_id: body.linked_revenue_target_id,
    linked_social_content_pack_id: body.linked_social_content_pack_id,
    start_date: body.start_date,
    end_date: body.end_date,
    platforms: preview.platforms,
    customer_journey_stage: preview.customer_journey_stage,
    funnel_stage: preview.funnel_stage,
    campaign_summary: preview.campaign_summary,
    key_message: preview.key_message,
    primary_cta: preview.primary_cta,
    secondary_cta: preview.secondary_cta,
    proof_needed: preview.proof_needed,
    required_assets: preview.required_assets,
    missing_assets: preview.missing_assets,
    risk_flags: preview.risk_flags,
    compliance_warnings: preview.compliance_warnings,
    readiness_score: preview.readiness_score,
    approval_status: "draft",
    founder_notes: body.founder_notes,
    is_test_data: !!body.is_test_data,
  };

  if (dry_run) return json({ ok: true, dry_run: true, no_records_mutated: true, would_insert: row });

  const { data, error } = await admin.from("social_campaign_plans").insert(row).select("*").single();
  if (error) return json({ ok: false, error: error.message }, 500);
  return json({ ok: true, plan: data });
});