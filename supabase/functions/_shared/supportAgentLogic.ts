import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

export const SUPPORT_SAFETY = {
  send_allowed: false,
  external_chat_connected: false,
  external_api_called: false,
  customer_replies_sent: 0,
  live_chats_started: 0,
  tickets_created_externally: 0,
  fake_tickets_created: 0,
  external_api_calls: 0,
  notes: "Support agent is internal-draft only. No external send, no live chat, no helpdesk API.",
};

export const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

export async function requireFounder(req: Request) {
  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return { error: json({ ok: false, error: "auth_missing", safety: SUPPORT_SAFETY }, 401) } as const;
  const userClient = createClient(url, anon, { global: { headers: { Authorization: auth } } });
  const { data: u } = await userClient.auth.getUser();
  if (!u?.user) return { error: json({ ok: false, error: "auth_invalid", safety: SUPPORT_SAFETY }, 401) } as const;
  const admin = createClient(url, service, { auth: { persistSession: false } });
  const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", u.user.id);
  const set = new Set((roles ?? []).map((r: any) => r.role));
  if (!set.has("founder") && !set.has("admin")) {
    return { error: json({ ok: false, error: "forbidden", safety: SUPPORT_SAFETY }, 403) } as const;
  }
  return { admin, user: u.user } as const;
}

export function classifyQuestion(text: string): {
  intent: string; category: string; urgency: string; risk_level: string;
  sentiment: string; recommended_agent: string; risk_flags: string[];
} {
  const t = (text || "").toLowerCase();
  const has = (...kws: string[]) => kws.some((k) => t.includes(k));
  let intent = "general_question";
  let category = "other";
  let urgency = "normal";
  let risk_level = "low";
  let sentiment: string = "neutral";
  let recommended_agent = "support_agent";
  const risk_flags: string[] = [];
  if (has("refund", "money back", "chargeback")) { intent = "refund_question"; category = "refund"; risk_level = "medium"; }
  else if (has("cancel", "cancellation")) { intent = "cancellation_question"; category = "cancellation"; risk_level = "medium"; }
  else if (has("price", "cost", "pricing", "quote")) { intent = "pricing_question"; category = "pricing"; }
  else if (has("invoice", "billing", "charged", "payment")) { intent = "billing_question"; category = "billing"; risk_level = "medium"; recommended_agent = "finance_agent"; }
  else if (has("delivery", "shipping", "arrive", "tracking")) { intent = "delivery_question"; category = "delivery"; }
  else if (has("onboard", "setup", "getting started")) { intent = "onboarding_question"; category = "onboarding"; }
  else if (has("login", "password", "access", "locked out", "account")) { intent = "account_access"; category = "account"; }
  else if (has("not working", "broken", "error", "bug", "doesn't work", "issue")) { intent = "technical_support"; category = "technical_support"; }
  else if (has("complain", "complaint", "angry", "disappointed", "terrible")) { intent = "complaint"; category = "complaint"; urgency = "high"; risk_level = "high"; sentiment = "negative"; recommended_agent = "customer_recovery_agent"; risk_flags.push("complaint"); }
  else if (has("lawyer", "sue", "legal action", "court", "lawsuit")) { intent = "dispute"; category = "complaint"; urgency = "urgent"; risk_level = "critical"; sentiment = "negative"; recommended_agent = "founder_copilot_agent"; risk_flags.push("legal_threat"); }
  else if (has("data breach", "gdpr", "privacy", "personal data")) { intent = "urgent_risk"; category = "privacy"; urgency = "urgent"; risk_level = "high"; recommended_agent = "compliance_agent"; risk_flags.push("privacy"); }
  else if (has("emergency", "urgent", "asap", "immediately")) { intent = "urgent_risk"; urgency = "urgent"; risk_level = "high"; }
  else if (has("thank", "amazing", "love", "great")) { intent = "testimonial"; sentiment = "positive"; urgency = "low"; }
  else if (has("interested", "buy", "upgrade", "more info")) { intent = "upsell_interest"; sentiment = "positive"; recommended_agent = "customer_success_agent"; }
  if (has("medical", "health advice", "diagnosis")) { risk_flags.push("medical"); risk_level = "high"; recommended_agent = "founder_copilot_agent"; }
  if (has("tax", "financial advice", "invest")) { risk_flags.push("financial_advice"); risk_level = "high"; recommended_agent = "founder_copilot_agent"; }
  return { intent, category, urgency, risk_level, sentiment, recommended_agent, risk_flags };
}

export function detectUnsupportedClaims(text: string): string[] {
  const out: string[] = [];
  const t = (text || "").toLowerCase();
  if (/\b\d+%\b/.test(t)) out.push("contains_percentage_claim");
  if (/\bguarantee/.test(t)) out.push("guarantee_language");
  if (/\brefund\b/.test(t)) out.push("refund_promise");
  if (/\bsla\b|\bservice level\b/.test(t)) out.push("sla_promise");
  if (/\b24\/?7\b|\balways available\b/.test(t)) out.push("availability_promise");
  if (/\bfree\b/.test(t)) out.push("free_claim");
  if (/\bbest\b|#1|\bnumber one\b/.test(t)) out.push("superlative");
  return out;
}