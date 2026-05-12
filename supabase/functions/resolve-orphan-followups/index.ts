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
 * Resolve orphan follow-up queue rows.
 *
 * An "orphan follow-up" is a pending email_queue row at step > 1 whose
 * required parent step has no real SMTP send (parent is missing, or was
 * simulated, blocked, cancelled, or otherwise not delivered with
 * delivery_kind='smtp_real' + smtp_accepted_at + provider_message_id).
 *
 * Behaviour (all founder-authorised, dry_run preview by default):
 *   1. Cancel orphan pending rows with block_reason=PARENT_STEP_NOT_SENT.
 *   2. For each affected contact, if `restart_step1` is true AND the contact
 *      is safe (valid email; not bounced/suppressed/replied; campaign active;
 *      assigned to a business; no existing real Step 1 send; no existing
 *      pending Step 1 row), enqueue a fresh Step 1 row scheduled for now().
 *
 * Never sends. Never bypasses suppression/bounce/reply guardrails.
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
  const { data: userData } = await userClient.auth.getUser(authHeader.replace("Bearer ", ""));
  if (!userData?.user) return json({ error: "Unauthorized" }, 401);
  const userId = userData.user.id;
  const userEmail = userData.user.email ?? userId;

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  const { data: roleRow } = await admin
    .from("user_roles").select("role")
    .eq("user_id", userId).eq("role", "founder").maybeSingle();
  if (!roleRow) return json({ error: "Founder role required" }, 403);

  type Body = { dry_run?: boolean; restart_step1?: boolean; campaign_id?: string };
  let body: Body = {};
  try { body = await req.json(); } catch { /* allow empty */ }
  const dryRun = body.dry_run !== false; // default true (preview)
  const restartStep1 = !!body.restart_step1;

  // 1. Find all pending follow-up rows (step > 1)
  let q = admin.from("email_queue")
    .select("id, contact_id, campaign_id, sequence_step, business_name")
    .eq("status", "pending")
    .gt("sequence_step", 1);
  if (body.campaign_id) q = q.eq("campaign_id", body.campaign_id);
  const { data: followUps, error: fErr } = await q.limit(2000);
  if (fErr) return json({ error: fErr.message }, 500);

  // 2. For each, check parent integrity
  const orphans: Array<{ id: string; contact_id: string; campaign_id: string; sequence_step: number; business_name: string; reason: string }> = [];
  for (const r of followUps ?? []) {
    const { data: parent } = await admin.from("email_queue")
      .select("status,delivery_kind,smtp_accepted_at,provider_message_id")
      .eq("contact_id", r.contact_id)
      .eq("campaign_id", r.campaign_id)
      .eq("sequence_step", r.sequence_step - 1)
      .maybeSingle();
    const ok = !!parent
      && parent.status === "sent"
      && parent.delivery_kind === "smtp_real"
      && !!parent.smtp_accepted_at
      && !!parent.provider_message_id;
    if (!ok) {
      orphans.push({
        id: r.id, contact_id: r.contact_id, campaign_id: r.campaign_id,
        sequence_step: r.sequence_step, business_name: r.business_name,
        reason: parent ? `parent ${parent.status}/${parent.delivery_kind ?? "-"}` : "no parent row",
      });
    }
  }

  // 3. Step 1 restart candidates (per unique contact in orphans)
  const uniqueContactIds = Array.from(new Set(orphans.map((o) => o.contact_id)));
  const restartPlan: Array<{ contact_id: string; campaign_id: string; reason?: string; safe: boolean; details: string }> = [];

  for (const contactId of uniqueContactIds) {
    const orphanRow = orphans.find((o) => o.contact_id === contactId)!;
    const campaignId = orphanRow.campaign_id;

    const { data: contact } = await admin.from("contacts")
      .select("id, email, status, assigned_business, bounced, unsubscribed")
      .eq("id", contactId).maybeSingle();
    if (!contact) {
      restartPlan.push({ contact_id: contactId, campaign_id: campaignId, safe: false, details: "contact not found" });
      continue;
    }
    const validEmail = !!contact.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email);
    const replied = (contact.status ?? "").toString().toUpperCase() === "REPLIED";
    const { data: suppressed } = await admin.from("suppressed_emails")
      .select("email").eq("email", contact.email).maybeSingle().then(
        (r) => r, () => ({ data: null }),
      );

    const { data: campaign } = await admin.from("outreach_campaigns")
      .select("id,status").eq("id", campaignId).maybeSingle();
    const campaignActive = (campaign?.status ?? "").toString().toLowerCase() === "active";

    // Existing Step 1: any sent or pending row?
    const { data: existingStep1 } = await admin.from("email_queue")
      .select("id,status,delivery_kind")
      .eq("contact_id", contactId).eq("campaign_id", campaignId).eq("sequence_step", 1)
      .maybeSingle();
    const hasRealStep1 = !!existingStep1 && existingStep1.status === "sent" && existingStep1.delivery_kind === "smtp_real";
    const hasPendingStep1 = !!existingStep1 && existingStep1.status === "pending";

    const safety: string[] = [];
    if (!validEmail) safety.push("invalid_email");
    if (contact.bounced) safety.push("bounced");
    if (contact.unsubscribed) safety.push("unsubscribed");
    if (suppressed) safety.push("suppressed");
    if (replied) safety.push("replied");
    if (!contact.assigned_business) safety.push("no_business");
    if (!campaignActive) safety.push("campaign_inactive");
    if (hasRealStep1) safety.push("step1_already_real_sent");
    if (hasPendingStep1) safety.push("step1_already_pending");

    restartPlan.push({
      contact_id: contactId, campaign_id: campaignId,
      safe: safety.length === 0,
      details: safety.length === 0 ? "safe to restart at Step 1" : safety.join(","),
    });
  }

  let cancelledCount = 0;
  let restartCreated = 0;

  if (!dryRun && orphans.length > 0) {
    const ids = orphans.map((o) => o.id);
    const { count: cancCount, error: cErr } = await admin.from("email_queue")
      .update({
        status: "cancelled",
        block_reason: "PARENT_STEP_NOT_SENT",
        send_error: "Cancelled: prior sequence step was never delivered via real SMTP.",
        last_attempt_at: new Date().toISOString(),
      }, { count: "exact" })
      .in("id", ids).eq("status", "pending");
    if (cErr) return json({ error: `cancel failed: ${cErr.message}` }, 500);
    cancelledCount = cancCount ?? 0;

    if (restartStep1) {
      const safeRestarts = restartPlan.filter((p) => p.safe);
      if (safeRestarts.length > 0) {
        // Find inbox + business_name from one orphan example for each campaign
        const newRows = [];
        for (const r of safeRestarts) {
          const orphanForContact = orphans.find((o) => o.contact_id === r.contact_id && o.campaign_id === r.campaign_id);
          const { data: contact } = await admin.from("contacts")
            .select("assigned_inbox_id, assigned_business").eq("id", r.contact_id).maybeSingle();
          newRows.push({
            contact_id: r.contact_id,
            campaign_id: r.campaign_id,
            sequence_step: 1,
            status: "pending" as const,
            scheduled_at: new Date().toISOString(),
            priority: 5,
            inbox_id: contact?.assigned_inbox_id ?? null,
            business_name: orphanForContact?.business_name ?? contact?.assigned_business ?? "",
          });
        }
        const { count: insCount, error: iErr } = await admin.from("email_queue")
          .insert(newRows, { count: "exact" });
        if (iErr) return json({ error: `step1 restart insert failed: ${iErr.message}` }, 500);
        restartCreated = insCount ?? 0;
      }
    }

    await admin.from("system_events").insert({
      event_type: "orphan_followups_resolved",
      severity: "low",
      business_name: "",
      message: `Founder ${userEmail} cancelled ${cancelledCount} orphan follow-up(s); ${restartCreated} Step 1 restart(s) created.`,
      metadata: {
        actor: userEmail,
        cancelled: cancelledCount,
        restart_step1: restartCreated,
        restart_requested: restartStep1,
        campaign_id: body.campaign_id ?? null,
      },
      resolved: true,
      resolution_note: "Orphan follow-up cleanup.",
    });
    await admin.from("activity_log").insert({
      event_type: "orphan_followups_resolved",
      description: `Cancelled ${cancelledCount} orphan follow-up(s); ${restartCreated} Step 1 restart(s) created.`,
      entity_type: "email_queue",
    });
  }

  const safeRestartCount = restartPlan.filter((p) => p.safe).length;

  return json({
    ok: true,
    dry_run: dryRun,
    message: dryRun
      ? `Preview: ${orphans.length} orphan follow-up(s) found across ${uniqueContactIds.length} contact(s); ${safeRestartCount} safe to restart at Step 1.`
      : `${cancelledCount} orphan follow-up(s) cancelled; ${restartCreated} Step 1 restart(s) created.`,
    summary: {
      orphans_found: orphans.length,
      contacts_affected: uniqueContactIds.length,
      safe_to_restart: safeRestartCount,
      cancelled: cancelledCount,
      restart_created: restartCreated,
    },
    orphans_sample: orphans.slice(0, 25),
    restart_plan_sample: restartPlan.slice(0, 25),
  });
});