import { corsHeaders, json, requireFounder } from "./socialAuth.ts";

export const SAFETY_FLAGS = {
  no_external_action: true,
  external_api_calls: 0,
  pages_published: 0,
  live_forms_created: 0,
  payments_created: 0,
  emails_sent: 0,
  no_publish: true,
  no_deploy: true,
  no_provider_calls: true,
  no_scraping: true,
  no_payment_links: true,
  no_forms_created: true,
  no_email_send: true,
  no_secrets_exposed: true,
  no_fake_proof: true,
};

export { corsHeaders, json, requireFounder };

export const STRATEGY_TYPES = ["lead_generation","sales_page","booking","demo_request","quote_request","waitlist","early_access","music_link","creator_access","product_launch","service_offer","customer_support","onboarding","retention","win_back","upsell","donation","other"];
export const PAGE_TYPES = ["homepage_section","landing_page","sales_page","lead_magnet_page","booking_page","demo_page","quote_page","waitlist_page","early_access_page","music_page","creator_access_page","product_page","service_page","thank_you_page","onboarding_page","support_page","other"];
export const LEAD_MAGNET_TYPES = ["checklist","guide","pdf","mini_training","video_access","music_access","creator_access","template","calculator","quiz","audit","report","webinar","sample_pack","early_access","consultation","other"];
export const PACK_TYPES = ["landing_page_pack","lead_magnet_pack","campaign_conversion_pack","booking_pack","demo_pack","quote_pack","website_improvement_pack","operator_build_pack","lovable_prompt_pack","wix_build_pack","shopify_build_pack","webflow_build_pack","other"];
export const SOURCE_TYPES = ["social_content","social_calendar_item","campaign","keyword_flow","dm_flow","ad_plan","email_later","manual","other"];

export function recommendFunnel(strategy_type: string) {
  const map: Record<string, { pages: string[]; primary_cta: string; secondary_cta: string; lead_magnet: string }> = {
    lead_generation: { pages: ["landing_page","thank_you_page"], primary_cta: "Get the free guide", secondary_cta: "Learn more", lead_magnet: "guide" },
    sales_page: { pages: ["sales_page","thank_you_page"], primary_cta: "Buy now (manual)", secondary_cta: "See details", lead_magnet: "" },
    booking: { pages: ["booking_page","thank_you_page"], primary_cta: "Book a call", secondary_cta: "See availability", lead_magnet: "" },
    demo_request: { pages: ["demo_page","thank_you_page"], primary_cta: "Request a demo", secondary_cta: "See how it works", lead_magnet: "" },
    quote_request: { pages: ["quote_page","thank_you_page"], primary_cta: "Request a quote", secondary_cta: "Tell us about your project", lead_magnet: "" },
    waitlist: { pages: ["waitlist_page","thank_you_page"], primary_cta: "Join the waitlist", secondary_cta: "Learn more", lead_magnet: "" },
    early_access: { pages: ["early_access_page","thank_you_page"], primary_cta: "Get early access", secondary_cta: "See what's coming", lead_magnet: "early_access" },
    music_link: { pages: ["music_page"], primary_cta: "Listen now", secondary_cta: "Follow", lead_magnet: "music_access" },
    creator_access: { pages: ["creator_access_page"], primary_cta: "Apply for creator access", secondary_cta: "See criteria", lead_magnet: "creator_access" },
    product_launch: { pages: ["product_page","thank_you_page"], primary_cta: "Get notified", secondary_cta: "See features", lead_magnet: "" },
    service_offer: { pages: ["service_page","thank_you_page"], primary_cta: "Start your project", secondary_cta: "See process", lead_magnet: "" },
    customer_support: { pages: ["support_page"], primary_cta: "Get help", secondary_cta: "Read FAQ", lead_magnet: "" },
    onboarding: { pages: ["onboarding_page"], primary_cta: "Start onboarding", secondary_cta: "See checklist", lead_magnet: "checklist" },
    retention: { pages: ["landing_page"], primary_cta: "Claim your benefit", secondary_cta: "Learn more", lead_magnet: "" },
    win_back: { pages: ["landing_page"], primary_cta: "Welcome back", secondary_cta: "See what's new", lead_magnet: "" },
    upsell: { pages: ["sales_page"], primary_cta: "Upgrade now", secondary_cta: "Compare plans", lead_magnet: "" },
    donation: { pages: ["landing_page"], primary_cta: "Learn how to help", secondary_cta: "Read mission", lead_magnet: "" },
  };
  return map[strategy_type] ?? { pages: ["landing_page"], primary_cta: "Learn more", secondary_cta: "Read more", lead_magnet: "" };
}

export function genericPageOutline(page_type: string, audience?: string, goal?: string) {
  return [
    { section: "hero", goal: "Capture attention and state core value" },
    { section: "problem", goal: "Name the pain audience feels" },
    { section: "solution", goal: "Position offer as fit" },
    { section: "benefits", goal: "List concrete outcomes" },
    { section: "proof", goal: "Add real proof (none invented)" },
    { section: "process", goal: "Show how it works" },
    { section: "faq", goal: "Answer common objections" },
    { section: "final_cta", goal: `Drive ${goal ?? "primary action"} for ${audience ?? "target audience"}` },
  ];
}

export function complianceWarnings(strategy_type: string) {
  const out: string[] = [];
  if (["sales_page","booking","quote_request","demo_request","upsell","donation"].includes(strategy_type)) {
    out.push("Terms of service required before live");
    out.push("Privacy policy required before live");
  }
  if (strategy_type === "donation") out.push("No payment processing in Liftor — manual donation page only");
  if (strategy_type === "lead_generation") out.push("Privacy policy + opt-in disclosure required");
  return out;
}

export async function logAudit(admin: any, row: Record<string, unknown>) {
  try {
    await admin.from("website_funnel_audit").insert({
      external_api_calls: 0, pages_published: 0, live_forms_created: 0, payments_created: 0, emails_sent: 0,
      ...row,
    });
  } catch (_e) { /* swallow */ }
}