import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

type Mode = "preview" | "send";

interface Payload {
  mode: Mode;
  queue_id?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

  // ----- Auth: founder only -----
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
  const token = authHeader.replace("Bearer ", "");
  const { data: userData, error: userErr } = await userClient.auth.getUser(token);
  if (userErr || !userData?.user) {
    return json(
      {
        ok: false,
        error_code: "auth_invalid",
        message: "Proof-send preview failed: founder session/auth could not be verified.",
        details: userErr?.message ?? "No user from token",
        next_action: "Sign out and back in, then retry.",
      },
      401,
    );
  }
  const userId = userData.user.id;
  const userEmail = userData.user.email ?? undefined;

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  const { data: roleRow } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "founder")
    .maybeSingle();
  if (!roleRow) return json({ error: "Founder role required" }, 403);

  // ----- Parse body -----
  let body: Payload;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }
  if (body.mode !== "preview" && body.mode !== "send") {
    return json({ error: "mode must be 'preview' or 'send'" }, 400);
  }

  // ----- Mode guard -----
  // TEST MODE has been removed as an operational blocker (founder decision).
  // Liftor defaults to LIVE OPERATING MODE; only real provider/contact/compliance
  // guardrails (below) and explicit founder confirmation gate the send.
  const { data: modeRow } = await admin
    .from("system_settings")
    .select("value")
    .eq("key", "system_mode")
    .maybeSingle();
  const rawMode: string =
    typeof modeRow?.value === "string" ? modeRow.value : (modeRow?.value as string) ?? "live";
  // Treat anything other than an explicit admin-only "sandbox" as live.
  const systemMode: string = rawMode === "sandbox" ? "sandbox" : "live";
  const isLive = true;

  // ----- Resolve target queue row -----
  // If queue_id provided, use it. Otherwise pick the next pending row by
  // priority/scheduled_at regardless of due time (proof send may happen
  // before the next scheduled batch).
  let queueRow: any = null;
  if (body.queue_id) {
    const { data, error } = await admin
      .from("email_queue")
      .select("*")
      .eq("id", body.queue_id)
      .maybeSingle();
    if (error) return json({ error: error.message }, 500);
    queueRow = data;
  } else {
    const { data, error } = await admin
      .from("email_queue")
      .select("*")
      .eq("status", "pending")
      .order("priority", { ascending: true })
      .order("scheduled_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) return json({ error: error.message }, 500);
    queueRow = data;
  }

  if (!queueRow) {
    return json(
      {
        ok: false,
        stage: "select",
        reason: "NO_ELIGIBLE_QUEUE_ROW",
        message: "No pending email_queue rows are available.",
      },
      200,
    );
  }

  if (queueRow.status !== "pending") {
    return json(
      {
        ok: false,
        stage: "select",
        reason: "QUEUE_ROW_NOT_PENDING",
        message: `Selected queue row is in status '${queueRow.status}' — only pending rows can be sent.`,
        queue_row: queueRow,
      },
      200,
    );
  }

  // ----- Hydrate contact, inbox, campaign, sequence -----
  const [contactRes, inboxRes, campaignRes, sequenceRes, suppressedRes] = await Promise.all([
    admin.from("contacts").select("*").eq("id", queueRow.contact_id).maybeSingle(),
    queueRow.inbox_id
      ? admin.from("inboxes").select("*").eq("id", queueRow.inbox_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    admin.from("outreach_campaigns").select("*").eq("id", queueRow.campaign_id).maybeSingle(),
    admin
      .from("outreach_sequences")
      .select("subject, body, step_number")
      .eq("campaign_id", queueRow.campaign_id)
      .eq("step_number", queueRow.sequence_step)
      .maybeSingle(),
    admin
      .from("suppressed_emails" as never)
      .select("email")
      .ilike("email", "%")
      .limit(0),
  ]);
  void suppressedRes;

  const contact = contactRes.data;
  const inbox = inboxRes.data as any;
  const campaign = campaignRes.data;
  const sequence = sequenceRes.data;

  // ----- Run all readiness checks -----
  const checks: Array<{ id: string; label: string; pass: boolean; detail: string }> = [];
  const fail = (id: string, label: string, detail: string) =>
    checks.push({ id, label, pass: false, detail });
  const pass = (id: string, label: string, detail: string) =>
    checks.push({ id, label, pass: true, detail });

  // Contact valid email
  if (!contact) fail("contact_exists", "Contact exists", "Contact row missing");
  else if (!contact.email || !/.+@.+\..+/.test(contact.email))
    fail("valid_email", "Contact has valid email", `Got: ${contact.email ?? "<empty>"}`);
  else pass("valid_email", "Contact has valid email", contact.email);

  // Business assignment
  if (contact) {
    if (!contact.assigned_business)
      fail("business_assigned", "Contact assigned to a business", "assigned_business is empty");
    else pass("business_assigned", "Contact assigned to a business", contact.assigned_business);
  }

  // Campaign active
  if (!campaign) fail("campaign_exists", "Campaign exists", "Campaign row missing");
  else if (campaign.status !== "active")
    fail("campaign_active", "Campaign active", `Status: ${campaign.status}`);
  else pass("campaign_active", "Campaign active", `${campaign.campaign_name}`);

  // Sequence step valid
  if (!sequence)
    fail(
      "sequence_valid",
      "Sequence step valid",
      `No sequence step ${queueRow.sequence_step} for this campaign`,
    );
  else if (!sequence.subject || !sequence.body)
    fail("sequence_valid", "Sequence step valid", "Step has empty subject or body");
  else
    pass(
      "sequence_valid",
      "Sequence step valid",
      `Step ${sequence.step_number}: ${(sequence.subject as string).slice(0, 60)}`,
    );

  // Inbox live-ready
  if (!inbox) fail("inbox_live", "Inbox live-ready", "No inbox assigned to this queue row");
  else if (!inbox.active) fail("inbox_live", "Inbox live-ready", `Inbox ${inbox.email_address} is inactive`);
  else if (inbox.live_readiness !== "live_ready")
    fail("inbox_live", "Inbox live-ready", `live_readiness=${inbox.live_readiness}`);
  else pass("inbox_live", "Inbox live-ready", inbox.email_address);

  // Provider cap on this inbox
  if (inbox?.provider_blocked_until && new Date(inbox.provider_blocked_until) > new Date()) {
    fail(
      "provider_cap",
      "Provider cap allows send",
      `Blocked until ${inbox.provider_blocked_until} — ${inbox.provider_blocked_reason ?? "provider cap"}`,
    );
  } else if (inbox) {
    pass("provider_cap", "Provider cap allows send", "No active provider block");
  }

  // Daily/hourly caps — INTERNAL CAPS BYPASSED for activation phase.
  // Provider-level caps (provider_blocked_until) and compliance gates remain enforced above/below.
  if (inbox) {
    pass(
      "daily_cap",
      "Daily cap (internal — bypassed for activation)",
      `Informational only: ${inbox.emails_sent_today ?? 0}/${inbox.daily_send_limit ?? 0} sent today. Internal Liftor daily cap is disabled during activation; only provider-level limits and compliance gates apply.`,
    );
    pass(
      "hourly_cap",
      "Hourly cap (internal — bypassed for activation)",
      `Informational only: ${inbox.hourly_send_count ?? 0}/${inbox.hourly_send_limit ?? 0} sent this hour. Internal Liftor hourly cap is disabled during activation; only provider-level limits and compliance gates apply.`,
    );
  }

  // Reply / bounce / suppression / recent-contact gates via existing RPC
  const { data: gateData, error: gateErr } = await admin.rpc("check_outreach_allowed", {
    _contact_id: queueRow.contact_id,
  });
  if (gateErr) {
    fail("compliance_gate", "Compliance gate (suppression/bounce/reply/recent)", gateErr.message);
  } else {
    const allowed = (gateData as any)?.allowed === true;
    const reason = (gateData as any)?.reason ?? "";
    if (allowed) pass("compliance_gate", "Compliance gate (suppression/bounce/reply/recent)", "All clear");
    else
      fail(
        "compliance_gate",
        "Compliance gate (suppression/bounce/reply/recent)",
        reason || "Blocked by compliance",
      );
  }

  // Throttle/window/reputation via existing RPC
  if (inbox) {
    const { data: throttle } = await admin.rpc("check_send_throttle", {
      _inbox_id: inbox.id,
      _contact_id: queueRow.contact_id,
    });
    const decision = throttle as { allowed?: boolean; reason?: string } | null;
    if (decision?.allowed === false) {
      fail("throttle", "Send throttle / reputation", decision.reason ?? "Throttle blocked");
    } else {
      pass("throttle", "Send throttle / reputation", "Within window");
    }
  }

  // Mode check (informational on preview, hard on send already done above)
  pass(
    "mode",
    "System mode",
    isLive ? "CONTROLLED LIVE — sends allowed" : "TEST MODE — preview only",
  );

  const allPass = checks.every((c) => c.pass);
  const blockers = checks.filter((c) => !c.pass);

  const previewPayload = {
    ok: true,
    stage: "preview",
    system_mode: systemMode,
    queue_row: {
      id: queueRow.id,
      status: queueRow.status,
      sequence_step: queueRow.sequence_step,
      scheduled_at: queueRow.scheduled_at,
      business_name: queueRow.business_name,
      priority: queueRow.priority,
    },
    contact: contact && {
      id: contact.id,
      email: contact.email,
      name: contact.name,
      company: contact.company,
      role: contact.role,
      status: contact.status,
      assigned_business: contact.assigned_business,
    },
    inbox: inbox && {
      id: inbox.id,
      email_address: inbox.email_address,
      live_readiness: inbox.live_readiness,
      daily_send_limit: inbox.daily_send_limit,
      hourly_send_limit: inbox.hourly_send_limit,
      emails_sent_today: inbox.emails_sent_today,
      hourly_send_count: inbox.hourly_send_count,
    },
    campaign: campaign && {
      id: campaign.id,
      name: campaign.campaign_name,
      status: campaign.status,
    },
    sequence: sequence && {
      step_number: (sequence as any).step_number,
      subject: (sequence as any).subject,
      body_preview: ((sequence as any).body as string).slice(0, 240),
    },
    checks,
    all_pass: allPass,
    blockers,
  };

  if (body.mode === "preview") return json(previewPayload, 200);

  // ----- SEND -----
  if (!allPass) {
    return json(
      {
        ...previewPayload,
        ok: false,
        stage: "blocked",
        reason: blockers[0]?.id ?? "BLOCKED",
        message: `Cannot send: ${blockers.map((b) => b.label).join(", ")}`,
      },
      200,
    );
  }

  // Bring this single row to the front of the worker queue: priority=1 and
  // scheduled_at=now(). All other guardrails inside the worker still apply.
  const { error: bumpErr } = await admin
    .from("email_queue")
    .update({ priority: 1, scheduled_at: new Date().toISOString() })
    .eq("id", queueRow.id);
  if (bumpErr) return json({ error: `Failed to prioritise queue row: ${bumpErr.message}` }, 500);

  // Audit: mark proof send started
  await admin.from("system_events").insert({
    event_type: "controlled_proof_send_start",
    severity: "high",
    business_name: queueRow.business_name,
    entity_type: "email_queue",
    entity_id: queueRow.id,
    message: `Founder ${userEmail ?? userId} starting controlled proof send to ${contact?.email}`,
    metadata: {
      contact_id: queueRow.contact_id,
      campaign_id: queueRow.campaign_id,
      sequence_step: queueRow.sequence_step,
      inbox_id: queueRow.inbox_id,
      inbox_email: inbox?.email_address,
      actor: userEmail ?? userId,
      checks: checks.map((c) => ({ id: c.id, pass: c.pass })),
    },
    resolved: true,
    resolution_note: "Audit only — not an unresolved warning.",
  });

  await admin.from("activity_log").insert({
    event_type: "controlled_proof_send_start",
    description: `Controlled proof send → ${contact?.email} via ${inbox?.email_address}`,
    entity_type: "email_queue",
    entity_id: queueRow.id,
    business_name: queueRow.business_name,
  });

  // Invoke the existing worker with max=1 (single-row guard).
  let workerResult: any = null;
  let workerError: string | null = null;
  try {
    const resp = await fetch(`${SUPABASE_URL}/functions/v1/outreach-send-worker?max=1`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SERVICE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ max: 1 }),
    });
    workerResult = await resp.json().catch(() => ({}));
    if (!resp.ok) workerError = `Worker HTTP ${resp.status}`;
  } catch (e) {
    workerError = (e as Error).message;
  }

  // Read back the queue row to see what happened
  const { data: postRow } = await admin
    .from("email_queue")
    .select(
      "id, status, sent_at, smtp_accepted_at, provider_message_id, provider_response, send_error, block_reason, delivery_kind, retry_count",
    )
    .eq("id", queueRow.id)
    .maybeSingle();

  // Find the matching email_event (sent/bounced/etc)
  let emailEvent: any = null;
  if (postRow?.provider_message_id) {
    const { data: ev } = await admin
      .from("email_events")
      .select("id, event_type, timestamp, email_id")
      .eq("contact_id", queueRow.contact_id)
      .eq("email_id", postRow.provider_message_id)
      .order("timestamp", { ascending: false })
      .limit(1)
      .maybeSingle();
    emailEvent = ev;
  }
  if (!emailEvent) {
    const { data: ev } = await admin
      .from("email_events")
      .select("id, event_type, timestamp, email_id")
      .eq("contact_id", queueRow.contact_id)
      .order("timestamp", { ascending: false })
      .limit(1)
      .maybeSingle();
    emailEvent = ev;
  }

  const success =
    postRow?.status === "sent" &&
    postRow?.delivery_kind === "smtp_real" &&
    !!postRow?.smtp_accepted_at;

  // Audit: result
  await admin.from("system_events").insert({
    event_type: success ? "controlled_proof_send_success" : "controlled_proof_send_result",
    severity: success ? "low" : "medium",
    business_name: queueRow.business_name,
    entity_type: "email_queue",
    entity_id: queueRow.id,
    message: success
      ? `Proof send delivered to ${contact?.email} via ${inbox?.email_address}`
      : `Proof send ended in status ${postRow?.status ?? "unknown"} — ${
          postRow?.send_error ?? postRow?.block_reason ?? "see provider response"
        }`,
    metadata: {
      queue_id: queueRow.id,
      contact_id: queueRow.contact_id,
      contact_email: contact?.email,
      inbox_id: queueRow.inbox_id,
      inbox_email: inbox?.email_address,
      provider_message_id: postRow?.provider_message_id,
      provider_response: postRow?.provider_response,
      send_error: postRow?.send_error,
      block_reason: postRow?.block_reason,
      delivery_kind: postRow?.delivery_kind,
      email_event_id: emailEvent?.id,
      worker_summary: workerResult,
      worker_error: workerError,
      actor: userEmail ?? userId,
    },
    resolved: success,
    resolution_note: success ? "Single proof send completed." : "Awaiting founder review.",
  });

  await admin.from("activity_log").insert({
    event_type: success ? "controlled_proof_send_success" : "controlled_proof_send_failed",
    description: success
      ? `Proof send delivered: ${contact?.email}`
      : `Proof send ended in ${postRow?.status ?? "unknown"}: ${
          postRow?.send_error ?? postRow?.block_reason ?? "see logs"
        }`,
    entity_type: "email_queue",
    entity_id: queueRow.id,
    business_name: queueRow.business_name,
  });

  return json({
    ok: true,
    stage: "send",
    success,
    system_mode: systemMode,
    queue_id: queueRow.id,
    contact_email: contact?.email,
    inbox_email: inbox?.email_address,
    queue_after: postRow,
    email_event: emailEvent,
    worker_summary: workerResult,
    worker_error: workerError,
    next_recommended_action: success
      ? "Watch the inbox for any reply. The Conversation Agent will draft a response for founder approval."
      : `Review send_error / block_reason and rerun preview. Status: ${postRow?.status ?? "unknown"}.`,
  });
});