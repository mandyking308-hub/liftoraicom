import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";
import { buildSocialOperatingProfile } from "../_shared/socialProfileGenerator.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const guard = await requireFounder(req);
  if ("error" in guard) return guard.error;
  const { admin } = guard;

  const body = await req.json().catch(() => ({}));
  const business_id = body.business_id;
  if (!business_id) return json({ ok: false, error: "business_id required" }, 400);

  const dry_run = body.dry_run !== false;
  const phrase = body.confirmation_phrase ?? "";
  const replacePhrase = "REPLACE APPROVED SOCIAL OPERATING PROFILE";
  const allowReplace = phrase === replacePhrase;

  // Build payload (use provided or regenerate)
  let payload = body.generated_profile_payload;
  if (!payload) {
    const [{ data: brain }, { data: sources }] = await Promise.all([
      admin.from("business_social_brain_profiles").select("*").eq("business_id", business_id).maybeSingle(),
      admin.from("business_social_knowledge_sources")
        .select("id,source_type,title,pasted_text,summary,approved_for_social_training")
        .eq("business_id", business_id),
    ]);
    payload = buildSocialOperatingProfile({
      business_id,
      brain,
      sources: (sources ?? []).filter((s: any) => s.approved_for_social_training !== false),
    });
  }

  if (dry_run) {
    return json({
      ok: true,
      dry_run: true,
      no_records_mutated: true,
      would_write: {
        pillars: payload.content_pillars?.length ?? 0,
        platform_rules: payload.platform_rules?.length ?? 0,
        offer_mappings: payload.offer_mappings?.length ?? 0,
        risk_flags: payload.risk_flags?.length ?? 0,
        version_snapshot: true,
      },
    });
  }

  if (phrase !== "SAVE SOCIAL OPERATING PROFILE" && !allowReplace) {
    return json({ ok: false, reason: "confirmation_phrase_required", expected: "SAVE SOCIAL OPERATING PROFILE" }, 400);
  }

  // Check existing approved
  const { data: existingApproved } = await admin
    .from("business_social_content_pillars")
    .select("id").eq("business_id", business_id).eq("approval_status", "approved").limit(1);
  if ((existingApproved?.length ?? 0) > 0 && !allowReplace) {
    return json({ ok: false, reason: "approved_profile_exists", hint: `Use phrase: ${replacePhrase}` }, 409);
  }

  const brain_profile_id = payload.social_brain_profile_id ?? null;

  const pillarRows = (payload.content_pillars ?? []).map((p: any) => ({
    business_id, social_brain_profile_id: brain_profile_id,
    pillar_name: p.pillar_name, pillar_description: p.pillar_description,
    funnel_stage: p.funnel_stage, recommended_platforms: p.recommended_platforms ?? [],
    example_topics: p.example_topics ?? [], example_hooks: p.example_hooks ?? [],
    priority_score: p.priority_score ?? 0, approval_status: "draft",
  }));
  const platformRows = (payload.platform_rules ?? []).map((r: any) => ({
    business_id, social_brain_profile_id: brain_profile_id,
    platform: r.platform, suitability_score: r.suitability_score ?? 0,
    recommended_use: r.recommended_use, content_types: r.content_types ?? [],
    tone_adjustments: r.tone_adjustments, posting_frequency: r.posting_frequency,
    best_time_notes: r.best_time_notes, caption_rules: r.caption_rules,
    hashtag_rules: r.hashtag_rules, link_rules: r.link_rules,
    engagement_rules: r.engagement_rules, risk_notes: r.risk_notes,
    approval_required: true, is_active: !!r.is_active,
  }));
  const offerRows = (payload.offer_mappings ?? []).map((o: any) => ({
    business_id, social_brain_profile_id: brain_profile_id,
    offer_name: o.offer_name, offer_summary: o.offer_summary,
    target_customer: o.target_customer, pain_points: o.pain_points ?? [],
    value_props: o.value_props ?? [], proof_needed: o.proof_needed ?? [],
    content_angles: o.content_angles ?? [], suggested_ctas: o.suggested_ctas ?? [],
    funnel_stage: o.funnel_stage ?? "lead_generation",
    priority_score: o.priority_score ?? 0,
    metadata: { missing: o.missing ?? [] },
  }));
  const riskRows = (payload.risk_flags ?? []).map((r: any) => ({
    business_id, social_brain_profile_id: brain_profile_id,
    risk_type: r.risk_type, risk_level: r.risk_level,
    risk_description: r.risk_description, affected_platforms: r.affected_platforms ?? [],
    suggested_guardrail: r.suggested_guardrail,
    founder_review_required: r.founder_review_required ?? true,
    legal_review_required: r.legal_review_required ?? false,
  }));

  if (allowReplace) {
    await admin.from("business_social_content_pillars").update({ approval_status: "archived" })
      .eq("business_id", business_id).neq("approval_status", "archived");
    await admin.from("business_social_platform_rules").update({ is_active: false })
      .eq("business_id", business_id);
    await admin.from("business_social_offer_mappings").update({ approval_status: "archived" })
      .eq("business_id", business_id).neq("approval_status", "archived");
  }

  const writes: any = {};
  if (pillarRows.length) writes.pillars = (await admin.from("business_social_content_pillars").insert(pillarRows).select("id")).data?.length ?? 0;
  if (offerRows.length) writes.offers = (await admin.from("business_social_offer_mappings").insert(offerRows).select("id")).data?.length ?? 0;
  if (riskRows.length) writes.risks = (await admin.from("business_social_risk_flags").insert(riskRows).select("id")).data?.length ?? 0;
  // platform rules: upsert per (business_id, platform)
  let platformsWritten = 0;
  for (const row of platformRows) {
    const { error } = await admin.from("business_social_platform_rules")
      .upsert(row, { onConflict: "business_id,platform" });
    if (!error) platformsWritten++;
  }
  writes.platform_rules = platformsWritten;

  // version snapshot
  const { data: last } = await admin.from("business_social_profile_versions")
    .select("version_number").eq("business_id", business_id)
    .order("version_number", { ascending: false }).limit(1);
  const nextVersion = ((last?.[0]?.version_number ?? 0) + 1);
  await admin.from("business_social_profile_versions").insert({
    business_id,
    profile_id: brain_profile_id,
    version_number: nextVersion,
    version_status: "draft",
    profile_snapshot: payload,
    generated_from_sources: payload.generated_from_sources ?? [],
    change_summary: allowReplace ? "Replace approved profile" : "Initial save",
  });

  return json({
    ok: true, dry_run: false, writes, version_number: nextVersion,
    safety_audit: { provider_calls: false, published: false },
  });
});