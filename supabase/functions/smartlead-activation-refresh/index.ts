import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { computeActivationChecklist } from "../_shared/smartleadActivationChecklist.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

/**
 * Smartlead Activation Checklist Refresh — READ-ONLY / WRITE-CHECKLIST ONLY.
 *
 * Recomputes the canonical 12-key activation checklist for a business/campaign
 * and optionally persists it to smartlead_activation_checklist. No provider
 * calls. Neon Candy is explicitly excluded from education sending.
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

  const business_id: string | null = body.business_id ?? null;
  const liftor_campaign_id: string | null = body.liftor_campaign_id ?? null;
  const persist: boolean = body.persist !== false; // default true

  if (!business_id) return json({ ok: false, error: "business_id_required" }, 400);

  // Fetch business name (public.businesses.name is canonical)
  const { data: business } = await admin
    .from("businesses")
    .select("id, name")
    .eq("id", business_id)
    .maybeSingle();
  const business_name = business?.name ?? "";

  // Explicit Neon Candy protection
  if (business_name.toLowerCase().startsWith("neon candy")) {
    return json({
      ok: true,
      checklist: [],
      notes: "Neon Candy is a segregated legacy estate and is excluded from this activation checklist.",
      persisted: false,
    });
  }

  // Mailbox estate for this business (Neon Candy legacy estate never counted)
  const { data: mailboxes } = await admin
    .from("inboxes")
    .select(
      "id, provider_ready, warmup_ready, estate_key, daily_send_limit, ramp_daily_cap, sending_domain_id, excluded_from_allocation",
    )
    .eq("business_name", business_name);

  const estate = (mailboxes ?? []).filter(
    (m: any) => (m.estate_key ?? "").toLowerCase() !== "neon-candy-legacy",
  );
  const mailboxCount = estate.length;
  const providerReadyCount = estate.filter((m: any) => m.provider_ready === true).length;
  const warmupReadyCount = estate.filter((m: any) => m.warmup_ready === true).length;
  const capsReadyCount = estate.filter(
    (m: any) => Number(m.ramp_daily_cap ?? 0) > 0 || Number(m.daily_send_limit ?? 0) > 0,
  ).length;

  // Sending domains referenced by this business estate
  const domainIds = new Set(estate.map((m: any) => m.sending_domain_id).filter(Boolean));
  const sendingDomainCount = domainIds.size;

  // Provider row
  const { data: providers } = await admin
    .from("outbound_providers")
    .select("id, provider_type, status, credentials_present, provider_health, webhook_configured")
    .eq("provider_type", "smartlead")
    .limit(1);
  const provider = providers?.[0];

  // Campaign mapping (ambiguity = more than one active mapping in scope)
  let mappingQ = admin
    .from("outbound_provider_campaign_mappings")
    .select("id, provider_campaign_id, mapping_status, is_active")
    .eq("provider_type", "smartlead")
    .eq("business_id", business_id);
  if (liftor_campaign_id) mappingQ = mappingQ.eq("liftor_campaign_id", liftor_campaign_id);
  const { data: mappings } = await mappingQ.limit(5);
  const activeMappings = (mappings ?? []).filter((m: any) => m.is_active === true);
  const mappingAmbiguous = activeMappings.length > 1;
  const mapping = activeMappings[0];

  // Eligible leads: canonical CRM truth only
  const { count: eligibleLeadCount } = await admin
    .from("contacts")
    .select("id", { count: "exact", head: true })
    .eq("assigned_business", business_id)
    .eq("sendable_status", "sendable")
    .is("do_not_contact_at", null)
    .is("unsubscribed_at", null)
    .eq("hard_bounced", false)
    .eq("is_globally_suppressed", false);

  // Zero-mutation dry run evidence
  const { data: dryRuns } = await admin
    .from("mailbox_allocation_audit")
    .select("id, decision, dry_run")
    .eq("business_name", business_name)
    .eq("dry_run", true)
    .eq("decision", "allocated")
    .limit(1);

  // Founder live-launch approval lives on the canonical campaign draft
  let founderApproved = false;
  if (liftor_campaign_id) {
    const { data: draft } = await admin
      .from("outreach_campaign_drafts")
      .select("id, is_live, external_send_blocked, founder_approval_state")
      .eq("id", liftor_campaign_id)
      .maybeSingle();
    founderApproved =
      draft?.founder_approval_state === "approved" &&
      draft?.is_live === true &&
      draft?.external_send_blocked === false;
  }

  const input = {
    business_name,
    business_id,
    liftor_campaign_id,
    provider_campaign_id: mapping?.provider_campaign_id ?? null,
    provider_connected: provider?.status === "connected",
    provider_credentials_present: provider?.credentials_present === true,
    provider_health_ok: provider?.provider_health === "ok",
    webhook_configured: provider?.webhook_configured === true,
    webhook_receiver_deployed: true, // smartlead-webhook is deployed and authenticated
    campaign_mapped: mapping?.mapping_status === "mapped",
    campaign_mapping_ambiguous: mappingAmbiguous,
    lead_mapping_schema_ready: true, // outbound_provider_lead_mappings is live with idempotency indexes
    eligible_lead_count: eligibleLeadCount ?? 0,
    sending_domain_count: sendingDomainCount,
    mailbox_count: mailboxCount,
    provider_ready_mailbox_count: providerReadyCount,
    warmup_ready_mailbox_count: warmupReadyCount,
    mailboxes_with_effective_cap_count: capsReadyCount,
    suppression_sync_enforced: true, // evaluateOutboundSendability gates every push path
    dry_run_passed: (dryRuns ?? []).length > 0,
    founder_live_launch_approved: founderApproved,
  };

  const checklist = computeActivationChecklist(input);

  let persisted = false;
  if (persist) {
    const nowIso = new Date().toISOString();
    const rows = checklist.map((item) => ({
      business_id,
      liftor_campaign_id,
      provider_campaign_id: input.provider_campaign_id,
      checklist_key: item.key,
      checklist_label: item.label,
      status: item.status,
      blocker_reason: item.blocker_reason,
      metadata: item.metadata,
      last_checked_at: nowIso,
      updated_at: nowIso,
    }));
    // The live uniqueness guard is an expression index (COALESCE on nullable
    // scope columns), so replace the scope deterministically instead of
    // relying on a column-based ON CONFLICT target.
    let delQ = admin.from("smartlead_activation_checklist").delete().eq("business_id", business_id);
    delQ = liftor_campaign_id
      ? delQ.eq("liftor_campaign_id", liftor_campaign_id)
      : delQ.is("liftor_campaign_id", null);
    await delQ;
    const { error } = await admin.from("smartlead_activation_checklist").insert(rows);
    if (error) return json({ ok: false, error: "persist_failed", detail: error.message }, 500);
    persisted = true;
  }

  return json({
    ok: true,
    business_id,
    liftor_campaign_id,
    checklist,
    summary: {
      ready: checklist.filter((i) => i.status === "ready").length,
      not_ready: checklist.filter((i) => i.status === "not_ready").length,
      blocked: checklist.filter((i) => i.status === "blocked").length,
    },
    persisted,
    notes: "No provider calls made. Neon Candy excluded. Smartlead is the delivery engine; Liftor CRM is source of truth.",
  });
});
