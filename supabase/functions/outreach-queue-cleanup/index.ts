// deno-lint-ignore-file no-explicit-any
// Founder-only cleanup/parking gate for parked Neon Candy pending queue rows.
// PARK   → status = 'blocked'   (non-sendable; preserves history)
// CANCEL → status = 'cancelled' (non-sendable; preserves history)
// Never sends, never calls SMTP, never calls Apollo. No queue creation/deletion.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const BUSINESS_ID = "b47c4b11-9a96-4af9-9aec-2f5218de9182";
const CAMPAIGN_ID = "d621d6bc-76af-48a2-a8f2-c7505dbb9654";
const INBOX_ID = "0a7096d1-8160-4243-97bc-c1615b6673b3";
const BUSINESS_NAME = "Neon Candy";

const ALLOWED_REASONS = new Set([
  "legacy_pending",
  "orphan_followup",
  "cancel_candidate",
  "review_required",
  "safety_baseline_unverified",
  "founder_cleanup",
]);

const CONFIRMATION_TEXT = "I understand this only parks/cancels pending rows and sends nothing";

const json = (b: any, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  // ===== AUTH: founder/admin only =====
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return json({ ok: false, error: "Unauthorized — bearer token required" }, 401);

  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const token = authHeader.replace("Bearer ", "");
  const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
  if (claimsErr || !claimsData?.claims?.sub) return json({ ok: false, error: "Unauthorized — invalid token" }, 401);
  const userId = claimsData.claims.sub as string;

  const supa = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const { data: roles } = await supa.from("user_roles").select("role").eq("user_id", userId);
  const isFounder = (roles ?? []).some((r: any) => r.role === "founder" || r.role === "admin");
  if (!isFounder) return json({ ok: false, error: "Forbidden — founder/admin role required" }, 403);

  // ===== INPUT =====
  let body: any = {};
  try { body = await req.json(); } catch { return json({ ok: false, error: "Invalid JSON body" }, 400); }

  const dry_run: boolean = body?.dry_run !== false; // default true
  const queue_ids: string[] = Array.isArray(body?.queue_ids) ? body.queue_ids : [];
  const action: "park" | "cancel" = body?.action;
  const reason: string = body?.reason;
  const confirmation: string | undefined = body?.confirmation;

  if (!["park", "cancel"].includes(action)) return json({ ok: false, error: "action must be 'park' or 'cancel'" }, 400);
  if (!ALLOWED_REASONS.has(reason)) return json({ ok: false, error: `reason must be one of ${[...ALLOWED_REASONS].join(", ")}` }, 400);
  if (queue_ids.length === 0) return json({ ok: false, error: "queue_ids[] required" }, 400);
  if (queue_ids.length > 10) return json({ ok: false, error: "max 10 queue_ids per call in this version" }, 400);
  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!queue_ids.every((id) => typeof id === "string" && uuidRe.test(id))) {
    return json({ ok: false, error: "queue_ids must be uuids" }, 400);
  }
  if (!dry_run && confirmation !== CONFIRMATION_TEXT) {
    return json({ ok: false, error: "confirmation text missing or incorrect — no rows changed" }, 400);
  }

  const newStatus = action === "park" ? "blocked" : "cancelled";

  // ===== ELIGIBILITY: only Neon Candy / this campaign / this inbox / status=pending =====
  const { data: rows, error: selErr } = await supa
    .from("email_queue")
    .select("id, contact_id, campaign_id, inbox_id, status, sequence_step, scheduled_at, business_name, block_reason, sent_at, provider_message_id")
    .in("id", queue_ids);
  if (selErr) return json({ ok: false, error: selErr.message }, 500);

  const eligible: any[] = [];
  const rejected: { queue_id: string; reason: string }[] = [];
  const foundIds = new Set((rows ?? []).map((r: any) => r.id));
  for (const id of queue_ids) {
    if (!foundIds.has(id)) rejected.push({ queue_id: id, reason: "not_found" });
  }
  for (const r of rows ?? []) {
    if (r.campaign_id !== CAMPAIGN_ID) { rejected.push({ queue_id: r.id, reason: "campaign_mismatch" }); continue; }
    if (r.inbox_id !== INBOX_ID) { rejected.push({ queue_id: r.id, reason: "inbox_mismatch" }); continue; }
    if (r.business_name !== BUSINESS_NAME) { rejected.push({ queue_id: r.id, reason: "business_mismatch" }); continue; }
    if (r.status !== "pending") { rejected.push({ queue_id: r.id, reason: `not_pending_${r.status}` }); continue; }
    eligible.push(r);
  }

  const preview = {
    action,
    new_status: newStatus,
    reason,
    eligible_ids: eligible.map((r) => r.id),
    rejected,
    counters: {
      dry_run,
      rows_changed: 0,
      emails_sent: 0,
      provider_calls: 0,
      apollo_credits_spent: 0,
      queue_rows_created: 0,
      queue_rows_updated: 0,
      queue_rows_deleted: 0,
      contacts_changed: 0,
      bcrs_changed: 0,
      compliance_records_changed: 0,
      system_settings_changed: 0,
      cron_changed: 0,
    },
  };

  if (dry_run) {
    return json({ ok: true, dry_run: true, preview, founder_protected: true, note: "Preview only. No rows changed. No SMTP. No Apollo." });
  }

  if (eligible.length === 0) {
    return json({ ok: false, dry_run: false, error: "no eligible rows to update", preview }, 400);
  }

  // ===== APPLY (only for eligible rows) =====
  // block_reason format: "<reason>:<action>:<founder uid8>" (preserves audit even though provider/sent fields untouched)
  const stamp = `${reason}:${action}:${userId.slice(0, 8)}`;
  const eligibleIds = eligible.map((r) => r.id);

  const { data: updated, error: updErr } = await supa
    .from("email_queue")
    .update({ status: newStatus, block_reason: stamp })
    .in("id", eligibleIds)
    .eq("status", "pending")
    .eq("campaign_id", CAMPAIGN_ID)
    .eq("inbox_id", INBOX_ID)
    .eq("business_name", BUSINESS_NAME)
    .select("id, status, block_reason");
  if (updErr) {
    return json({ ok: false, error: `update failed: ${updErr.message}`, rows_changed: 0 }, 500);
  }

  // ===== AUDIT: system_events =====
  const { error: evErr } = await supa.from("system_events").insert({
    event_type: "outreach_queue_cleanup",
    entity_type: "email_queue",
    entity_id: null,
    business_name: BUSINESS_NAME,
    severity: "low",
    message: `Founder cleanup: ${action} → ${newStatus} for ${updated?.length ?? 0} pending row(s) (reason: ${reason})`,
    metadata: {
      action,
      reason,
      new_status: newStatus,
      affected_queue_ids: (updated ?? []).map((r: any) => r.id),
      rejected,
      business_id: BUSINESS_ID,
      campaign_id: CAMPAIGN_ID,
      inbox_id: INBOX_ID,
      founder_user_id: userId,
      dry_run: false,
      emails_sent: 0,
      provider_calls: 0,
      apollo_credits_spent: 0,
    },
  });

  if (evErr) {
    // Best-effort rollback: revert updated rows back to pending.
    await supa.from("email_queue")
      .update({ status: "pending", block_reason: null })
      .in("id", eligibleIds);
    return json({ ok: false, error: `system_events write failed; queue update rolled back: ${evErr.message}` }, 500);
  }

  return json({
    ok: true,
    dry_run: false,
    founder_protected: true,
    action,
    reason,
    new_status: newStatus,
    rows_changed: updated?.length ?? 0,
    affected_queue_ids: (updated ?? []).map((r: any) => r.id),
    rejected,
    counters: {
      dry_run: false,
      rows_changed: updated?.length ?? 0,
      emails_sent: 0,
      provider_calls: 0,
      apollo_credits_spent: 0,
      queue_rows_created: 0,
      queue_rows_updated: updated?.length ?? 0,
      queue_rows_deleted: 0,
      contacts_changed: 0,
      bcrs_changed: 0,
      compliance_records_changed: 0,
      system_settings_changed: 0,
      cron_changed: 0,
    },
  });
});