import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";
import { buildExtraction } from "../_shared/socialBrainLogic.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const auth = await requireFounder(req);
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => ({}));
  const { business_id, source_ids = [], dry_run = true, confirmation_phrase, is_test_data = false } = body ?? {};
  if (!business_id) return json({ ok: false, error: "business_id required" }, 400);

  let q = auth.admin.from("business_social_knowledge_sources").select("*").eq("business_id", business_id);
  if (source_ids.length > 0) q = q.in("id", source_ids);
  const { data: sources } = await q;
  const extraction = buildExtraction(sources ?? []);

  if (dry_run !== false) {
    return json({ ok: true, dry_run: true, would_save: extraction, no_external_action: true });
  }
  if (confirmation_phrase !== "SAVE SOCIAL KNOWLEDGE EXTRACTION") {
    return json({ ok: false, blocked: true, reason: "confirmation_phrase_required" }, 400);
  }

  const { data, error } = await auth.admin.from("business_social_brain_extractions").insert({
    business_id, source_ids,
    extraction_status: "saved",
    extracted_brand_voice: extraction.extracted_brand_voice,
    extracted_audience: extraction.extracted_audience,
    extracted_offers: extraction.extracted_offers,
    extracted_ctas: extraction.extracted_ctas,
    extracted_content_pillars: extraction.extracted_content_pillars,
    extracted_platform_rules: extraction.extracted_platform_rules,
    extracted_forbidden_claims: extraction.extracted_forbidden_claims,
    extracted_escalation_rules: extraction.extracted_escalation_rules,
    extracted_compliance_notes: extraction.extracted_compliance_notes,
    missing_inputs: extraction.missing_inputs,
    confidence_score: extraction.confidence_score,
    model_notes: extraction.model_notes,
    founder_review_required: true,
    is_test_data,
  }).select().single();
  if (error) return json({ ok: false, error: error.message }, 500);
  return json({ ok: true, saved: data, no_external_action: true });
});