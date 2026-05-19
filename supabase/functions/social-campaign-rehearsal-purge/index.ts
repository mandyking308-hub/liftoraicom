import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";

const CONFIRM = "PURGE SOCIAL CAMPAIGN TEST DATA";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const g = await requireFounder(req); if ("error" in g) return g.error;
  const { admin } = g;
  const body = await req.json().catch(() => ({}));
  const business_id = body.business_id;
  if (!business_id) return json({ ok: false, error: "business_id_required" }, 400);
  const dry_run = body.dry_run !== false;
  if (!dry_run && body.confirmation_phrase !== CONFIRM)
    return json({ ok: false, error: `confirmation_phrase_required:${CONFIRM}` }, 400);

  const tables = [
    "social_campaign_readiness_reviews",
    "social_campaign_content_map",
    "social_revenue_content_strategy",
    "social_customer_journey_content_rules",
    "social_campaign_plans",
  ];
  if (dry_run) {
    const counts: Record<string, number> = {};
    for (const t of tables) {
      const { count } = await admin.from(t).select("id", { count: "exact", head: true })
        .eq("business_id", business_id).eq("is_test_data", true);
      counts[t] = count ?? 0;
    }
    return json({ ok: true, dry_run: true, would_delete: counts });
  }
  const deleted: Record<string, number> = {};
  for (const t of tables) {
    const { count } = await admin.from(t).delete({ count: "exact" })
      .eq("business_id", business_id).eq("is_test_data", true);
    deleted[t] = count ?? 0;
  }
  return json({ ok: true, deleted, real_data_preserved: true });
});