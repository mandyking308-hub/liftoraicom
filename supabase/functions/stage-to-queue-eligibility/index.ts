import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

/**
 * Stage-to-Queue Eligibility Gate.
 *
 * Promotes already-promoted contacts from BCR.current_stage='ready_to_stage' /
 * qualification='needs_review' / campaign_eligible=false → qualified, eligible,
 * staged, with assigned inbox + active campaign.
 *
 * NEVER:
 *  - reveals Apollo emails
 *  - spends Apollo credits
 *  - creates contacts
 *  - creates BCRs
 *  - inserts queue rows
 *  - sends emails
 *
 * Body:
 *  { dry_run?: boolean (default true),
 *    business_name?: string  (default "Neon Candy"),
 *    inbox_id?: string,
 *    campaign_id?: string,
 *    contact_ids?: string[]  (optional whitelist) }
 */
const NEON_INBOX = "0a7096d1-8160-4243-97bc-c1615b6673b3";
const NEON_CAMPAIGN = "d621d6bc-76af-48a2-a8f2-c7505dbb9654";
const DEFAULT_BUSINESS = "Neon Candy";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: auth } }, auth: { persistSession: false },
  });
  const { data: u } = await userClient.auth.getUser(auth.replace("Bearer ", ""));
  if (!u?.user) return json({ error: "Unauthorized" }, 401);
  const userEmail = u.user.email ?? u.user.id;

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  const { data: role } = await admin.from("user_roles")
    .select("role").eq("user_id", u.user.id).eq("role", "founder").maybeSingle();
  if (!role) return json({ error: "Founder role required" }, 403);

  let body: {
    dry_run?: boolean; business_name?: string;
    inbox_id?: string; campaign_id?: string; contact_ids?: string[];
  } = {};
  try { body = await req.json(); } catch { /* allow empty */ }
  const dryRun = body.dry_run !== false;
  const businessName = body.business_name ?? DEFAULT_BUSINESS;
  const inboxId = body.inbox_id ?? NEON_INBOX;
  const campaignId = body.campaign_id ?? NEON_CAMPAIGN;

  // 1) Confirm inbox + campaign are valid + active for this business.
  const { data: inboxRow, error: inboxErr } = await admin.from("inboxes")
    .select("id,email_address,business_name,active,provider_type,live_readiness")
    .eq("id", inboxId).maybeSingle();
  if (inboxErr || !inboxRow) return json({ error: `inbox not found: ${inboxId}` }, 400);
  if (!inboxRow.active) return json({ error: `inbox inactive: ${inboxRow.email_address}` }, 400);
  if (inboxRow.business_name !== businessName) {
    return json({ error: `inbox business mismatch: ${inboxRow.business_name} vs ${businessName}` }, 400);
  }

  const { data: campaignRow, error: campErr } = await admin.from("outreach_campaigns")
    .select("id,campaign_name,business_name,status").eq("id", campaignId).maybeSingle();
  if (campErr || !campaignRow) return json({ error: `campaign not found: ${campaignId}` }, 400);
  if (campaignRow.business_name !== businessName) {
    return json({ error: `campaign business mismatch: ${campaignRow.business_name} vs ${businessName}` }, 400);
  }
  if (campaignRow.status !== "active") {
    return json({ error: `campaign not active: status=${campaignRow.status}` }, 400);
  }

  // 2) Pull all candidate contacts assigned to this business.
  let cq = admin.from("contacts")
    .select("id,email,name,first_name,last_name,company,status,assigned_business,assigned_inbox_id,active_campaign_id,sendable_status,is_globally_suppressed,hard_bounced,conversation_active,last_contacted_at")
    .eq("assigned_business", businessName);
  if (body.contact_ids?.length) cq = cq.in("id", body.contact_ids);
  const { data: contacts, error: cErr } = await cq;
  if (cErr) return json({ error: cErr.message }, 500);

  const contactIds = (contacts ?? []).map((c) => c.id);
  if (!contactIds.length) {
    return json({ ok: true, dry_run: dryRun, summary: emptySummary(), plan: [] });
  }

  // 3) BCRs for this business
  const { data: bcrs } = await admin.from("business_contact_relationships")
    .select("id,contact_id,business_name,business_id,qualification,current_stage,campaign_eligible,do_not_contact,notes,relevance_category")
    .in("contact_id", contactIds).eq("business_name", businessName);
  const bcrByContact = new Map<string, any>((bcrs ?? []).map((b) => [b.contact_id, b]));

  // 4) Apollo lifecycle status (Sierra etc.)
  const { data: apolloLeads } = await admin.from("apollo_leads")
    .select("id,contact_id").in("contact_id", contactIds);
  const apolloByContact = new Map<string, string>((apolloLeads ?? []).map((a) => [a.contact_id as string, a.id]));
  const leadIds = (apolloLeads ?? []).map((a) => a.id).filter(Boolean) as string[];
  const { data: rawLeads } = leadIds.length
    ? await admin.from("apollo_raw_leads")
        .select("apollo_lead_id,quality_status").in("apollo_lead_id", leadIds)
    : { data: [] as any[] };
  const rawByLead = new Map<string, string>((rawLeads ?? []).map((r) => [r.apollo_lead_id as string, r.quality_status as string]));

  // 5) Existing queue rows (any status) for these contacts in this campaign
  const { data: queueRows } = await admin.from("email_queue")
    .select("contact_id,status,campaign_id").in("contact_id", contactIds);
  const queueByContact = new Map<string, any[]>();
  for (const q of queueRows ?? []) {
    const list = queueByContact.get(q.contact_id) ?? [];
    list.push(q); queueByContact.set(q.contact_id, list);
  }

  type Eligibility =
    | "eligible_to_stage"
    | "already_staged"
    | "excluded_no_bcr"
    | "excluded_already_contacted_or_historical_sequence"
    | "excluded_pending_queue_row"
    | "excluded_rejected_wrong_person"
    | "excluded_suppressed_or_bounced"
    | "excluded_do_not_contact"
    | "excluded_active_conversation"
    | "excluded_apollo_lifecycle_not_promoted";

  type PlanRow = {
    contact_id: string;
    email: string | null;
    name: string | null;
    company: string | null;
    bcr_id: string | null;
    business_id: string | null;
    current_stage: string | null;
    qualification: string | null;
    campaign_eligible: boolean | null;
    eligibility: Eligibility;
    blocker_reason: string | null;
    apollo_raw_status: string | null;
    will_qualify_bcr: boolean;
    will_assign_inbox: boolean;
    will_assign_campaign: boolean;
    queue_action: "none";
    send_action: "none";
  };

  const plan: PlanRow[] = [];

  for (const c of contacts ?? []) {
    const bcr = bcrByContact.get(c.id);
    const apolloLeadId = apolloByContact.get(c.id);
    const apolloRawStatus = apolloLeadId ? rawByLead.get(apolloLeadId) ?? null : null;
    const queue = queueByContact.get(c.id) ?? [];
    const hasHistoricalSend = queue.some((q) => q.status === "sent" || q.status === "cancelled");
    const hasPending = queue.some((q) => !["sent", "cancelled", "failed", "blocked"].includes(q.status));

    const base: PlanRow = {
      contact_id: c.id,
      email: c.email ?? null,
      name: c.name ?? [c.first_name, c.last_name].filter(Boolean).join(" ") || null,
      company: c.company ?? null,
      bcr_id: bcr?.id ?? null,
      business_id: bcr?.business_id ?? null,
      current_stage: bcr?.current_stage ?? null,
      qualification: bcr?.qualification ?? null,
      campaign_eligible: bcr?.campaign_eligible ?? null,
      eligibility: "eligible_to_stage",
      blocker_reason: null,
      apollo_raw_status: apolloRawStatus,
      will_qualify_bcr: false,
      will_assign_inbox: false,
      will_assign_campaign: false,
      queue_action: "none",
      send_action: "none",
    };

    // Exclusion order matters
    if (!bcr) { plan.push({ ...base, eligibility: "excluded_no_bcr", blocker_reason: "no BCR for this business" }); continue; }
    if (apolloRawStatus === "rejected" || apolloRawStatus === "needs_founder_review") {
      plan.push({ ...base, eligibility: "excluded_rejected_wrong_person", blocker_reason: `apollo_raw quality_status=${apolloRawStatus}` });
      continue;
    }
    if (c.is_globally_suppressed || c.hard_bounced) {
      plan.push({ ...base, eligibility: "excluded_suppressed_or_bounced", blocker_reason: c.is_globally_suppressed ? "globally_suppressed" : "hard_bounced" });
      continue;
    }
    if (c.status === "DO_NOT_CONTACT" || bcr.do_not_contact) {
      plan.push({ ...base, eligibility: "excluded_do_not_contact", blocker_reason: c.status === "DO_NOT_CONTACT" ? "contact.status=DO_NOT_CONTACT" : "bcr.do_not_contact=true" });
      continue;
    }
    if (c.conversation_active) {
      plan.push({ ...base, eligibility: "excluded_active_conversation", blocker_reason: "conversation_active=true" });
      continue;
    }
    if (hasHistoricalSend) {
      plan.push({ ...base, eligibility: "excluded_already_contacted_or_historical_sequence", blocker_reason: "prior sent/cancelled email_queue rows for this contact" });
      continue;
    }
    if (hasPending) {
      plan.push({ ...base, eligibility: "excluded_pending_queue_row", blocker_reason: "pending email_queue row already exists" });
      continue;
    }
    // Already advanced past ready_to_stage?
    if (bcr.current_stage !== "ready_to_stage" && bcr.qualification === "qualified" && bcr.campaign_eligible) {
      plan.push({ ...base, eligibility: "already_staged", blocker_reason: null });
      continue;
    }
    // Apollo lifecycle gate (must be promoted-to-contact, not anything earlier)
    if (apolloRawStatus && apolloRawStatus !== "promoted_to_contact" && apolloRawStatus !== "already_contacted") {
      plan.push({ ...base, eligibility: "excluded_apollo_lifecycle_not_promoted", blocker_reason: `apollo_raw quality_status=${apolloRawStatus}` });
      continue;
    }

    base.will_qualify_bcr = !(bcr.qualification === "qualified" && bcr.campaign_eligible === true && bcr.current_stage === "staged");
    base.will_assign_inbox = c.assigned_inbox_id !== inboxId;
    base.will_assign_campaign = c.active_campaign_id !== campaignId;
    plan.push(base);
  }

  const summary = {
    candidates_checked: plan.length,
    eligible_to_stage: plan.filter((p) => p.eligibility === "eligible_to_stage").length,
    already_staged: plan.filter((p) => p.eligibility === "already_staged").length,
    excluded_already_contacted: plan.filter((p) => p.eligibility === "excluded_already_contacted_or_historical_sequence").length,
    excluded_pending_queue_row: plan.filter((p) => p.eligibility === "excluded_pending_queue_row").length,
    excluded_rejected: plan.filter((p) => p.eligibility === "excluded_rejected_wrong_person").length,
    excluded_suppressed_or_bounced: plan.filter((p) => p.eligibility === "excluded_suppressed_or_bounced").length,
    excluded_do_not_contact: plan.filter((p) => p.eligibility === "excluded_do_not_contact").length,
    excluded_active_conversation: plan.filter((p) => p.eligibility === "excluded_active_conversation").length,
    excluded_no_bcr: plan.filter((p) => p.eligibility === "excluded_no_bcr").length,
    excluded_apollo_lifecycle_not_promoted: plan.filter((p) => p.eligibility === "excluded_apollo_lifecycle_not_promoted").length,
    bcrs_to_qualify: plan.filter((p) => p.eligibility === "eligible_to_stage" && p.will_qualify_bcr).length,
    contacts_to_assign_inbox: plan.filter((p) => p.eligibility === "eligible_to_stage" && p.will_assign_inbox).length,
    contacts_to_assign_campaign: plan.filter((p) => p.eligibility === "eligible_to_stage" && p.will_assign_campaign).length,
    queue_rows_to_create: 0,
    sends_to_create: 0,
    inbox_id: inboxId,
    inbox_email: inboxRow.email_address,
    campaign_id: campaignId,
    campaign_name: campaignRow.campaign_name,
    business_name: businessName,
  };

  let appliedBcrIds: string[] = [];
  let appliedContactIds: string[] = [];
  let alreadyStagedCount = summary.already_staged;
  let qualifiedNow = 0;
  let inboxAssignedNow = 0;
  let campaignAssignedNow = 0;

  if (!dryRun) {
    const eligible = plan.filter((p) => p.eligibility === "eligible_to_stage");
    const approvedAt = new Date().toISOString();
    for (const row of eligible) {
      // Update BCR (idempotent: skip writes when already qualified+eligible+staged)
      if (row.will_qualify_bcr && row.bcr_id) {
        const auditNote =
          `\n[stage_to_queue_eligibility_gate ${approvedAt}] founder_approved_queue_eligibility=true ` +
          `campaign_id=${campaignId} inbox_id=${inboxId} actor=${userEmail} ` +
          `no_queue_row_created=true no_email_sent=true`;
        const { error: bErr } = await admin.from("business_contact_relationships").update({
          qualification: "qualified",
          campaign_eligible: true,
          current_stage: "staged",
          notes: ((bcrs ?? []).find((b) => b.id === row.bcr_id)?.notes ?? "") + auditNote,
        }).eq("id", row.bcr_id);
        if (!bErr) { qualifiedNow++; appliedBcrIds.push(row.bcr_id); }
      }
      // Update contact (idempotent: only patch the fields that change)
      const patch: Record<string, any> = {};
      if (row.will_assign_inbox) patch.assigned_inbox_id = inboxId;
      if (row.will_assign_campaign) patch.active_campaign_id = campaignId;
      if (Object.keys(patch).length > 0) {
        const { error: ucErr } = await admin.from("contacts").update(patch).eq("id", row.contact_id);
        if (!ucErr) {
          if (row.will_assign_inbox) inboxAssignedNow++;
          if (row.will_assign_campaign) campaignAssignedNow++;
          appliedContactIds.push(row.contact_id);
        }
      }
    }

    await admin.from("system_events").insert({
      event_type: "stage_to_queue_eligibility_approved",
      severity: "low",
      business_name: businessName,
      message: `Founder ${userEmail} approved ${eligible.length} contact(s) for queue eligibility (no queue rows, no sends).`,
      metadata: {
        actor: userEmail,
        business_name: businessName,
        campaign_id: campaignId,
        inbox_id: inboxId,
        contacts_count: eligible.length,
        contact_ids: eligible.map((e) => e.contact_id),
        bcr_ids: eligible.map((e) => e.bcr_id),
        already_staged_count: alreadyStagedCount,
        bcrs_qualified_now: qualifiedNow,
        contacts_inbox_assigned_now: inboxAssignedNow,
        contacts_campaign_assigned_now: campaignAssignedNow,
        no_queue_rows_created: true,
        no_emails_sent: true,
      },
      resolved: true,
    });
  }

  return json({
    ok: true,
    dry_run: dryRun,
    summary: {
      ...summary,
      applied: !dryRun,
      bcrs_qualified_now: qualifiedNow,
      contacts_inbox_assigned_now: inboxAssignedNow,
      contacts_campaign_assigned_now: campaignAssignedNow,
      already_staged_count: alreadyStagedCount,
    },
    plan,
  });
});

function emptySummary() {
  return {
    candidates_checked: 0, eligible_to_stage: 0, already_staged: 0,
    excluded_already_contacted: 0, excluded_pending_queue_row: 0,
    excluded_rejected: 0, excluded_suppressed_or_bounced: 0,
    excluded_do_not_contact: 0, excluded_active_conversation: 0,
    excluded_no_bcr: 0, excluded_apollo_lifecycle_not_promoted: 0,
    bcrs_to_qualify: 0, contacts_to_assign_inbox: 0, contacts_to_assign_campaign: 0,
    queue_rows_to_create: 0, sends_to_create: 0,
  };
}