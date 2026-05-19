// Generic asset requirement generation per business type.
// No external calls. Used by social-asset-requirements-generate.

export type AssetRequirementSeed = {
  requirement_name: string;
  asset_type: string;
  required_for: string;
  priority: "low" | "medium" | "high" | "critical";
  notes?: string;
  platform?: string;
};

const COMMON: AssetRequirementSeed[] = [
  { requirement_name: "Brand logo (primary)", asset_type: "logo",        required_for: "profile_setup", priority: "critical" },
  { requirement_name: "Founder photo",        asset_type: "founder_photo", required_for: "profile_setup", priority: "high" },
  { requirement_name: "Brand image set",      asset_type: "brand_image",  required_for: "content_pack",  priority: "high" },
  { requirement_name: "Hook/caption bank",    asset_type: "hook_bank",    required_for: "content_pack",  priority: "high" },
  { requirement_name: "Approved CTAs",        asset_type: "caption_block",required_for: "content_pack",  priority: "high" },
  { requirement_name: "Testimonial / proof",  asset_type: "testimonial",  required_for: "proof",         priority: "medium" },
  { requirement_name: "Lead magnet asset",    asset_type: "lead_magnet",  required_for: "lead_magnet",   priority: "medium" },
];

const BY_TYPE: Record<string, AssetRequirementSeed[]> = {
  music_creative: [
    { requirement_name: "Music track (master)", asset_type: "music_track", required_for: "campaign",     priority: "critical" },
    { requirement_name: "Short clips (3–9 hooks)", asset_type: "short_clip", required_for: "content_pack", priority: "critical" },
    { requirement_name: "Music video / visualiser", asset_type: "long_video", required_for: "campaign", priority: "high" },
    { requirement_name: "Thumbnails", asset_type: "thumbnail",   required_for: "content_pack", priority: "high" },
    { requirement_name: "Creator / press pack", asset_type: "document", required_for: "campaign", priority: "medium" },
  ],
  b2b_saas: [
    { requirement_name: "Product screenshots",  asset_type: "image",     required_for: "content_pack", priority: "critical" },
    { requirement_name: "Demo clip (30–60s)",   asset_type: "short_clip",required_for: "content_pack", priority: "high" },
    { requirement_name: "Feature graphic set",  asset_type: "image",     required_for: "content_pack", priority: "medium" },
    { requirement_name: "Case study (1 written)", asset_type: "case_study", required_for: "proof",     priority: "high" },
    { requirement_name: "Explainer video",      asset_type: "long_video",required_for: "landing_page", priority: "medium" },
    { requirement_name: "Founder authority post bank", asset_type: "caption_block", required_for: "content_pack", priority: "medium" },
  ],
  ecommerce: [
    { requirement_name: "Product photos (hero + lifestyle)", asset_type: "product_image", required_for: "content_pack", priority: "critical" },
    { requirement_name: "Product demo videos",  asset_type: "short_clip", required_for: "content_pack", priority: "high" },
    { requirement_name: "UGC / testimonial (with consent)", asset_type: "testimonial", required_for: "proof", priority: "high", notes: "Consent required before publish." },
    { requirement_name: "Offer graphic",        asset_type: "ad_creative",required_for: "ads",         priority: "medium" },
    { requirement_name: "Packaging/brand asset",asset_type: "brand_image",required_for: "content_pack",priority: "medium" },
  ],
  service_business: [
    { requirement_name: "Case studies (2)",     asset_type: "case_study", required_for: "proof",        priority: "high" },
    { requirement_name: "Client testimonial (consent)", asset_type: "testimonial", required_for: "proof", priority: "high", notes: "Consent required." },
    { requirement_name: "Process diagram",      asset_type: "image",      required_for: "content_pack", priority: "medium" },
    { requirement_name: "Offer explainer video",asset_type: "short_clip", required_for: "content_pack", priority: "medium" },
  ],
  charity: [
    { requirement_name: "Impact proof asset",   asset_type: "case_study", required_for: "proof",        priority: "critical", notes: "Consent + safeguarding review required." },
    { requirement_name: "Beneficiary story (consent)", asset_type: "testimonial", required_for: "proof", priority: "high", notes: "Safeguarding + consent required." },
    { requirement_name: "Governance/trust doc", asset_type: "document",   required_for: "profile_setup", priority: "medium" },
    { requirement_name: "Donor FAQ doc",        asset_type: "document",   required_for: "content_pack", priority: "medium" },
    { requirement_name: "Campaign graphic",     asset_type: "ad_creative",required_for: "campaign",     priority: "medium" },
  ],
  health: [
    { requirement_name: "Compliance disclaimer doc", asset_type: "document", required_for: "profile_setup", priority: "critical", notes: "Legal review required." },
    { requirement_name: "Evidence / source pack",    asset_type: "document", required_for: "content_pack",  priority: "high",     notes: "Legal review required." },
    { requirement_name: "Cautious testimonial (consent + legal)", asset_type: "testimonial", required_for: "proof", priority: "medium", notes: "Legal + consent required." },
  ],
  finance: [
    { requirement_name: "Compliance disclaimer doc", asset_type: "document", required_for: "profile_setup", priority: "critical", notes: "Not financial advice." },
    { requirement_name: "Evidence / source pack",    asset_type: "document", required_for: "content_pack",  priority: "high" },
  ],
  property: [
    { requirement_name: "Compliance / disclaimer",   asset_type: "document", required_for: "profile_setup", priority: "critical", notes: "No guaranteed return claims." },
    { requirement_name: "Photography rights pack",   asset_type: "document", required_for: "content_pack",  priority: "high" },
  ],
  education: [
    { requirement_name: "Safeguarding disclaimer",   asset_type: "document", required_for: "profile_setup", priority: "critical" },
    { requirement_name: "Curriculum / proof of outcomes", asset_type: "document", required_for: "proof",   priority: "high" },
  ],
  generic: [
    { requirement_name: "Generic brand starter image", asset_type: "image", required_for: "content_pack", priority: "medium" },
  ],
};

