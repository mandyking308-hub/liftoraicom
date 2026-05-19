import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  let body: any = {}; try { body = await req.json(); } catch {}
  const { business_id, publish_job_id } = body;
  if (!business_id || !publish_job_id) return json({ ok: false, error: "missing_fields" }, 400);
  const { data: job } = await a.admin.from("social_publish_jobs").select("*").eq("id", publish_job_id).eq("business_id", business_id).maybeSingle();
  if (!job) return json({ ok: false, error: "job_not_found" }, 404);
  const { data: adapter } = await a.admin.from("social_provider_adapters").select("*").eq("provider", job.provider).maybeSingle();
  const { data: conn } = await a.admin.from("social_provider_connections").select("*").eq("business_id", business_id).eq("provider", job.provider).maybeSingle();
  const jt = (job.job_type || "post").toLowerCase();
  const actionType = jt.includes("reel") ? "publish_reel" : jt.includes("story") ? "publish_story" : jt.includes("short") ? "publish_short" : jt.includes("carousel") ? "publish_carousel" : "publish_post";
  const { data: gate } = await a.admin.from("social_provider_execution_gates").select("*").eq("business_id", business_id).eq("provider", job.provider).eq("action_type", actionType).maybeSingle();

  let status = "ready_for_future_provider_execution"; let reason = "execution_gate_locked_by_sprint_policy";
  if (!conn || conn.connection_status === "not_connected") { status = "blocked"; reason = "provider_not_connected"; }
  else if (adapter && job.provider_capability_required && (adapter as any)[job.provider_capability_required] === false) { status = "blocked"; reason = "provider_capability_missing"; }
  else if (!gate || gate.gate_status === "locked") { status = "provider_locked"; reason = "provider_execution_gate_locked"; }

  return json({
    ok: true, no_provider_call: true, no_records_mutated: true,
    job_id: job.id, provider: job.provider, platform: job.platform,
    required_capability: job.provider_capability_required, action_type: actionType,
    adapter_capabilities: adapter, connection_status: conn?.connection_status || "not_connected",
    gate_status: gate?.gate_status || "locked",
    can_execute_now: false, status, reason,
  });
});