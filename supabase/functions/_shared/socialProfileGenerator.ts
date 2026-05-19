// Pure-logic generator for the Business Social Operating Profile.
// No external calls. Used by social-profile-generator-* edge functions.
// Multi-business safe — no NeonCandy-specific logic.

import { detectSensitiveSectors } from "./socialBrainLogic.ts";

export type BrainProfile = Record<string, any> | null;
export type SourceLite = {
  id: string;
  source_type: string;
  title: string;
  pasted_text?: string | null;
  summary?: string | null;
  approved_for_social_training?: boolean | null;
};

const ALL_PLATFORMS = [
  "instagram","tiktok","youtube_shorts","facebook","linkedin",
  "x_twitter","website_blog","email_newsletter","pinterest","other",
] as const;

type Platform = typeof ALL_PLATFORMS[number];

const SECTOR_TO_RISK: Record<string,{type:string;level:string;legal:boolean;guard:string}> = {
  health:           { type:"health_claims",      level:"high",     legal:true,  guard:"No outcome guarantees. Add 'not medical advice' disclaimer. Founder + legal review." },
  finance:          { type:"financial_claims",   level:"high",     legal:true,  guard:"No return/yield claims. Add 'not financial advice' disclaimer." },
  legal:            { type:"legal_claims",       level:"high",     legal:true,  guard:"No legal advice claims. Add 'not legal advice' disclaimer." },
  children_education:{type:"children_education", level:"high",     legal:true,  guard:"Safeguarding rules apply. Founder + legal review before publish." },
  property:         { type:"property_investment",level:"high",     legal:true,  guard:"No investment / guaranteed return claims. Compliance review." },
  charity:          { type:"charity_donor",      level:"medium",   legal:true,  guard:"Donor privacy + fundraising regulator rules apply." },
  medical:          { type:"health_claims",      level:"critical", legal:true,  guard:"Regulated medical content — founder + legal review mandatory." },
  employment:       { type:"employment",         level:"medium",   legal:false, guard:"Avoid discriminatory language. Comply with employment rules." },
};

function inferBusinessType(corpus: string, hint?: string): string {
  const c = (corpus + " " + (hint ?? "")).toLowerCase();
  if (/\b(music|track|playlist|artist|label|song|record)\b/.test(c)) return "music_creative";
  if (/\b(saas|software|api|developer|platform|b2b)\b/.test(c)) return "b2b_saas";
  if (/\b(beauty|cosmetics|skincare|fashion|apparel|ecommerce|shop|store)\b/.test(c)) return "ecommerce";
  if (/\b(consult|coach|agency|service|advisory)\b/.test(c)) return "service_business";
  if (/\b(charity|donor|fundrais)\b/.test(c)) return "charity";
  if (/\b(property|real estate|letting|landlord)\b/.test(c)) return "property";
  if (/\b(health|clinic|medical|therapy|wellness)\b/.test(c)) return "health";
  if (/\b(invest|fund|portfolio|trading)\b/.test(c)) return "finance";
  if (/\b(education|school|tutor|teacher|learn)\b/.test(c)) return "education";
  return "generic";
}

