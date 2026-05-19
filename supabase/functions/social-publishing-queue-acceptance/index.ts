import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  const checks: Array<{ name: string; pass: boolean; detail?: string }> = [];
  const tables = ["social_publish_jobs","social_provider_connections","social_provider_execution_gates","social_publish_queue_batches","social_publish_queue_audit","social_manual_export_batches"];
  for (const t of tables) {
    const { error } = await a.admin.from(t).select("id", { head: true, count: "exact" }).limit(1);
    checks.push({ name: `table_${t}`, pass: !error, detail: error?.message });
  }
  const { error: extErr } = await a.admin.from("social_publish_jobs")
    .select("queue_batch_id, execution_gate_status, manual_export_status, founder_final_approval_required, external_execution_attempted, publish_payload, provider_capability_required", { head: true }).limit(1);
  checks.push({ name: "social_publish_jobs_extended", pass: !extErr, detail: extErr?.message });

  const failed = checks.filter((c) => !c.pass);
  return json({
    ok: true, status: failed.length === 0 ? "PASS" : "BLOCKED", checks, blockers: failed,
    no_forbidden_action_audit: {
      external_publish: false, external_scheduling: false, provider_api: false,
      dm_send: false, comments_sent: false, apollo: false, smartlead_post: false,
      email_send: false, auto_send: false, cron: false, external_scheduled_jobs: false,
      provider_tokens_exposed: false, real_data_deletion: false,
      provider_calls: 0, posts_published: 0, posts_scheduled: 0, dms_sent: 0, comments_sent: 0,
      sprint_policy: "fail_closed_all_provider_execution",
    },
  });
});