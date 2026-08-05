import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";
import {
  VIRAL_CONFIRMATIONS, VIRAL_SAFETY_FLAGS, confirmationAccepted, scoreOpportunity,
  type BusinessMatchContext, type ViralSignalInput,
} from "../_shared/socialViralLogic.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  const ad = a.admin as any;
  const b = await req.json().catch(() => ({} as any));
  const business_id = b.business_id;
  if (!business_id) return json({ ok: false, error: "business_id_required" }, 400);
  if (!b.signal_id) return json({ ok: false, error: "signal_id_required" }, 400);

  const { data: signal } = await ad.from("social_viral_signals")
    .select("*").eq("id", b.signal_id).eq("business_id", business_id).maybeSingle();
  if (!signal) return json({ ok: false, error: "signal_not_found_for_business" }, 404);

  let watchlist: any = null;
  const wid = b.watchlist_id ?? signal.watchlist_id;
  if (wid) {
    const { data } = await ad.from("social_viral_watchlists")
      .select("*").eq("id", wid).eq("business_id", business_id).maybeSingle();
    watchlist = data ?? null;
  }

  const ctx: BusinessMatchContext = {
    business_id,
    niche: watchlist?.niche ?? null,
    audience_description: watchlist?.audience_description ?? null,
    business_objective: b.business_objective ?? watchlist?.business_objective ?? "awareness",
    keywords: watchlist?.keywords ?? [],
    platforms: watchlist?.platforms ?? [],
    geographies: watchlist?.geographies ?? [],
    languages: watchlist?.languages ?? [],
    excluded_topics: watchlist?.excluded_topics ?? [],
    conversion_route: b.conversion_route ?? watchlist?.conversion_route ?? null,
    regulated_sector: !!b.regulated_sector,
  };

  const signalInput: ViralSignalInput = {
    platform: signal.platform,
    external_id: signal.external_id,
    canonical_url: signal.canonical_url,
    title: signal.title,
    topic: signal.topic,
    creator_handle: signal.creator_handle,
    language: signal.language,
    geography: signal.geography,
    metrics: signal.metrics ?? {},
    observed_at: signal.observed_at,
    published_at: signal.published_at,
    freshness_deadline: signal.freshness_deadline,
  };

  const score = scoreOpportunity(signalInput, ctx, { evidence_level: signal.evidence_level });

  const opportunityRow = {
    business_id,
    signal_id: signal.id,
    watchlist_id: watchlist?.id ?? null,
    opportunity_title: (b.opportunity_title ?? signal.title ?? signal.topic ?? `${signal.platform} signal`).slice(0, 200),
    opportunity_summary: b.opportunity_summary ?? null,
    platform: signal.platform,
    target_audience: ctx.audience_description ?? null,
    business_objective: ctx.business_objective ?? "awareness",
    conversion_route: ctx.conversion_route,
    viral_reach_score: score.components.viral_reach,
    trend_velocity_score: score.components.trend_velocity,
    audience_fit_score: score.components.audience_fit,
    conversion_potential_score: score.components.conversion_potential,
    timing_saturation_score: score.components.timing_saturation,
    safety_score: score.components.safety,
    overall_score: score.overall_score,
    confidence_level: score.confidence_level,
    confidence_score: score.confidence_score,
    blockers: score.blockers,
    risk_flags: score.risk_flags,
    requires_compliance_review: score.requires_compliance_review,
    provenance: {
      signal_id: signal.id,
      provider_slug: signal.provider_slug,
      canonical_url: signal.canonical_url,
      observed_at: signal.observed_at,
      evidence_level: signal.evidence_level,
    },
    freshness_deadline: signal.freshness_deadline,
    opportunity_status: score.recommended_status,
    is_test_data: !!signal.is_test_data,
  };

  if (b.dry_run !== false) {
    return json({
      ok: true, dry_run: true, no_records_mutated: true,
      score, preview: opportunityRow,
      phrase_required: VIRAL_CONFIRMATIONS.persist_score,
      disclaimer: "Potential, not guaranteed performance.",
      ...VIRAL_SAFETY_FLAGS,
    });
  }
  if (!confirmationAccepted(b.confirmation_phrase, VIRAL_CONFIRMATIONS.persist_score)) {
    return json({ ok: false, error: `confirmation_phrase_required:${VIRAL_CONFIRMATIONS.persist_score}` }, 400);
  }

  const { data: existing } = await ad.from("social_viral_opportunities")
    .select("id, opportunity_status").eq("business_id", business_id).eq("signal_id", signal.id).maybeSingle();

  let opportunity: any, error: any;
  if (existing) {
    // Never silently un-approve or re-open a founder decision.
    const keepStatus = ["approved", "rejected", "converted"].includes(existing.opportunity_status);
    ({ data: opportunity, error } = await ad.from("social_viral_opportunities")
      .update({ ...opportunityRow, opportunity_status: keepStatus ? existing.opportunity_status : opportunityRow.opportunity_status })
      .eq("id", existing.id).eq("business_id", business_id).select().maybeSingle());
  } else {
    ({ data: opportunity, error } = await ad.from("social_viral_opportunities")
      .insert(opportunityRow).select().maybeSingle());
  }
  if (error) return json({ ok: false, error: error.message }, 500);

  const { data: snapshot } = await ad.from("social_viral_score_snapshots").insert({
    business_id, opportunity_id: opportunity.id,
    formula_version: score.formula_version,
    component_scores: score.components,
    weights: score.weights,
    overall_score: score.overall_score,
    confidence_score: score.confidence_score,
    blockers: score.blockers,
    inputs_digest: `${signal.provider_slug}:${signal.platform}:${signal.external_id}`,
    is_test_data: !!signal.is_test_data,
  }).select().maybeSingle();

  await ad.from("social_viral_signals")
    .update({ signal_status: "scored" }).eq("id", signal.id).eq("business_id", business_id);

  await ad.from("social_viral_audit").insert({
    business_id, actor_user_id: a.user.id, action: "opportunity_scored",
    entity_type: "opportunity", entity_id: opportunity.id, after_json: score as any,
    is_test_data: !!signal.is_test_data,
  });

  return json({ ok: true, opportunity, snapshot, score, disclaimer: "Potential, not guaranteed performance.", ...VIRAL_SAFETY_FLAGS });
});