// Shared logic for the Social Engagement Inbox (capture, classify, match, draft, escalate).
// 100% internal — never sends DMs/comments, never calls provider APIs.

export const ALLOWED_PLATFORMS = ["instagram","facebook","tiktok","youtube","linkedin","x_twitter","website","manual","other"] as const;
export const ALLOWED_EVENT_TYPES = ["comment","dm","keyword_comment","keyword_dm","story_reply","mention","tag","share","review","manual_note","imported_message","support_message","complaint","spam","abuse","other"] as const;
export const ALLOWED_INTENTS = ["lead_interest","creator_interest","customer_support","complaint","dispute","pricing_question","booking_request","demo_request","quote_request","partnership","press_media","licensing","testimonial","referral","unsubscribe_stop","spam","abuse","general_question","other"] as const;

export const SAFETY_FLAGS = {
  no_manychat_api_call: true,
  no_meta_api_call: true,
  no_social_provider_api_call: true,
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
  provider_calls: 0,
  dms_sent: 0,
  comments_sent: 0,
  external_actions: 0,
};

const SPAM = ["follow back","f4f","check my page","crypto","earn $","free followers","onlyfans","link in bio dm","🤑"];
const COMPLAINT = ["refund","scam","broken","disappointed","ripoff","terrible","worst","never again","fraud"];
const SUPPORT = ["help","question","issue","problem","how do i","when is","tracking","order status","not working"];
const LEAD = ["pricing","price","cost","quote","interested","interested in","buy","purchase","sign up","sign-up","trial"];
const BOOKING = ["book","booking","schedule","calendar","availability"];
const DEMO = ["demo","walkthrough","see it in action"];
const CREATOR = ["creator","collab","collaboration","partner","work together","brand deal","ugc","ambassador"];
const PRESS = ["press","journalist","editor","feature","interview","podcast","blog","magazine"];
const LICENSING = ["license","licensing","sync","use your"];
const TESTIMONIAL = ["love your","amazing","best ever","obsessed","life changing","game changer","testimonial","review of"];
const REFERRAL = ["referred","recommended","my friend","sent me"];
const STOP = ["stop","unsubscribe","opt out","opt-out","do not contact"];
const ABUSE = ["fuck","shit","kill","threat","hate you","disgusting"];
const URGENT_NEG = ["urgent","asap","immediately","right now","emergency"];

function any(s: string, arr: string[]) { return arr.some(k => s.includes(k)); }

export function classifyText(text: string, keyword?: string | null) {
  const t = String(text ?? "").toLowerCase();
  let intent = "general_question";
  let sentiment: "positive"|"neutral"|"negative"|"mixed"|"unknown" = "neutral";
  let urgency: "low"|"normal"|"high"|"urgent"|"critical" = "normal";
  let risk: "low"|"medium"|"high"|"critical" = "low";
  const risk_flags: string[] = [];
  const opportunities: string[] = [];

  if (any(t, ABUSE)) { intent = "abuse"; sentiment = "negative"; urgency = "critical"; risk = "critical"; risk_flags.push("abuse"); }
  else if (any(t, STOP)) { intent = "unsubscribe_stop"; sentiment = "negative"; urgency = "high"; risk = "medium"; risk_flags.push("unsubscribe"); }
  else if (any(t, SPAM)) { intent = "spam"; sentiment = "neutral"; urgency = "low"; risk = "low"; risk_flags.push("spam"); }
  else if (any(t, COMPLAINT)) { intent = "complaint"; sentiment = "negative"; urgency = "urgent"; risk = "high"; risk_flags.push("complaint","reputational_risk"); opportunities.push("recovery"); }
  else if (any(t, LICENSING)) { intent = "licensing"; sentiment = "positive"; urgency = "high"; risk = "medium"; opportunities.push("licensing_revenue"); }
  else if (any(t, PRESS)) { intent = "press_media"; sentiment = "positive"; urgency = "high"; opportunities.push("press_coverage"); }
  else if (any(t, CREATOR)) { intent = "creator_interest"; sentiment = "positive"; urgency = "high"; opportunities.push("partnership"); }
  else if (any(t, DEMO)) { intent = "demo_request"; sentiment = "positive"; urgency = "high"; opportunities.push("pipeline"); }
  else if (any(t, BOOKING)) { intent = "booking_request"; sentiment = "positive"; urgency = "high"; opportunities.push("pipeline"); }
  else if (any(t, LEAD)) { intent = "lead_interest"; sentiment = "positive"; urgency = "high"; opportunities.push("pipeline"); }
  else if (any(t, REFERRAL)) { intent = "referral"; sentiment = "positive"; urgency = "normal"; opportunities.push("referral"); }
  else if (any(t, TESTIMONIAL)) { intent = "testimonial"; sentiment = "positive"; opportunities.push("testimonial"); }
  else if (any(t, SUPPORT)) { intent = "customer_support"; sentiment = "neutral"; urgency = "high"; }
  else if (keyword) { intent = "lead_interest"; sentiment = "positive"; }

  if (any(t, URGENT_NEG) && intent !== "spam") urgency = urgency === "low" ? "high" : urgency === "normal" ? "high" : urgency;

  const recommended_agent =
    intent === "complaint" || intent === "dispute" ? "customer_recovery_agent" :
    intent === "customer_support" ? "support_agent" :
    intent === "creator_interest" || intent === "partnership" ? "marketing_agent" :
    intent === "press_media" || intent === "licensing" ? "founder_copilot_agent" :
    intent === "lead_interest" || intent === "demo_request" || intent === "quote_request" || intent === "booking_request" ? "proposal_agent" :
    intent === "abuse" || intent === "spam" ? "compliance_agent" :
    intent === "testimonial" || intent === "referral" ? "customer_success_agent" :
    "social_media_manager_agent";

  const recommended_next_action =
    intent === "complaint" ? "Acknowledge internally and route to recovery; founder approval before any external reply." :
    intent === "customer_support" ? "Draft a single clarifying question internally; founder review before reply." :
    intent === "creator_interest" ? "Draft warm reply asking platform/audience; route to partnership review." :
    intent === "lead_interest" || intent === "demo_request" || intent === "quote_request" || intent === "booking_request" ? "Draft next-step reply; capture in pipeline." :
    intent === "press_media" || intent === "licensing" ? "Escalate to founder with press kit suggestion." :
    intent === "spam" || intent === "abuse" ? "Recommend no reply; archive or block internally." :
    intent === "unsubscribe_stop" ? "Suppress further outreach; log opt-out." :
    intent === "testimonial" ? "Thank internally; capture as social proof candidate." :
    "Founder triage.";

  const confidence = intent === "general_question" ? 35 : 70;

  return {
    intent, sentiment, urgency, risk_level: risk,
    detected_risk_flags: risk_flags,
    detected_opportunities: opportunities,
    recommended_agent,
    recommended_next_action,
    confidence_score: confidence,
    founder_review_required: true,
    compliance_review_required: risk === "critical" || risk === "high" || intent === "complaint" || intent === "dispute" || intent === "licensing",
    support_review_required: intent === "customer_support" || intent === "complaint",
    customer_success_review_required: intent === "testimonial" || intent === "referral" || intent === "complaint",
  };
}

