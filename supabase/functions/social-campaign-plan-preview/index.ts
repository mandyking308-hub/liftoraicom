import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";
import { buildCampaignPreview } from "../_shared/socialCampaignLogic.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const g = await requireFounder(req); if ("error" in g) return g.error;
  const { admin } = g;
  const body = await req.json().catch(() => ({}));
  const business_id = body.business_id;
  if (!business_id) return json({ ok: false, error: "business_id_required" }, 400);
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

  return json({ ok: true, no_records_mutated: true, dry_run: true, campaign_type, preview });
});