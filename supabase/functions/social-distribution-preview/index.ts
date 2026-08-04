import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";
import { evaluateJob, loadContext } from "../_shared/socialDistributionSubmit.ts";
import { summariseStatuses } from "../_shared/socialDistributionLogic.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  let body: any = {}; try { body = await req.json(); } catch {}
  const url = new URL(req.url);
  const business_id = body.business_id ?? url.searchParams.get("business_id");
  if (!business_id) return json({ ok: false, error: "business_id_required" }, 400);
  const batch_id = body.batch_id ?? null;
  const job_ids: string[] | null = body.job_ids ?? null;

  const ctx = await loadContext(a.admin, business_id);
  let q = a.admin.from("social_publish_jobs").select("*").eq("business_id", business_id).limit(200);
  if (batch_id) q = q.eq("queue_batch_id", batch_id);
  if (job_ids?.length) q = q.in("id", job_ids);
  const { data: jobs } = await q;

  const evaluations = [];
  for (const j of jobs ?? []) evaluations.push(await evaluateJob(a.admin, business_id, j, ctx));

  return json({
    ok: true,
    connection_configured: !!ctx.connection,
    organization_id: ctx.connection?.provider_organization_id ?? null,
    policy_mode: ctx.policy.mode,
    emergency_paused: ctx.paused,
    execution_gate_unlocked: ctx.gate,
    ready: evaluations.filter((e) => e.eligible).length,
    blocked: evaluations.filter((e) => !e.eligible).length,
    status_totals: summariseStatuses(jobs ?? []),
    evaluations,
    no_provider_call: true,
  });
});
