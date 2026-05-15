import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const KEYWORDS = ["CANDY","DROP","LINK","MUSIC","COLLAB","PRESS","BOOK","BUY"];
const SPAM_HINTS = ["follow back","f4f","check my page","crypto","earn $","free followers","onlyfans","link in bio dm"];
const CREATOR_HINTS = ["creator","label","producer","management","press","feature","collab","playlist","blog","editor","journalist"];
const FAN_HINTS = ["love","obsessed","banger","fire","goat","queen","king","stan","favourite","favorite","🔥","🍭","❤️"];
const COMPLAINT_HINTS = ["refund","scam","broken","didn't","hate","disappointed","ripoff"];
const SUPPORT_HINTS = ["help","question","issue","problem","how do i","when is"];
const HIGH_VALUE_HINTS = ["budget","pay","sponsor","retainer","license","sync","brand deal","commission"];
const PLAYLIST_MEDIA_HINTS = ["playlist","spotify curator","editor","blog","podcast","feature in"];

function classify(text: string) {
  const t = (text ?? "").toLowerCase();
  const flags = {
    spam: SPAM_HINTS.some((k) => t.includes(k)),
    creator: CREATOR_HINTS.some((k) => t.includes(k)),
    fan: FAN_HINTS.some((k) => t.includes(k)),
    complaint: COMPLAINT_HINTS.some((k) => t.includes(k)),
    support: SUPPORT_HINTS.some((k) => t.includes(k)),
    high_value: HIGH_VALUE_HINTS.some((k) => t.includes(k)),
    playlist_media: PLAYLIST_MEDIA_HINTS.some((k) => t.includes(k)),
    collaborator: t.includes("collab") || t.includes("work together") || t.includes("partner"),
  };
  let label = "unknown";
  if (flags.spam) label = "spam";
  else if (flags.high_value) label = "high_value";
  else if (flags.complaint) label = "complaint";
  else if (flags.collaborator) label = "collaborator";
  else if (flags.creator) label = "creator";
  else if (flags.playlist_media) label = "playlist_media";
  else if (flags.support) label = "customer_support";
  else if (flags.fan) label = "fan";

  const keyword = KEYWORDS.find((k) => t.includes(k.toLowerCase())) ?? null;
  const sentiment = flags.complaint ? "negative" : (flags.fan || flags.high_value ? "positive" : "neutral");

  let recommendation: any;
  switch (label) {
    case "spam": recommendation = { action: "ignore_spam", manychat_flow: null, founder_reply: null, crm_capture: false, creator_outreach: false }; break;
    case "high_value": recommendation = { action: "founder_reply", manychat_flow: null, founder_reply: "Personal founder reply — high-value lead. Capture in CRM, schedule call.", crm_capture: true, creator_outreach: false }; break;
    case "complaint": recommendation = { action: "founder_reply", manychat_flow: null, founder_reply: "Apologise, ask for details, route to support. Do not auto-reply.", crm_capture: true, creator_outreach: false }; break;
    case "collaborator":
    case "creator": recommendation = { action: "creator_outreach", manychat_flow: keyword ? `${keyword.toLowerCase()}_keyword` : null, founder_reply: "Thanks for reaching out — share more about what you're working on.", crm_capture: true, creator_outreach: true }; break;
    case "playlist_media": recommendation = { action: "creator_outreach", manychat_flow: null, founder_reply: "Thanks — happy to send the press kit and stems.", crm_capture: true, creator_outreach: true }; break;
    case "customer_support": recommendation = { action: "founder_reply", manychat_flow: null, founder_reply: "Acknowledge, ask for context, log support ticket.", crm_capture: true, creator_outreach: false }; break;
    case "fan": recommendation = { action: "manychat_flow", manychat_flow: keyword ? `${keyword.toLowerCase()}_keyword` : "candy_keyword", founder_reply: "Heart + short reply when keyword present.", crm_capture: false, creator_outreach: false }; break;
    default: recommendation = { action: "founder_review", manychat_flow: null, founder_reply: "Needs founder triage.", crm_capture: false, creator_outreach: false };
  }

  return { label, sentiment, keyword_detected: keyword, signals: flags, recommendation };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization") ?? "";

    const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const admin = createClient(url, service);
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", userData.user.id);
    const isFounder = (roles ?? []).some((r: any) => r.role === "founder" || r.role === "admin");
    if (!isFounder) {
      return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json().catch(() => ({}));
    const event_id: string | undefined = body?.social_engagement_event_id;
    const raw_text: string | undefined = body?.raw_text;
    const persist: boolean = body?.persist === true;

    let text = raw_text ?? "";
    let event: any = null;
    if (event_id) {
      const { data } = await admin.from("social_engagement_events").select("*").eq("id", event_id).maybeSingle();
      if (!data) return new Response(JSON.stringify({ error: "event not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      event = data;
      text = data.message_text ?? "";
    }
    if (!text) {
      return new Response(JSON.stringify({ error: "raw_text or social_engagement_event_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const result = classify(text);

    if (persist && event_id) {
      await admin.from("social_engagement_events").update({
        detected_intent: result.label,
        sentiment: result.sentiment,
        keyword_detected: result.keyword_detected,
        creator_signal: result.signals.creator || result.signals.collaborator,
        customer_signal: result.signals.support,
        fan_signal: result.signals.fan,
        spam_signal: result.signals.spam,
        requires_response: result.recommendation.action !== "ignore_spam",
        founder_review_required: true,
        raw_payload: { ...(event?.raw_payload ?? {}), classification: result },
      }).eq("id", event_id);
    }

    return new Response(JSON.stringify({
      status: "ok",
      classification: result,
      persisted: persist && !!event_id,
      safety_audit: { no_external_dm: true, no_external_reply: true, no_manychat_api_call: true },
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});