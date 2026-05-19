import { corsHeaders, json, requireFounder } from "./socialAuth.ts";

export { corsHeaders, json, requireFounder };

export const SAFETY_FLAGS = {
  no_external_action: true,
  no_publish: true,
  no_deploy: true,
  no_cms_api: true,
  no_newsletter_send: true,
  no_email_send: true,
  no_scraping: true,
  no_seo_api: true,
  no_invented_proof: true,
  no_secrets_exposed: true,
  external_api_calls: 0,
  pages_published: 0,
  newsletters_sent: 0,
  emails_sent: 0,
  scraped_pages: 0,
  fake_metrics_created: 0,
};

export const STRATEGY_TYPES = ["blog","seo","newsletter","thought_leadership","education","nurture","support_content","faq","case_study","lead_magnet","pillar_content","campaign_content","customer_success","retention","win_back","other"];
export const DRAFT_TYPES = ["blog_post","seo_article","newsletter","newsletter_sequence_email","founder_note","thought_leadership","support_article","faq_article","education_article","case_study_framework","lead_magnet_longform","pillar_page","nurture_content","win_back_content","onboarding_content","other"];
export const SEQUENCE_TYPES = ["welcome","nurture","lead_magnet_delivery_later","onboarding","customer_success","retention","win_back","upsell","newsletter_series","education_series","other"];
export const ARTICLE_TYPES = ["how_to","guide","comparison","listicle","opinion","thought_leadership","faq","support_article","case_study_framework","announcement","news_commentary","other"];

export function defaultPillars(strategy_type: string) {
  const map: Record<string,string[]> = {
    blog: ["Educate","Inspire","Convert"],
    seo: ["Awareness keywords","Solution keywords","Brand keywords"],
    newsletter: ["Insight","Story","Offer"],
    thought_leadership: ["Industry POV","Founder lessons","Future outlook"],
    education: ["Foundations","How-to","Advanced"],
    nurture: ["Welcome","Value","Soft CTA"],
    support_content: ["FAQ","How-to","Troubleshooting"],
    faq: ["Pre-sale","Onboarding","Support"],
    case_study: ["Problem","Approach","Outcome (real evidence required)"],
    lead_magnet: ["Core promise","Step-by-step","Activation"],
    pillar_content: ["Anchor topic","Supporting subtopics","Repurposing tracks"],
    campaign_content: ["Hook","Proof","Offer"],
    customer_success: ["Onboarding","Adoption","Expansion"],
    retention: ["Reminder","New value","Re-engage"],
    win_back: ["Empathy","New reason","Soft offer"],
    other: ["Educate","Engage","Convert"],
  };
  return map[strategy_type] ?? ["Educate","Engage","Convert"];
}

export function recommendCadence(strategy_type: string) {
  if (["blog","seo","thought_leadership","education","pillar_content"].includes(strategy_type)) return "1-2 per week";
  if (["newsletter","newsletter_series"].includes(strategy_type)) return "weekly";
  if (["nurture","welcome","onboarding"].includes(strategy_type)) return "every 2-3 days for 5-7 emails";
  return "as needed";
}

export function buyerJourneyFor(strategy_type: string): string {
  const map: Record<string,string> = {
    blog: "awareness", seo: "awareness", thought_leadership: "consideration",
    education: "interest", nurture: "consideration", support_content: "support",
    faq: "consideration", case_study: "conversion", lead_magnet: "interest",
    pillar_content: "awareness", campaign_content: "conversion",
    customer_success: "onboarding", retention: "retention", win_back: "win_back",
    newsletter: "interest", other: "awareness",
  };
  return map[strategy_type] ?? "awareness";
}

export function defaultProofRequired(strategy_type: string) {
  const base = ["real customer story or example","verifiable source for any statistic","compliance disclaimer where required"];
  if (strategy_type === "case_study") base.push("signed customer reference required");
  if (["thought_leadership","seo"].includes(strategy_type)) base.push("link to authoritative source");
  return base;
}

