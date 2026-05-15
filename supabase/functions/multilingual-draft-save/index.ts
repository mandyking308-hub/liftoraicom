import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const CONFIRM_PHRASE = "SAVE MULTILINGUAL DRAFT";

interface Input {
  business_id?: string | null;
  contact_id?: string | null;
  conversation_id?: string | null;
  interaction_id?: string | null;
  source_language?: string | null;
  detected_language_confidence?: number | null;
  founder_summary_english?: string | null;
  original_text?: string | null;
  translated_text_english?: string | null;
  intent_detected?: string | null;
  cultural_tone_notes?: string | null;
  recommended_response_language?: string | null;
  draft_response_original_language?: string | null;
  draft_response_english_back_translation?: string | null;
  risk_flags?: string[] | null;
  create_approval_item?: boolean | null;
  dry_run?: boolean;
  confirmation_phrase?: string | null;
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
    const dryRun = input.dry_run !== false;

    if (!dryRun && (input.confirmation_phrase ?? "").trim() !== CONFIRM_PHRASE) {
      return new Response(JSON.stringify({
        error: "Confirmation phrase required",
        required_phrase: CONFIRM_PHRASE,
        dry_run: false,
        saved: false,
      }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const lang = (input.source_language ?? "").toLowerCase();
    let founderReviewRequired = true;
    if (lang) {
      const { data: langRow } = await admin
        .from("supported_languages").select("founder_review_required").eq("language_code", lang).maybeSingle();
      if (langRow) founderReviewRequired = !!langRow.founder_review_required;
    }

    if (dryRun) {
      return new Response(JSON.stringify({
        dry_run: true,
        saved: false,
        would_create_review: true,
        would_create_approval_item: !!input.create_approval_item,
        founder_review_required: founderReviewRequired,
        send_allowed: false,
        required_phrase_for_save: CONFIRM_PHRASE,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const row = {
      business_id: input.business_id ?? null,
      contact_id: input.contact_id ?? null,
      conversation_id: input.conversation_id ?? null,
      interaction_id: input.interaction_id ?? null,
      source_language: input.source_language ?? null,
      detected_language_confidence: input.detected_language_confidence ?? null,
      founder_summary_english: input.founder_summary_english ?? null,
      original_text: input.original_text ?? null,
      translated_text_english: input.translated_text_english ?? null,
      intent_detected: input.intent_detected ?? null,
      cultural_tone_notes: input.cultural_tone_notes ?? null,
      recommended_response_language: input.recommended_response_language ?? null,
      draft_response_original_language: input.draft_response_original_language ?? null,
      draft_response_english_back_translation: input.draft_response_english_back_translation ?? null,
      founder_review_required: founderReviewRequired,
      approval_status: "draft",
      send_allowed: false,
      risk_flags: input.risk_flags ?? [],
      metadata: { saved_by: userId },
    };

    const { data: review, error } = await admin
      .from("multilingual_interaction_reviews")
      .insert(row)
      .select()
      .single();
    if (error) throw error;

    let approvalId: string | null = null;
    if (input.create_approval_item) {
      const { data: approval } = await admin
        .from("founder_approval_items")
        .insert({
          business_id: input.business_id ?? null,
          item_type: "multilingual_draft_review",
          status: "pending",
          priority: "medium",
          summary: `Multilingual draft (${input.source_language ?? "?"}) → ${input.recommended_response_language ?? "?"}`,
          payload: { review_id: review.id, risk_flags: input.risk_flags ?? [] },
          source_table: "multilingual_interaction_reviews",
          source_id: review.id,
        })
        .select("id")
        .maybeSingle();
      approvalId = approval?.id ?? null;
    }

    return new Response(JSON.stringify({
      dry_run: false,
      saved: true,
      review_id: review.id,
      approval_item_id: approvalId,
      founder_review_required: founderReviewRequired,
      send_allowed: false,
      email_sent: false,
      provider_mutation: false,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});