// Education outreach eligibility preflight (Chat 3 commercial layer).
//
// READ-ONLY. This function never sends, queues, maps or mutates any provider.
// It answers one question per contact: "may this brand approach this person?"
//
// Eligible requires ALL of:
//   canonical organisation link, eligible business relationship, not globally
//   suppressed, not hard bounced, not unsubscribed/DNC, no cross-brand collision
//   (ownership / active conversation / cooldown), usable work email, campaign
//   approved + live + external send unblocked, Smartlead mapping ready, sender
//   infrastructure ready.
//
// Smartlead mapping readiness and sender readiness are owned by Chat 2 and are
// read from existing architecture only — never created or modified here.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const MAX_CONTACTS = 100;

function hasUsableWorkEmail(c: Record<string, unknown>): boolean {
  const email = (c.email as string | null) ?? "";
  if (!email.includes("@")) return false;
  const sendable = c.sendable_status as string | null;
  if (sendable && !["sendable", "verified_sendable"].includes(sendable)) return false;
  const verified = c.email_verified_status as string | null;
  if (verified && ["invalid", "unknown", "catch_all_risky"].includes(verified)) return false;
  return true;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: auth } }, auth: { persistSession: false },
  });
  const { data: u } = await userClient.auth.getUser(auth.replace("Bearer ", ""));
  if (!u?.user) return json({ error: "unauthorized" }, 401);

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  const { data: roles } = await admin.from("user_roles")
    .select("role").eq("user_id", u.user.id).in("role", ["founder", "admin"]);
  if (!roles?.length) return json({ error: "founder_role_required" }, 403);

  let body: { contact_ids?: string[]; business_name?: string; campaign_key?: string } = {};
  try { body = await req.json(); } catch { /* defaults */ }

  const businessName = (body.business_name ?? "").trim();
  if (!businessName) return json({ error: "business_name_required" }, 400);
  const contactIds = (body.contact_ids ?? []).filter(Boolean).slice(0, MAX_CONTACTS);
  if (!contactIds.length) return json({ error: "contact_ids_required" }, 400);

  // --- campaign shell -----------------------------------------------------
  let campaignQuery = admin.from("outreach_campaign_drafts")
    .select("id, campaign_key, business_id, status, is_live, external_send_blocked, founder_approved_at, founder_approval_state, qualification_threshold, smartlead_campaign_id");
  campaignQuery = body.campaign_key
    ? campaignQuery.eq("campaign_key", body.campaign_key)
    : campaignQuery.eq("campaign_key", "");
  const { data: campaigns } = await campaignQuery.limit(1);
  const campaign = campaigns?.[0] ?? null;

  const { data: business } = await admin.from("businesses").select("id").eq("name", businessName).maybeSingle();

  // --- Chat 2 owned readiness (read only) ---------------------------------
  const { data: mappings } = await admin.from("outbound_provider_campaign_mappings")
    .select("id, is_active, mapping_status, provider_campaign_id")
    .eq("business_id", business?.id ?? "00000000-0000-0000-0000-000000000000")
    .eq("is_active", true);
  const smartleadMappingReady = !!(mappings ?? []).some(
    (m: any) => m.is_active && m.mapping_status === "mapped" && !!m.provider_campaign_id,
  );

  const { data: inboxes } = await admin.from("inboxes")
    .select("id, active, warmup_status").eq("active", true);
  const senderInfrastructureReady = (inboxes ?? []).length > 0
    && (inboxes ?? []).some((i: any) => i.warmup_status === "completed" || i.warmup_status === "warm");

  // --- contacts + relationships + ownership -------------------------------
  const { data: contacts } = await admin.from("contacts")
    .select("id, email, organisation_id, email_verified_status, sendable_status, reveal_status, is_globally_suppressed, hard_bounced, unsubscribed_at, do_not_contact_at, conversation_active, last_replied_at")
    .in("id", contactIds);

  const { data: relationships } = await admin.from("business_contact_relationships")
    .select("contact_id, business_name, campaign_eligible, do_not_contact, business_relevance_score, qualification")
    .in("contact_id", contactIds).eq("business_name", businessName);

  const { data: ownerships } = await admin.from("portfolio_contact_ownership")
    .select("contact_id, business_name, campaign_key, status, cooldown_until, released_at")
    .in("contact_id", contactIds);

  const relByContact = new Map((relationships ?? []).map((r: any) => [r.contact_id, r]));
  const activeOwner = new Map<string, any>();
  const releasedByContact = new Map<string, any[]>();
  for (const o of ownerships ?? []) {
    if (o.status === "active") activeOwner.set(o.contact_id, o);
    else {
      if (!releasedByContact.has(o.contact_id)) releasedByContact.set(o.contact_id, []);
      releasedByContact.get(o.contact_id)!.push(o);
    }
  }

  const now = Date.now();
  const threshold = campaign?.qualification_threshold ?? 55;

  const results = (contacts ?? []).map((c: any) => {
    const blockers: string[] = [];
    const rel = relByContact.get(c.id);

    if (!c.organisation_id) blockers.push("missing_organisation_link");
    if (!rel) blockers.push("no_business_relationship");
    else {
      if (rel.do_not_contact) blockers.push("relationship_do_not_contact");
      if (!rel.campaign_eligible) blockers.push("relationship_not_eligible");
      if ((rel.business_relevance_score ?? 0) < threshold) blockers.push("relationship_not_eligible");
    }

    if (c.is_globally_suppressed) blockers.push("globally_suppressed");
    if (c.hard_bounced) blockers.push("hard_bounced");
    if (c.unsubscribed_at || c.do_not_contact_at) blockers.push("unsubscribed_or_dnc");

    const owner = activeOwner.get(c.id);
    if (owner && owner.business_name !== businessName) blockers.push("collision_blocked");
    if (c.conversation_active && (!owner || owner.business_name !== businessName)) blockers.push("collision_blocked");
    const cooldown = (releasedByContact.get(c.id) ?? []).find(
      (r: any) => r.business_name !== businessName && r.cooldown_until && new Date(r.cooldown_until).getTime() > now,
    );
    if (cooldown) blockers.push("collision_blocked");

    if (!hasUsableWorkEmail(c)) blockers.push("no_usable_work_email");

    const approved = !!campaign?.founder_approved_at || campaign?.founder_approval_state === "approved";
    if (!approved) blockers.push("campaign_not_approved");
    if (!campaign?.is_live) blockers.push("campaign_not_live");
    if (campaign?.external_send_blocked !== false) blockers.push("external_send_blocked");
    if (!smartleadMappingReady) blockers.push("smartlead_mapping_not_ready");
    if (!senderInfrastructureReady) blockers.push("sender_infrastructure_not_ready");

    const unique = Array.from(new Set(blockers));
    return {
      contact_id: c.id,
      eligible: unique.length === 0,
      send_allowed: unique.length === 0,
      blockers: unique,
      current_owner_business: owner?.business_name ?? null,
      cooldown_until: cooldown?.cooldown_until ?? null,
    };
  });

  return json({
    ok: true,
    read_only: true,
    business_name: businessName,
    campaign_key: campaign?.campaign_key ?? null,
    campaign_found: !!campaign,
    gate_version: "edu-eligibility-1.0.0",
    infrastructure: {
      smartlead_mapping_ready: smartleadMappingReady,
      sender_infrastructure_ready: senderInfrastructureReady,
      note: "Readiness is read from existing Chat 2 architecture. This function never mutates a provider.",
    },
    evaluated: results.length,
    eligible_count: results.filter((r) => r.eligible).length,
    results,
    checked_at: new Date().toISOString(),
  });
});
