import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";
import { buildExtraction, profileFromExtraction, NEONCANDY_SEED } from "../_shared/socialBrainLogic.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const auth = await requireFounder(req);
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => ({}));
  const {
    business_id, extraction_id, dry_run = true, confirmation_phrase,
    use_neoncandy_seed = false, business_name,
  } = body ?? {};
  if (!business_id) return json({ ok: false, error: "business_id required" }, 400);

  // Existing profile guard
  const { data: existing } = await auth.admin.from("business_social_brain_profiles")
    .select("*").eq("business_id", business_id).maybeSingle();
  if (existing?.profile_status === "approved" || existing?.profile_status === "applied_to_settings") {
    if (confirmation_phrase !== "REGENERATE APPROVED SOCIAL BRAIN PROFILE") {
      return json({
        ok: false, blocked: true,
        reason: "approved_profile_requires_regen_phrase",
        existing_status: existing.profile_status,
      }, 409);
    }
  }

  // Build draft
  let draft: any;
  if (use_neoncandy_seed) {
    draft = { ...NEONCANDY_SEED };
  } else if (extraction_id) {
    const { data: ex } = await auth.admin.from("business_social_brain_extractions")
      .select("*").eq("id", extraction_id).maybeSingle();
    if (!ex) return json({ ok: false, error: "extraction_not_found" }, 404);
    draft = profileFromExtraction(ex, business_name);
  } else {
    const { data: sources } = await auth.admin.from("business_social_knowledge_sources")
      .select("*").eq("business_id", business_id).eq("approved_for_social_training", true);
    draft = profileFromExtraction(buildExtraction(sources ?? [], business_name), business_name);
  }

  if (dry_run !== false) {
    return json({
      ok: true, dry_run: true,
      preview: draft,
      missing_inputs: draft.missing_inputs ?? [],
      confidence_score: draft.confidence_score ?? 0,
      founder_review_required: true,
      no_external_action: true,
    });
  }
  if (confirmation_phrase !== "GENERATE SOCIAL BRAIN PROFILE" &&
      confirmation_phrase !== "REGENERATE APPROVED SOCIAL BRAIN PROFILE") {
    return json({ ok: false, blocked: true, reason: "confirmation_phrase_required" }, 400);
  }

  const upsertPayload = {
    business_id, profile_status: "needs_review",
    last_generated_at: new Date().toISOString(),
    ...draft,
  };
  const { data, error } = await auth.admin.from("business_social_brain_profiles")
    .upsert(upsertPayload, { onConflict: "business_id" }).select().single();
  if (error) return json({ ok: false, error: error.message }, 500);

  await auth.admin.from("business_social_profile_approval_log").insert({
    business_id, profile_id: data.id, action: "generated",
    before_json: existing ?? {}, after_json: data,
  });

  return json({ ok: true, profile: data, founder_review_required: true, no_external_action: true });
});