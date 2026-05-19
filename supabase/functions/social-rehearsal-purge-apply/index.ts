import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";

const TABLES = [
  "social_assets", "social_content_items", "social_publish_jobs",
  "social_inbox_messages", "social_reply_jobs", "social_performance_logs",
];
const CONFIRM = "PURGE SOCIAL REHEARSAL DATA";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const auth = await requireFounder(req);
  if ("error" in auth) return auth.error;
  const body = await req.json().catch(() => ({}));
  if (body?.confirm !== CONFIRM) {
    return json({ ok: false, blocked: true, reason: "confirmation_phrase_required" }, 400);
  }
  const business_id = body?.business_id ?? null;
  const deleted: Record<string, number> = {};
  for (const t of TABLES) {
    let q: any = auth.admin.from(t).delete({ count: "exact" }).eq("is_test_data", true);
    if (business_id) q = q.eq("business_id", business_id);
    const { count, error } = await q;
    if (error) return json({ ok: false, error: error.message, table: t }, 500);
    deleted[t] = count ?? 0;
  }
  return json({
    ok: true,
    business_id,
    deleted,
    total_deleted: Object.values(deleted).reduce((a, b) => a + b, 0),
    real_data_deleted: false,
    no_external_action: true,
  });
});