import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  let body: any = {}; try { body = await req.json(); } catch {}
  const { business_id, publish_job_id, batch_id, provider, action_type } = body;
  if (!business_id) return json({ ok: false, error: "business_id_required" }, 400);
  await a.admin.from("social_publish_queue_audit").insert({
    business_id, publish_job_id: publish_job_id ?? null, queue_batch_id: batch_id ?? null,
    action: "provider_execution_attempt_blocked", action_status: "blocked",
    provider: provider ?? null,
    result_json: { reason: "provider_execution_not_enabled", action_type: action_type ?? null },
    provider_calls: 0, posts_published: 0, posts_scheduled: 0, dms_sent: 0, comments_sent: 0,
  });
  return json({
    ok: true, blocked: true, reason: "provider_execution_not_enabled",
    provider_calls: 0, posts_published: 0, posts_scheduled: 0, dms_sent: 0, comments_sent: 0,
    external_execution_attempted: false, no_provider_call: true,
  });
});