export function generateAssetRequirementSeeds(opts: {
  business_type: string;
  active_platforms?: string[];
  has_offer?: boolean;
}): AssetRequirementSeed[] {
  const base = [...COMMON, ...(BY_TYPE[opts.business_type] ?? BY_TYPE.generic)];
  if (opts.has_offer) {
    base.push({
      requirement_name: "Landing page mockup", asset_type: "landing_page_mockup",
      required_for: "landing_page", priority: "medium",
    });
  }
  for (const p of opts.active_platforms ?? []) {
    if (p === "instagram" || p === "tiktok") {
      base.push({
        requirement_name: `Short-form clips for ${p}`, asset_type: "short_clip",
        required_for: "content_pack", priority: "high", platform: p,
      });
    }
    if (p === "linkedin") {
      base.push({
        requirement_name: "LinkedIn carousel template", asset_type: "carousel",
        required_for: "content_pack", priority: "medium", platform: p,
      });
    }
  }
  // Deduplicate by name
  const seen = new Set<string>();
  return base.filter(r => (seen.has(r.requirement_name) ? false : (seen.add(r.requirement_name), true)));
}

export function rightsRiskFromAsset(a: any) {
  const warnings: string[] = [];
  if (!a) return { warnings, can_use_publicly: false, can_use_for_ads: false };
  if (a.rights_status === "unknown") warnings.push("Rights unknown — do not publish.");
  if (a.rights_status === "blocked") warnings.push("Asset rights blocked.");
  if (a.rights_status === "expired") warnings.push("Asset rights expired.");
  if (a.consent_required && a.consent_status !== "granted") warnings.push("Consent required but not granted.");
  if (a.legal_review_required) warnings.push("Legal review required.");
  if (a.rights_expiry_date) {
    const d = new Date(a.rights_expiry_date);
    const now = new Date();
    const diff = (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    if (diff < 0) warnings.push("Rights already expired.");
    else if (diff < 30) warnings.push(`Rights expire in ${Math.round(diff)} days.`);
  }
  const can_use_publicly =
    warnings.length === 0 &&
    a.public_use_allowed === true &&
    a.approved_for_social === true;
  const can_use_for_ads =
    can_use_publicly && a.paid_ads_allowed === true && a.approved_for_ads === true;
  return { warnings, can_use_publicly, can_use_for_ads };
}