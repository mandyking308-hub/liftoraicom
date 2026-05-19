// Pure-logic helper for social knowledge extraction. No external calls.
// Used by social-knowledge-extract-preview, social-brain-profile-generate, and the seed example.

export type SourceRow = {
  id: string;
  source_type: string;
  title: string;
  pasted_text?: string | null;
  source_url?: string | null;
  summary?: string | null;
  approved_for_social_training?: boolean | null;
  reliability_level?: string | null;
};

const SENSITIVE_KEYWORDS: Record<string, string[]> = {
  health: ["medical","clinical","therapy","supplement","cure","diagnose","patient","prescription"],
  finance: ["invest","returns","yield","trading","stocks","crypto","loan","mortgage","apr"],
  legal: ["lawyer","attorney","legal advice","litigation","contract review"],
  children_education: ["child","children","minors","school","teacher","tutor","safeguarding"],
  property: ["property","real estate","tenant","landlord","letting","mortgage"],
  charity: ["donation","donor","charity","fundraising","gift aid"],
  medical: ["doctor","nurse","clinic","hospital","prescription","drug"],
  employment: ["recruit","hiring","candidate","cv","resume","interview"],
};

export function detectSensitiveSectors(corpus: string): string[] {
  const lower = corpus.toLowerCase();
  const hits: string[] = [];
  for (const [sector, kws] of Object.entries(SENSITIVE_KEYWORDS)) {
    if (kws.some(k => lower.includes(k))) hits.push(sector);
  }
  return hits;
}

export function buildExtraction(sources: SourceRow[], businessName?: string) {
  const corpus = sources.map(s => [s.title, s.summary ?? "", s.pasted_text ?? ""].join("\n")).join("\n\n");
  const haveType = (t: string) => sources.some(s => s.source_type === t);

  const required = [
    "technical_manual","user_manual","brand_guide","offer_sheet",
    "customer_profile","faq","sales_script","marketing_plan",
  ];
  const missing_inputs = required.filter(r => !haveType(r));

  const sensitive = detectSensitiveSectors(corpus);
  const compliance_caution = sensitive.length > 0;

  const wordCount = corpus.split(/\s+/).filter(Boolean).length;
  const baseConfidence = Math.min(95, Math.round((sources.length * 8) + Math.min(40, wordCount / 100)));
  const confidence_score = compliance_caution ? Math.max(20, baseConfidence - 15) : baseConfidence;

  return {
    extracted_brand_voice:
      sources.length === 0
        ? null
        : `Voice inferred from ${sources.length} source(s) for ${businessName ?? "this business"}. Founder review required.`,
    extracted_audience:
      haveType("customer_profile")
        ? "ICP draft synthesised from customer_profile source — founder review required."
        : null,
    extracted_offers:
      haveType("offer_sheet") || haveType("pricing_sheet")
        ? [{ name: "Primary offer (draft)", source: "offer_sheet/pricing_sheet" }]
        : [],
    extracted_ctas: haveType("sales_script")
      ? [{ cta: "Primary CTA (draft from sales script)" }]
      : [],
    extracted_content_pillars: [
      { pillar: "Value / education", source: "user_manual or brand_guide" },
      { pillar: "Offer / proof", source: "offer_sheet" },
      { pillar: "Community / brand", source: "brand_guide" },
      { pillar: "Behind the scenes", source: "founder_notes" },
    ],
    extracted_platform_rules: {
      instagram: { suggested: true, format_focus: ["reel","carousel","story"] },
      tiktok: { suggested: true, format_focus: ["short"] },
      youtube: { suggested: haveType("user_manual"), format_focus: ["short","long"] },
      linkedin: { suggested: sensitive.includes("finance") || sensitive.includes("legal"), format_focus: ["post"] },
    },
    extracted_forbidden_claims: compliance_caution
      ? ["No guaranteed outcomes", "No medical/financial/legal claims without disclaimer"]
      : [],
    extracted_escalation_rules: {
      partnership: "escalate_to_founder",
      press: "escalate_to_founder",
      legal_or_complaint: "escalate_to_founder",
      sensitive_sectors: sensitive,
    },
    extracted_compliance_notes: compliance_caution
      ? `Sensitive sector(s) detected: ${sensitive.join(", ")}. Founder/legal review required before publish.`
      : null,
    missing_inputs,
    confidence_score,
    model_notes:
      "Rule-based extraction v1. No external LLM call. Founder approval required before applying to settings.",
    sensitive_sectors: sensitive,
  };
}

