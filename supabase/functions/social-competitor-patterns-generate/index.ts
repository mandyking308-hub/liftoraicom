import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";
import { SAFETY_FLAGS, SUCCESS_AUDIT_DEFAULTS, inferPatternType, legallyDistinctSuggestion, confidenceFromCount } from "../_shared/socialCompetitorTrendLogic.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  const b = await req.json().catch(() => ({}));
  const { business_id, competitor_id, observation_ids, platform } = b;
  const dry_run = b.dry_run !== false;
  const phrase = b.confirmation_phrase ?? "";
  if (!business_id) return json({ ok: false, error: "missing_business_id" }, 400);

  let q = (a.admin as any).from("social_competitor_observations").select("*").eq("business_id", business_id).limit(200);
  if (competitor_id) q = q.eq("competitor_id", competitor_id);
  if (Array.isArray(observation_ids) && observation_ids.length) q = q.in("id", observation_ids);
  if (platform) q = q.eq("platform", platform);
  const { data: obs, error } = await q;
  if (error) return json({ ok: false, error: error.message }, 500);

  // Group by inferred pattern type
  const groups: Record<string, any[]> = {};
  for (const o of obs ?? []) {
    const k = `${inferPatternType(o.observation_type, o.content_format)}::${o.platform ?? ""}`;
    (groups[k] ||= []).push(o);
  }
  const patterns = Object.entries(groups).map(([k, list]) => {
    const [pattern_type, plat] = k.split("::");
    const sample = list[0];
    return {
      business_id, competitor_id: competitor_id ?? null,
      pattern_type, pattern_status: "needs_review",
      platform: plat || null,
      pattern_title: `${pattern_type.replace(/_/g, " ")} (${list.length} obs)`,
      pattern_description: `Inferred from ${list.length} manual observation(s). Treat as hypothesis only.`,
      evidence_observation_ids: list.map(x => x.id),
      example_summary: (sample?.observation_text ?? "").slice(0, 300),
      why_it_may_work: "Pattern recurs across observations; mechanism unverified.",
      legally_distinct_adaptation: legallyDistinctSuggestion(sample?.observation_text ?? ""),
      risk_flags: Array.from(new Set((list.flatMap((x: any) => x.risk_flags ?? [])))),
      confidence_score: confidenceFromCount(list.length),
      founder_review_required: true,
      approved_for_strategy: false,
      is_test_data: list.every((x: any) => x.is_test_data),
    };
  });

  if (dry_run) return json({ ok: true, dry_run: true, patterns, observations_considered: obs?.length ?? 0, ...SAFETY_FLAGS, no_records_mutated: true });
  if (phrase !== "GENERATE SOCIAL COMPETITOR PATTERNS") return json({ ok: false, error: "confirmation_phrase_required" }, 400);

  const ins = patterns.length
    ? await (a.admin as any).from("social_competitor_content_patterns").insert(patterns).select()
    : { data: [], error: null };
  if (ins.error) return json({ ok: false, error: ins.error.message }, 500);

  await (a.admin as any).from("social_competitor_trend_audit").insert({
    business_id, competitor_id: competitor_id ?? null, action: "pattern_generated",
    result_json: { patterns_created: ins.data?.length ?? 0 }, ...SUCCESS_AUDIT_DEFAULTS,
  });
  return json({ ok: true, patterns: ins.data ?? [], ...SAFETY_FLAGS });
});