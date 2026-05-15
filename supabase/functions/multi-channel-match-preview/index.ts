import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

function detectLanguage(text?: string | null): string {
  if (!text) return "unknown";
  const t = text.toLowerCase();
  if (/[\u0600-\u06FF]/.test(text)) return "ar";
  if (/[\u4e00-\u9fff]/.test(text)) return "zh";
  if (/[\u3040-\u30ff]/.test(text)) return "ja";
  if (/[\uac00-\ud7af]/.test(text)) return "ko";
  if (/[\u0900-\u097F]/.test(text)) return "hi";
  if (/\b(bonjour|merci|salut|comment)\b/.test(t)) return "fr";
  if (/\b(hola|gracias|buenos|cómo)\b/.test(t)) return "es";
  if (/\b(hallo|danke|guten|wie)\b/.test(t)) return "de";
  if (/\b(ciao|grazie|buongiorno)\b/.test(t)) return "it";
  if (/\b(olá|obrigado|bom dia)\b/.test(t)) return "pt";
  return "en";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: cErr } = await supabase.auth.getClaims(token);
    if (cErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claims.claims.sub;
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: roles } = await admin
      .from("user_roles").select("role").eq("user_id", userId);
    const ok = (roles ?? []).some((r: any) => ["founder", "admin"].includes(r.role));
    if (!ok) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const eventId: string | undefined = body?.event_id;

    let event: any = null;
    if (eventId) {
      const { data } = await admin
        .from("multi_channel_inbound_events")
        .select("*").eq("id", eventId).maybeSingle();
      event = data;
    } else if (body?.event) {
      event = body.event;
    }
    if (!event) {
      return new Response(JSON.stringify({ error: "event_id or event required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Match contact by email or handle
    let matched: any = null;
    if (event.contact_email) {
      const { data } = await admin
        .from("crm_contacts" as any)
        .select("id, business_id, full_name, email")
        .eq("email", event.contact_email)
        .limit(1).maybeSingle();
      matched = data ?? null;
    }

    const language = event.message_language ?? detectLanguage(event.message_text);

    // Recommend agent task (no execution)
    const text = (event.message_text ?? "").toLowerCase();
    let recommendedAgent = "ai_engagement_agent";
    let intent = "general_reply";
    if (/invoice|payment|refund|billing/.test(text)) { intent = "finance"; recommendedAgent = "finance_agent"; }
    else if (/proposal|quote|pricing/.test(text)) { intent = "sales"; recommendedAgent = "commercial_agent"; }
    else if (/unsubscribe|stop|opt[- ]?out/.test(text)) { intent = "unsubscribe"; recommendedAgent = "compliance_agent"; }
    else if (/complain|angry|unhappy|disappointed/.test(text)) { intent = "escalation"; recommendedAgent = "founder_review"; }

    return new Response(JSON.stringify({
      event_id: event.id ?? null,
      channel_key: event.channel_key,
      detected_language: language,
      matched_contact: matched,
      matched_business_id: matched?.business_id ?? event.business_id ?? null,
      recommended_agent: recommendedAgent,
      recommended_intent: intent,
      founder_review_required: true,
      reply_dispatched: false,
      notes: "Preview only. No reply sent. No provider mutation.",
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});