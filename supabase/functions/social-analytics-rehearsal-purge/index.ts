import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";
import { SAFETY_FLAGS } from "../_shared/socialAnalyticsLogic.ts";

const PHRASE = "PURGE SOCIAL ANALYTICS TEST DATA";
const TABLES = [
  "social_performance_import_batches","social_performance_metrics",
  "social_content_performance_summaries","social_learning_signals",
  "social_strategy_recommendations","social_analytics_audit",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  const body = await req.json().catch(() => ({} as any));
  const business_id = body.business_id;
  if (!business_id) return json({ ok: false, error: "business_id_required" }, 400);
  const dry_run = body.dry_run !== false;
  const counts: Record<string, number> = {};
  for (const t of TABLES) {
    const { count } = await (a.admin as any).from(t).select("id", { count: "exact", head: true }).eq("business_id", business_id).eq("is_test_data", true);
    counts[t] = count ?? 0;
  }
  if (dry_run) return json({ ok: true, dry_run: true, would_delete: counts, no_real_data_deletion: true, ...SAFETY_FLAGS });
  if (body.confirmation_phrase !== PHRASE) return json({ ok: false, error: "confirmation_phrase_required", required: PHRASE }, 400);
  const deleted: Record<string, number> = {};
  for (const t of TABLES) {
    const { error, count } = await (a.admin as any).from(t).delete({ count: "exact" }).eq("business_id", business_id).eq("is_test_data", true);
    if (error) return json({ ok: false, error: error.message, table: t }, 500);
    deleted[t] = count ?? 0;
  }
  return json({ ok: true, deleted, no_real_data_deletion: true, ...SAFETY_FLAGS });
});