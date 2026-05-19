import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";
import { SAFETY_FLAGS, detectCopyRisk, inferPatternType, legallyDistinctSuggestion } from "../_shared/socialCompetitorTrendLogic.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  const b = await req.json().catch(() => ({}));
  if (!b.business_id || !b.observation_text || !b.observation_type) return json({ ok: false, error: "missing_fields" }, 400);
  const risk_flags = detectCopyRisk(b.observation_text);
  return json({
    ok: true, dry_run: true,
    parsed: {
      business_id: b.business_id,
      competitor_id: b.competitor_id ?? null,
      observation_type: b.observation_type,
      platform: b.platform ?? null,
      observation_text: b.observation_text,
      source_url: b.source_url ?? null,
    },
    inferred_pattern_type: inferPatternType(b.observation_type, b.content_format),
    risk_flags,
    evidence_warning: "Observation is manual_unverified until founder marks it checked.",
    legally_distinct_adaptation: legallyDistinctSuggestion(b.observation_text, b.our_business_name),
    ...SAFETY_FLAGS, no_records_mutated: true,
  });
});