import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";
import { SAFETY_FLAGS, SUCCESS_AUDIT_DEFAULTS } from "../_shared/socialCompetitorTrendLogic.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  const b = await req.json().catch(() => ({}));
  const { business_id, signals } = b;
  const dry_run = b.dry_run !== false;
  const phrase = b.confirmation_phrase ?? "";
  if (!business_id || !Array.isArray(signals) || signals.length === 0) return json({ ok: false, error: "missing_business_or_signals" }, 400);

  const rows = signals.map((s: any) => ({
    business_id,
    signal_type: s.signal_type ?? "other",
    signal_status: "needs_review",
    source_competitor_id: s.source_competitor_id ?? null,
    source_observation_id: s.source_observation_id ?? null,
    source_trend_id: s.source_trend_id ?? null,
    positioning_review_id: s.positioning_review_id ?? null,
    signal_title: String(s.signal_title ?? "Market learning signal").slice(0, 240),
    signal_description: s.signal_description ?? null,
    evidence_summary: s.evidence_summary ?? null,
    recommendation: s.recommendation ?? null,
    legally_distinct_adaptation: s.legally_distinct_adaptation ?? null,
    impact_area: s.impact_area ?? "content",
    confidence_score: s.confidence_score ?? 0,
    founder_review_required: true,
    is_test_data: !!s.is_test_data,
  }));

  if (dry_run) return json({ ok: true, dry_run: true, preview: rows, ...SAFETY_FLAGS, no_records_mutated: true });
  if (phrase !== "CREATE SOCIAL MARKET LEARNING SIGNALS") return json({ ok: false, error: "confirmation_phrase_required" }, 400);

  const ins = await (a.admin as any).from("social_market_learning_signals").insert(rows).select();
  if (ins.error) return json({ ok: false, error: ins.error.message }, 500);
  await (a.admin as any).from("social_competitor_trend_audit").insert({
    business_id, action: "market_signal_generated",
    result_json: { created: ins.data?.length ?? 0 }, ...SUCCESS_AUDIT_DEFAULTS,
  });
  return json({ ok: true, signals: ins.data ?? [], ...SAFETY_FLAGS });
});