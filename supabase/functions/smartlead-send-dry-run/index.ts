import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { evaluateOutboundSendability } from "../_shared/outboundSendability.ts";
import { allocateMailboxes } from "../_shared/mailboxAllocator.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

/**
 * Smartlead Send Dry-Run — NO PROVIDER POST.
 *
 * Evaluates a single contact against a mapped campaign, runs the sendability
 * gate, allocates a mailbox, builds the exact provider payload that WOULD be
 * sent, and records a dry-run audit row. Nothing reaches Smartlead.
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
  const roleSet = new Set((roles ?? []).map((r: any) => r.role));
  if (!roleSet.has("founder") && !roleSet.has("admin")) {
    return json({ ok: false, error: "forbidden" }, 403);
  }

  let body: any = {};
  try { body = await req.json(); } catch { /* */ }

  const campaign_mapping_id: string | null = body.campaign_mapping_id ?? null;
  const contact_id: string | null = body.contact_id ?? null;
  const estate_key: string | null = body.estate_key ?? "education";

  // Fail-closed structured result. Any unresolved link in the chain returns
  // BLOCKED (never a send) and performs no writes at all.
  const blocked = (stage: string, reason: string, extra: Record<string, unknown> = {}) =>
    json({
      ok: true,
      dry_run: true,
      decision: "BLOCKED",
      would_send: false,
      blocked_stage: stage,
      blockers: [reason],
      provider_payload: null,
      notes: "No provider call made. No database mutation performed. Fail-closed dry run.",
      ...extra,
    });

  if (!campaign_mapping_id || !contact_id) {
    return blocked("input", "campaign_mapping_id_and_contact_id_required");
  }

  const { data: mapping } = await admin
    .from("outbound_provider_campaign_mappings")
    .select("id, business_id, business_name, liftor_campaign_id, provider_campaign_id, provider_campaign_name")
    .eq("id", campaign_mapping_id)
    .eq("provider_type", "smartlead")
    .eq("mapping_status", "mapped")
    .eq("is_active", true)
    .maybeSingle();

  if (!mapping) {
    return blocked("campaign_mapping", "campaign_mapping_not_found_or_inactive");
  }

  const { data: contact } = await admin
    .from("contacts")
    .select("id, email, first_name, last_name, name, company, linkedin_url, sendable_status, email_verified_status, status, compliance_status, is_globally_suppressed, hard_bounced, unsubscribed_at, do_not_contact_at, conversation_active")
    .eq("id", contact_id)
    .maybeSingle();

  if (!contact) {
    return blocked("contact", "contact_not_found_or_not_resolvable");
  }


  const sendability = evaluateOutboundSendability(contact as any);

  // Allocate mailbox only if sendable; still report allocation attempt if not.
  const { data: mailboxes } = await admin
    .from("inboxes")
    .select("id, email_address, business_name, estate_key, allowed_business_names, segregation_locked, active, excluded_from_allocation, provider_ready, smtp_ready, imap_ready, warmup_ready, warmup_status, paused_reason, provider_blocked_until, health_status, consecutive_failures, bounce_rate_per_inbox, daily_send_limit, ramp_daily_cap, emails_sent_today, current_send_count")
    .eq("business_name", mapping.business_name)
    .eq("active", true);

  const allocation = allocateMailboxes(
    (mailboxes ?? []).map((m: any) => ({ ...m, id: m.id, email_address: m.email_address })),
    { business_name: mapping.business_name, estate_key, requested_count: 1 },
  );

  const providerPayload = sendability.sendable && allocation.ok
    ? {
        email: contact.email,
        first_name: contact.first_name ?? contact.name?.split(" ")?.[0] ?? "",
        last_name: contact.last_name ?? contact.name?.split(" ")?.slice(1).join(" ") ?? "",
        company_name: contact.company ?? "",
        custom_fields: {
          liftor_contact_id: contact.id,
          liftor_campaign_id: mapping.liftor_campaign_id,
          business_id: mapping.business_id,
          business_name: mapping.business_name,
        },
      }
    : null;

  const nowIso = new Date().toISOString();
  const auditRow = {
    business_id: mapping.business_id,
    liftor_campaign_id: mapping.liftor_campaign_id,
    provider_campaign_id: mapping.provider_campaign_id,
    contact_id: contact.id,
    contact_email: contact.email,
    sendable: sendability.sendable,
    blockers: sendability.blockers,
    allocated_mailbox_id: allocation.primary_inbox_id,
    allocated_mailbox_email: allocation.primary_email,
    provider_payload: providerPayload,
    would_send: sendability.sendable && allocation.ok,
    dry_run_at: nowIso,
  };

  await admin.from("smartlead_send_dry_run_audit").insert(auditRow);

  return json({
    ok: true,
    dry_run: true,
    decision: auditRow.would_send ? "WOULD_SEND" : "BLOCKED",
    would_send: auditRow.would_send,
    sendability,
    allocation: {
      ok: allocation.ok,
      decision: allocation.decision,
      decision_reason: allocation.decision_reason,
      primary_inbox_id: allocation.primary_inbox_id,
      primary_email: allocation.primary_email,
      rejected_count: allocation.rejected.length,
    },
    provider_payload: providerPayload,
    notes: "No provider call made. This was a dry-run audit only.",
  });
});