export function genericOutline(draft_type: string, topic: string) {
  const intro = { section: "intro", goal: `Hook reader and frame ${topic}` };
  const ctaClose = { section: "cta", goal: "Drive next step (internal CTA only)" };
  if (draft_type === "faq_article" || draft_type === "support_article") {
    return [
      { section: "question", goal: "State the customer question" },
      { section: "short_answer", goal: "Clear one-paragraph answer" },
      { section: "detail", goal: "Walk through detail and edge cases" },
      { section: "next_steps", goal: "Tell user what to do next" },
      ctaClose,
    ];
  }
  if (draft_type === "newsletter" || draft_type === "newsletter_sequence_email") {
    return [
      { section: "subject", goal: "Curiosity + value, no spam triggers" },
      { section: "preview_text", goal: "Set context in 1 line" },
      { section: "open", goal: "Personal hook" },
      { section: "value", goal: "One useful idea or insight" },
      { section: "cta", goal: "Single clear CTA" },
      { section: "footer", goal: "Compliance reminder (unsubscribe/sender info externally)" },
    ];
  }
  if (draft_type === "case_study_framework") {
    return [
      intro,
      { section: "problem", goal: "Document the real problem (no invention)" },
      { section: "approach", goal: "Real approach taken" },
      { section: "outcome", goal: "Real outcome — requires evidence" },
      { section: "quote_placeholder", goal: "Slot for verified customer quote" },
      ctaClose,
    ];
  }
  return [
    intro,
    { section: "problem", goal: "Name the reader's pain" },
    { section: "solution", goal: "Explain the path" },
    { section: "steps", goal: "Practical, ordered steps" },
    { section: "proof", goal: "Add real proof only — placeholders if missing" },
    { section: "faq", goal: "Answer top objections" },
    ctaClose,
  ];
}

export function complianceWarnings(draft_type: string, strategy_type?: string) {
  const out: string[] = [];
  if (["newsletter","newsletter_sequence_email"].includes(draft_type)) {
    out.push("Sender details + unsubscribe required by external email tool");
    out.push("No medical/financial/legal advice without verified source");
  }
  if (["case_study","case_study_framework"].includes(draft_type) || strategy_type === "case_study") {
    out.push("Customer permission required before publishing");
    out.push("Numbers/results must be verifiable");
  }
  if (["seo","seo_article"].includes(draft_type) || strategy_type === "seo") {
    out.push("No keyword stuffing; no copying competitor copy");
  }
  if (["thought_leadership","founder_note"].includes(draft_type)) {
    out.push("Opinions clearly attributed to founder; no unsupported industry claims");
  }
  return out;
}

export function detectUnsupportedClaims(text: string | undefined | null): string[] {
  if (!text) return [];
  const out: string[] = [];
  const t = text.toLowerCase();
  const patterns: Array<[RegExp,string]> = [
    [/\b\d{1,3}\s?%/, "Percentage stat — verify source"],
    [/\bguarantee[sd]?\b/, "Guarantee language — legal risk"],
    [/\bproven\b/, "'Proven' — verify evidence"],
    [/\b(cure|treat|diagnose)\b/, "Medical claim — requires evidence"],
    [/\b(roi|return on investment)\b/, "ROI claim — verify"],
    [/\bbest\s+in\s+(class|the world|industry)\b/, "Superlative claim — verify"],
    [/\b#1\b/, "#1 claim — verify"],
    [/\b(approved|certified)\s+by\b/, "Certification claim — verify"],
  ];
  for (const [re, msg] of patterns) if (re.test(t)) out.push(msg);
  return out;
}

export async function logAudit(admin: any, row: Record<string, unknown>) {
  try {
    await admin.from("longform_content_audit").insert({
      external_api_calls: 0, pages_published: 0, newsletters_sent: 0, emails_sent: 0,
      scraped_pages: 0, fake_metrics_created: 0,
      ...row,
    });
  } catch (_e) { /* swallow */ }
}