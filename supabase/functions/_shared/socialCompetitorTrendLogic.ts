export const SAFETY_FLAGS = {
  no_scraping: true,
  no_provider_api_call: true,
  no_publish: true,
  no_dm_send: true,
  no_comment_send: true,
  no_email_send: true,
  no_competitor_claim_published: true,
  no_copied_assets: true,
  no_fake_competitor_data: true,
  no_fake_trend_data: true,
  no_unverified_claims_as_fact: true,
  no_real_data_deletion: true,
  founder_review_required: true,
};

export const COPY_RISK_TERMS = [
  "exact same", "copy this", "copy their", "verbatim", "screenshot of their",
];

export function detectCopyRisk(text: string): string[] {
  const flags: string[] = [];
  if (!text) return flags;
  const t = text.toLowerCase();
  for (const term of COPY_RISK_TERMS) if (t.includes(term)) flags.push(`copy_risk:${term}`);
  if (t.length > 1200) flags.push("long_text_review");
  if (/https?:\/\//.test(t) && t.split(" ").length < 6) flags.push("url_only_evidence");
  return flags;
}

export function legallyDistinctSuggestion(observation: string, ourBusiness?: string): string {
  const a = (observation || "").slice(0, 160).replace(/\s+/g, " ").trim();
  return `Do not copy. Rebuild from first principles in ${ourBusiness ?? "our"} voice with original wording, original visuals and a different specific example. Reference idea only: "${a}".`;
}

export function inferPatternType(observationType: string, contentFormat?: string | null): string {
  switch (observationType) {
    case "hook": return "hook_pattern";
    case "caption": return "caption_pattern";
    case "offer": case "pricing": return "offer_pattern";
    case "funnel": case "lead_magnet": case "landing_page": return "funnel_pattern";
    case "ad": case "content_post": return contentFormat === "reel" || contentFormat === "short" ? "content_format_pattern" : "visual_pattern";
    case "engagement": case "community": return "community_pattern";
    case "customer_objection": return "objection_pattern";
    case "testimonial": case "review": return "proof_pattern";
    default: return "other";
  }
}

export function confidenceFromCount(n: number): number {
  if (n <= 0) return 0;
  if (n === 1) return 25;
  if (n === 2) return 45;
  if (n <= 4) return 60;
  if (n <= 8) return 75;
  return 85;
}

export const SUCCESS_AUDIT_DEFAULTS = {
  provider_calls: 0,
  scraped_pages: 0,
  competitor_claims_published: 0,
  copied_assets_created: 0,
};