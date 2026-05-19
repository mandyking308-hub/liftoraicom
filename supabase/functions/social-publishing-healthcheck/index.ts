import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  const url = new URL(req.url);
  const business_id = url.searchParams.get("business_id");
  if (!business_id) return json({ ok: false, error: "business_id_required" }, 400);

  const count = async (table: string, filters: Record<string, any> = {}) => {
    let q = a.admin.from(table).select("id", { head: true, count: "exact" }).eq("business_id", business_id);
    for (const [k, v] of Object.entries(filters)) q = q.eq(k, v);
    const { count: c } = await q; return c ?? 0;
  };
  const jobs_total = await count("social_publish_jobs");
  const queued = await count("social_publish_jobs", { status: "queued" });
  const provider_locked = await count("social_publish_jobs", { status: "provider_locked" });
  const blocked = await count("social_publish_jobs", { status: "blocked" });
  const failed = await count("social_publish_jobs", { status: "failed" });
  const batches = await count("social_publish_queue_batches");
  const exports = await count("social_manual_export_batches");
  const conns = await count("social_provider_connections");
  const gates_total = await count("social_provider_execution_gates");
  const unlocked_gates = await count("social_provider_execution_gates", { gate_status: "unlocked_limited" });
  const exec_attempts = await count("social_publish_queue_audit", { action: "provider_execution_attempt_blocked" });

  return json({
    ok: true, no_external_action: true,
    publish_jobs_total: jobs_total, queued_jobs: queued, provider_locked_jobs: provider_locked,
    blocked_jobs: blocked, failed_jobs: failed,
    batches_total: batches, export_batches_total: exports,
    provider_connections_count: conns, provider_gates_count: gates_total, unlocked_gates_count: unlocked_gates,
    external_execution_attempts: exec_attempts, provider_calls_total: 0,
    posts_published_total: 0, posts_scheduled_total: 0,
    ready_for_manual_export: jobs_total > 0, ready_for_future_provider_connection: true,
  });
});