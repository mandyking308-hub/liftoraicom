import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), {
    status: s,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

/**
 * Controlled live batch runner.
 *
 * Founder-triggered. Authenticates the founder, validates the requested
 * batch size (no internal Liftor cap — the founder picks N), logs the
 * Outreach -> Email agent handoff, then invokes the existing
 * outreach-send-worker with `?max=N`. The worker enforces ALL real
 * guardrails (suppressed/bounced/unsubscribed contacts, reply-stop,
 * duplicate step prevention, inactive inbox/campaign, provider rejection,
 * live-readiness, IONOS daily-limit intercept). This wrapper adds NO
 * artificial restriction beyond founder-confirmed batch size.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser(
    authHeader.replace("Bearer ", ""),
  );
  if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);
  const userId = userData.user.id;
  const userEmail = userData.user.email ?? userId;

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  const { data: roleRow } = await admin
    .from("user_roles").select("role")
    .eq("user_id", userId).eq("role", "founder").maybeSingle();
  if (!roleRow) return json({ error: "Founder role required" }, 403);

  let body: { batch_size?: number; confirm?: boolean } = {};
  try { body = await req.json(); } catch { /* allow empty */ }
  const requested = Number(body.batch_size ?? 5);
  if (!Number.isFinite(requested) || requested < 1 || requested > 500) {
    return json({ error: "batch_size must be between 1 and 500" }, 400);
  }
  const batchSize = Math.floor(requested);
  if (!body.confirm) {
    return json({ error: "confirm: true required" }, 400);
  }

  // Snapshot pre-batch counts
  const { count: pendingBefore } = await admin
    .from("email_queue").select("id", { count: "exact", head: true }).eq("status", "pending");
  const { count: sentBefore } = await admin
    .from("email_queue").select("id", { count: "exact", head: true }).eq("status", "sent");

  // Outreach Agent: snapshot the eligible pool the worker will consider.
  const { data: eligibleSample } = await admin
    .from("email_queue")
    .select("id, contact_id, campaign_id, inbox_id, business_name, scheduled_at, priority")
    .eq("status", "pending")
    .order("priority", { ascending: true })
    .order("scheduled_at", { ascending: true })
    .limit(batchSize);

  const nowIso = new Date().toISOString();
  const futureRows = (eligibleSample ?? []).filter((r) => r.scheduled_at > nowIso);
  const selectedIds = (eligibleSample ?? []).map((r) => r.id);

  // Founder-authorised immediate batch: bump ONLY the selected rows to now()
  // and priority=1 so the worker picks exactly these rows. All real guardrails
  // inside outreach-send-worker still apply (suppressed/bounced/unsubscribed,
  // reply-stop, duplicate-step, inactive inbox/campaign, provider rejection,
  // live-readiness). No other rows are touched.
  let rescheduledCount = 0;
  if (selectedIds.length > 0) {
    const { error: bumpErr, count } = await admin
      .from("email_queue")
      .update({ scheduled_at: nowIso, priority: 1 }, { count: "exact" })
      .in("id", selectedIds)
      .eq("status", "pending");
    if (bumpErr) {
      return json({ error: `Failed to prioritise selected rows: ${bumpErr.message}` }, 500);
    }
    rescheduledCount = count ?? 0;
  }

  await admin.from("system_events").insert({
    event_type: "controlled_live_batch_start",
    severity: "high",
    business_name: "",
    message: `Founder ${userEmail} starting controlled live batch (size=${batchSize}, selected=${selectedIds.length}, future_scheduled=${futureRows.length})`,
    metadata: {
      actor: userEmail,
      batch_size: batchSize,
      eligible_preview: selectedIds,
      future_scheduled_count: futureRows.length,
      rescheduled_to_now: rescheduledCount,
      pending_before: pendingBefore,
      sent_before: sentBefore,
      note: futureRows.length > 0
        ? "Selected rows were scheduled for the future. Founder-authorised batch will run them now."
        : undefined,
    },
    resolved: true,
    resolution_note: "Outreach Agent -> Email Agent handoff.",
  });

  await admin.from("activity_log").insert([
    {
      event_type: "agent_handoff",
      description: `Outreach Agent selected ${eligibleSample?.length ?? 0} eligible queue rows; handing off to Email Agent.`,
      entity_type: "email_queue",
    },
    {
      event_type: "controlled_live_batch_start",
      description: `Email Agent dispatching controlled live batch of up to ${batchSize}.`,
      entity_type: "email_queue",
    },
  ]);

  // Invoke the existing worker — no artificial wrapper logic.
  const t0 = Date.now();
  let workerResult: any = null;
  let workerError: string | null = null;
  try {
    const resp = await fetch(
      `${SUPABASE_URL}/functions/v1/outreach-send-worker?max=${batchSize}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SERVICE_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ max: batchSize }),
      },
    );
    workerResult = await resp.json().catch(() => ({}));
    if (!resp.ok) workerError = `Worker HTTP ${resp.status}`;
  } catch (e) {
    workerError = (e as Error).message;
  }
  const elapsedMs = Date.now() - t0;

  // Snapshot post-batch counts + recent rows touched.
  const { count: pendingAfter } = await admin
    .from("email_queue").select("id", { count: "exact", head: true }).eq("status", "pending");
  const { count: sentAfter } = await admin
    .from("email_queue").select("id", { count: "exact", head: true }).eq("status", "sent");
  const { count: blockedAfter } = await admin
    .from("email_queue").select("id", { count: "exact", head: true }).eq("status", "blocked");

  const { data: recentSent } = await admin
    .from("email_queue")
    .select("id, status, sent_at, provider_message_id, provider_response, send_error, block_reason, delivery_kind")
    .gte("last_attempt_at", new Date(Date.now() - elapsedMs - 5000).toISOString())
    .order("last_attempt_at", { ascending: false })
    .limit(batchSize * 2);

  const sentDelta = (sentAfter ?? 0) - (sentBefore ?? 0);
  const summary = {
    batch_size_requested: batchSize,
    eligible_selected: eligibleSample?.length ?? 0,
    rescheduled_to_now: rescheduledCount,
    future_scheduled_count: futureRows.length,
    sent: sentDelta,
    pending_before: pendingBefore,
    pending_after: pendingAfter,
    sent_before: sentBefore,
    sent_after: sentAfter,
    blocked_after: blockedAfter,
    elapsed_ms: elapsedMs,
    worker: workerResult,
    worker_error: workerError,
  };

  await admin.from("system_events").insert({
    event_type: workerError ? "controlled_live_batch_error" : "controlled_live_batch_complete",
    severity: workerError ? "high" : "low",
    business_name: "",
    message: workerError
      ? `Controlled live batch error: ${workerError}`
      : `Controlled live batch complete — ${sentDelta} sent, ${pendingAfter} queued.`,
    metadata: { actor: userEmail, ...summary, recent_rows: recentSent ?? [] },
    resolved: !workerError,
    resolution_note: workerError ? "Investigate worker response." : "Batch finished cleanly.",
  });

  await admin.from("activity_log").insert({
    event_type: workerError ? "controlled_live_batch_error" : "controlled_live_batch_complete",
    description: workerError
      ? `Controlled live batch error: ${workerError}`
      : `Controlled live batch complete — ${sentDelta} sent, ${pendingAfter} queued.`,
    entity_type: "email_queue",
  });

  return json({
    ok: !workerError,
    message: workerError
      ? `Batch failed: ${workerError}`
      : `Batch complete — ${sentDelta} sent, ${pendingAfter} queued, ${blockedAfter} blocked.`,
    summary,
    recent_rows: recentSent ?? [],
    note: selectedIds.length === 0
      ? "No pending rows found. All queue items may be blocked, sent, suppressed, replied, or cancelled."
      : futureRows.length > 0
        ? `Selected ${selectedIds.length} pending row(s); ${futureRows.length} were scheduled for the future and were moved to now under founder authorisation.`
        : undefined,
    next_recommended_action: workerError
      ? "Review system_events and worker response."
      : sentDelta === 0
        ? "No rows were eligible. Check guardrails / inbox live-readiness."
        : "Inbox Agent will poll for replies. Conversation Agent will draft AI replies for founder approval.",
  });
});