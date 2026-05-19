import { inferBusinessType, SENSITIVE_SECTORS } from "./socialContentFactory.ts";

export type CampaignInputs = {
  businessId: string;
  businessName?: string;
  brain?: { brand_voice?: string; icp_summary?: string };
  offers: Array<{ id?: string; offer_name?: string; cta?: string; pain_point?: string }>;
  pillars: Array<{ name: string; funnel_stage?: string }>;
  rules: Array<{ platform: string; suitability?: string }>;
  assets: Array<{ id: string; consent_status?: string }>;
  risks: Array<{ severity?: string; category?: string }>;
};

const CAMPAIGN_DEFAULTS: Record<string, { funnel: string; journey: string; ctas: string[]; proof: string[]; platforms: string[] }> = {
  awareness:        { funnel: "awareness",    journey: "prospect",         ctas: ["Learn more", "Follow"],                 proof: ["brand_story"],                 platforms: ["instagram","tiktok"] },
  launch:           { funnel: "awareness",    journey: "prospect",         ctas: ["See the launch", "Sign up"],            proof: ["launch_visuals","press"],      platforms: ["instagram","tiktok","linkedin"] },
  lead_generation:  { funnel: "consideration",journey: "lead",             ctas: ["Get the guide", "Book a call"],         proof: ["lead_magnet","case_study"],    platforms: ["instagram","linkedin","facebook"] },
  conversion:       { funnel: "conversion",   journey: "warm_lead",        ctas: ["Buy now", "Start trial"],               proof: ["testimonial","before_after"],  platforms: ["instagram","facebook","tiktok"] },
  onboarding:       { funnel: "onboarding",   journey: "onboarding",       ctas: ["Watch the setup", "Read the guide"],    proof: ["setup_demo","docs"],           platforms: ["email","linkedin","blog"] },
  retention:        { funnel: "retention",    journey: "active_customer",  ctas: ["Try this feature", "Tell us"],          proof: ["usage_tip","success_story"],   platforms: ["email","instagram"] },
  upsell:           { funnel: "expansion",    journey: "active_customer",  ctas: ["Upgrade", "Add this"],                  proof: ["upgrade_story","roi_example"], platforms: ["email","linkedin"] },
  win_back:         { funnel: "win_back",     journey: "churned_customer", ctas: ["Come back", "See what's new"],          proof: ["whats_new","incentive"],       platforms: ["email","instagram"] },
  authority:        { funnel: "consideration",journey: "prospect",         ctas: ["Read the post", "Follow for insights"], proof: ["thought_leadership","data"],   platforms: ["linkedin","x","blog"] },
  community:        { funnel: "retention",    journey: "advocate",         ctas: ["Join the convo", "Tag a friend"],       proof: ["ugc","community_post"],        platforms: ["instagram","tiktok"] },
  seasonal:         { funnel: "awareness",    journey: "prospect",         ctas: ["Shop the drop"],                        proof: ["seasonal_visuals"],            platforms: ["instagram","tiktok"] },
  partnership:      { funnel: "consideration",journey: "lead",             ctas: ["Meet our partner"],                     proof: ["partner_logo","case_study"],   platforms: ["linkedin","instagram"] },
  creator_outreach: { funnel: "awareness",    journey: "advocate",         ctas: ["Collab with us"],                       proof: ["creator_brief"],               platforms: ["instagram","tiktok"] },
  product_education:{ funnel: "consideration",journey: "warm_lead",        ctas: ["See the demo"],                         proof: ["demo_video","tutorial"],       platforms: ["youtube_shorts","linkedin","blog"] },
  support_education:{ funnel: "retention",    journey: "client",           ctas: ["See the FAQ"],                          proof: ["faq","support_doc"],           platforms: ["email","blog"] },
  custom:           { funnel: "awareness",    journey: "prospect",         ctas: ["Learn more"],                           proof: [],                              platforms: ["instagram"] },
};

export function buildCampaignPreview(opts: {
  inputs: CampaignInputs;
  campaign_type: string;
  payload: any;
}) {
  const { inputs, campaign_type, payload } = opts;
  const defaults = CAMPAIGN_DEFAULTS[campaign_type] || CAMPAIGN_DEFAULTS.custom;
  const btype = inferBusinessType(inputs.businessName, undefined, inputs.brain?.icp_summary);
  const sensitive = SENSITIVE_SECTORS.includes(btype) || (inputs.risks || []).some(r => r.severity === "high");

  const primary_offer = payload.primary_offer || inputs.offers?.[0]?.offer_name || null;
  const primary_cta = payload.primary_cta || inputs.offers?.[0]?.cta || defaults.ctas[0];
  const secondary_cta = payload.secondary_cta || defaults.ctas[1] || null;
  const platforms = payload.platforms?.length ? payload.platforms : defaults.platforms;

  const usableAssets = (inputs.assets || []).filter(a => a.consent_status === "approved" || a.consent_status === "verified");
  const missing_assets: string[] = [];
  if (!usableAssets.length) missing_assets.push("No approved-rights assets registered — visual campaign blocked.");
  if (!primary_offer) missing_assets.push("No primary offer set.");

  const proof_needed: string[] = [...defaults.proof];
  const compliance_warnings: string[] = [];
  if (sensitive) {
    compliance_warnings.push(`Sensitive sector (${btype}) — founder/legal review required, no outcome claims.`);
    proof_needed.push("legal_disclaimer");
  }
  if (!inputs.brain?.brand_voice) compliance_warnings.push("No brand voice — campaign confidence reduced.");

  const key_message = payload.key_message ||
    `${payload.campaign_name || campaign_type} — ${primary_offer || "your offer"}. ${inputs.brain?.brand_voice || ""}`.trim();

  const readiness_score = scoreReadiness({
    primary_offer, hasAssets: usableAssets.length > 0, sensitive,
    hasBrand: !!inputs.brain?.brand_voice, hasPillars: (inputs.pillars?.length || 0) > 0,
  });

  return {
    campaign_summary: `${campaign_type} campaign for ${inputs.businessName || "business"}. Internal draft. Funnel: ${defaults.funnel}. Journey: ${defaults.journey}.`,
    key_message,
    primary_cta, secondary_cta,
    platforms,
    funnel_stage: defaults.funnel,
    customer_journey_stage: defaults.journey,
    proof_needed,
    required_assets: ["hero_visual", "supporting_visuals"],
    missing_assets,
    risk_flags: sensitive ? ["sensitive_sector"] : [],
    compliance_warnings,
    readiness_score,
    primary_offer,
  };
}

