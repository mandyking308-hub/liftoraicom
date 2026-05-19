// Shared content factory logic — internal only, no provider calls

export const SENSITIVE_SECTORS = ["health", "medical", "finance", "investment", "legal", "property", "education"];

export type GenInputs = {
  businessId: string;
  businessName?: string;
  businessType?: string;
  brandVoice?: string;
  pillars: Array<{ id?: string; name: string; funnel_stage?: string }>;
  platformRules: Array<{ platform: string; suitability?: string; cadence?: string }>;
  offers: Array<{ id?: string; offer_name: string; cta?: string; pain_point?: string }>;
  riskFlags: Array<{ category?: string; severity?: string; rule?: string }>;
  assets: Array<{ id: string; consent_status?: string; asset_type?: string; title?: string }>;
  hookBank: Array<{ hook: string; platform?: string }>;
  revenueTarget?: { target_amount?: number; currency?: string };
  knowledgeSummary?: string;
};

const DEFAULT_PILLARS = [
  { name: "Awareness", funnel_stage: "awareness" },
  { name: "Education", funnel_stage: "consideration" },
  { name: "Authority/Proof", funnel_stage: "consideration" },
  { name: "Offer/Conversion", funnel_stage: "conversion" },
  { name: "Retention/Community", funnel_stage: "retention" },
];

const PLATFORM_VARIANTS: Record<string, string> = {
  instagram: "instagram_reel",
  instagram_post: "instagram_post",
  instagram_story: "instagram_story",
  tiktok: "tiktok_video",
  youtube_shorts: "youtube_short",
  facebook: "facebook_post",
  linkedin: "linkedin_post",
  x: "x_thread",
  twitter: "x_thread",
  blog: "website_blog_starter",
  email: "email_newsletter_starter",
  pinterest: "pinterest_pin",
};

export function platformToVariantType(p: string): string {
  return PLATFORM_VARIANTS[p.toLowerCase()] || "other";
}

export function inferBusinessType(name?: string, type?: string, knowledge?: string): string {
  const s = `${name ?? ""} ${type ?? ""} ${knowledge ?? ""}`.toLowerCase();
  if (/music|artist|song|album|release|candy/.test(s)) return "music";
  if (/saas|software|ai|platform|api/.test(s)) return "saas";
  if (/shop|ecom|product|beauty|skincare/.test(s)) return "ecommerce";
  if (/charity|nonprofit|donor/.test(s)) return "charity";
  if (/health|medical|clinic|therap/.test(s)) return "health";
  if (/finance|invest|wealth|loan/.test(s)) return "finance";
  if (/property|real estate|landlord/.test(s)) return "property";
  if (/consult|agency|service/.test(s)) return "service";
  return "generic";
}

function pickPillars(inputs: GenInputs) {
  return (inputs.pillars && inputs.pillars.length ? inputs.pillars : DEFAULT_PILLARS) as any[];
}

function pad(n: number) { return n < 10 ? `0${n}` : `${n}`; }
function isoDate(d: Date) { return `${d.getUTCFullYear()}-${pad(d.getUTCMonth()+1)}-${pad(d.getUTCDate())}`; }

export function generateConfidence(inputs: GenInputs): number {
  let score = 30;
  if (inputs.pillars?.length) score += 15;
  if (inputs.platformRules?.length) score += 10;
  if (inputs.offers?.length) score += 10;
  if (inputs.assets?.length) score += 10;
  if (inputs.hookBank?.length) score += 5;
  if (inputs.brandVoice) score += 5;
  if (inputs.knowledgeSummary) score += 10;
  if (inputs.riskFlags?.some(r => r.severity === "high")) score -= 15;
  return Math.max(0, Math.min(100, score));
}

