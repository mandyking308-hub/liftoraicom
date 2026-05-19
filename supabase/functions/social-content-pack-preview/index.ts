import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";
import { generatePack } from "../_shared/socialContentFactory.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const g = await requireFounder(req); if ("error" in g) return g.error;
  const { admin } = g;
  const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
  const business_id = body.business_id;
  if (!business_id) return json({ ok: false, error: "business_id_required" }, 400);

  const days = Number(body.days_count ?? 30);
  const platforms: string[] = (body.platforms?.length ? body.platforms : ["instagram", "tiktok"]);

  const [profile, pillars, rules, offers, risks, assets, hooks, brain] = await Promise.all([
    admin.from("business_social_brain_profiles").select("*").eq("business_id", business_id).maybeSingle(),
    admin.from("business_social_content_pillars").select("id,name,funnel_stage").eq("business_id", business_id),
    admin.from("business_social_platform_rules").select("platform,suitability,cadence").eq("business_id", business_id),
    admin.from("business_social_offer_mappings").select("id,offer_name,cta,pain_point").eq("business_id", business_id),
    admin.from("business_social_risk_flags").select("category,severity,rule").eq("business_id", business_id),
    admin.from("social_assets").select("id,consent_status,asset_type,title").eq("business_id", business_id).limit(50),
    admin.from("social_hook_caption_bank").select("hook,platform").eq("business_id", business_id).limit(50),
    admin.from("business_social_brain_profiles").select("brand_voice,icp_summary").eq("business_id", business_id).maybeSingle(),
  ]);

  const preview = generatePack({
    inputs: {
      businessId: business_id,
      businessName: body.business_name,
      businessType: body.business_type,
      brandVoice: (brain.data as any)?.brand_voice,
      pillars: pillars.data || [],
      platformRules: rules.data || [],
      offers: offers.data || [],
      riskFlags: risks.data || [],
      assets: assets.data || [],
      hookBank: hooks.data || [],
      knowledgeSummary: (brain.data as any)?.icp_summary,
    },
    days, platforms,
    startDate: body.start_date,
    goal: body.pack_type || body.goal,
  });

  return json({
    ok: true, no_records_mutated: true, dry_run: true,
    pack: preview.pack,
    proposed_posts: preview.items,
    proposed_variants: preview.variants,
    missing_assets: preview.missing_assets,
    compliance_warnings: preview.compliance_warnings,
    confidence_score: preview.confidence,
  });
});