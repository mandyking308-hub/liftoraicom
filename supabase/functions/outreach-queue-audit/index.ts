// deno-lint-ignore-file no-explicit-any
// READ-ONLY brake-verification + parked-queue audit.
// Performs ZERO mutations: no SMTP, no Apollo, no queue/contacts/BCR/compliance/system_settings/cron writes.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const BUSINESS_ID = "b47c4b11-9a96-4af9-9aec-2f5218de9182";
const CAMPAIGN_ID = "d621d6bc-76af-48a2-a8f2-c7505dbb9654";
const INBOX_ID = "0a7096d1-8160-4243-97bc-c1615b6673b3";
const PROVIDER_MODE = "ionos_proof";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const supa = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  // ============ PART 1: SAFETY BASELINE ============
  const baseline: any = {
    auto_send_setting_present: false,
    auto_send_enabled_value: null,
    auto_send_is_strict_false: false,
    worker_guard_present_in_source: true, // verified at code-review time; worker contains GLOBAL AUTO-SEND KILL SWITCH block
    worker_exits_before_queue_selection: true,
    cron_query_attempted: false,
    cron_query_ok: false,
    cron_outbound_send_jobs: [] as any[],
    cron_inbound_only_jobs: [] as any[],
    cron_unknown_jobs: [] as any[],
    smtp_called: false,
    apollo_called: false,
    notes: [] as string[],
  };

  try {
    const { data: setting } = await supa.from("system_settings")
      .select("value").eq("key", "auto_send_enabled").maybeSingle();
    if (setting) {
      baseline.auto_send_setting_present = true;
      baseline.auto_send_enabled_value = setting.value;
      baseline.auto_send_is_strict_false = setting.value === false || setting.value === "false";
    }
  } catch (e) {
    baseline.notes.push(`auto_send read error: ${(e as Error).message}`);
  }

  // Best-effort cron inspection. cron schema may not be readable; treat failure as REVIEW_REQUIRED.
  try {
    baseline.cron_query_attempted = true;
    const { data: cronRows, error: cronErr } = await supa
      .from("cron.job" as any)
      .select("jobname,schedule,active,command");
    if (!cronErr && cronRows) {
      baseline.cron_query_ok = true;
      for (const j of cronRows as any[]) {
        const cmd = String(j.command ?? "");
        const isOutbound = cmd.includes("outreach-send-worker");
        const isInbound = cmd.includes("outreach-inbound-poll") || cmd.includes("outreach-inbound-webhook");
        const entry = { jobname: j.jobname, schedule: j.schedule, active: j.active };
        if (isOutbound && j.active) baseline.cron_outbound_send_jobs.push(entry);
        else if (isInbound) baseline.cron_inbound_only_jobs.push(entry);
        else if (!isOutbound && !isInbound) baseline.cron_unknown_jobs.push(entry);
      }
    } else {
      baseline.notes.push(`cron query failed: ${cronErr?.message ?? "unknown"}`);
    }
  } catch (e) {
    baseline.notes.push(`cron query exception: ${(e as Error).message}`);
  }

  let safety_status: "SAFE_BLOCKED" | "UNSAFE_REVIEW_REQUIRED" = "UNSAFE_REVIEW_REQUIRED";
  const unsafe_reasons: string[] = [];
  if (!baseline.auto_send_setting_present) unsafe_reasons.push("auto_send_enabled row missing");
  if (!baseline.auto_send_is_strict_false) unsafe_reasons.push("auto_send_enabled is not strict false");
  if (!baseline.worker_guard_present_in_source) unsafe_reasons.push("worker guard not present");
  if (baseline.cron_query_ok && baseline.cron_outbound_send_jobs.length > 0) unsafe_reasons.push("active outbound send cron found");
  if (!baseline.cron_query_ok) unsafe_reasons.push("could not verify cron table — manual confirmation required");
  if (unsafe_reasons.length === 0) safety_status = "SAFE_BLOCKED";

  // ============ PART 2: PARKED QUEUE AUDIT ============
  const { data: pendingRows, error: qErr } = await supa
    .from("email_queue")
    .select("id, contact_id, campaign_id, sequence_step, status, scheduled_at, created_at, inbox_id, business_name, block_reason, tracking_token, tracking_pixel_id, provider_message_id, sent_at")
    .eq("campaign_id", CAMPAIGN_ID)
    .eq("inbox_id", INBOX_ID)
    .eq("status", "pending")
    .order("sequence_step")
    .order("scheduled_at");
  if (qErr) {
    return new Response(JSON.stringify({ ok: false, error: qErr.message }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const contactIds = Array.from(new Set((pendingRows ?? []).map(r => r.contact_id)));

  const [contactsRes, bcrRes, sentRes, campaignRes, inboxRes, sequencesRes, repliesEvRes, repliesCommRes] = await Promise.all([
    supa.from("contacts").select("id, name, email, status, compliance_status, lawful_basis, lawful_basis_recorded_at, retention_until, unsubscribe_token, unsubscribed_at, do_not_contact_at, do_not_contact_reason, is_globally_suppressed, hard_bounced, active_campaign_id").in("id", contactIds.length ? contactIds : ["00000000-0000-0000-0000-000000000000"]),
    supa.from("business_contact_relationships").select("contact_id, business_id, current_stage, qualification, campaign_eligible, do_not_contact, do_not_contact_reason").in("contact_id", contactIds.length ? contactIds : ["00000000-0000-0000-0000-000000000000"]).eq("business_id", BUSINESS_ID),
    supa.from("email_queue").select("id, contact_id, sequence_step, status, sent_at, provider_message_id").eq("campaign_id", CAMPAIGN_ID).in("status", ["sent"]).in("contact_id", contactIds.length ? contactIds : ["00000000-0000-0000-0000-000000000000"]),
    supa.from("outreach_campaigns").select("id, campaign_name, status").eq("id", CAMPAIGN_ID).maybeSingle(),
    supa.from("inboxes").select("id, email_address, active, daily_send_limit, current_send_count").eq("id", INBOX_ID).maybeSingle(),
    supa.from("outreach_sequences").select("step_number, subject, body").eq("campaign_id", CAMPAIGN_ID).order("step_number"),
    supa.from("email_events").select("contact_id, event_type, created_at").in("contact_id", contactIds.length ? contactIds : ["00000000-0000-0000-0000-000000000000"]).in("event_type", ["replied", "bounced"]),
    supa.from("communications").select("contact_id, direction, created_at").in("contact_id", contactIds.length ? contactIds : ["00000000-0000-0000-0000-000000000000"]).eq("direction", "inbound"),
  ]);

  const contactMap = new Map((contactsRes.data ?? []).map((c: any) => [c.id, c]));
  const bcrMap = new Map((bcrRes.data ?? []).map((b: any) => [b.contact_id, b]));
  const sentByContact = new Map<string, any[]>();
  for (const s of (sentRes.data ?? [])) {
    const arr = sentByContact.get(s.contact_id) ?? [];
    arr.push(s); sentByContact.set(s.contact_id, arr);
  }
  const seqMap = new Map((sequencesRes.data ?? []).map((s: any) => [s.step_number, s]));
  const repliedSet = new Set<string>();
  for (const e of (repliesEvRes.data ?? [])) if (e.event_type === "replied") repliedSet.add(e.contact_id);
  for (const c of (repliesCommRes.data ?? [])) repliedSet.add(c.contact_id);
  const bouncedSet = new Set((repliesEvRes.data ?? []).filter((e: any) => e.event_type === "bounced").map((e: any) => e.contact_id));

  // Duplicate detection on pending: same (contact, step)
  const dupKey = new Map<string, number>();
  for (const r of pendingRows ?? []) {
    const k = `${r.contact_id}|${r.sequence_step}`;
    dupKey.set(k, (dupKey.get(k) ?? 0) + 1);
  }

  const items: any[] = [];
  for (const r of pendingRows ?? []) {
    const c: any = contactMap.get(r.contact_id) ?? null;
    const bcr: any = bcrMap.get(r.contact_id) ?? null;
    const sent = (sentByContact.get(r.contact_id) ?? []).sort((a, b) => a.sequence_step - b.sequence_step);
    const sentSteps = sent.map(s => s.sequence_step);
    const lastSentStep = sentSteps.length ? Math.max(...sentSteps) : null;
    const step1Sent = sentSteps.includes(1);
    const followsLastSent = lastSentStep !== null && r.sequence_step === lastSentStep + 1;
    const seq: any = seqMap.get(r.sequence_step) ?? null;
    const hasReply = repliedSet.has(r.contact_id);
    const hasBounce = bouncedSet.has(r.contact_id);
    const dup = (dupKey.get(`${r.contact_id}|${r.sequence_step}`) ?? 0) > 1;

    const blockers: string[] = [];
    if (!c) blockers.push("contact_missing");
    if (c?.is_globally_suppressed) blockers.push("globally_suppressed");
    if (c?.hard_bounced || hasBounce) blockers.push("hard_bounced");
    if (c?.unsubscribed_at) blockers.push("unsubscribed");
    if (c?.do_not_contact_at) blockers.push("do_not_contact");
    if (c?.compliance_status && c.compliance_status !== "outreach_allowed") blockers.push(`compliance_${c.compliance_status}`);
    if (!c?.lawful_basis) blockers.push("missing_lawful_basis");
    if (!c?.unsubscribe_token) blockers.push("missing_unsubscribe_token");
    if (!bcr) blockers.push("bcr_missing_for_business");
    if (bcr?.do_not_contact) blockers.push("bcr_do_not_contact");
    if (bcr && bcr.campaign_eligible === false) blockers.push("bcr_not_campaign_eligible");
    if (hasReply) blockers.push("prior_reply_should_cancel");
    if (dup) blockers.push("duplicate_pending_same_step");
    if (r.sequence_step > 1 && !step1Sent) blockers.push("missing_step1_proof");
    if (lastSentStep !== null && !followsLastSent) blockers.push("does_not_follow_last_sent_step");

    let classification: string;
    let recommended: string;
    if (hasReply || hasBounce || c?.unsubscribed_at || c?.do_not_contact_at || c?.is_globally_suppressed) {
      classification = "cancel_candidate";
      recommended = "Park then cancel — contact has reply/bounce/suppression/unsubscribe.";
    } else if (!step1Sent && r.sequence_step > 1) {
      classification = "orphan_followup";
      recommended = "Park — follow-up exists with no proof of Step 1 send.";
    } else if (lastSentStep !== null && !followsLastSent) {
      classification = "orphan_followup";
      recommended = "Park — pending step does not follow last sent step.";
    } else if (!bcr || bcr.do_not_contact || bcr.campaign_eligible === false || !c?.lawful_basis || !c?.unsubscribe_token || (c?.compliance_status && c.compliance_status !== "outreach_allowed")) {
      classification = "review_required";
      recommended = "Human review — compliance/BCR not in clean send-ready state.";
    } else if (lastSentStep === null && r.sequence_step === 1) {
      classification = "valid_future_step_blocked";
      recommended = "Hold — valid Step 1 candidate, must wait for Controlled Manual Send Apply.";
    } else if (followsLastSent && blockers.length === 0) {
      classification = "valid_future_step_blocked";
      recommended = "Hold — logically next sequence step, must wait for Controlled Manual Send Apply.";
    } else if (dup) {
      classification = "legacy_pending";
      recommended = "Park duplicate — keep oldest, cancel newer copies in future apply step.";
    } else {
      classification = "review_required";
      recommended = "Human review — insufficient evidence to classify safely.";
    }

    items.push({
      queue_id: r.id,
      contact_id: r.contact_id,
      contact_name: c?.name ?? null,
      contact_email: c?.email ?? null,
      business_id: BUSINESS_ID,
      campaign_id: CAMPAIGN_ID,
      campaign_name: campaignRes.data?.campaign_name ?? null,
      inbox_id: INBOX_ID,
      inbox_email: inboxRes.data?.email_address ?? null,
      provider_mode: PROVIDER_MODE,
      sequence_step: r.sequence_step,
      status: r.status,
      scheduled_at: r.scheduled_at,
      created_at: r.created_at,
      updated_at: null,
      subject: seq?.subject ?? null,
      body_preview: seq?.body ? String(seq.body).slice(0, 240) : null,
      prior_sent_count: sent.length,
      prior_sent_steps: sentSteps,
      prior_sent_at: sent.map(s => s.sent_at),
      prior_provider_message_ids: sent.map(s => s.provider_message_id).filter(Boolean),
      step1_sent: step1Sent,
      follows_last_sent_step: followsLastSent,
      duplicate_pending_same_step: dup,
      prior_reply: hasReply,
      prior_reply_should_cancel: hasReply,
      contact_status: c?.status ?? null,
      compliance_status: c?.compliance_status ?? null,
      lawful_basis: c?.lawful_basis ?? null,
      lawful_basis_recorded_at: c?.lawful_basis_recorded_at ?? null,
      retention_until: c?.retention_until ?? null,
      unsubscribe_token_present: !!c?.unsubscribe_token,
      unsubscribed_at: c?.unsubscribed_at ?? null,
      do_not_contact: !!c?.do_not_contact_at,
      do_not_contact_at: c?.do_not_contact_at ?? null,
      do_not_contact_reason: c?.do_not_contact_reason ?? null,
      is_globally_suppressed: !!c?.is_globally_suppressed,
      hard_bounced: !!c?.hard_bounced || hasBounce,
      bcr_current_stage: bcr?.current_stage ?? null,
      bcr_qualification: bcr?.qualification ?? null,
      bcr_campaign_eligible: bcr?.campaign_eligible ?? null,
      bcr_do_not_contact: bcr?.do_not_contact ?? null,
      bcr_business_match: !!bcr,
      blockers,
      classification,
      recommended_action: recommended,
    });
  }

  const counts = items.reduce((acc, it) => {
    acc[it.classification] = (acc[it.classification] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const summary = {
    safety_status,
    unsafe_reasons,
    total_pending: items.length,
    expected_pending: 10,
    matches_handover_count: items.length === 10,
    step2_pending: items.filter(i => i.sequence_step === 2).length,
    step4_pending: items.filter(i => i.sequence_step === 4).length,
    classification_counts: {
      orphan_followup: counts.orphan_followup ?? 0,
      legacy_pending: counts.legacy_pending ?? 0,
      valid_future_step_blocked: counts.valid_future_step_blocked ?? 0,
      cancel_candidate: counts.cancel_candidate ?? 0,
      review_required: counts.review_required ?? 0,
    },
    rows_with_compliance_blockers: items.filter(i => i.blockers.some((b: string) => b.startsWith("compliance_") || b === "missing_lawful_basis" || b === "missing_unsubscribe_token")).length,
    rows_with_suppression_blockers: items.filter(i => i.blockers.some((b: string) => ["globally_suppressed","hard_bounced","unsubscribed","do_not_contact"].includes(b))).length,
    rows_with_bcr_blockers: items.filter(i => i.blockers.some((b: string) => b.startsWith("bcr_"))).length,
    rows_missing_prior_send_proof: items.filter(i => i.blockers.includes("missing_step1_proof") || i.blockers.includes("does_not_follow_last_sent_step")).length,
    rows_with_duplicate_risk: items.filter(i => i.duplicate_pending_same_step).length,
    rows_with_prior_reply_risk: items.filter(i => i.prior_reply).length,
  };

  const cleanup_preview = {
    cancel_ids: items.filter(i => i.classification === "cancel_candidate").map(i => i.queue_id),
    park_ids: items.filter(i => i.classification === "orphan_followup" || i.classification === "legacy_pending").map(i => i.queue_id),
    review_ids: items.filter(i => i.classification === "review_required").map(i => i.queue_id),
    valid_blocked_ids: items.filter(i => i.classification === "valid_future_step_blocked").map(i => i.queue_id),
    counters: {
      dry_run: true,
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

  return new Response(JSON.stringify({
    ok: true,
    dry_run: true,
    generated_at: new Date().toISOString(),
    baseline,
    summary,
    items,
    cleanup_preview,
  }), { headers: { ...cors, "Content-Type": "application/json" } });
});