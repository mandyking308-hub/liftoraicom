// Shared helpers for the ManyChat / Comment Keyword + DM Flow Planner layer.
// Strictly internal — no provider API calls. No DMs/comments are ever sent.

export type FlowType =
  | "lead_magnet"
  | "music_link"
  | "creator_access"
  | "booking"
  | "demo_request"
  | "quote_request"
  | "customer_support"
  | "onboarding"
  | "upsell"
  | "win_back"
  | "campaign_keyword"
  | "faq"
  | "other";

export function normalizeKeyword(k: string): string {
  return (k || "").trim().toUpperCase().replace(/\s+/g, "_");
}

export function defaultPublicReply(flowType: FlowType, brand: string): string {
  const b = brand || "us";
  switch (flowType) {
    case "music_link": return `Nice — sent you the ${b} link 🍭`;
    case "lead_magnet": return `Done — check your DMs for the ${b} guide 📩`;
    case "creator_access": return `Love it — DMing you now ✉️`;
    case "booking": return `On it — sending booking details by DM 📅`;
    case "demo_request": return `Got it — DMing you the demo flow 🎬`;
    case "quote_request": return `Great — sending quote info by DM 📝`;
    case "customer_support": return `Hey — DMing you support now 🙌`;
    case "onboarding": return `Welcome — onboarding steps in your DMs ✅`;
    case "upsell": return `Awesome — DMing you the next step ⬆️`;
    case "win_back": return `Good to see you back — DM sent 💬`;
    case "faq": return `Answered in your DMs 📬`;
    default: return `Replied in your DMs 📬`;
  }
}

export function defaultDmOpening(flowType: FlowType, brand: string, link?: string): string {
  const b = brand || "us";
  const l = link ? ` ${link}` : "";
  switch (flowType) {
    case "music_link": return `Follow / Subscribe to ${b} 🍭 fresh drops here:${l}`;
    case "lead_magnet": return `Here's the ${b} guide you asked about:${l}`;
    case "creator_access": return `Thanks for reaching out about creator access with ${b}. Quick qs to send the right info.`;
    case "booking": return `Thanks for your interest. Here's how to book with ${b}:${l}`;
    case "demo_request": return `Thanks — here is how the ${b} demo works:${l}`;
    case "quote_request": return `Thanks — to scope the quote, a couple of quick questions about your project.`;
    case "customer_support": return `Hey 👋 — quick support check from ${b}. What's the issue you're seeing?`;
    case "onboarding": return `Welcome to ${b}! Here is your onboarding checklist:${l}`;
    case "upsell": return `Quick note from ${b} — based on where you are, here's what's next:${l}`;
    case "win_back": return `Good to see you again. From ${b} — what would help right now?`;
    case "faq": return `Quick answer from ${b}:${l}`;
    default: return `Hi from ${b} — how can we help?`;
  }
}

export function defaultFollowUp(flowType: FlowType): string {
  switch (flowType) {
    case "music_link": return "Which drop are you feeling most?";
    case "lead_magnet": return "Want me to walk you through it?";
    case "creator_access": return "What's your platform + audience size?";
    case "booking": return "What date range works for you?";
    case "demo_request": return "What's the main outcome you want to see?";
    case "quote_request": return "What's the scope / timeline?";
    case "customer_support": return "Can you share a screenshot or order ref?";
    case "onboarding": return "Want help with step 1?";
    case "upsell": return "Want me to set this up for you?";
    case "win_back": return "What would make this a yes again?";
    case "faq": return "Was that helpful?";
    default: return "Anything else I can help with?";
  }
}

export function defaultButton(flowType: FlowType, link?: string): { label: string; url: string } | null {
  if (!link) return null;
  switch (flowType) {
    case "music_link": return { label: "Send me the link", url: link };
    case "lead_magnet": return { label: "Get the guide", url: link };
    case "booking": return { label: "Book a call", url: link };
    case "demo_request": return { label: "See the demo", url: link };
    case "onboarding": return { label: "Open checklist", url: link };
    default: return { label: "Open link", url: link };
  }
}

export function defaultStopConditions() {
  return {
    opt_out_keywords: ["STOP", "UNSUBSCRIBE", "OPT OUT"],
    escalate_keywords: ["HUMAN", "AGENT", "REFUND", "COMPLAINT"],
    max_messages: 6,
  };
}

export function defaultEscalationRules(flowType: FlowType) {
  const base = { on_keyword: ["HUMAN", "AGENT"], on_negative_sentiment: true };
  switch (flowType) {
    case "creator_access":
      return { ...base, on_keyword: [...base.on_keyword, "LICENSING", "BRAND", "PRESS", "PLAYLIST", "MEDIA"], escalate_to: "founder" };
    case "customer_support":
      return { ...base, on_keyword: [...base.on_keyword, "REFUND", "BROKEN", "URGENT"], escalate_to: "support" };
    case "quote_request":
    case "demo_request":
    case "booking":
      return { ...base, escalate_to: "founder" };
    default:
      return base;
  }
}

export function defaultRoutingRules(flowType: FlowType) {
  return {
    tag_user: `engaged:${flowType}`,
    move_to_pipeline: ["booking", "demo_request", "quote_request", "creator_access"].includes(flowType) ? "founder_review" : "nurture",
  };
}

