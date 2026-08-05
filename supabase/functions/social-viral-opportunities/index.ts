import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";
import { VIRAL_CONFIRMATIONS, VIRAL_SAFETY_FLAGS, confirmationAccepted } from "../_shared/socialViralLogic.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  const ad = a.admin as any;
  const b = await req.json().catch(() => ({} as any));
  const business_id = b.business_id;
  const action = b.action ?? "list";
  if (!business_id) return json({ ok: false, error: "business_id_required" }, 400);

  if (action === "list") {
    let q = ad.from("social_viral_opportunities").select("*").eq("business_id", business_id);
    if (b.status) q = q.eq("opportunity_status", b.status);
    if (b.platform) q = q.eq("platform", b.platform);
    if (b.business_objective) q = q.eq("business_objective", b.business_objective);
    if (typeof b.min_score === "number") q = q.gte("overall_score", b.min_score);
    if (b.only_fresh) q = q.or(`freshness_deadline.is.null,freshness_deadline.gte.${new Date().toISOString()}`);
    if (b.exclude_risky) q = q.eq("requires_compliance_review", false);
    const { data, error } = await q.order("overall_score", { ascending: false }).limit(Number(b.limit ?? 100));
    if (error) return json({ ok: false, error: error.message }, 500);
    return json({ ok: true, opportunities: data ?? [], disclaimer: "Potential, not guaranteed performance.", ...VIRAL_SAFETY_FLAGS });
  }

  if (action === "detail") {
    if (!b.opportunity_id) return json({ ok: false, error: "opportunity_id_required" }, 400);
    const { data: opportunity } = await ad.from("social_viral_opportunities")
      .select("*").eq("id", b.opportunity_id).eq("business_id", business_id).maybeSingle();
    if (!opportunity) return json({ ok: false, error: "opportunity_not_found_for_business" }, 404);
    const [{ data: snapshots }, { data: signal }, { data: briefs }] = await Promise.all([
      ad.from("social_viral_score_snapshots").select("*").eq("business_id", business_id)
        .eq("opportunity_id", opportunity.id).order("scored_at", { ascending: false }).limit(20),
      opportunity.signal_id
        ? ad.from("social_viral_signals").select("*").eq("id", opportunity.signal_id).eq("business_id", business_id).maybeSingle()
        : Promise.resolve({ data: null }),
      ad.from("social_viral_content_briefs").select("*").eq("business_id", business_id).eq("opportunity_id", opportunity.id),
    ]);
    return json({ ok: true, opportunity, snapshots: snapshots ?? [], signal, briefs: briefs ?? [], ...VIRAL_SAFETY_FLAGS });
  }

  if (action === "review") {
    const decision = b.decision;
    if (!b.opportunity_id) return json({ ok: false, error: "opportunity_id_required" }, 400);
    if (!["approved", "rejected", "needs_review"].includes(decision)) {
      return json({ ok: false, error: "decision_must_be_approved_rejected_or_needs_review" }, 400);
    }
    const { data: current } = await ad.from("social_viral_opportunities")
      .select("*").eq("id", b.opportunity_id).eq("business_id", business_id).maybeSingle();
    if (!current) return json({ ok: false, error: "opportunity_not_found_for_business" }, 404);

    const hardBlocked = (current.blockers ?? []).some((x: string) =>
      ["wrong_audience", "excluded_topic", "stale_trend", "no_conversion_route", "prohibited_regulated_risk", "missing_evidence"].includes(x));
    if (decision === "approved" && hardBlocked && !b.override_blockers) {
      return json({ ok: false, error: "blocked_by_hard_blockers", blockers: current.blockers, hint: "resolve the blockers or pass override_blockers with a review note" }, 409);
    }
    if (decision === "approved" && current.requires_compliance_review && !b.compliance_reviewed) {
      return json({ ok: false, error: "compliance_review_required", risk_flags: current.risk_flags }, 409);
    }

    if (b.dry_run !== false) {
      return json({
        ok: true, dry_run: true, no_records_mutated: true,
        would_set: decision, blockers: current.blockers,
        requires_compliance_review: current.requires_compliance_review,
        phrase_required: VIRAL_CONFIRMATIONS.review_opportunity, ...VIRAL_SAFETY_FLAGS,
      });
    }
    if (!confirmationAccepted(b.confirmation_phrase, VIRAL_CONFIRMATIONS.review_opportunity)) {
      return json({ ok: false, error: `confirmation_phrase_required:${VIRAL_CONFIRMATIONS.review_opportunity}` }, 400);
    }
    const { data, error } = await ad.from("social_viral_opportunities").update({
      opportunity_status: decision,
      reviewed_by: a.user.id,
      reviewed_at: new Date().toISOString(),
      review_notes: b.review_notes ? String(b.review_notes).slice(0, 2000) : null,
    }).eq("id", current.id).eq("business_id", business_id).select().maybeSingle();
    if (error) return json({ ok: false, error: error.message }, 500);
    await ad.from("social_viral_audit").insert({
      business_id, actor_user_id: a.user.id, action: `opportunity_${decision}`,
      entity_type: "opportunity", entity_id: current.id,
      before_json: { status: current.opportunity_status }, after_json: { status: decision },
      notes: b.review_notes ?? null, is_test_data: !!current.is_test_data,
    });
    return json({ ok: true, opportunity: data, ...VIRAL_SAFETY_FLAGS });
  }

  return json({ ok: false, error: "unknown_action" }, 400);
});