import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), {
    status: s,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

/* ---- intent classifier (rule-based, no LLM call, no side effects) ---- */
type Intent =
  | "interested"
  | "send_more"
  | "not_relevant"
  | "unsubscribe"
  | "wrong_person"
  | "partnership_opportunity"
  | "licensing_opportunity"
  | "press_media_opportunity"
  | "creator_opportunity"
  | "high_value_founder_review"
  | "unknown";

const RULES: { intent: Intent; re: RegExp; weight: number }[] = [
  { intent: "unsubscribe", re: /\b(unsubscribe|opt[- ]?out|stop emailing|remove me|do not (?:contact|email))\b/i, weight: 0.95 },
  { intent: "wrong_person", re: /\b(wrong person|not (?:the right|me)|no longer (?:work|with)|left the company)\b/i, weight: 0.9 },
  { intent: "not_relevant", re: /\b(not (?:relevant|interested|a fit)|no thanks|pass\b|not for (?:us|me))\b/i, weight: 0.85 },
  { intent: "send_more", re: /\b(send (?:more|over|the (?:link|deck|info))|more info|share (?:more|access)|please send)\b/i, weight: 0.8 },
  { intent: "licensing_opportunity", re: /\b(licen[cs]e|sync(?:ing)?|publishing|royalt|master rights)\b/i, weight: 0.85 },
  { intent: "partnership_opportunity", re: /\b(partner(?:ship)?|collab(?:orate|oration)?|work together|joint)\b/i, weight: 0.8 },
  { intent: "press_media_opportunity", re: /\b(press|media|feature|interview|magazine|journalist|outlet)\b/i, weight: 0.8 },
  { intent: "creator_opportunity", re: /\b(creator|influencer|tiktok|instagram|youtube|reels|shorts)\b/i, weight: 0.75 },
  { intent: "interested", re: /\b(interested|sounds (?:good|great)|love (?:this|it)|would like|happy to (?:chat|talk))\b/i, weight: 0.75 },
  { intent: "high_value_founder_review", re: /\b(label|a&r|major|publisher|deal|contract|legal|lawyer)\b/i, weight: 0.7 },
];

function classifyReply(text: string): { intent: Intent; confidence: number; matched: string[] } {
  const t = (text ?? "").trim();
  if (!t) return { intent: "unknown", confidence: 0, matched: [] };
  const matched: { intent: Intent; weight: number; snippet: string }[] = [];
  for (const r of RULES) {
    const m = t.match(r.re);
    if (m) matched.push({ intent: r.intent, weight: r.weight, snippet: m[0] });
  }
  if (matched.length === 0) return { intent: "unknown", confidence: 0.2, matched: [] };
  matched.sort((a, b) => b.weight - a.weight);
  return {
    intent: matched[0].intent,
    confidence: matched[0].weight,
    matched: matched.map((m) => `${m.intent}:${m.snippet}`),
  };
}

const ELIGIBLE_TYPES = new Set([
  "reply_received",
  "email_bounced",
  "lead_unsubscribed",
  "link_clicked",
  "email_opened",
]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return json({ ok: false, error: "auth_missing" }, 401);

  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false },
  });
  const { data: u, error: ue } = await userClient.auth.getUser(auth.replace("Bearer ", ""));
  if (ue || !u?.user) return json({ ok: false, error: "auth_invalid" }, 401);

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", u.user.id);
  const roleSet = new Set((roles ?? []).map((r: any) => r.role));
  if (!roleSet.has("founder") && !roleSet.has("admin")) {
    return json({ ok: false, error: "forbidden" }, 403);
  }

  let body: any = {};
  try { body = await req.json(); } catch { body = {}; }
  const limit = Math.min(Math.max(Number(body.limit ?? 50), 1), 200);

  const { data: events } = await admin
    .from("outbound_provider_events")
    .select(
      "id, provider_event_type, provider_campaign_id, provider_lead_id, raw_payload, normalized_payload, received_at",
    )
    .eq("provider_type", "smartlead")
    .in("provider_event_type", Array.from(ELIGIBLE_TYPES))
    .order("received_at", { ascending: false })
    .limit(limit);

  const { data: mappings } = await admin
    .from("outbound_provider_campaign_mappings")
    .select("provider_campaign_id, liftor_campaign_id, business_id")
    .eq("provider_type", "smartlead")
    .eq("is_active", true);
  const mapByProvider = new Map<string, any>();
  for (const m of mappings ?? []) mapByProvider.set(String(m.provider_campaign_id), m);

  const previews: any[] = [];
  const counts: Record<string, number> = {};
  for (const e of events ?? []) {
    const evt = String(e.provider_event_type);
    counts[evt] = (counts[evt] ?? 0) + 1;

    const norm: any = e.normalized_payload ?? {};
    const raw: any = e.raw_payload ?? {};
    const email = norm?.email ?? raw?.email ?? raw?.lead?.email ?? null;

    let contactId: string | null = null;
    if (email) {
      const { data: contact } = await admin
        .from("contacts")
        .select("id")
        .ilike("email", String(email))
        .maybeSingle();
      contactId = contact?.id ?? null;
    }

    const camp = e.provider_campaign_id ? mapByProvider.get(String(e.provider_campaign_id)) : null;

    let intent: Intent = "unknown";
    let confidence = 0;
    let recommended_action = "manual_review";

    if (evt === "reply_received") {
      const replyText: string =
        raw?.reply_message?.text ??
        raw?.reply_text ??
        raw?.message ??
        raw?.text ??
        raw?.body ??
        norm?.reply_text ??
        "";
      const cls = classifyReply(String(replyText));
      intent = cls.intent;
      confidence = cls.confidence;
      recommended_action =
        intent === "unsubscribe"
          ? "unsubscribe_contact_later"
          : intent === "wrong_person"
            ? "mark_wrong_contact_later"
            : intent === "not_relevant"
              ? "soft_close_later"
              : intent === "high_value_founder_review"
                ? "founder_review_now"
                : "draft_reply_for_founder_review_later";
    } else if (evt === "email_bounced") {
      recommended_action = "suppress_contact_later";
    } else if (evt === "lead_unsubscribed") {
      recommended_action = "unsubscribe_contact_later";
    } else if (evt === "link_clicked" || evt === "email_opened") {
      recommended_action = "engagement_signal_only";
    }

    previews.push({
      provider_event_id: e.id,
      received_at: e.received_at,
      normalized_event_type: evt,
      contact_email: email,
      matched_contact_id: contactId,
      matched_liftor_campaign_id: camp?.liftor_campaign_id ?? null,
      matched_business_id: camp?.business_id ?? null,
      provider_campaign_id: e.provider_campaign_id,
      detected_intent: intent,
      confidence,
      recommended_action,
      founder_review_required: true,
      ai_draft_allowed: false,
      outbound_send_allowed: false,
      apply_status: "preview",
    });
  }

  return json({
    ok: true,
    event_count: previews.length,
    counts_by_type: counts,
    previews,
    apply_available: false,
    apply_disabled_reason: "ai_intake_apply_disabled_by_default",
    notes:
      "Read-only classification preview. No communications, no conversations, no AI drafts, no outbound sends. No queue / contact / BCR / compliance / system_settings / cron mutation.",
  });
});