export function defaultQualificationQuestions(flowType: FlowType): string[] {
  switch (flowType) {
    case "creator_access": return ["Which platform?", "Audience size?", "Why this brand?"];
    case "booking": return ["Preferred date?", "Time zone?", "Anything we should know?"];
    case "demo_request": return ["Company / brand?", "Use case?", "Decision timeline?"];
    case "quote_request": return ["Project scope?", "Budget range?", "Deadline?"];
    case "customer_support": return ["Order / account ref?", "Issue type?", "Screenshots?"];
    case "win_back": return ["What changed since last time?", "What would help most now?"];
    default: return [];
  }
}

export function complianceWarnings(flowType: FlowType, profile: any): string[] {
  const w: string[] = [];
  const sector = String(profile?.industry_sector ?? "").toLowerCase();
  if (["finance", "health", "medical", "legal", "crypto"].some(s => sector.includes(s))) {
    w.push("regulated_sector_review_required");
  }
  if (flowType === "customer_support") w.push("avoid_committing_to_refund_terms_in_dm");
  if (flowType === "upsell") w.push("avoid_price_or_guarantee_claims_in_dm");
  if (flowType === "creator_access") w.push("escalate_licensing_or_press_requests");
  return w;
}

export function buildStepsFromBlueprint(bp: any): any[] {
  const steps: any[] = [];
  let order = 0;
  if (bp.public_reply_text) steps.push({ step_order: order++, step_type: "public_reply", message_text: bp.public_reply_text });
  if (bp.dm_opening_text) steps.push({ step_order: order++, step_type: "dm_opening", message_text: bp.dm_opening_text });
  if (bp.button_label && bp.button_url) steps.push({ step_order: order++, step_type: "button", button_label: bp.button_label, button_url: bp.button_url });
  if (bp.follow_up_question) steps.push({ step_order: order++, step_type: "question", message_text: bp.follow_up_question });
  for (const q of (bp.qualification_questions ?? []) as string[]) {
    steps.push({ step_order: order++, step_type: "qualification", message_text: q });
  }
  steps.push({ step_order: order++, step_type: "escalation", message_text: "Escalate to founder/operator if rules trigger.", escalation_required: true });
  steps.push({ step_order: order++, step_type: "opt_out", message_text: "Reply STOP to opt out." });
  return steps;
}

export function operatorChecklist(): any[] {
  return [
    { step: "open_manychat", label: "Open ManyChat (or chosen tool) for the correct connected account" },
    { step: "create_keyword_trigger", label: "Create keyword trigger with the exact keyword shown" },
    { step: "paste_public_reply", label: "Paste the public comment reply text" },
    { step: "paste_dm_opening", label: "Paste the DM opening message" },
    { step: "configure_button", label: "Configure the button label + URL" },
    { step: "configure_follow_up", label: "Add the follow-up question / qualification flow" },
    { step: "configure_escalation", label: "Configure escalation routing to founder/operator" },
    { step: "configure_opt_out", label: "Confirm STOP/opt-out behaviour" },
    { step: "test_in_sandbox", label: "Test the flow with a sandbox account before going live" },
    { step: "confirm_in_liftor", label: "Return to Liftor and confirm manual setup (and live if applicable)" },
  ];
}

export function validateFlow(bp: any, steps: any[], requireExport = false): { status: "passed" | "warning" | "failed"; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!bp?.public_reply_text) warnings.push("missing_public_reply");
  if (!bp?.dm_opening_text) errors.push("missing_dm_opening");
  if (bp?.button_url && !/^https?:\/\//.test(bp.button_url)) errors.push("invalid_button_url");
  const hasOptOut = (steps || []).some((s: any) => s.step_type === "opt_out");
  if (!hasOptOut) warnings.push("missing_opt_out_step");
  const flowType = String(bp?.flow_type ?? "");
  if (["customer_support", "creator_access", "quote_request"].includes(flowType)) {
    const hasEsc = (steps || []).some((s: any) => s.step_type === "escalation");
    if (!hasEsc) errors.push("missing_escalation_step");
  }
  if (requireExport && bp?.approval_status !== "approved") errors.push("flow_not_approved_for_export");
  if (Array.isArray(bp?.compliance_warnings) && bp.compliance_warnings.length) {
    warnings.push(...bp.compliance_warnings.map((w: string) => `compliance:${w}`));
  }
  const status = errors.length ? "failed" : warnings.length ? "warning" : "passed";
  return { status, errors, warnings };
}

export const SAFETY_FLAGS = {
  no_manychat_api_call: true,
  no_meta_api_call: true,
  no_instagram_api_call: true,
  no_tiktok_api_call: true,
  no_youtube_api_call: true,
  no_linkedin_api_call: true,
  no_x_api_call: true,
  no_social_provider_api_call: true,
  no_external_flow_creation: true,
  no_dm_send: true,
  no_comment_send: true,
  no_external_publish: true,
  no_external_schedule: true,
  no_apollo: true,
  no_smartlead_post: true,
  no_email_send: true,
  no_auto_send: true,
  no_cron: true,
  no_raw_provider_tokens: true,
  no_real_data_deletion: true,
  provider_calls: 0,
  dms_sent: 0,
  comments_sent: 0,
  flows_created_externally: 0,
};