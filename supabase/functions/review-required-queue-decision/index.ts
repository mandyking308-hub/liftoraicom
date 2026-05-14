// deno-lint-ignore-file no-explicit-any
// Founder-only Decision Apply path for the 7 review_required Step 4
// Neon Candy follow-ups. Park-only. Never sends. Never calls SMTP/Apollo.
// Never touches contacts / BCRs / compliance / campaigns / inboxes /
// system_settings / cron / valid_future_step_blocked rows.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const BUSINESS_ID = "b47c4b11-9a96-4af9-9aec-2f5218de9182";
const BUSINESS_NAME = "Neon Candy";
const CAMPAIGN_ID = "d621d6bc-76af-48a2-a8f2-c7505dbb9654";
const INBOX_ID = "0a7096d1-8160-4243-97bc-c1615b6673b3";
const SENDER_EMAIL = "hello@neoncandy.online";
const CONFIRMATION_TEXT =
  "I understand this parks selected review-required follow-ups and sends nothing";
const BLOCK_REASON =
  "review_required_decision_gate:park_followup:missing_compliance_spine";

const ELIGIBLE_QUEUE_IDS = new Set<string>([
  "77a84330-a066-4a28-983f-e42adf295936",
  "2771e102-7d76-4ab3-bb16-29d8769d7b02",
  "0fe97fb4-1947-40d8-b983-9bfa419a21f7",
  "11d3c5bf-31d3-414d-9093-bcba5c78a618",
  "0c46352b-cf98-4bbb-98b6-a24a6aa97f64",
  "0d14b45e-2142-4db4-b66d-aab530c03cf2",
  "baec3a1a-3430-4172-940e-d99843abea3e",
]);