function platformsForType(t: string): Partial<Record<Platform,{score:number;use:string;types:string[]}>> {
  switch (t) {
    case "music_creative":
      return {
        instagram: { score:90, use:"Primary fan + curator reach", types:["reel","carousel","story"] },
        tiktok:    { score:90, use:"Discovery + viral teasers",    types:["short"] },
        youtube_shorts:{score:80,use:"Short-form discovery",       types:["short"] },
        facebook:  { score:55, use:"Older fan base + groups",      types:["post","story"] },
      };
    case "b2b_saas":
      return {
        linkedin:  { score:90, use:"Decision-maker reach + thought leadership", types:["post","article","carousel"] },
        youtube_shorts:{score:70,use:"Product demos + how-to",    types:["short","long"] },
        website_blog:{score:80,use:"SEO + technical authority",   types:["article"] },
        email_newsletter:{score:80,use:"Lead nurture",            types:["newsletter"] },
        x_twitter: { score:50, use:"Dev/community signal",        types:["post","thread"] },
      };
    case "ecommerce":
      return {
        instagram: { score:90, use:"Product visuals + UGC",        types:["reel","carousel","story"] },
        tiktok:    { score:85, use:"Product discovery + virality", types:["short"] },
        pinterest: { score:75, use:"Inspiration + long-tail traffic", types:["pin"] },
        facebook:  { score:60, use:"Retargeting + shop integration", types:["post","story","catalog"] },
      };
    case "charity":
      return {
        linkedin:  { score:80, use:"Corporate donors + partnerships", types:["post","article"] },
        facebook:  { score:75, use:"Community + supporter engagement", types:["post","fundraiser"] },
        website_blog:{score:80,use:"Impact stories + transparency",  types:["article"] },
        email_newsletter:{score:80,use:"Donor stewardship",          types:["newsletter"] },
      };
    case "health":
    case "finance":
    case "property":
    case "education":
      return {
        linkedin:  { score:80, use:"Trust-led, authority content", types:["post","article"] },
        website_blog:{score:80,use:"Compliance-friendly long form", types:["article"] },
        email_newsletter:{score:75,use:"Owned-channel nurture",     types:["newsletter"] },
        instagram: { score:50, use:"Brand presence — extra approval", types:["carousel","story"] },
      };
    case "service_business":
      return {
        linkedin:  { score:80, use:"Founder-led B2B reach",     types:["post","article"] },
        instagram: { score:60, use:"Brand + case study visuals", types:["carousel","story"] },
        facebook:  { score:55, use:"Local + community trust",    types:["post"] },
        website_blog:{score:70,use:"SEO + proof",                types:["article"] },
      };
    default:
      return {
        instagram: { score:60, use:"Generic brand presence",    types:["post","carousel"] },
        linkedin:  { score:55, use:"Founder authority",         types:["post"] },
        website_blog:{score:60,use:"Owned content baseline",    types:["article"] },
        email_newsletter:{score:55,use:"Owned-channel nurture", types:["newsletter"] },
      };
  }
}

function pillarsForType(t: string, businessName?: string) {
  const base = [
    { name:"Problem / pain awareness", desc:"Surface the pains your audience already feels.", stage:"awareness", priority:80 },
    { name:"Solution education",       desc:"Show how your approach solves the pain.",         stage:"trust_building", priority:75 },
    { name:"Proof / credibility",      desc:"Case studies, results, testimonials, data.",      stage:"trust_building", priority:75 },
    { name:"Behind the scenes",        desc:"Humanise the brand — process, people, values.",   stage:"community", priority:60 },
    { name:"Offer / conversion",       desc:"Lead toward the primary offer with clear CTAs.",  stage:"conversion", priority:70 },
    { name:"Community / engagement",   desc:"Open loops, prompts, conversations, replies.",    stage:"community", priority:55 },
    { name:"Founder authority",        desc:"Founder POV, opinions, contrarian takes.",        stage:"authority", priority:65 },
  ];
  if (t === "music_creative") {
    base.push({ name:"Track teasers", desc:"Hook-driven music clips with clear CTA.", stage:"awareness", priority:90 });
    base.push({ name:"Fan / creator features", desc:"UGC + creator spotlights.",      stage:"community", priority:70 });
  }
  if (t === "ecommerce") {
    base.push({ name:"Product demo / unboxing", desc:"Show product in use, transformations.", stage:"conversion", priority:80 });
  }
  if (t === "b2b_saas") {
    base.push({ name:"Objection handling", desc:"Address buyer objections + comparisons.", stage:"conversion", priority:75 });
  }
  return base.map(b => ({
    pillar_name: b.name,
    pillar_description: businessName ? `${b.desc} (for ${businessName})` : b.desc,
    funnel_stage: b.stage,
    example_topics: [],
    example_hooks: [],
    priority_score: b.priority,
  }));
}

