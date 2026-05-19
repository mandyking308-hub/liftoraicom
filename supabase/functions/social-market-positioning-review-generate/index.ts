import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";
import { SAFETY_FLAGS, SUCCESS_AUDIT_DEFAULTS, confidenceFromCount } from "../_shared/socialCompetitorTrendLogic.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  const b = await req.json().catch(() => ({}));
  const { business_id, competitor_ids, trend_ids, period_start, period_end } = b;
  const dry_run = b.dry_run !== false;
  const phrase = b.confirmation_phrase ?? "";
  if (!business_id) return json({ ok: false, error: "missing_business_id" }, 400);

  const ad = a.admin as any;
  let comp = ad.from("social_competitor_profiles").select("id,competitor_name,offer_notes,positioning_notes,weaknesses,strengths").eq("business_id", business_id);
  if (Array.isArray(competitor_ids) && competitor_ids.length) comp = comp.in("id", competitor_ids);
  const { data: comps } = await comp;

  let obs = ad.from("social_competitor_observations").select("observation_type,apparent_weakness,offer_observed,audience_reaction_notes").eq("business_id", business_id);
  const { data: obsRows } = await obs;

  let tr = ad.from("social_trend_signals").select("trend_title,trend_type,relevance_to_business").eq("business_id", business_id);
  if (Array.isArray(trend_ids) && trend_ids.length) tr = tr.in("id", trend_ids);
  const { data: trends } = await tr;

  const observationTypes = new Set((obsRows ?? []).map((x: any) => x.observation_type));
  const offer_gaps = Array.from(new Set((comps ?? []).flatMap((c: any) => c.weaknesses ?? []))).slice(0, 10);
  const content_gaps: string[] = [];
  if (!observationTypes.has("testimonial") && !observationTypes.has("review")) content_gaps.push("proof-led content (no competitor proof captured)");
  if (!observationTypes.has("hook")) content_gaps.push("hook examples missing — capture more hook observations");
  const proof_gaps: string[] = [];
  if (!observationTypes.has("testimonial")) proof_gaps.push("Customer testimonial format");
  if (!observationTypes.has("review")) proof_gaps.push("Public review proof");
  const positioning_opportunities = (comps ?? []).flatMap((c: any) => (c.positioning_notes ? [`Counter-position to ${c.competitor_name}: ${String(c.positioning_notes).slice(0, 80)}`] : [])).slice(0, 8);
  const risk_warnings = ["Manual observations only — evidence limited.", "Do not copy competitor wording or assets.", "All recommendations require founder approval."];
  const recommended_actions = [
    "Approve high-confidence patterns for legally distinct adaptation.",
    "Capture missing observation types (proof, hook, offer).",
    "Generate market learning signals from this review.",
  ];

  const row = {
    business_id,
    review_name: b.review_name ?? `Positioning review ${new Date().toISOString().slice(0,10)}`,
    review_status: "generated",
    period_start: period_start ?? null,
    period_end: period_end ?? null,
    competitors_reviewed: comps?.length ?? 0,
    observations_reviewed: obsRows?.length ?? 0,
    trends_reviewed: trends?.length ?? 0,
    content_gaps, offer_gaps, proof_gaps, positioning_opportunities, risk_warnings, recommended_actions,
    confidence_score: confidenceFromCount(obsRows?.length ?? 0),
    founder_review_required: true,
    approval_status: "draft",
    is_test_data: !!b.is_test_data,
  };

  if (dry_run) return json({ ok: true, dry_run: true, preview: row, ...SAFETY_FLAGS, no_records_mutated: true });
  if (phrase !== "GENERATE SOCIAL MARKET POSITIONING REVIEW") return json({ ok: false, error: "confirmation_phrase_required" }, 400);

  const ins = await ad.from("social_market_positioning_reviews").insert(row).select().single();
  if (ins.error) return json({ ok: false, error: ins.error.message }, 500);
  await ad.from("social_competitor_trend_audit").insert({
    business_id, positioning_review_id: ins.data.id, action: "positioning_review_generated",
    after_json: ins.data, ...SUCCESS_AUDIT_DEFAULTS, is_test_data: row.is_test_data,
  });
  return json({ ok: true, review: ins.data, ...SAFETY_FLAGS });
});