export function profileFromExtraction(extraction: any, businessName?: string) {
  return {
    business_summary: `Draft business summary for ${businessName ?? "this business"}. Founder review required.`,
    brand_voice: extraction.extracted_brand_voice,
    audience_summary: extraction.extracted_audience,
    ideal_customer_profile: extraction.extracted_audience,
    primary_offer_summary: extraction.extracted_offers?.[0]?.name ?? null,
    secondary_offer_summary: extraction.extracted_offers?.[1]?.name ?? null,
    primary_cta: extraction.extracted_ctas?.[0]?.cta ?? null,
    secondary_cta: extraction.extracted_ctas?.[1]?.cta ?? null,
    content_pillars: extraction.extracted_content_pillars ?? [],
    platform_recommendations: extraction.extracted_platform_rules ?? {},
    posting_cadence: { default: "3-5 posts per week, founder-approved." },
    funnel_stage_rules: { awareness: "value-led", consideration: "proof-led", conversion: "offer-led, approval required" },
    engagement_rules: { public_replies: "short, warm, brand-safe", dms: "approval-required" },
    dm_rules: { cold_dm: "blocked unless founder enables", warm_dm: "approval-required" },
    escalation_rules: extraction.extracted_escalation_rules ?? {},
    forbidden_claims: extraction.extracted_forbidden_claims ?? [],
    forbidden_phrases: [],
    required_disclaimers: (extraction.sensitive_sectors ?? []).length > 0 ? ["Not advice. Founder review required."] : [],
    compliance_notes: extraction.extracted_compliance_notes,
    content_do: ["lead with value", "respect brand voice", "escalate sensitive interest to founder"],
    content_do_not: ["sound desperate", "make guaranteed claims", "publish without approval"],
    offer_angles: [],
    objection_bank: [],
    hashtag_bank: [],
    hook_bank: [],
    confidence_score: extraction.confidence_score ?? 0,
    missing_inputs: extraction.missing_inputs ?? [],
  };
}

export const NEONCANDY_SEED = {
  business_summary:
    "NeonCandy is an established, polished, playful music brand. Confident, modern, non-needy tone.",
  brand_voice: "Confident, fun, polished, playful, modern, non-needy.",
  audience_summary: "Music fans, playlist curators, creators, licensing scouts.",
  ideal_customer_profile: "Fans + creators + curators + licensing/brand partners.",
  primary_offer_summary: "NeonCandy music catalogue — neoncandy.net/music",
  secondary_offer_summary: "Creator/partner collaborations (approval-required).",
  primary_cta: "Follow / Subscribe to NeonCandy 🍭 Comment CANDY for fresh drops. neoncandy.net/music",
  secondary_cta: "DM for creator/partner enquiries — escalates to founder.",
  content_pillars: [
    { pillar: "Track teasers" },
    { pillar: "Behind the scenes" },
    { pillar: "Fan engagement / CANDY" },
    { pillar: "Creator / partner spotlights" },
  ],
  platform_recommendations: {
    instagram: { suggested: true, format_focus: ["reel","carousel","story"] },
    tiktok: { suggested: true, format_focus: ["short"] },
    youtube: { suggested: true, format_focus: ["short"] },
  },
  posting_cadence: {
    timezone: "Europe/London",
    slots: [
      { time: "11:30", track: "Boom in My Step" },
      { time: "16:30", track: "Can't Wait" },
      { time: "20:30", track: "Sassy Princess" },
    ],
  },
  funnel_stage_rules: {
    awareness: "track teasers + behind the scenes",
    consideration: "CANDY engagement + creator features",
    conversion: "follow/subscribe + neoncandy.net/music",
  },
  engagement_rules: {
    public_replies: "short, warm, brand-safe",
    candy_keyword: "warm engagement trigger",
    full_video_access: "selected creators/partners only — approval required",
  },
  dm_rules: { cold_dm: "blocked", warm_dm: "approval-required" },
  escalation_rules: {
    creator: "escalate_to_founder",
    influencer: "escalate_to_founder",
    licensing: "escalate_to_founder",
    brand: "escalate_to_founder",
    playlist: "escalate_to_founder",
    press: "escalate_to_founder",
    media: "escalate_to_founder",
    partnership: "escalate_to_founder",
  },
  forbidden_claims: [
    "Do not present NeonCandy as a tiny new label",
    "Do not over-explain AI",
    "Do not sound desperate",
  ],
  forbidden_phrases: ["please please", "tiny label", "just starting out"],
  required_disclaimers: [],
  compliance_notes: null,
  content_do: ["Confident polished playful tone", "CANDY keyword warmth", "Escalate partner interest"],
  content_do_not: ["Send full videos to general commenters", "Sound needy", "Auto-DM"],
  offer_angles: [],
  objection_bank: [],
  hashtag_bank: [],
  hook_bank: [],
  confidence_score: 90,
  missing_inputs: [],
};