function offersFromBrain(brain: BrainProfile, businessName?: string) {
  const offers: any[] = [];
  if (brain?.primary_offer_summary) {
    offers.push({
      offer_name: brain.primary_offer_summary,
      offer_summary: `Primary offer for ${businessName ?? "this business"} (drafted from Social Brain).`,
      funnel_stage: "conversion",
      priority_score: 90,
      pain_points: [],
      value_props: [],
      proof_needed: ["customer outcome", "before/after", "testimonial"],
      content_angles: ["pain → solution","proof → CTA","FAQ → CTA"],
      suggested_ctas: brain.primary_cta ? [brain.primary_cta] : [],
      missing: brain.primary_cta ? [] : ["primary_cta"],
    });
  }
  if (brain?.secondary_offer_summary) {
    offers.push({
      offer_name: brain.secondary_offer_summary,
      offer_summary: "Secondary offer (drafted from Social Brain).",
      funnel_stage: "lead_generation",
      priority_score: 60,
      pain_points: [],
      value_props: [],
      proof_needed: [],
      content_angles: [],
      suggested_ctas: brain.secondary_cta ? [brain.secondary_cta] : [],
      missing: ["pricing","proof"],
    });
  }
  return offers;
}

export function buildSocialOperatingProfile(opts: {
  business_id: string;
  business_name?: string;
  business_category?: string;
  brain: BrainProfile;
  sources: SourceLite[];
  founder_notes?: string | null;
}) {
  const { business_name, business_category, brain, sources, founder_notes } = opts;
  const corpus = [
    business_name ?? "",
    business_category ?? "",
    founder_notes ?? "",
    JSON.stringify(brain ?? {}),
    ...sources.map(s => [s.title, s.summary ?? "", s.pasted_text ?? ""].join(" ")),
  ].join("\n");

  const type = inferBusinessType(corpus, business_category);
  const sensitive = detectSensitiveSectors(corpus);
  const platformMap = platformsForType(type);

  const missing_inputs: string[] = [];
  if (!brain) missing_inputs.push("social_brain_profile");
  if (!brain?.brand_voice) missing_inputs.push("brand_voice");
  if (!brain?.audience_summary) missing_inputs.push("audience_summary");
  if (!brain?.primary_offer_summary) missing_inputs.push("primary_offer");
  if (!brain?.primary_cta) missing_inputs.push("primary_cta");
  if (sources.length === 0) missing_inputs.push("knowledge_sources");

  // Confidence: brain quality + sources + sensitive penalty
  const brainScore = Math.min(60, (brain?.confidence_score ?? 0) * 0.6);
  const sourceScore = Math.min(30, sources.length * 6);
  const missingPenalty = Math.min(40, missing_inputs.length * 6);
  const sensitivePenalty = sensitive.length > 0 ? 15 : 0;
  const confidence_score = Math.max(0, Math.min(95, Math.round(brainScore + sourceScore + 20 - missingPenalty - sensitivePenalty)));

  const platform_rules = Object.entries(platformMap).map(([platform, v]) => ({
    platform,
    suitability_score: v!.score,
    recommended_use: v!.use,
    content_types: v!.types,
    tone_adjustments: brain?.brand_voice ?? null,
    posting_frequency: v!.score >= 80 ? "3-5/week" : v!.score >= 60 ? "1-3/week" : "1-2/week",
    best_time_notes: "Founder to confirm timezone slots.",
    caption_rules: "Lead with hook. End with single CTA. No multi-CTA spam.",
    hashtag_rules: platform === "instagram" || platform === "tiktok" ? "3-8 relevant tags, no banned/spam tags." : "Sparingly.",
    link_rules: platform === "instagram" ? "Link in bio only." : "Single primary link.",
    engagement_rules: "Brand-safe public replies. DMs approval-required.",
    risk_notes: sensitive.length > 0 ? `Sensitive sectors: ${sensitive.join(", ")}. Founder review required.` : null,
    approval_required: true,
    is_active: v!.score >= 50,
  }));

  const content_pillars = pillarsForType(type, business_name).map(p => ({
    ...p,
    recommended_platforms: platform_rules
      .filter(pr => pr.is_active)
      .slice(0, 3)
      .map(pr => pr.platform),
    approval_status: "draft",
  }));

  const offers = offersFromBrain(brain, business_name);

  const risk_flags = sensitive.map(s => {
    const r = SECTOR_TO_RISK[s] ?? { type:"other", level:"medium", legal:false, guard:"Founder review." };
    return {
      risk_type: r.type,
      risk_level: r.level,
      risk_description: `Sensitive sector detected: ${s}. Content may trigger platform policy or regulator review.`,
      affected_platforms: platform_rules.map(p => p.platform),
      suggested_guardrail: r.guard,
      founder_review_required: true,
      legal_review_required: r.legal,
      status: "open",
    };
  });

  // Platform-policy risk if no sources at all
  if (sources.length === 0) {
    risk_flags.push({
      risk_type: "platform_policy",
      risk_level: "medium",
      risk_description: "No business knowledge sources registered — content may drift off-brand or off-policy.",
      affected_platforms: [],
      suggested_guardrail: "Register manuals, brand guide, and offer sheet before publishing.",
      founder_review_required: true,
      legal_review_required: false,
      status: "open",
    });
  }

  return {
    business_id: opts.business_id,
    business_type: type,
    positioning: brain?.business_summary ?? `Draft positioning for ${business_name ?? "this business"} — founder review required.`,
    brand_voice: brain?.brand_voice ?? null,
    audience_segments: brain?.audience_summary ? [brain.audience_summary] : [],
    ideal_customer_profile: brain?.ideal_customer_profile ?? brain?.audience_summary ?? null,
    posting_cadence: brain?.posting_cadence ?? { default: "3-5 posts per week, founder-approved." },
    approval_rules: { mode: "approval_required", publish: "blocked_until_founder_approves" },
    engagement_rules: brain?.engagement_rules ?? { public_replies: "short, warm, brand-safe", dms: "approval-required" },
    dm_rules: brain?.dm_rules ?? { cold_dm: "blocked", warm_dm: "approval-required" },
    escalation_rules: brain?.escalation_rules ?? { partnership: "escalate_to_founder", legal_or_complaint: "escalate_to_founder" },
    forbidden_phrases: brain?.forbidden_phrases ?? [],
    forbidden_claims: brain?.forbidden_claims ?? [],
    required_disclaimers: sensitive.length > 0
      ? ["Internal-only draft. Not advice. Founder/legal review required before publish."]
      : (brain?.required_disclaimers ?? []),
    sensitive_sectors: sensitive,
    content_pillars,
    platform_rules,
    offer_mappings: offers,
    risk_flags,
    missing_inputs,
    confidence_score,
    generated_from_sources: sources.map(s => s.id),
    generator_version: "social-profile-generator/1.0",
    safety: {
      auto_publish_allowed: false,
      auto_reply_allowed: false,
      cold_dm_allowed: false,
      provider_calls: false,
    },
  };
}

export function readinessFromCounts(c: {
  profile_exists: boolean;
  profile_status?: string | null;
  approved_pillars_count: number;
  active_platform_rules_count: number;
  critical_risk_flags: number;
  confidence_score: number;
}) {
  const ready_for_content_generation =
    c.profile_exists &&
    (c.profile_status === "approved" || c.profile_status === "applied_to_settings") &&
    c.approved_pillars_count >= 3 &&
    c.active_platform_rules_count >= 1 &&
    c.critical_risk_flags === 0 &&
    c.confidence_score >= 50;
  return {
    ready_for_content_generation,
    ready_for_calendar_generation: ready_for_content_generation && c.approved_pillars_count >= 4,
    ready_for_reply_drafting: ready_for_content_generation,
    ready_for_publish_queue: false, // always false — provider execution locked
  };
}