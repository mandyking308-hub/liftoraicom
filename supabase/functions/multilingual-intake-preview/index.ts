import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createOpenAICompatible } from "npm:@ai-sdk/openai-compatible";
import { generateText, Output } from "npm:ai";
import { z } from "npm:zod";
import { beginGatewayLog, endGatewayLog } from "../_shared/aiGateway.ts";

interface Input {
  interaction_id?: string | null;
  conversation_id?: string | null;
  business_id?: string | null;
  contact_id?: string | null;
  raw_text?: string | null;
  founder_language?: string | null;
}

function gateway(key: string) {
  return createOpenAICompatible({
    name: "lovable",
    baseURL: "https://ai.gateway.lovable.dev/v1",
    headers: { "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
  });
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

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY missing" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const model = gateway(apiKey)("google/gemini-3-flash-preview");
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
      messages: [],
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
    const ctx = await beginGatewayLog(gatewayInput);
    try {
      const result = await generateText({
        model,
        output: Output.object({ schema }),
        prompt:
          `You are a multilingual intake analyst for a B2B AI engineering firm. Founder reviews everything in ${founderLang}.\n\n` +
          `Customer message:\n"""${text}"""\n\n` +
          `Detect language, summarise in English for the founder, classify intent (e.g. enquiry, complaint, scheduling, pricing, support, spam), note cultural/tone considerations for the customer's language, recommend response language, draft a polite response in the customer's language preserving formal B2B tone, and provide an English back-translation of that draft. Flag risks: legal_risk, compliance_risk, sanctions_risk, ambiguous_meaning, sensitive_content, low_confidence, machine_translation_warning. Always include "machine_translation_warning" if confidence < 0.85.`,
      });
      const usage: any = (result as any).usage ?? {};
      await endGatewayLog({ ...ctx, input: gatewayInput }, {
        ok: true,
        prompt_tokens: usage.promptTokens ?? usage.prompt_tokens,
        completion_tokens: usage.completionTokens ?? usage.completion_tokens,
      });
      return new Response(JSON.stringify({
        ...result.output,
        send_allowed: false,
        founder_review_required: true,
        note: "Preview only. Not saved. No send.",
        trace_id: ctx.trace_id,
        request_id: ctx.request_id,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    } catch (err: any) {
      await endGatewayLog({ ...ctx, input: gatewayInput }, { ok: false, error: String(err?.message ?? err) });
      throw err;
    }
  } catch (e: any) {
    const status = typeof e?.statusCode === "number" ? e.statusCode : 500;
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});