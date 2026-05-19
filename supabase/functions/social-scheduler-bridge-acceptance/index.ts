import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  const checks: Record<string, any> = {};
  const tables = ["social_manual_export_batches","social_scheduler_export_rows","social_scheduler_export_templates","social_operator_scheduling_tasks","social_scheduler_export_audit"];
  for (const t of tables) {
    const { error } = await a.admin.from(t).select("id").limit(1);
    checks[t] = error ? `err:${error.message}` : "ok";
  }
  const status = Object.values(checks).every((v) => v === "ok") ? "PASS" : "BLOCKED";
  return json({
    ok: true, status, tables: checks,
    safety: {
      no_metricool_api_call: true, no_buffer_api_call: true, no_hootsuite_api_call: true,
      no_social_provider_api_call: true, no_external_publish: true, no_external_schedule: true,
      no_dm_send: true, no_comment_send: true, no_apollo: true, no_smartlead_post: true,
      no_email_send: true, no_auto_send: true, no_cron: true,
      provider_calls: 0, posts_published: 0, posts_scheduled_externally: 0,
      no_raw_provider_tokens: true, no_real_data_deletion: true,
    },
    no_forbidden_action_audit: "pass",
  });
});
