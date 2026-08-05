/**
 * Truthful state-driven distribution health for the Command Centre.
 * Never claims LIVE unless secrets, connection, mapping, gates, policy and a
 * healthy dispatcher heartbeat all agree.
 */
import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";
import { bufferKeyPresent, resolveOrganizationId } from "../_shared/bufferClient.ts";
import { gateUnlocked, getConnection, getPolicy, isPaused } from "../_shared/socialDistributionDb.ts";
import { computeDistributionHealth, normaliseDispatchMode, summariseStatuses } from "../_shared/socialDistributionLogic.ts";
import { dispatchScheduleRegistered } from "../_shared/socialDispatchAuth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  const admin = a.admin;
  let body: any = {}; try { body = await req.json(); } catch { /* */ }
  const business_id = body.business_id;
  const provider = body.provider ?? "buffer";
  if (!business_id) return json({ ok: false, error: "business_id_required" }, 400);

  const [policy, connection, paused, gate] = await Promise.all([
    getPolicy(admin, business_id, provider),
    getConnection(admin, business_id, provider),
    isPaused(admin, business_id, provider),
    gateUnlocked(admin, business_id, provider),
  ]);

  const [{ data: maps }, { data: jobs }, { data: runs }, { data: maintRuns }, { data: pauses }] = await Promise.all([
    admin.from("social_business_channel_map").select("dispatch_mode, active").eq("business_id", business_id).eq("provider", provider),
    admin.from("social_publish_jobs").select("distribution_status, next_retry_at, scheduled_for, provider_post_id").eq("business_id", business_id).limit(1000),
    admin.from("social_distribution_dispatch_runs").select("*").eq("provider", provider).eq("trigger_source", "scheduler").order("started_at", { ascending: false }).limit(1),
    admin.from("social_distribution_dispatch_runs").select("*").eq("provider", provider).eq("trigger_source", "scheduler_maintenance").order("started_at", { ascending: false }).limit(1),
    admin.from("social_distribution_pauses").select("scope, scope_key, paused, reason").eq("paused", true),
  ]);

  const activeMaps = (maps ?? []).filter((m: any) => m.active);
  const autoSchedule = activeMaps.filter((m: any) => normaliseDispatchMode(m.dispatch_mode) === "AUTO_SCHEDULE").length;
  const lastRun = (runs ?? [])[0] ?? null;
  const lastMaint = (maintRuns ?? [])[0] ?? null;
  const totals = summariseStatuses(jobs ?? []);
  const now = Date.now();
  const due = (jobs ?? []).filter((j: any) =>
    !j.provider_post_id && j.scheduled_for && new Date(j.scheduled_for).getTime() <= now + 60 * 60 * 1000
    && !["scheduled", "sent", "draft_in_provider", "dead_letter", "submission_unknown"].includes(j.distribution_status ?? "")).length;

  const health = computeDistributionHealth({
    secrets_present: bufferKeyPresent(),
    organization_id_present: !!resolveOrganizationId(connection?.provider_organization_id),
    connection_ok: !!connection && connection.connection_status !== "error",
    mapped_channels: activeMaps.length,
    auto_schedule_channels: autoSchedule,
    gate_unlocked: gate,
    policy_mode: policy.mode,
    paused,
    last_dispatch_run_at: lastRun?.finished_at ?? lastRun?.started_at ?? null,
    last_dispatch_failed: lastRun?.run_status === "completed_with_errors" || lastRun?.run_status === "failed",
    dispatcher_schedule_registered: dispatchScheduleRegistered(),
    last_maintenance_run_at: lastMaint?.finished_at ?? lastMaint?.started_at ?? null,
    maintenance_schedule_registered: dispatchScheduleRegistered(),
    failed_jobs: (totals.dead_letter ?? 0) + (totals.failed ?? 0),
  });

  return json({
    ok: true,
    health,
    policy_mode: policy.mode,
    gate_unlocked: gate,
    paused,
    kill_switches: pauses ?? [],
    channels: { mapped: activeMaps.length, auto_schedule: autoSchedule,
      draft: activeMaps.filter((m: any) => normaliseDispatchMode(m.dispatch_mode) === "DRAFT_TO_BUFFER").length,
      off: activeMaps.filter((m: any) => normaliseDispatchMode(m.dispatch_mode) === "OFF").length },
    counts: {
      due,
      scheduled: totals.scheduled ?? 0,
      draft_in_provider: totals.draft_in_provider ?? 0,
      blocked: totals.blocked ?? 0,
      failed: (totals.dead_letter ?? 0) + (totals.failed ?? 0),
      published: totals.sent ?? 0,
      retrying: totals.retrying ?? 0,
      submission_unknown: totals.submission_unknown ?? 0,
    },
    dispatcher: {
      status: health.dispatcher,
      schedule_registered: dispatchScheduleRegistered(),
      last_run_at: lastRun?.finished_at ?? lastRun?.started_at ?? null,
      last_run_status: lastRun?.run_status ?? null,
    },
    maintenance: {
      status: health.maintenance,
      schedule_registered: dispatchScheduleRegistered(),
      last_run_at: lastMaint?.finished_at ?? lastMaint?.started_at ?? null,
      last_run_status: lastMaint?.run_status ?? null,
    },
  });
});