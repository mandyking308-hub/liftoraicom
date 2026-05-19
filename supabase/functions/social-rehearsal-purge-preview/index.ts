import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";

const TABLES = [
  "social_assets", "social_content_items", "social_publish_jobs",
  "social_inbox_messages", "social_reply_jobs", "social_performance_logs",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const auth = await requireFounder(req);
  if ("error" in auth) return auth.error;
  const url = new URL(req.url);
  const business_id = url.searchParams.get("business_id");
  const counts: Record<string, number> = {};
  for (const t of TABLES) {
    let q: any = auth.admin.from(t).select("id", { count: "exact", head: true }).eq("is_test_data", true);
    if (business_id) q = q.eq("business_id", business_id);
    const { count } = await q;
    counts[t] = count ?? 0;
  }
  return json({
    ok: true,
    business_id,
    test_data_counts: counts,
    total: Object.values(counts).reduce((a, b) => a + b, 0),
    no_external_action: true,
    will_delete_only_test_data: true,
  });
});