import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";
import {
  VIRAL_CONFIRMATIONS, VIRAL_SAFETY_FLAGS, buildContentBrief, confirmationAccepted,
} from "../_shared/socialViralLogic.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  const ad = a.admin as any;
  const b = await req.json().catch(() => ({} as any));
  const business_id = b.business_id;
  if (!business_id) return json({ ok: false, error: "business_id_required" }, 400);

  // ---- brief lifecycle actions (list / approve / link to content) --------
  const action = b.action ?? "create";
  if (action === "list") {
    const { data, error } = await ad.from("social_viral_content_briefs")
      .select("*").eq("business_id", business_id).order("created_at", { ascending: false }).limit(100);
    if (error) return json({ ok: false, error: error.message }, 500);
    return json({ ok: true, briefs: data ?? [], ...VIRAL_SAFETY_FLAGS });
  }
  if (action === "approve_brief" || action === "reject_brief" || action === "link_content") {
    if (!b.brief_id) return json({ ok: false, error: "brief_id_required" }, 400);
    const patch: Record<string, unknown> =
      action === "approve_brief" ? { brief_status: "approved" }
      : action === "reject_brief" ? { brief_status: "rejected" }
      : { brief_status: "linked_to_content", content_pack_id: b.content_pack_id ?? null, content_item_id: b.content_item_id ?? null };
    if (b.dry_run !== false) {
      return json({ ok: true, dry_run: true, no_records_mutated: true, would_set: patch, phrase_required: VIRAL_CONFIRMATIONS.create_brief, ...VIRAL_SAFETY_FLAGS });
    }
    if (!confirmationAccepted(b.confirmation_phrase, VIRAL_CONFIRMATIONS.create_brief)) {
      return json({ ok: false, error: `confirmation_phrase_required:${VIRAL_CONFIRMATIONS.create_brief}` }, 400);
    }
    const { data, error } = await ad.from("social_viral_content_briefs")
      .update(patch).eq("id", b.brief_id).eq("business_id", business_id).select().maybeSingle();
    if (error) return json({ ok: false, error: error.message }, 500);
    if (!data) return json({ ok: false, error: "brief_not_found_for_business" }, 404);
    await ad.from("social_viral_audit").insert({
      business_id, actor_user_id: a.user.id, action, entity_type: "content_brief", entity_id: data.id, after_json: patch,
    });
    return json({ ok: true, brief: data, ...VIRAL_SAFETY_FLAGS });
  }

  if (!b.opportunity_id) return json({ ok: false, error: "opportunity_id_required" }, 400);

  const { data: opportunity } = await ad.from("social_viral_opportunities")
    .select("*").eq("id", b.opportunity_id).eq("business_id", business_id).maybeSingle();
  if (!opportunity) return json({ ok: false, error: "opportunity_not_found_for_business" }, 404);

  const [{ data: signal }, { data: snapshot }, { data: brain }] = await Promise.all([
    opportunity.signal_id
      ? ad.from("social_viral_signals").select("*").eq("id", opportunity.signal_id).eq("business_id", business_id).maybeSingle()
      : Promise.resolve({ data: null }),
    ad.from("social_viral_score_snapshots").select("*").eq("business_id", business_id)
      .eq("opportunity_id", opportunity.id).order("scored_at", { ascending: false }).limit(1).maybeSingle(),
    ad.from("business_social_brain_profiles").select("brand_voice").eq("business_id", business_id).maybeSingle(),
  ]);

  const { brief, blockers } = buildContentBrief({
    opportunity: {
      id: opportunity.id,
      opportunity_title: opportunity.opportunity_title,
      opportunity_summary: opportunity.opportunity_summary,
      platform: opportunity.platform,
      target_audience: opportunity.target_audience,
      business_objective: opportunity.business_objective,
      conversion_route: opportunity.conversion_route,
      freshness_deadline: opportunity.freshness_deadline,
      opportunity_status: opportunity.opportunity_status,
      risk_flags: opportunity.risk_flags ?? [],
      requires_compliance_review: opportunity.requires_compliance_review,
    },
    signal: signal
      ? {
          platform: signal.platform, external_id: signal.external_id,
          canonical_url: signal.canonical_url, title: signal.title, topic: signal.topic,
          metrics: signal.metrics, published_at: signal.published_at,
        }
      : null,
    score: snapshot
      ? ({ components: snapshot.component_scores, overall_score: snapshot.overall_score } as any)
      : null,
    landing_page: b.landing_page ?? null,
    brand_voice: (brain as any)?.brand_voice ?? null,
  });

  if (b.dry_run !== false) {
    return json({
      ok: blockers.length === 0, dry_run: true, no_records_mutated: true,
      preview: brief, blockers,
      phrase_required: VIRAL_CONFIRMATIONS.create_brief,
      note: "Creating a brief never publishes. The brief still passes through Content Factory and the existing founder approval, calendar and Buffer pipeline.",
      ...VIRAL_SAFETY_FLAGS,
    });
  }

  if (blockers.length) {
    return json({ ok: false, error: "blocked", blockers, no_records_mutated: true, ...VIRAL_SAFETY_FLAGS }, 409);
  }
  if (!confirmationAccepted(b.confirmation_phrase, VIRAL_CONFIRMATIONS.create_brief)) {
    return json({ ok: false, error: `confirmation_phrase_required:${VIRAL_CONFIRMATIONS.create_brief}` }, 400);
  }

  const row = {
    ...brief,
    business_id,
    opportunity_id: opportunity.id,
    score_snapshot_id: snapshot?.id ?? null,
    is_test_data: !!opportunity.is_test_data,
  };

  const { data, error } = await ad.from("social_viral_content_briefs")
    .upsert(row, { onConflict: "business_id,opportunity_id,brief_title" }).select().maybeSingle();
  if (error) return json({ ok: false, error: error.message }, 500);

  await ad.from("social_viral_opportunities")
    .update({ opportunity_status: "converted" }).eq("id", opportunity.id).eq("business_id", business_id);

  await ad.from("social_viral_audit").insert({
    business_id, actor_user_id: a.user.id, action: "brief_created_from_opportunity",
    entity_type: "content_brief", entity_id: data?.id ?? null, after_json: row as any,
    notes: "Awaiting founder approval; no content published.", is_test_data: !!opportunity.is_test_data,
  });

  return json({
    ok: true, brief: data,
    next_step: "Approve the brief, then generate content through the existing Content Factory and founder approval flow.",
    ...VIRAL_SAFETY_FLAGS,
  });
});