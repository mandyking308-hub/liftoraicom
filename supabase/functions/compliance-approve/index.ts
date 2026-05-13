import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const DEFAULT_BUSINESS = "Neon Candy";

/**
 * Compliance Approval Gate.
 *
 * Flips compliance_status from `pending_review` -> `outreach_allowed` for the
 * Apollo-promoted, validation-clean Neon Candy contacts whose compliance spine
 * is fully populated. NEVER:
 *  - reveals/enriches Apollo
 *  - creates contacts/BCRs
 *  - sets BCR.campaign_eligible (that is the next, separate Stage-to-Queue gate)
 *  - inserts queue rows
 *  - sends emails
 */
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

  let body: { dry_run?: boolean; business_name?: string; contact_ids?: string[] } = {};
  try { body = await req.json(); } catch { /* allow empty */ }
  const dryRun = body.dry_run !== false;
  const businessName = body.business_name ?? DEFAULT_BUSINESS;

  // 1) Candidate contacts — strict gates.
  let cq = admin.from("contacts")
    .select("id,email,name,first_name,last_name,company,status,source,assigned_business,sendable_status,compliance_status,lawful_basis,lawful_basis_recorded_at,retention_until,unsubscribe_token,unsubscribed_at,is_globally_suppressed,hard_bounced,apollo_person_id,apollo_enrichment_status")
    .eq("assigned_business", businessName)
    .eq("source", "autopilot_promotion")
    .eq("status", "NEW")
    .eq("sendable_status", "sendable")
    .eq("compliance_status", "pending_review")
    .not("lawful_basis", "is", null)
    .not("retention_until", "is", null)
    .gt("retention_until", new Date().toISOString())
    .not("unsubscribe_token", "is", null)
    .is("unsubscribed_at", null)
    .eq("is_globally_suppressed", false)
    .eq("hard_bounced", false)
    .not("apollo_person_id", "is", null)
    .eq("apollo_enrichment_status", "succeeded");
  if (body.contact_ids?.length) cq = cq.in("id", body.contact_ids);
  const { data: contacts, error: cErr } = await cq;
  if (cErr) return json({ error: cErr.message }, 500);

  const contactIds = (contacts ?? []).map((c: any) => c.id);
  if (!contactIds.length) {
    return json({
      ok: true, dry_run: dryRun,
      summary: {
        eligible_for_compliance_approval: 0, blocked: 0,
        queue_rows_to_create: 0, sends_to_create: 0, apollo_credits_to_spend: 0,
        business_name: businessName,
      },
      plan: [],
    });
  }

  // 2) BCR check (Neon Candy, not DNC)
  const { data: bcrs } = await admin.from("business_contact_relationships")
    .select("id,contact_id,business_id,do_not_contact,qualification,campaign_eligible,current_stage")
    .in("contact_id", contactIds).eq("business_name", businessName).eq("do_not_contact", false);
  const bcrByContact = new Map<string, any>((bcrs ?? []).map((b: any) => [b.contact_id, b]));

  // 3) Apollo lifecycle: must be promoted-clean, not rejected/needs_founder_review
  const { data: lqp } = await admin.from("lead_quality_profiles")
    .select("promoted_contact_id,quality_status,lifecycle_stage,needs_founder_review")
    .in("promoted_contact_id", contactIds);
  const lqpByContact = new Map<string, any>((lqp ?? []).map((p: any) => [p.promoted_contact_id, p]));

  type PlanRow = {
    contact_id: string;
    name: string | null;
    email: string | null;
    company: string | null;
    lawful_basis: string | null;
    retention_until: string | null;
    unsubscribe_token_present: boolean;
    current_compliance_status: string | null;
    proposed_compliance_status: "outreach_allowed";
    reason: string;
    eligible: boolean;
    blocker_reason: string | null;
  };

  const plan: PlanRow[] = [];
  const eligibleIds: string[] = [];

  for (const c of contacts ?? []) {
    const bcr = bcrByContact.get(c.id);
    const profile = lqpByContact.get(c.id);
    const row: PlanRow = {
      contact_id: c.id,
      name: c.name ?? ([c.first_name, c.last_name].filter(Boolean).join(" ") || null),
      email: c.email ?? null,
      company: c.company ?? null,
      lawful_basis: c.lawful_basis ?? null,
      retention_until: c.retention_until ?? null,
      unsubscribe_token_present: !!c.unsubscribe_token,
      current_compliance_status: c.compliance_status ?? null,
      proposed_compliance_status: "outreach_allowed",
      reason: "founder_reviewed_b2b_legitimate_interest",
      eligible: true,
      blocker_reason: null,
    };
    if (!bcr) { row.eligible = false; row.blocker_reason = "no Neon Candy BCR or BCR.do_not_contact=true"; }
    else if (!profile) { row.eligible = false; row.blocker_reason = "no lead_quality_profile linked"; }
    else if (profile.quality_status === "rejected" || profile.lifecycle_stage === "rejected" || profile.needs_founder_review === true) {
      row.eligible = false;
      row.blocker_reason = `lead_quality_profile blocked: quality_status=${profile.quality_status} lifecycle=${profile.lifecycle_stage} needs_founder_review=${profile.needs_founder_review}`;
    }
    plan.push(row);
    if (row.eligible) eligibleIds.push(c.id);
  }

  const summary = {
    eligible_for_compliance_approval: eligibleIds.length,
    blocked: plan.length - eligibleIds.length,
    queue_rows_to_create: 0,
    sends_to_create: 0,
    apollo_credits_to_spend: 0,
    business_name: businessName,
  };

  if (dryRun) return json({ ok: true, dry_run: true, summary, plan });

  // 4) Apply
  const approvedAt = new Date().toISOString();
  const updatedIds: string[] = [];
  for (const cid of eligibleIds) {
    const c = (contacts ?? []).find((x: any) => x.id === cid);
    const { error: uErr } = await admin.from("contacts").update({
      compliance_status: "outreach_allowed",
      last_compliance_review_at: approvedAt,
      lawful_basis_recorded_at: c?.lawful_basis_recorded_at ?? approvedAt,
    }).eq("id", cid).eq("compliance_status", "pending_review");
    if (uErr) continue;
    updatedIds.push(cid);

    await admin.from("contact_compliance_events").insert({
      contact_id: cid,
      business_name: businessName,
      event_type: "compliance_approved",
      event_source: "founder_command_centre",
      event_notes: `Founder ${userEmail} approved contact for outreach (compliance gate only; campaign eligibility still pending Stage-to-Queue gate).`,
      new_value: {
        business_name: businessName,
        lawful_basis: c?.lawful_basis,
        retention_until: c?.retention_until,
        founder_action: "approved_for_outreach",
        no_queue_rows_created: true,
        no_emails_sent: true,
        actor: userEmail,
      },
      actor: userEmail,
    });
  }

  await admin.from("system_events").insert({
    event_type: "contact_compliance_approval_completed",
    severity: "low",
    business_name: businessName,
    message: `Founder ${userEmail} approved compliance for ${updatedIds.length} contact(s).`,
    metadata: {
      business_name: businessName,
      contacts_count: updatedIds.length,
      contact_ids: updatedIds,
      queue_rows_created: 0,
      emails_sent: 0,
      apollo_credits_spent: 0,
      actor: userEmail,
    },
    resolved: true,
  });

  return json({
    ok: true, dry_run: false,
    summary: { ...summary, contacts_updated: updatedIds.length },
    plan,
    updated_contact_ids: updatedIds,
  });
});