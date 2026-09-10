import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { evaluateOutboundSendability } from "../_shared/outboundSendability.ts";
import { allocateMailboxes, type MailboxRecord } from "../_shared/mailboxAllocator.ts";
import { LEGACY_NEON_CANDY_ESTATE } from "../_shared/mailboxRegistrationParser.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), {
    status: s,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

/**
 * End-to-end DRY RUN: contact -> mapped campaign -> provider lead payload ->
 * allocated mailbox -> readiness verdict.
 *
 * There is deliberately NO fetch() in this file. It cannot reach Smartlead, so
 * it cannot send, create or mutate anything externally under any input.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return json({ ok: false, error: "auth_missing" }, 401);

  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false },
  });
  const { data: u, error: ue } = await userClient.auth.getUser(auth.replace("Bearer ", ""));
  if (ue || !u?.user) return json({ ok: false, error: "auth_invalid" }, 401);

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", u.user.id);
  const roleSet = new Set((roles ?? []).map((r: { role: string }) => r.role));
  if (!roleSet.has("founder") && !roleSet.has("admin")) {
    return json({ ok: false, error: "forbidden" }, 403);
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch { /* optional */ }

  const contactId = String(body.contact_id ?? "").trim() || null;
  const campaignMappingId = String(body.campaign_mapping_id ?? "").trim() || null;
  const estateKey = String(body.estate_key ?? "").trim() || null;
  const businessName = String(body.business_name ?? "").trim() || null;

  const blockers: string[] = [];
  const stages: Record<string, unknown> = {};

  // ---- Stage 1: campaign mapping ----
  let mq = admin
    .from("outbound_provider_campaign_mappings")
    .select("id, business_id, liftor_campaign_id, provider_campaign_id, provider_campaign_name, mapping_status, is_active")
    .eq("provider_type", "smartlead")
    .eq("mapping_status", "mapped")
    .eq("is_active", true);
  if (campaignMappingId) mq = mq.eq("id", campaignMappingId);
  const { data: mappings } = await mq.limit(2);
  const mapping = (mappings ?? [])[0] ?? null;

  if (!mapping) blockers.push("no_active_campaign_mapping");
  if ((mappings ?? []).length > 1 && !campaignMappingId) blockers.push("ambiguous_campaign_mapping");
  stages.campaign_mapping = mapping
    ? {
        ok: true,
        campaign_mapping_id: mapping.id,
        provider_campaign_id: mapping.provider_campaign_id,
        liftor_campaign_id: mapping.liftor_campaign_id,
      }
    : { ok: false, reason: "no_active_campaign_mapping" };

  // ---- Stage 2: test contact + sendability ----
  let contact: Record<string, unknown> | null = null;
  if (contactId) {
    const { data } = await admin
      .from("contacts")
      .select(
        "id, email, first_name, last_name, name, company, linkedin_url, assigned_business, active_campaign_id, email_verified_status, sendable_status, reveal_status, status, compliance_status, is_globally_suppressed, global_suppression_at, hard_bounced, unsubscribed_at, do_not_contact_at, conversation_active",
      )
      .eq("id", contactId)
      .maybeSingle();
    contact = data ?? null;
  }
  if (!contact) blockers.push("test_contact_not_found");

  const sendability = contact
    ? evaluateOutboundSendability(contact as Parameters<typeof evaluateOutboundSendability>[0])
    : null;
  if (sendability && !sendability.sendable) blockers.push("contact_not_sendable");
  stages.sendability = sendability
    ? {
        ok: sendability.sendable,
        blockers: sendability.blockers,
        hard_blockers: sendability.hard_blockers,
        snapshot: sendability.snapshot,
      }
    : { ok: false, reason: "no_contact" };

  // ---- Stage 3: provider lead payload (built, never sent) ----
  const leadPayload = contact
    ? {
        email: contact.email,
        first_name: contact.first_name ?? String(contact.name ?? "").split(" ")[0] ?? "",
        last_name: contact.last_name ?? String(contact.name ?? "").split(" ").slice(1).join(" "),
        company_name: contact.company ?? "",
        linkedin_profile: contact.linkedin_url ?? null,
        custom_fields: {
          liftor_contact_id: contact.id,
          liftor_campaign_id: mapping?.liftor_campaign_id ?? null,
          business_name: businessName ?? contact.assigned_business ?? null,
        },
      }
    : null;
  stages.lead_payload = { ok: !!leadPayload, payload: leadPayload };

  // ---- Stage 4: mailbox allocation ----
  let inboxQ = admin
    .from("inboxes")
    .select(
      "id, email_address, business_name, estate_key, allowed_business_names, segregation_locked, active, excluded_from_allocation, provider_ready, smtp_ready, imap_ready, warmup_ready, warmup_status, paused_reason, provider_blocked_until, consecutive_failures, bounce_rate_per_inbox, daily_send_limit, ramp_daily_cap, emails_sent_today, current_send_count",
    )
    .neq("estate_key", LEGACY_NEON_CANDY_ESTATE);
  if (estateKey) inboxQ = inboxQ.eq("estate_key", estateKey);
  const { data: inboxes } = await inboxQ;

  const allocation = allocateMailboxes((inboxes ?? []) as MailboxRecord[], {
    business_name: businessName ?? String(contact?.assigned_business ?? ""),
    estate_key: estateKey,
    requested_count: 1,
  });
  if (!allocation.ok) blockers.push(allocation.decision);
  stages.mailbox_allocation = {
    ok: allocation.ok,
    decision: allocation.decision,
    decision_reason: allocation.decision_reason,
    selected_email: allocation.primary_email,
    considered: allocation.considered_count,
    eligible: allocation.eligible.length,
    rejected: allocation.rejected,
  };

  // Audit every dry run so allocation decisions are reviewable later.
  await admin.from("mailbox_allocation_audit").insert({
    allocation_run_key: `dry-run-${Date.now()}`,
    business_name: businessName ?? String(contact?.assigned_business ?? ""),
    estate_key: estateKey,
    liftor_campaign_id: (mapping?.liftor_campaign_id as string) ?? null,
    liftor_contact_id: contactId,
    requested_count: 1,
    selected_inbox_id: allocation.primary_inbox_id,
    selected_email: allocation.primary_email,
    considered_count: allocation.considered_count,
    eligible_count: allocation.eligible.length,
    rejected: allocation.rejected,
    decision: allocation.decision,
    decision_reason: allocation.decision_reason,
    allocator_version: allocation.allocator_version,
    dry_run: true,
    created_by: u.user.id,
  });

  const ready = blockers.length === 0;
  return json({
    ok: true,
    dry_run: true,
    provider_calls: 0,
    emails_sent: 0,
    ready_for_first_live_test: ready,
    blockers,
    stages,
    notes:
      "Dry run only. This function contains no outbound HTTP call to Smartlead, so nothing can be sent, created or mutated externally.",
  });
});
