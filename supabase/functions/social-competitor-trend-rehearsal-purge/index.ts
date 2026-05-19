import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";
import { SAFETY_FLAGS, SUCCESS_AUDIT_DEFAULTS } from "../_shared/socialCompetitorTrendLogic.ts";

const TABLES = [
  "social_market_learning_signals",
  "social_market_positioning_reviews",
  "social_competitor_content_patterns",
  "social_competitor_observations",
  "social_trend_signals",
  "social_competitor_accounts",
  "social_competitor_profiles",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  const b = await req.json().catch(() => ({}));
  const { business_id } = b;
  const phrase = b.confirmation_phrase ?? "";
  if (!business_id) return json({ ok: false, error: "missing_business_id" }, 400);
  if (phrase !== "PURGE SOCIAL COMPETITOR TREND TEST DATA") return json({ ok: false, error: "confirmation_phrase_required" }, 400);

  const ad = a.admin as any;
  const deleted: Record<string, number> = {};
  for (const t of TABLES) {
    const { count, error } = await ad.from(t).delete({ count: "exact" }).eq("business_id", business_id).eq("is_test_data", true);
    if (error) return json({ ok: false, error: `${t}:${error.message}` }, 500);
    deleted[t] = count ?? 0;
  }
  await ad.from("social_competitor_trend_audit").insert({
    business_id, action: "test_data_purged", result_json: { deleted },
    ...SUCCESS_AUDIT_DEFAULTS, is_test_data: true,
  });
  return json({ ok: true, deleted, ...SAFETY_FLAGS });
});