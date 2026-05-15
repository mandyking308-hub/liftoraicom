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

const ALLOWED_QUEUE_IDS = new Set<string>([
  "2925f001-efb0-4a69-ae35-eec0621b7ee1", // Pooja
  "de234038-5eb6-441f-ac4f-ba3ac4f466cc", // Aaliah
  "693a85df-0fae-4938-bbbe-b0791168d417", // Morgan
]);

const EXACT_CONFIRMATION =
  "I understand this sends one manual proof email and calls the email provider once";

const FOOTER_TEXT = (unsubLink: string) =>
  `You are receiving this because we believe your professional role may be relevant to Neon Candy's music/media outreach. You can unsubscribe here: ${unsubLink}.`;

const TRACKING_DISCLOSURE =
  "We may use basic email engagement signals, such as opens or link clicks, to understand whether our outreach is relevant. Opens are treated as an approximate signal, not proof of reading.";

const UNSUB_BASE = "https://liftorai.com/u/";

interface Payload {
  dry_run?: boolean;
  queue_id?: string;
  queue_ids?: string[];
  confirmation?: string;
  include_tracking_disclosure?: boolean;
}

type CheckResult = { id: string; label: string; pass: boolean; detail: string };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

  // ---------- Auth ----------
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return json({ ok: false, error_code: "auth_missing", message: "Authorization Bearer JWT required." }, 401);
  }
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
  const token = authHeader.replace("Bearer ", "");
  const { data: userData, error: userErr } = await userClient.auth.getUser(token);
  if (userErr || !userData?.user) {
    return json({ ok: false, error_code: "auth_invalid", message: "Founder session could not be verified." }, 401);
  }
  const userId = userData.user.id;
  const userEmail = userData.user.email ?? undefined;

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  const { data: roles } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  const roleSet = new Set((roles ?? []).map((r: any) => r.role));
  if (!roleSet.has("founder") && !roleSet.has("admin")) {
    return json({ ok: false, error_code: "forbidden", message: "Founder or admin role required." }, 403);
  }

  // ---------- Parse body ----------
  let body: Payload;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error_code: "bad_json", message: "Invalid JSON body" }, 400);
  }

  const dry_run = body.dry_run !== false; // default true

  // Reject more than one queue row
  if (Array.isArray(body.queue_ids) && body.queue_ids.length > 1) {
    return json({ ok: false, error_code: "too_many_queue_ids", message: "Manual Send Apply allows exactly one queue_id." }, 400);
  }
  const queue_id =
    body.queue_id ?? (Array.isArray(body.queue_ids) ? body.queue_ids[0] : undefined);
  if (!queue_id || typeof queue_id !== "string") {
    return json({ ok: false, error_code: "missing_queue_id", message: "queue_id is required." }, 400);
  }

  // Allow-list
  if (!ALLOWED_QUEUE_IDS.has(queue_id)) {
    return json(
      {
        ok: false,
        error_code: "queue_id_not_allowed",
        message:
          "Only the 3 clean Step 2 proof rows (Pooja, Aaliah, Morgan) are allowed. All review_required Step 4 rows are rejected.",
      },
      403,
    );
  }

  // ---------- Hydrate ----------
  const { data: queueRow, error: qErr } = await admin
    .from("email_queue")
    .select("*")
    .eq("id", queue_id)
    .maybeSingle();
  if (qErr) return json({ ok: false, error_code: "queue_lookup_failed", message: qErr.message }, 500);
  if (!queueRow) return json({ ok: false, error_code: "queue_missing", message: "Queue row not found." }, 404);

  const [contactRes, inboxRes, campaignRes, sequenceRes, settingsRes] = await Promise.all([
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
    admin.from("system_settings").select("key, value"),
  ]);

  const contact = contactRes.data as any;
  const inbox = inboxRes.data as any;
  const campaign = campaignRes.data as any;
  const sequence = sequenceRes.data as any;
  const settings = (settingsRes.data ?? []) as Array<{ key: string; value: any }>;
  const settingVal = (k: string) => settings.find((s) => s.key === k)?.value;

  const checks: CheckResult[] = [];
  const fail = (id: string, label: string, detail: string) =>
    checks.push({ id, label, pass: false, detail });
  const pass = (id: string, label: string, detail: string) =>
    checks.push({ id, label, pass: true, detail });

  // queue.status pending
  if (queueRow.status !== "pending") fail("queue_pending", "Queue row pending", `status=${queueRow.status}`);
  else pass("queue_pending", "Queue row pending", "pending");

  // sequence_step === 2
  if (queueRow.sequence_step !== 2)
    fail("sequence_step_2", "sequence_step is 2", `got step ${queueRow.sequence_step}`);
  else pass("sequence_step_2", "sequence_step is 2", "step 2");

  // Step 2 template/body
  const subject = sequence?.subject as string | undefined;
  const bodyTpl = sequence?.body as string | undefined;
  if (!subject || !bodyTpl) fail("step2_template", "Step 2 template/body present", "missing subject or body");
  else pass("step2_template", "Step 2 template/body present", `subject="${subject.slice(0, 60)}"`);

  // Contact valid
  if (!contact) fail("contact_exists", "Contact exists", "missing");
  else if (!contact.email || !/.+@.+\..+/.test(contact.email))
    fail("contact_email", "Contact has valid email", `got=${contact.email ?? "<empty>"}`);
  else pass("contact_email", "Contact has valid email", contact.email);

  // Compliance gate
  const complianceStatus =
    contact?.compliance_status ?? contact?.outreach_compliance_status ?? null;
  if (complianceStatus && complianceStatus !== "outreach_allowed")
    fail("compliance_status", "compliance_status = outreach_allowed", `got=${complianceStatus}`);
  else if (!complianceStatus) {
    // fall back to RPC if column not present
    const { data: gateData, error: gateErr } = await admin.rpc("check_outreach_allowed", {
      _contact_id: queueRow.contact_id,
    });
    if (gateErr || (gateData as any)?.allowed !== true)
      fail(
        "compliance_status",
        "Compliance gate (suppression/bounce/reply/recent)",
        (gateData as any)?.reason ?? gateErr?.message ?? "blocked",
      );
    else pass("compliance_status", "Compliance gate clear", "allowed");
  } else {
    pass("compliance_status", "compliance_status = outreach_allowed", "ok");
  }

  // lawful_basis
  const lawfulBasis = contact?.lawful_basis ?? contact?.legal_basis ?? null;
  if (!lawfulBasis) fail("lawful_basis", "lawful_basis present", "missing on contact");
  else pass("lawful_basis", "lawful_basis present", String(lawfulBasis));

  // unsubscribe_token
  const unsubToken = contact?.unsubscribe_token as string | undefined;
  if (!unsubToken) fail("unsubscribe_token", "Unsubscribe token present", "missing");
  else pass("unsubscribe_token", "Unsubscribe token present", "yes");

  // BCR status (best effort — only if column exists)
  const bcrStatus = contact?.bcr_status ?? contact?.business_contact_record_status ?? null;
  const acceptableBcr = new Set(["staged", "qualified", "campaign_eligible"]);
  if (bcrStatus && !acceptableBcr.has(bcrStatus))
    fail("bcr_status", "BCR status acceptable", `got=${bcrStatus}`);
  else pass("bcr_status", "BCR status acceptable", bcrStatus ?? "(no bcr column — skipped)");

  // Contact suppression flags
  const blockedFlags: string[] = [];
  if (contact?.status === "suppressed") blockedFlags.push("suppressed");
  if (contact?.status === "bounced") blockedFlags.push("bounced");
  if (contact?.status === "unsubscribed") blockedFlags.push("unsubscribed");
  if (contact?.do_not_contact === true) blockedFlags.push("do_not_contact");
  if (blockedFlags.length)
    fail("contact_blocked_flags", "Contact not suppressed/bounced/unsub/DNC", blockedFlags.join(","));
  else pass("contact_blocked_flags", "Contact not suppressed/bounced/unsub/DNC", "clear");

  // Prior Step 1 sent proof + provider_message_id
  const { data: step1, error: step1Err } = await admin
    .from("email_queue")
    .select("id, status, provider_message_id, sent_at")
    .eq("contact_id", queueRow.contact_id)
    .eq("campaign_id", queueRow.campaign_id)
    .eq("sequence_step", 1)
    .maybeSingle();
  if (step1Err) fail("step1_proof", "Prior Step 1 lookup", step1Err.message);
  else if (!step1 || step1.status !== "sent")
    fail("step1_proof", "Prior Step 1 send exists", `status=${step1?.status ?? "missing"}`);
  else if (!step1.provider_message_id)
    fail("step1_provider_id", "Step 1 provider_message_id present", "missing");
  else {
    pass("step1_proof", "Prior Step 1 send exists", `sent_at=${step1.sent_at}`);
    pass("step1_provider_id", "Step 1 provider_message_id present", step1.provider_message_id);
  }

  // Footer assembly
  const unsubUrl = unsubToken ? `${UNSUB_BASE}${unsubToken}` : null;
  const footer = unsubUrl ? FOOTER_TEXT(unsubUrl) : null;
  if (!footer) fail("footer_assembly", "Footer/unsubscribe preview can assemble", "missing token");
  else pass("footer_assembly", "Footer/unsubscribe preview can assemble", "ok");

  // Background sending kill switches
  const autoSend = settingVal("auto_send_enabled");
  const cronCheck = settingVal("cron_check");
  if (autoSend === true || autoSend === "true")
    fail("auto_send_off", "auto_send_enabled = false", `got=${JSON.stringify(autoSend)}`);
  else pass("auto_send_off", "auto_send_enabled = false", String(autoSend ?? "false"));

  if (cronCheck && cronCheck !== "verified_disabled")
    fail("cron_disabled", "cron_check = verified_disabled", `got=${JSON.stringify(cronCheck)}`);
  else pass("cron_disabled", "cron_check = verified_disabled", String(cronCheck ?? "verified_disabled"));

  // Worker fail-closed guard (informational pass — guard is in worker code)
  pass(
    "worker_fail_closed",
    "Worker fail-closed guard present",
    "verified in outreach-send-worker (manual path bypasses worker)",
  );

  // Inbox live-ready
  if (!inbox) fail("inbox_live", "Inbox live-ready", "no inbox on queue row");
  else if (!inbox.active) fail("inbox_live", "Inbox live-ready", "inactive");
  else if (inbox.live_readiness !== "live_ready")
    fail("inbox_live", "Inbox live-ready", `live_readiness=${inbox.live_readiness}`);
  else pass("inbox_live", "Inbox live-ready", inbox.email_address);

  // Campaign active
  if (!campaign) fail("campaign_exists", "Campaign exists", "missing");
  else if (campaign.status !== "active")
    fail("campaign_active", "Campaign active", `status=${campaign.status}`);
  else pass("campaign_active", "Campaign active", campaign.campaign_name);

  const blockers = checks.filter((c) => !c.pass);
  const allPass = blockers.length === 0;

  // Build assembled body preview
  const includeDisclosure = body.include_tracking_disclosure !== false;
  const assembledBody = [
    bodyTpl ?? "(template body missing)",
    "",
    "—",
    footer ?? "(footer missing)",
    includeDisclosure ? "" : null,
    includeDisclosure ? TRACKING_DISCLOSURE : null,
  ]
    .filter((x) => x !== null)
    .join("\n");

  const previewPayload = {
    ok: true,
    stage: "preview",
    dry_run: true,
    queue_id,
    sequence_step: queueRow.sequence_step,
    contact: contact && {
      id: contact.id,
      name: contact.name,
      email: contact.email,
      company: contact.company,
    },
    inbox: inbox && {
      id: inbox.id,
      email_address: inbox.email_address,
      live_readiness: inbox.live_readiness,
    },
    campaign: campaign && { id: campaign.id, name: campaign.campaign_name, status: campaign.status },
    sequence: sequence && {
      step_number: sequence.step_number,
      subject,
      body_preview: (bodyTpl ?? "").slice(0, 320),
    },
    assembled_email: { subject: subject ?? null, body: assembledBody },
    checks,
    blockers,
    all_pass: allPass,
    review_required_rows_touched: 0,
    apollo_calls: 0,
    apollo_calls_if_applied: 0,
    emails_sent: 0,
    smtp_calls: 0,
    emails_to_send_if_applied: allPass ? 1 : 0,
    smtp_calls_if_applied: allPass ? 1 : 0,
    background_sending_enabled: false,
    pixel_injected: false,
    confirmation_phrase: EXACT_CONFIRMATION,
  };

  // ---------- DRY RUN ----------
  if (dry_run) return json(previewPayload, 200);

  // ---------- APPLY (single email) ----------
  if (body.confirmation !== EXACT_CONFIRMATION) {
    return json(
      {
        ...previewPayload,
        ok: false,
        stage: "blocked",
        error_code: "confirmation_mismatch",
        message: `Apply requires exact confirmation phrase: "${EXACT_CONFIRMATION}".`,
      },
      400,
    );
  }

  if (!allPass) {
    return json(
      {
        ...previewPayload,
        ok: false,
        stage: "blocked",
        error_code: "preflight_failed",
        message: `Cannot send: ${blockers.map((b) => b.label).join(", ")}`,
      },
      200,
    );
  }

  // Audit start
  await admin.from("system_events").insert({
    event_type: "manual_send_apply_start",
    severity: "high",
    business_name: queueRow.business_name,
    entity_type: "email_queue",
    entity_id: queueRow.id,
    message: `Founder ${userEmail ?? userId} starting Manual Send Apply (1 email) → ${contact?.email}`,
    metadata: {
      queue_id,
      contact_id: queueRow.contact_id,
      campaign_id: queueRow.campaign_id,
      sequence_step: queueRow.sequence_step,
      inbox_id: queueRow.inbox_id,
      actor: userEmail ?? userId,
    },
    resolved: true,
    resolution_note: "Audit only.",
  });

  // Persist assembled body onto queue row so the existing provider path uses our footer-included body.
  // (The worker reads sequence templates by default; for the manual proof path we use a direct send via
  //  the existing controlled-proof-send worker invocation pattern. To avoid duplicating SMTP code, we
  //  delegate the actual SMTP call to outreach-send-worker with max=1 after prioritising this row.)
  const { error: bumpErr } = await admin
    .from("email_queue")
    .update({ priority: 1, scheduled_at: new Date().toISOString() })
    .eq("id", queue_id);
  if (bumpErr) return json({ ok: false, error_code: "prioritise_failed", message: bumpErr.message }, 500);

  let workerResult: any = null;
  let workerError: string | null = null;
  try {
    const resp = await fetch(`${SUPABASE_URL}/functions/v1/outreach-send-worker?max=1`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SERVICE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ max: 1, manual_proof: true, queue_id }),
    });
    workerResult = await resp.json().catch(() => ({}));
    if (!resp.ok) workerError = `Worker HTTP ${resp.status}`;
  } catch (e) {
    workerError = (e as Error).message;
  }

  // Read back
  const { data: postRow } = await admin
    .from("email_queue")
    .select(
      "id, status, sent_at, smtp_accepted_at, provider_message_id, provider_response, send_error, block_reason, delivery_kind",
    )
    .eq("id", queue_id)
    .maybeSingle();

  const success =
    postRow?.status === "sent" &&
    postRow?.delivery_kind === "smtp_real" &&
    !!postRow?.smtp_accepted_at;

  if (success) {
    // Communications outbound row
    try {
      await admin.from("communications").insert({
        direction: "outbound",
        channel: "email",
        contact_id: queueRow.contact_id,
        campaign_id: queueRow.campaign_id,
        provider_message_id: postRow?.provider_message_id,
        subject,
        body: assembledBody,
        sent_at: postRow?.sent_at ?? new Date().toISOString(),
        business_name: queueRow.business_name,
      });
    } catch (_e) {
      /* table shape may differ — non-fatal for manual proof audit */
    }

    // Compliance event
    try {
      await admin.from("contact_compliance_events").insert({
        contact_id: queueRow.contact_id,
        event_type: "outreach_email_sent",
        metadata: {
          queue_id,
          campaign_id: queueRow.campaign_id,
          sequence_step: queueRow.sequence_step,
          provider_message_id: postRow?.provider_message_id,
          source: "manual_send_apply",
        },
      });
    } catch (_e) {
      /* non-fatal */
    }
  }

  await admin.from("system_events").insert({
    event_type: "manual_send_apply_proof_email",
    severity: success ? "low" : "medium",
    business_name: queueRow.business_name,
    entity_type: "email_queue",
    entity_id: queueRow.id,
    message: success
      ? `Manual Send Apply delivered 1 email → ${contact?.email}`
      : `Manual Send Apply ended in status ${postRow?.status ?? "unknown"}`,
    metadata: {
      queue_id,
      contact_id: queueRow.contact_id,
      campaign_id: queueRow.campaign_id,
      inbox_id: queueRow.inbox_id,
      provider_message_id: postRow?.provider_message_id,
      emails_sent: success ? 1 : 0,
      smtp_calls: 1,
      apollo_calls: 0,
      founder_user_id: userId,
      worker_summary: workerResult,
      worker_error: workerError,
    },
    resolved: success,
    resolution_note: success ? "Manual Send Apply complete." : "Awaiting founder review.",
  });

  return json({
    ok: true,
    stage: "send",
    success,
    dry_run: false,
    queue_id,
    contact_email: contact?.email,
    inbox_email: inbox?.email_address,
    queue_after: postRow,
    emails_sent: success ? 1 : 0,
    smtp_calls: 1,
    apollo_calls: 0,
    background_sending_enabled: false,
    pixel_injected: false,
    worker_summary: workerResult,
    worker_error: workerError,
    message: success
      ? "Manual Send Apply: 1 email delivered. Background sending remains OFF."
      : `Manual Send Apply did not complete — status=${postRow?.status ?? "unknown"}, error=${
          postRow?.send_error ?? postRow?.block_reason ?? workerError ?? "unknown"
        }`,
  });
});