export function generatePack(opts: {
  inputs: GenInputs;
  days: number;
  platforms: string[];
  startDate?: string;
  goal?: string;
}): {
  pack: any;
  items: any[];
  variants: any[];
  missing_assets: string[];
  compliance_warnings: string[];
  confidence: number;
} {
  const { inputs, days, platforms, startDate, goal } = opts;
  const pillars = pickPillars(inputs);
  const start = startDate ? new Date(startDate + "T00:00:00Z") : new Date();
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + days - 1);

  const btype = inferBusinessType(inputs.businessName, inputs.businessType, inputs.knowledgeSummary);
  const sensitive = SENSITIVE_SECTORS.includes(btype) || inputs.riskFlags?.some(r => r.severity === "high");
  const compliance_warnings: string[] = [];
  if (sensitive) compliance_warnings.push(`Sensitive sector (${btype}) — founder/legal review required before publish.`);
  if (!inputs.brandVoice) compliance_warnings.push("No brand voice set — confidence reduced.");
  if (!inputs.offers?.length) compliance_warnings.push("No approved offer mappings — conversion posts use generic CTA.");

  const missing_assets: string[] = [];
  const usableAssets = (inputs.assets || []).filter(a => a.consent_status === "approved" || a.consent_status === "verified");
  if (!usableAssets.length) missing_assets.push("No approved-rights assets registered — visual posts marked needs_asset.");

  const cta = inputs.offers?.[0]?.cta || "Learn more.";
  const items: any[] = [];
  const variants: any[] = [];

  for (let d = 0; d < days; d++) {
    const date = new Date(start);
    date.setUTCDate(date.getUTCDate() + d);
    const pillar = pillars[d % pillars.length];
    const offer = inputs.offers?.[d % Math.max(1, inputs.offers?.length || 1)];
    const hookFromBank = inputs.hookBank?.[d % Math.max(1, inputs.hookBank?.length || 1)]?.hook;
    const hook = hookFromBank || `${pillar.name}: open with a 1-second visual punch.`;
    const title = `Day ${d + 1} · ${pillar.name}`;
    const caption = sensitive
      ? `${pillar.name} — educational, no outcome claims. Founder/legal review required. ${inputs.brandVoice ? `Voice: ${inputs.brandVoice}.` : ""}`
      : `${pillar.name}. ${inputs.brandVoice || ""} ${offer ? offer.offer_name + "." : ""} ${cta}`.trim();
    const assetPick = usableAssets[d % Math.max(1, usableAssets.length || 1)];
    const asset_id = assetPick?.id;
    const asset_status = asset_id ? "ready" : "missing_asset";
    const publish_readiness = sensitive ? "blocked" : (asset_id ? "draft_ready" : "not_ready");

    const item = {
      _idx: items.length,
      business_id: inputs.businessId,
      platform: platforms[0] || "instagram",
      content_type: pillar.funnel_stage === "conversion" ? "offer" : "educational",
      title,
      caption,
      hashtags: null,
      cta,
      scheduled_date: isoDate(date),
      scheduled_time: "18:00",
      content_pillar: pillar.name,
      funnel_stage: pillar.funnel_stage || null,
      offer_angle: offer?.offer_name || null,
      approval_status: "draft",
      automation_status: "not_queued",
      generated_by_ai: true,
      hook,
      script: null,
      carousel_outline: [],
      content_goal: goal || pillar.funnel_stage || null,
      target_audience: inputs.knowledgeSummary?.slice(0, 200) || null,
      content_pillar_id: pillar.id || null,
      offer_mapping_id: offer?.id || null,
      quality_status: "not_reviewed",
      asset_readiness_status: asset_status,
      compliance_status: sensitive ? "needs_review" : "not_reviewed",
      publish_readiness,
      asset_id,
      metadata: { day_number: d + 1, pillar: pillar.name, business_type: btype },
    };
    items.push(item);

    for (const p of platforms) {
      variants.push({
        _item_idx: item._idx,
        business_id: inputs.businessId,
        platform: p,
        variant_type: platformToVariantType(p),
        title,
        hook,
        caption: adaptCaption(caption, p),
        script: p === "tiktok" || p === "instagram" || p === "youtube_shorts"
          ? `0-1s: hook (${hook})\n1-6s: ${pillar.name} story beat\n6-12s: payoff\n12-15s: CTA — ${cta}`
          : null,
        carousel_outline: p === "instagram_post"
          ? [{ slide: 1, text: hook }, { slide: 2, text: pillar.name }, { slide: 3, text: cta }]
          : [],
        hashtags: defaultHashtags(inputs.businessName, pillar.name),
        cta,
        link_url: null,
        asset_id: asset_id || null,
        approval_status: "draft",
        risk_flags: sensitive ? ["sensitive_sector"] : [],
        missing_requirements: asset_id ? [] : ["visual_asset_required"],
      });
    }
  }

  return {
    pack: {
      business_id: inputs.businessId,
      pack_name: `${inputs.businessName || "Business"} — ${days}-day pack`,
      pack_type: days <= 7 ? "seven_day" : days <= 14 ? "fourteen_day" : days <= 30 ? "thirty_day" : "ninety_day",
      pack_status: "draft",
      days_count: days,
      start_date: isoDate(start),
      end_date: isoDate(end),
      platforms,
      pack_summary: `Auto-generated ${days}-day content pack for ${inputs.businessName || "business"}. Internal draft only.`,
      primary_goal: goal || "awareness",
      target_audience: inputs.knowledgeSummary?.slice(0, 200) || null,
      approval_status: "draft",
      risk_level: sensitive ? "high" : "low",
      missing_assets,
      compliance_warnings,
      generated_from_sources: {
        pillars_count: pillars.length,
        platform_rules_count: inputs.platformRules?.length || 0,
        offers_count: inputs.offers?.length || 0,
        assets_count: inputs.assets?.length || 0,
        hook_bank_count: inputs.hookBank?.length || 0,
        brand_voice_present: !!inputs.brandVoice,
        revenue_target_present: !!inputs.revenueTarget,
      },
    },
    items,
    variants,
    missing_assets,
    compliance_warnings,
    confidence: generateConfidence(inputs),
  };
}

