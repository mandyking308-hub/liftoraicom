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

  // Fetch business name
  const { data: business } = await admin
    .from("businesses")
    .select("id, business_name")
    .eq("id", business_id)
    .single();
  const business_name = business?.business_name ?? "";

  // Explicit Neon Candy protection
  if (business_name.toLowerCase().startsWith("neon candy")) {
    return json({
      ok: true,
      checklist: [],
      notes: "Neon Candy is a segregated legacy estate and is excluded from this activation checklist.",
      persisted: false,
    });
  }

  // Domain
  const { data: domains } = await admin
    .from("sending_domains")
    .select("id")
    .eq("business_id", business_id)
    .limit(1);

  // Mailboxes
  let mailboxQ = admin.from("inboxes").select("id, provider_ready, warmup_ready, estate_key");
  if (liftor_campaign_id) {
    // If a campaign is given, restrict to mailboxes allowed for that campaign's business.
    mailboxQ = mailboxQ.eq("business_name", business_name);
  } else {
    mailboxQ = mailboxQ.eq("business_name", business_name);
  }
  const { data: mailboxes } = await mailboxQ;
  const mailboxCount = (mailboxes ?? []).filter((m: any) => (m.estate_key ?? "").toLowerCase() !== "neon-candy-legacy").length;
  const providerReadyCount = (mailboxes ?? []).filter((m: any) => m.provider_ready === true).length;
  const warmupReadyCount = (mailboxes ?? []).filter((m: any) => m.warmup_ready === true).length;

  // Provider
  const { data: providers } = await admin
    .from("outbound_providers")
    .select("id, provider_type, connected, webhook_configured")
    .eq("provider_type", "smartlead")
    .limit(1);
  const provider = providers?.[0];

  // Campaign mapping
  let mappingQ = admin
    .from("outbound_provider_campaign_mappings")
    .select("id, provider_campaign_id, mapping_status, is_active")
    .eq("provider_type", "smartlead")
    .eq("business_id", business_id);
  if (liftor_campaign_id) mappingQ = mappingQ.eq("liftor_campaign_id", liftor_campaign_id);
  const { data: mappings } = await mappingQ.limit(1);
  const mapping = mappings?.[0];

  // Liftor campaign approval
  let campaignApproved = false;
  if (liftor_campaign_id) {
    const { data: campaign } = await admin
      .from("campaigns")
      .select("id, approval_status")
      .eq("id", liftor_campaign_id)
      .single();
    campaignApproved = campaign?.approval_status === "approved";
  }

  // Eligible leads (sendable_status = sendable, not suppressed)
  const { data: eligibleLeads } = await admin
    .from("contacts")
    .select("id", { count: "exact" })
    .eq("assigned_business", business_id)
    .eq("sendable_status", "sendable")
    .is("do_not_contact_at", null)
    .is("unsubscribed_at", null)
    .eq("hard_bounced", false)
    .eq("is_globally_suppressed", false)
    .limit(1000);

  // Founder approval (look for a recent approval log entry)
  const { data: approvals } = await admin
    .from("founder_approval_log")
    .select("id")
    .eq("business_id", business_id)
    .eq("approval_type", "smartlead_send")
    .eq("status", "approved")
    .limit(1);

  const input = {
    business_name,
    business_id,
    liftor_campaign_id,
    provider_campaign_id: mapping?.provider_campaign_id ?? null,
    has_sending_domain: (domains ?? []).length > 0,
    mailbox_count: mailboxCount,
    provider_ready_mailbox_count: providerReadyCount,
    warmup_ready_mailbox_count: warmupReadyCount,
    smartlead_provider_connected: provider?.connected === true,
    smartlead_webhook_configured: provider?.webhook_configured === true,
    liftor_campaign_approved: campaignApproved,
    smartlead_campaign_mapped: mapping?.mapping_status === "mapped" && mapping?.is_active === true,
    eligible_lead_count: eligibleLeads?.length ?? 0,
    founder_final_approval_recorded: (approvals ?? []).length > 0,
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
    const { error } = await admin.from("smartlead_activation_checklist").upsert(rows, {
      onConflict: "business_id,liftor_campaign_id,checklist_key",
    });
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
    notes: "No provider calls made. Neon Candy excluded.",
  });
});