export function draftReply(intent: string, brand: string, crmKnown: boolean): { draft_type: string; reply_channel: string; draft_text: string; suggested_tone: string; risk_flags: string[]; compliance_warnings: string[] } {
  const b = brand || "us";
  const ctx = crmKnown ? "Good to hear from you again — " : "";
  switch (intent) {
    case "complaint":
      return { draft_type: "complaint_acknowledgement", reply_channel: "dm", draft_text: `${ctx}Really sorry about this. Can you DM your order/account ref so we can look into it right away?`, suggested_tone: "calm, accountable, non-committal", risk_flags: ["reputational_risk"], compliance_warnings: ["no_liability_admission"] };
    case "customer_support":
      return { draft_type: "support_reply", reply_channel: "dm", draft_text: `${ctx}Happy to help — can you share a screenshot or order ref so we can get to the bottom of it?`, suggested_tone: "helpful, concise", risk_flags: [], compliance_warnings: [] };
    case "creator_interest":
      return { draft_type: "creator_followup", reply_channel: "dm", draft_text: `${ctx}Love it — what's your platform and audience size? Happy to share what we usually work on with creators.`, suggested_tone: "warm, brief", risk_flags: [], compliance_warnings: [] };
    case "lead_interest":
    case "demo_request":
    case "booking_request":
    case "quote_request":
      return { draft_type: "lead_followup", reply_channel: "dm", draft_text: `${ctx}Thanks for reaching out — DMing you the next step now.`, suggested_tone: "professional, prompt", risk_flags: [], compliance_warnings: [] };
    case "press_media":
    case "licensing":
      return { draft_type: "partnership_followup", reply_channel: "dm", draft_text: `${ctx}Thanks — happy to send the press/licensing pack. Quick context first: what's the angle/timeline?`, suggested_tone: "professional", risk_flags: [], compliance_warnings: ["legal_review_recommended"] };
    case "testimonial":
    case "referral":
      return { draft_type: "dm_reply", reply_channel: "dm", draft_text: `${ctx}Thank you 🙏 — would you be ok if we shared that?`, suggested_tone: "warm", risk_flags: [], compliance_warnings: ["consent_required_before_sharing"] };
    case "spam":
    case "abuse":
    case "unsubscribe_stop":
      return { draft_type: "no_reply_recommended", reply_channel: "no_reply", draft_text: "(no reply recommended — archive/suppress internally)", suggested_tone: "n/a", risk_flags: ["do_not_engage"], compliance_warnings: [] };
    default:
      return { draft_type: "dm_reply", reply_channel: "dm", draft_text: `${ctx}Thanks for the message — quick q to help: what's the goal here?`, suggested_tone: "neutral, brief", risk_flags: [], compliance_warnings: [] };
  }
}

export function isLikelyDuplicate(a: { platform?: string|null; external_event_id?: string|null; social_handle?: string|null; message_text?: string|null }, b: { platform?: string|null; external_event_id?: string|null; social_handle?: string|null; message_text?: string|null }) {
  if (a.external_event_id && b.external_event_id && a.external_event_id === b.external_event_id && a.platform === b.platform) return true;
  if (a.platform === b.platform && a.social_handle && b.social_handle && a.social_handle.toLowerCase() === b.social_handle.toLowerCase() && (a.message_text ?? "").trim() === (b.message_text ?? "").trim() && (a.message_text ?? "").length > 0) return true;
  return false;
}

export function normalizeHandle(h?: string | null) { return (h ?? "").trim().replace(/^@/, "").toLowerCase() || null; }

export const PHRASES = {
  capture: "CAPTURE SOCIAL ENGAGEMENT",
  import: "IMPORT SOCIAL ENGAGEMENT",
  classify: "CLASSIFY SOCIAL ENGAGEMENT",
  crm_apply: "APPLY SOCIAL CRM MATCH",
  reply_draft: "CREATE SOCIAL REPLY DRAFT",
  escalation: "CREATE SOCIAL ENGAGEMENT ESCALATION",
  purge: "PURGE SOCIAL ENGAGEMENT TEST DATA",
} as const;