function adaptCaption(base: string, platform: string): string {
  const p = platform.toLowerCase();
  if (p === "linkedin") return `Insight: ${base}`;
  if (p === "x" || p === "twitter") return base.slice(0, 240);
  if (p === "tiktok") return base.split(".").slice(0, 2).join(".");
  return base;
}

function defaultHashtags(name?: string, pillar?: string): string {
  const tag = (s: string) => "#" + s.replace(/[^a-zA-Z0-9]/g, "");
  const parts = [];
  if (name) parts.push(tag(name));
  if (pillar) parts.push(tag(pillar));
  return parts.join(" ");
}

export function qualityReview(input: {
  content?: any;
  variant?: any;
  hasAsset: boolean;
  assetApproved: boolean;
  sensitive: boolean;
  brandFitHints: string[];
}): {
  review_status: string;
  quality_score: number;
  brand_fit_score: number;
  compliance_score: number;
  asset_readiness_score: number;
  risk_level: string;
  issues: string[];
  recommendations: string[];
  publish_readiness: string;
  founder_review_required: boolean;
  legal_review_required: boolean;
} {
  const issues: string[] = [];
  const recs: string[] = [];
  let quality = 70;
  let brand = 70;
  let compliance = 80;
  let assetReady = input.hasAsset ? (input.assetApproved ? 100 : 50) : 0;
  if (!input.hasAsset) issues.push("Missing visual asset.");
  if (input.hasAsset && !input.assetApproved) issues.push("Asset rights not approved.");
  if (input.sensitive) { compliance = 40; issues.push("Sensitive sector — legal review required."); }
  if (!input.brandFitHints.length) { brand = 60; recs.push("Add brand voice / tone hints."); }
  const risk = input.sensitive ? "high" : (issues.length ? "medium" : "low");
  const blocked = !input.hasAsset || !input.assetApproved || input.sensitive;
  return {
    review_status: blocked ? "needs_edit" : "passed",
    quality_score: quality,
    brand_fit_score: brand,
    compliance_score: compliance,
    asset_readiness_score: assetReady,
    risk_level: risk,
    issues,
    recommendations: recs,
    publish_readiness: blocked ? "blocked" : "approval_ready",
    founder_review_required: true,
    legal_review_required: input.sensitive,
  };
}