import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

/**
 * Queue Creation Gate.
 *
 * Inserts Step 1 email_queue rows for already-staged Neon Candy contacts.
 * NEVER:
 *  - sends emails
 *  - calls the send worker
 *  - calls Apollo / spends credits
 *  - reveals emails
 *  - creates / modifies contacts
 *  - creates / modifies BCRs
 *  - changes compliance_status
 *
 * Status: "pending" (the canonical pre-send enum). Auto-send is OFF at
 * the system level, so the worker will not pick these up.
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

  let body: { dry_run?: boolean; business_name?: string; inbox_id?: string; campaign_id?: string; contact_ids?: string[] } = {};
  try { body = await req.json(); } catch { /* allow empty */ }
  const dryRun = body.dry_run !== false;
  const businessName = body.business_name ?? DEFAULT_BUSINESS;
  const inboxId = body.inbox_id ?? NEON_INBOX;
  const campaignId = body.campaign_id ?? NEON_CAMPAIGN;

  // Confirm inbox + campaign + sequence step 1
  const { data: inboxRow } = await admin.from("inboxes")
    .select("id,email_address,business_name,active").eq("id", inboxId).maybeSingle();
  if (!inboxRow) return json({ error: `inbox not found: ${inboxId}` }, 400);
  if (!inboxRow.active) return json({ error: `inbox inactive` }, 400);
  if (inboxRow.business_name !== businessName) return json({ error: `inbox business mismatch` }, 400);

  const { data: campaignRow } = await admin.from("outreach_campaigns")
    .select("id,campaign_name,business_name,status").eq("id", campaignId).maybeSingle();
  if (!campaignRow) return json({ error: `campaign not found` }, 400);
  if (campaignRow.business_name !== businessName) return json({ error: `campaign business mismatch` }, 400);
  if (campaignRow.status !== "active") return json({ error: `campaign not active` }, 400);

  const { data: step1 } = await admin.from("outreach_sequences")
    .select("id,step_number").eq("campaign_id", campaignId).eq("step_number", 1).maybeSingle();
  if (!step1) return json({ error: `campaign has no step 1 sequence` }, 400);

  // Resolve canonical business id (tolerant)
  const { data: bizRow } = await admin.from("businesses")
    .select("id,name").ilike("name", businessName).limit(1).maybeSingle();
  const resolvedBusinessId = bizRow?.id ?? null;

  // Candidate contacts: must already be fully staged + compliance-approved.
  let cq = admin.from("contacts")
    .select("id,email,name,first_name,last_name,company,assigned_business,assigned_inbox_id,active_campaign_id,status,sendable_status,compliance_status,is_globally_suppressed,hard_bounced,conversation_active,unsubscribed_at,apollo_person_id,apollo_enrichment_status,source")
    .eq("assigned_business", businessName)
    .eq("source", "autopilot_promotion")
    .eq("status", "NEW")
    .eq("sendable_status", "sendable")
    .eq("compliance_status", "outreach_allowed")
    .eq("is_globally_suppressed", false)
    .eq("hard_bounced", false)
    .eq("conversation_active", false)
    .is("unsubscribed_at", null)
    .eq("apollo_enrichment_status", "succeeded")
    .not("apollo_person_id", "is", null)
    .not("assigned_inbox_id", "is", null)
    .not("active_campaign_id", "is", null);
  if (body.contact_ids?.length) cq = cq.in("id", body.contact_ids);
  const { data: contacts, error: cErr } = await cq;
  if (cErr) return json({ error: cErr.message }, 500);
  const contactIds = (contacts ?? []).map((c) => c.id);
  if (!contactIds.length) {
    return json({ ok: true, dry_run: dryRun, summary: emptySummary(campaignId, inboxRow.email_address, businessName, campaignRow.campaign_name), plan: [] });
  }

  // BCRs (tolerant business match, no qualification filters in lookup)
  const businessNameNorm = businessName.trim().toLowerCase();
  const { data: bcrsRaw } = await admin.from("business_contact_relationships")
    .select("id,contact_id,business_name,business_id,qualification,current_stage,campaign_eligible,do_not_contact")
    .in("contact_id", contactIds);
  const bcrs = (bcrsRaw ?? []).filter((b: any) => {
    if (resolvedBusinessId && b.business_id === resolvedBusinessId) return true;
    return (b.business_name ?? "").trim().toLowerCase() === businessNameNorm;
  });
  const bcrByContact = new Map<string, any>(bcrs.map((b: any) => [b.contact_id, b]));

  // Apollo lifecycle (Sierra=rejected guard)
  const { data: apolloLeads } = await admin.from("apollo_leads")
    .select("id,contact_id").in("contact_id", contactIds);
  const apolloByContact = new Map<string, string>((apolloLeads ?? []).map((a: any) => [a.contact_id, a.id]));
  const leadIds = (apolloLeads ?? []).map((a: any) => a.id);
  const { data: rawLeads } = leadIds.length
    ? await admin.from("apollo_raw_leads").select("apollo_lead_id,quality_status").in("apollo_lead_id", leadIds)
    : { data: [] as any[] };
  const rawByLead = new Map<string, string>((rawLeads ?? []).map((r: any) => [r.apollo_lead_id, r.quality_status]));

  // Existing queue rows for these contacts (any campaign)
  const { data: queueRows } = await admin.from("email_queue")
    .select("id,contact_id,campaign_id,sequence_step,status").in("contact_id", contactIds);
  const queueByContact = new Map<string, any[]>();
  for (const q of queueRows ?? []) {
    const list = queueByContact.get(q.contact_id) ?? [];
    list.push(q); queueByContact.set(q.contact_id, list);
  }

  type Eligibility =
    | "eligible_to_queue" | "excluded_no_bcr" | "excluded_bcr_not_staged"
    | "excluded_do_not_contact" | "excluded_apollo_lifecycle_not_promoted"
    | "excluded_existing_queue_row_step1" | "excluded_prior_queue_history";

  type PlanRow = {
    contact_id: string; email: string | null; name: string | null; company: string | null;
    bcr_id: string | null; eligibility: Eligibility; blocker_reason: string | null;
    apollo_raw_status: string | null;
    will_create_queue_row: boolean;
    sequence_step: number;
    campaign_id: string; inbox_id: string;
    queue_action: "insert_step1" | "none";
    send_action: "none";
  };

  const plan: PlanRow[] = [];
  for (const c of contacts ?? []) {
    const bcr = bcrByContact.get(c.id);
    const apolloLeadId = apolloByContact.get(c.id);
    const apolloRawStatus = apolloLeadId ? rawByLead.get(apolloLeadId) ?? null : null;
    const queue = queueByContact.get(c.id) ?? [];
    const sameCampaignAny = queue.filter((q) => q.campaign_id === campaignId);
    const sameStep1 = sameCampaignAny.filter((q) => q.sequence_step === 1);
    const priorBlockingHistory = queue.some((q) =>
      ["sent", "cancelled"].includes(q.status) ||
      (q.campaign_id === campaignId && ["pending", "delayed", "throttled", "blocked"].includes(q.status))
    );

    const base: PlanRow = {
      contact_id: c.id, email: c.email ?? null,
      name: (c.name ?? ([c.first_name, c.last_name].filter(Boolean).join(" ") || null)),
      company: c.company ?? null,
      bcr_id: bcr?.id ?? null,
      eligibility: "eligible_to_queue",
      blocker_reason: null,
      apollo_raw_status: apolloRawStatus,
      will_create_queue_row: false,
      sequence_step: 1,
      campaign_id: campaignId, inbox_id: inboxId,
      queue_action: "none", send_action: "none",
    };

    if (!bcr) { plan.push({ ...base, eligibility: "excluded_no_bcr", blocker_reason: "no BCR for this business" }); continue; }
    if (bcr.do_not_contact) { plan.push({ ...base, eligibility: "excluded_do_not_contact", blocker_reason: "bcr.do_not_contact=true" }); continue; }
    if (!(bcr.current_stage === "staged" && bcr.qualification === "qualified" && bcr.campaign_eligible === true)) {
      plan.push({ ...base, eligibility: "excluded_bcr_not_staged", blocker_reason: `stage=${bcr.current_stage} qual=${bcr.qualification} elig=${bcr.campaign_eligible}` });
      continue;
    }
    if (apolloRawStatus && apolloRawStatus !== "promoted_to_contact" && apolloRawStatus !== "already_contacted") {
      plan.push({ ...base, eligibility: "excluded_apollo_lifecycle_not_promoted", blocker_reason: `apollo_raw=${apolloRawStatus}` });
      continue;
    }
    if (sameStep1.length > 0) {
      plan.push({ ...base, eligibility: "excluded_existing_queue_row_step1", blocker_reason: `existing step1 row status=${sameStep1[0].status}` });
      continue;
    }
    if (priorBlockingHistory) {
      plan.push({ ...base, eligibility: "excluded_prior_queue_history", blocker_reason: "prior sent/cancelled or active queue row exists" });
      continue;
    }

    base.will_create_queue_row = true;
    base.queue_action = "insert_step1";
    plan.push(base);
  }

  const summary = {
    candidates_checked: plan.length,
    eligible_to_queue: plan.filter((p) => p.eligibility === "eligible_to_queue").length,
    excluded_no_bcr: plan.filter((p) => p.eligibility === "excluded_no_bcr").length,
    excluded_bcr_not_staged: plan.filter((p) => p.eligibility === "excluded_bcr_not_staged").length,
    excluded_do_not_contact: plan.filter((p) => p.eligibility === "excluded_do_not_contact").length,
    excluded_apollo_lifecycle_not_promoted: plan.filter((p) => p.eligibility === "excluded_apollo_lifecycle_not_promoted").length,
    excluded_existing_queue_row_step1: plan.filter((p) => p.eligibility === "excluded_existing_queue_row_step1").length,
    excluded_prior_queue_history: plan.filter((p) => p.eligibility === "excluded_prior_queue_history").length,
    queue_rows_to_create: plan.filter((p) => p.will_create_queue_row).length,
    sends_to_create: 0,
    apollo_credits_to_spend: 0,
    inbox_id: inboxId,
    inbox_email: inboxRow.email_address,
    campaign_id: campaignId,
    campaign_name: campaignRow.campaign_name,
    sequence_step_id: step1.id,
    business_name: businessName,
  };

  let createdQueueIds: string[] = [];
  let queueRowsCreated = 0;

  if (!dryRun) {
    const eligible = plan.filter((p) => p.eligibility === "eligible_to_queue");
    const scheduledAt = new Date().toISOString();
    for (const row of eligible) {
      // Idempotency double-check
      const { data: existing } = await admin.from("email_queue")
        .select("id").eq("contact_id", row.contact_id).eq("campaign_id", campaignId).eq("sequence_step", 1).limit(1);
      if (existing && existing.length > 0) continue;

      const { data: ins, error: insErr } = await admin.from("email_queue").insert({
        contact_id: row.contact_id,
        campaign_id: campaignId,
        sequence_step: 1,
        scheduled_at: scheduledAt,
        status: "pending",
        inbox_id: inboxId,
        business_name: businessName,
      }).select("id").single();
      if (!insErr && ins?.id) {
        createdQueueIds.push(ins.id);
        queueRowsCreated++;
      }
    }

    await admin.from("system_events").insert({
      event_type: "queue_created_from_staged_contacts",
      severity: "low",
      business_name: businessName,
      message: `Founder ${userEmail} created ${queueRowsCreated} step1 queue row(s) from staged contacts. Auto-send remains OFF; no emails sent.`,
      metadata: {
        actor: userEmail,
        business_name: businessName,
        campaign_id: campaignId,
        inbox_id: inboxId,
        sequence_step_id: step1.id,
        contacts_checked: plan.length,
        queue_rows_created: queueRowsCreated,
        created_queue_ids: createdQueueIds,
        sends_created: 0,
        provider_calls: 0,
        apollo_credits_spent: 0,
        excluded_no_bcr: summary.excluded_no_bcr,
        excluded_bcr_not_staged: summary.excluded_bcr_not_staged,
        excluded_do_not_contact: summary.excluded_do_not_contact,
        excluded_apollo_lifecycle_not_promoted: summary.excluded_apollo_lifecycle_not_promoted,
        excluded_existing_queue_row_step1: summary.excluded_existing_queue_row_step1,
        excluded_prior_queue_history: summary.excluded_prior_queue_history,
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
      queue_rows_created: queueRowsCreated,
      created_queue_ids: createdQueueIds,
      emails_sent: 0,
      provider_calls: 0,
      apollo_credits_spent: 0,
    },
    plan,
  });
});

function emptySummary(campaignId: string, inboxEmail: string, businessName: string, campaignName: string) {
  return {
    candidates_checked: 0, eligible_to_queue: 0,
    excluded_no_bcr: 0, excluded_bcr_not_staged: 0, excluded_do_not_contact: 0,
    excluded_apollo_lifecycle_not_promoted: 0, excluded_existing_queue_row_step1: 0,
    excluded_prior_queue_history: 0,
    queue_rows_to_create: 0, sends_to_create: 0, apollo_credits_to_spend: 0,
    inbox_email: inboxEmail, campaign_id: campaignId,
    campaign_name: campaignName, business_name: businessName,
  };
}
