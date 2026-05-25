import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod";
import { callAIGateway } from "../_shared/aiGateway.ts";

interface Input {
  interaction_id?: string | null;
  conversation_id?: string | null;
  business_id?: string | null;
  contact_id?: string | null;
  raw_text?: string | null;
  founder_language?: string | null;
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
    const { data: claims } = await supabase.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (!claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claims.claims.sub;
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    const ok = (roles ?? []).some((r: any) => ["founder", "admin"].includes(r.role));
    if (!ok) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const input = (await req.json().catch(() => ({}))) as Input;
    const text = (input.raw_text ?? "").trim();
    if (!text) {
      return new Response(JSON.stringify({ error: "raw_text required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const founderLang = (input.founder_language ?? "en").toLowerCase();

    const schema = z.object({
      source_language: z.string().describe("ISO 639-1 code, e.g. en, fr, ar"),
      detection_confidence: z.number().min(0).max(1),
      english_summary: z.string(),
      translated_text_english: z.string(),
      intent_detected: z.string(),
      cultural_tone_notes: z.string(),
      recommended_response_language: z.string(),
      draft_response_original_language: z.string(),
      draft_response_english_back_translation: z.string(),
      risk_flags: z.array(z.string()),
    });

    const gatewayInput = {
      action_type: "multilingual_intake_preview",
      task_category: "intake_translation",
      model: "google/gemini-3-flash-preview",
      messages: [
        {
          role: "user" as const,
          content:
            `You are a multilingual intake analyst for a B2B AI engineering firm. Founder reviews everything in ${founderLang}.\n\n` +
            `Customer message:\n"""${text}"""\n\n` +
            `Detect language, summarise in English for the founder, classify intent (e.g. enquiry, complaint, scheduling, pricing, support, spam), note cultural/tone considerations for the customer's language, recommend response language, draft a polite response in the customer's language preserving formal B2B tone, and provide an English back-translation of that draft. Flag risks: legal_risk, compliance_risk, sanctions_risk, ambiguous_meaning, sensitive_content, low_confidence, machine_translation_warning. Always include "machine_translation_warning" if confidence < 0.85.\n\n` +
            `Respond ONLY with a strict JSON object matching this schema: {source_language:string(ISO 639-1), detection_confidence:number(0..1), english_summary:string, translated_text_english:string, intent_detected:string, cultural_tone_notes:string, recommended_response_language:string, draft_response_original_language:string, draft_response_english_back_translation:string, risk_flags:string[]}.`,
        },
      ],
      response_format: { type: "json_object" } as any,
      user_id: userId,
      business_id: input.business_id ?? null,
      conversation_id: input.conversation_id ?? null,
      request_type: "multilingual_intake_preview",
      risk_level: "low" as const,
      approval_required: false,
      metadata: {
        interaction_id: input.interaction_id ?? null,
        contact_id: input.contact_id ?? null,
        founder_language: founderLang,
        text_length: text.length,
      },
    };
    const gw = await callAIGateway(gatewayInput);
    if (gw.status !== "completed" || !gw.data) {
      const status = gw.status === "rate_limited" ? 429 : gw.status === "payment_required" ? 402 : 500;
      return new Response(JSON.stringify({ error: gw.error ?? `gateway_${gw.http_status}` }), {
        status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const raw = gw.data?.choices?.[0]?.message?.content ?? "{}";
    let parsed: z.infer<typeof schema>;
    try {
      parsed = schema.parse(JSON.parse(raw));
    } catch (e: any) {
      return new Response(JSON.stringify({ error: `schema_parse_failed: ${String(e?.message ?? e)}` }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({
      ...parsed,
      send_allowed: false,
      founder_review_required: true,
      note: "Preview only. Not saved. No send.",
      trace_id: gw.trace_id,
      request_id: gw.request_id,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    const status = typeof e?.statusCode === "number" ? e.statusCode : 500;
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});