const FORBIDDEN_QUEUE_IDS = new Set<string>([
  // valid_future_step_blocked Step 2 rows — never touched by this path.
  "2925f001-efb0-4a69-ae35-eec0621b7ee1",
  "de234038-5eb6-441f-ac4f-ba3ac4f466cc",
  "693a85df-0fae-4938-bbbe-b0791168d417",
]);

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function json(status: number, body: any) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json(405, { ok: false, error: "POST only" });

  // ===== AUTH: founder/admin only =====
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return json(401, { ok: false, error: "Unauthorized — bearer token required" });
  }
  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const token = authHeader.replace("Bearer ", "");
  const { data: userData, error: userErr } = await userClient.auth.getUser(token);
  if (userErr || !userData?.user?.id) {
    return json(401, { ok: false, error: "Unauthorized — invalid token" });
  }
  const userId = userData.user.id;

  const supa = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const { data: roles } = await supa
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  const isFounder = (roles ?? []).some(
    (r: any) => r.role === "founder" || r.role === "admin",
  );
  if (!isFounder) {
    return json(403, { ok: false, error: "Forbidden — founder/admin role required" });
  }

  // ===== INPUT =====
  let body: any;
  try {
    body = await req.json();
  } catch {
    return json(400, { ok: false, error: "Invalid JSON body" });
  }

  const dryRun = body?.dry_run !== false; // default true
  const decisions: any[] = Array.isArray(body?.decisions) ? body.decisions : [];
  const confirmation: string = typeof body?.confirmation === "string" ? body.confirmation : "";

  if (decisions.length === 0) {
    return json(400, { ok: false, error: "decisions must contain at least one row" });
  }
  if (decisions.length > 7) {
    return json(400, { ok: false, error: "this version accepts at most 7 decisions" });
  }

  const queueIds: string[] = [];
  for (const d of decisions) {
    if (!d || typeof d !== "object") {
      return json(400, { ok: false, error: "decision items must be objects" });
    }
    const qid = String(d.queue_id ?? "");
    if (!UUID_RE.test(qid)) {
      return json(400, { ok: false, error: `invalid queue_id: ${qid}` });
    }
    if (FORBIDDEN_QUEUE_IDS.has(qid)) {
      return json(400, {
        ok: false,
        error: `queue_id ${qid} is a valid_future_step_blocked row and is not allowed in this path`,
      });
    }
    if (!ELIGIBLE_QUEUE_IDS.has(qid)) {
      return json(400, {
        ok: false,
        error: `queue_id ${qid} is not in the eligible review_required set for this version`,
      });
    }
    if (d.decision !== "park_followup") {
      return json(400, {
        ok: false,
        error: `only decision='park_followup' is allowed in this version (got '${d.decision}')`,
      });
    }
    queueIds.push(qid);
  }
  if (new Set(queueIds).size !== queueIds.length) {
    return json(400, { ok: false, error: "duplicate queue_id in decisions" });
  }

  // ===== Pull current rows + verify eligibility =====
  const { data: rows, error: rowsErr } = await supa
    .from("email_queue")
    .select("id,status,business_name,sequence_step,scheduled_at,sent_at,provider_message_id,contact_id,campaign_id,inbox_id,block_reason")
    .in("id", queueIds);
  if (rowsErr) return json(500, { ok: false, error: `queue read failed: ${rowsErr.message}` });

  const foundIds = new Set((rows ?? []).map((r: any) => r.id));
  const missing = queueIds.filter((q) => !foundIds.has(q));
  if (missing.length > 0) {
    return json(400, { ok: false, error: "queue rows not found", missing });
  }

  const ineligibility: { queue_id: string; reason: string }[] = [];
  for (const r of rows ?? []) {
    if (r.business_name !== BUSINESS_NAME)
      ineligibility.push({ queue_id: r.id, reason: `business_name mismatch (${r.business_name})` });
    if (r.campaign_id !== CAMPAIGN_ID)
      ineligibility.push({ queue_id: r.id, reason: `campaign_id mismatch` });
    if (r.inbox_id !== INBOX_ID)
      ineligibility.push({ queue_id: r.id, reason: `inbox_id mismatch` });
    if (r.status !== "pending")
      ineligibility.push({ queue_id: r.id, reason: `status is '${r.status}' (must be pending)` });
    if (r.sequence_step !== 4)
      ineligibility.push({ queue_id: r.id, reason: `sequence_step is ${r.sequence_step} (must be 4)` });
  }
  if (ineligibility.length > 0) {
    return json(409, { ok: false, error: "ineligible rows", ineligibility });
  }

  // Pull contact display info (read-only, names only).
  const contactIds = (rows ?? []).map((r: any) => r.contact_id).filter(Boolean);
  const { data: contacts } = await supa
    .from("contacts")
    .select("id,first_name,last_name,email")
    .in("id", contactIds);
  const contactById = new Map<string, any>((contacts ?? []).map((c: any) => [c.id, c]));

  const previewRows = (rows ?? []).map((r: any) => {
    const c = contactById.get(r.contact_id);
    const name = c ? [c.first_name, c.last_name].filter(Boolean).join(" ") : null;
    return {
      queue_id: r.id,
      contact_id: r.contact_id,
      contact_name: name,
      contact_email: c?.email ?? null,
      sequence_step: r.sequence_step,
      current_status: r.status,
      proposed_new_status: "blocked",
      reason: BLOCK_REASON,
      scheduled_at: r.scheduled_at,
      sent_at: r.sent_at,
      provider_message_id: r.provider_message_id,
    };
  });

  const counters = {
    rows_changed_if_applied: previewRows.length,
    contacts_changed_if_applied: 0,
    bcrs_changed_if_applied: 0,
    compliance_records_changed_if_applied: 0,
    emails_sent: 0,
    smtp_calls: 0,
    apollo_calls: 0,
    apollo_credits_spent: 0,
    system_settings_changed: 0,
    cron_changed: 0,
    valid_future_step_blocked_rows_touched: 0,
    inboxes_changed: 0,
    campaigns_changed: 0,
  };

  const previewPayload = {
    ok: true,
    dry_run: true,
    business_id: BUSINESS_ID,
    business_name: BUSINESS_NAME,
    campaign_id: CAMPAIGN_ID,
    inbox_id: INBOX_ID,
    sender_email: SENDER_EMAIL,
    selected_count: previewRows.length,
    selected_queue_ids: previewRows.map((r) => r.queue_id),
    rows: previewRows,
    counters,
    confirmation_text_required: CONFIRMATION_TEXT,
    decision: "park_followup",
    rows_changed: 0,
  };

  if (dryRun) return json(200, previewPayload);

  // ===== APPLY =====
  if (confirmation !== CONFIRMATION_TEXT) {
    return json(400, {
      ok: false,
      error: "exact confirmation text required for apply",
      required: CONFIRMATION_TEXT,
    });
  }

  const { data: updated, error: updErr } = await supa
    .from("email_queue")
    .update({ status: "blocked", block_reason: BLOCK_REASON })
    .in("id", queueIds)
    .eq("status", "pending")
    .eq("business_name", BUSINESS_NAME)
    .eq("campaign_id", CAMPAIGN_ID)
    .eq("inbox_id", INBOX_ID)
    .eq("sequence_step", 4)
    .select("id,status,block_reason");

  if (updErr) {
    return json(500, { ok: false, error: `queue update failed: ${updErr.message}` });
  }
  const rowsChanged = updated?.length ?? 0;

  // ===== AUDIT =====
  const { error: evErr } = await supa.from("system_events").insert({
    event_type: "review_required_queue_decision_apply",
    severity: "low",
    entity_type: "email_queue",
    business_name: BUSINESS_NAME,
    message:
      "Founder parked review_required Step 4 follow-ups (missing compliance spine). No sends.",
    metadata: {
      business_id: BUSINESS_ID,
      campaign_id: CAMPAIGN_ID,
      inbox_id: INBOX_ID,
      sender_email: SENDER_EMAIL,
      decision: "park_followup",
      affected_queue_ids: (updated ?? []).map((r: any) => r.id),
      requested_queue_ids: queueIds,
      rows_changed: rowsChanged,
      dry_run: false,
      emails_sent: 0,
      smtp_calls: 0,
      apollo_calls: 0,
      apollo_credits_spent: 0,
      contacts_changed: 0,
      bcrs_changed: 0,
      compliance_records_changed: 0,
      campaigns_changed: 0,
      inboxes_changed: 0,
      system_settings_changed: 0,
      cron_changed: 0,
      valid_future_step_blocked_rows_touched: 0,
      founder_user_id: userId,
      reason: "missing compliance spine on old Step 4 follow-up",
      block_reason: BLOCK_REASON,
    },
  });

  if (evErr) {
    // Best-effort rollback: revert any rows we just changed back to pending.
    if (rowsChanged > 0) {
      await supa
        .from("email_queue")
        .update({ status: "pending", block_reason: null })
        .in("id", (updated ?? []).map((r: any) => r.id));
    }
    return json(500, {
      ok: false,
      error: `audit write failed — rolled back: ${evErr.message}`,
    });
  }

  return json(200, {
    ok: true,
    dry_run: false,
    decision: "park_followup",
    rows_changed: rowsChanged,
    affected_queue_ids: (updated ?? []).map((r: any) => r.id),
    counters: { ...counters, rows_changed_if_applied: rowsChanged },
    audit_event: "review_required_queue_decision_apply",
    founder_user_id: userId,
  });
});