export function scoreReadiness(opts: { primary_offer: any; hasAssets: boolean; sensitive: boolean; hasBrand: boolean; hasPillars: boolean }) {
  let s = 20;
  if (opts.primary_offer) s += 25;
  if (opts.hasAssets) s += 20;
  if (opts.hasBrand) s += 15;
  if (opts.hasPillars) s += 10;
  if (opts.sensitive) s -= 20;
  return Math.max(0, Math.min(100, s));
}

export function defaultJourneyRules(): Array<{ journey_stage: string; rule_name: string; rule_description: string; recommended_content_types: string[]; recommended_ctas: string[]; proof_needed: string[]; tone_notes: string }> {
  return [
    { journey_stage: "prospect", rule_name: "Awareness / problem-aware", rule_description: "Hook curiosity, surface the pain.", recommended_content_types: ["reel","short","carousel"], recommended_ctas: ["Follow","Learn more"], proof_needed: ["brand_story"], tone_notes: "Curious, not pushy." },
    { journey_stage: "lead", rule_name: "Education + proof", rule_description: "Educate, build trust, soft CTA.", recommended_content_types: ["carousel","blog","reel"], recommended_ctas: ["Get the guide","Read more"], proof_needed: ["case_study","faq"], tone_notes: "Helpful, expert." },
    { journey_stage: "warm_lead", rule_name: "Comparison + demo", rule_description: "Show the how + outcome.", recommended_content_types: ["demo","carousel","reel"], recommended_ctas: ["See the demo","Book a call"], proof_needed: ["demo","testimonial"], tone_notes: "Clear, confident." },
    { journey_stage: "qualified", rule_name: "Proposal/demo support", rule_description: "Reinforce confidence pre-deal.", recommended_content_types: ["testimonial","case_study"], recommended_ctas: ["Reply to confirm"], proof_needed: ["case_study"], tone_notes: "Trust-building." },
    { journey_stage: "client", rule_name: "Onboarding + usage", rule_description: "Help them get to value fast.", recommended_content_types: ["tutorial","email","carousel"], recommended_ctas: ["Watch the setup"], proof_needed: ["setup_demo"], tone_notes: "Reassuring." },
    { journey_stage: "active_customer", rule_name: "Retention + expansion", rule_description: "Reinforce value, surface upgrades.", recommended_content_types: ["tip","email","carousel"], recommended_ctas: ["Try this","Upgrade"], proof_needed: ["usage_tip"], tone_notes: "Empowering." },
    { journey_stage: "at_risk_customer", rule_name: "Reassure + resolve", rule_description: "Address friction directly.", recommended_content_types: ["email","support_post"], recommended_ctas: ["Tell us","Book support"], proof_needed: ["case_study"], tone_notes: "Calm, helpful." },
    { journey_stage: "churned_customer", rule_name: "Win-back", rule_description: "What changed + soft re-entry.", recommended_content_types: ["email","reel"], recommended_ctas: ["See what's new","Come back"], proof_needed: ["whats_new"], tone_notes: "Honest, no pressure." },
    { journey_stage: "advocate", rule_name: "Referral + UGC", rule_description: "Activate fans, request testimonials.", recommended_content_types: ["ugc","case_study"], recommended_ctas: ["Refer a friend","Share your story"], proof_needed: ["testimonial_permission"], tone_notes: "Grateful, warm." },
  ];
}

export function estimateRevenueStrategy(opts: { target_amount?: number; target_count?: number; price?: number; primary_offer?: string }) {
  const assumptions: Record<string, unknown> = {};
  const blockers: string[] = [];
  let estLeads: number | null = null;
  let estContent: number | null = null;
  let convRate: number | null = null;

  if (opts.target_amount && opts.price) {
    const signupsNeeded = Math.ceil(opts.target_amount / opts.price);
    assumptions["signups_needed"] = signupsNeeded;
    convRate = 0.03;
    estLeads = Math.ceil(signupsNeeded / convRate);
    estContent = Math.max(12, Math.ceil(estLeads / 50));
    assumptions["conversion_rate_assumption"] = "3% (industry placeholder — replace with real data)";
  } else if (opts.target_count) {
    convRate = 0.03;
    estLeads = Math.ceil(opts.target_count / convRate);
    estContent = Math.max(12, Math.ceil(estLeads / 50));
    assumptions["conversion_rate_assumption"] = "3% placeholder";
  } else {
    blockers.push("No target_amount/target_count provided.");
  }
  if (opts.target_amount && !opts.price) blockers.push("Price unknown — cannot estimate signups. Provide offer pricing.");
  if (!opts.primary_offer) blockers.push("No primary_offer linked.");

  return {
    estimated_leads_needed: estLeads,
    estimated_conversion_rate: convRate,
    estimated_content_volume: estContent,
    revenue_assumptions: assumptions,
    blockers,
    confidence_score: blockers.length === 0 ? 70 : Math.max(20, 70 - blockers.length * 20),
  };
}