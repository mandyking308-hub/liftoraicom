// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const supa = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let body: any = {};
  try { body = await req.json(); } catch { /* ignore */ }
  const queueIds: string[] = Array.isArray(body?.queue_ids) ? body.queue_ids : [];
  if (queueIds.length === 0) {
    return new Response(JSON.stringify({ error: "queue_ids[] required" }), {
      status: 400, headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  // Read kill switch
  const { data: setting } = await supa.from("system_settings")
    .select("value").eq("key", "auto_send_enabled").maybeSingle();
  const autoSendEnabled = setting?.value === true || setting?.value === "true";

  const { data: rows } = await supa
    .from("email_queue")
    .select("id, status, scheduled_at, contact_id, campaign_id, inbox_id, business_name, sequence_step, tracking_token, provider_message_id, sent_at")
    .in("id", queueIds);

  const previews: any[] = [];
  for (const r of rows ?? []) {
    const [contactRes, campaignRes, inboxRes] = await Promise.all([
      supa.from("contacts").select("id, name, email, compliance_status, lawful_basis, lawful_basis_notes, unsubscribe_token, is_globally_suppressed, hard_bounced, unsubscribed_at, do_not_contact_at").eq("id", r.contact_id).maybeSingle(),
      supa.from("outreach_campaigns").select("id, campaign_name, status").eq("id", r.campaign_id).maybeSingle(),
      supa.from("inboxes").select("id, email_address, active, daily_send_limit, current_send_count, hourly_send_limit, hourly_send_count").eq("id", r.inbox_id).maybeSingle(),
    ]);
    const contact = contactRes.data as any;
    const campaign = campaignRes.data as any;
    const inbox = inboxRes.data as any;

    const blockers: string[] = [];
    if (!autoSendEnabled) blockers.push("auto_send_disabled");
    if (r.status !== "pending") blockers.push(`status_${r.status}`);
    if (!contact) blockers.push("contact_missing");
    if (contact?.is_globally_suppressed) blockers.push("globally_suppressed");
    if (contact?.hard_bounced) blockers.push("hard_bounced");
    if (contact?.unsubscribed_at) blockers.push("unsubscribed");
    if (contact?.do_not_contact_at) blockers.push("do_not_contact");
    if (contact?.compliance_status && contact.compliance_status !== "outreach_allowed") {
      blockers.push(`compliance_${contact.compliance_status}`);
    }
    if (!contact?.lawful_basis) blockers.push("missing_lawful_basis");
    if (!contact?.unsubscribe_token) blockers.push("missing_unsubscribe_token");
    if (!campaign || campaign.status !== "active") blockers.push("campaign_not_active");
    if (!inbox?.active) blockers.push("inbox_inactive");
    if (inbox && inbox.daily_send_limit != null && inbox.current_send_count >= inbox.daily_send_limit) blockers.push("daily_limit_reached");
    if (inbox && inbox.hourly_send_limit != null && inbox.hourly_send_count >= inbox.hourly_send_limit) blockers.push("hourly_limit_reached");

    previews.push({
      queue_id: r.id,
      contact: contact ? { id: contact.id, name: contact.name, email: contact.email } : null,
      compliance_status: contact?.compliance_status ?? null,
      lawful_basis: contact?.lawful_basis ?? null,
      lawful_basis_notes: contact?.lawful_basis_notes ?? null,
      unsubscribe_token_present: !!contact?.unsubscribe_token,
      tracking_token_present: !!r.tracking_token,
      campaign: campaign ? { id: campaign.id, name: campaign.campaign_name, status: campaign.status } : null,
      inbox: inbox ? { id: inbox.id, email: inbox.email_address, active: inbox.active } : null,
      provider: "ionos_proof",
      sequence_step: r.sequence_step,
      scheduled_at: r.scheduled_at,
      already_sent_at: r.sent_at,
      provider_message_id: r.provider_message_id,
      send_budget_impact: inbox ? {
        daily_used: inbox.current_send_count,
        daily_limit: inbox.daily_send_limit,
        hourly_used: inbox.hourly_send_count,
        hourly_limit: inbox.hourly_send_limit,
      } : null,
      auto_send_enabled: autoSendEnabled,
      can_send: blockers.length === 0,
      blockers,
    });
  }

  return new Response(JSON.stringify({
    ok: true,
    dry_run: true,
    auto_send_enabled: autoSendEnabled,
    previews,
    sends_to_create: 0,
    emails_sent: 0,
    provider_calls: 0,
    apollo_credits_spent: 0,
    note: "Preview only. No queue rows created or modified. No SMTP/provider calls. Apply path is intentionally not built in this turn.",
  }), { headers: { ...cors, "Content-Type": "application/json" } });
});