import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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
 * Smartlead Event Mapping Preview — read-only.
 *
 * Reads recent outbound_provider_events and shows what each event WOULD map to
 * (email_events / communications / suppression / DNC) without writing anything.
 */
const MAPPING_TARGET: Record<string, string> = {
  email_sent: "email_events.email_sent",
  email_opened: "email_events.email_opened",
  link_clicked: "email_events.link_clicked",
  reply_received: "communications + conversations (inbound reply)",
  email_bounced: "suppression_list (hard/soft bounce)",
  lead_unsubscribed: "do_not_contact + unsubscribe ledger",
  campaign_completed: "campaign metrics only",
  lead_status_changed: "contact lifecycle stage update",
  account_error: "outbound_providers health flag",
  unknown: "ignored / manual review",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const SECRET_PRESENT = !!(Deno.env.get("SMARTLEAD_WEBHOOK_SECRET") ?? "").trim();

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
  try { body = await req.json(); } catch { body = {}; }
  const limit = Math.min(Math.max(Number(body.limit ?? 50), 1), 200);

  const { data: events } = await admin
    .from("outbound_provider_events")
    .select(
      "id, provider_type, provider_event_type, provider_event_id, provider_campaign_id, provider_lead_id, raw_payload, normalized_payload, processing_status, operational_mutation_applied, received_at",
    )
    .eq("provider_type", "smartlead")
    .order("received_at", { ascending: false })
    .limit(limit);

  // Counts per event type
  const counts: Record<string, number> = {};
  for (const e of events ?? []) {
    const k = String(e.provider_event_type ?? "unknown");
    counts[k] = (counts[k] ?? 0) + 1;
  }

  // Active mappings for campaign join hints
  const { data: mappings } = await admin
    .from("outbound_provider_campaign_mappings")
    .select("provider_campaign_id, liftor_campaign_id, business_id, mapping_status, is_active")
    .eq("provider_type", "smartlead")
    .eq("is_active", true);
  const mapByProvider = new Map<string, any>();
  for (const m of mappings ?? []) mapByProvider.set(String(m.provider_campaign_id), m);

  // Build preview rows
  const previews: any[] = [];
  for (const e of events ?? []) {
    const norm: any = e.normalized_payload ?? {};
    const email = norm?.email ?? null;
    let contactId: string | null = null;
    if (email) {
      const { data: contact } = await admin
        .from("contacts")
        .select("id")
        .ilike("email", String(email))
        .maybeSingle();
      contactId = contact?.id ?? null;
    }
    const campMap = e.provider_campaign_id ? mapByProvider.get(String(e.provider_campaign_id)) : null;
    const evt = String(e.provider_event_type ?? "unknown");
    const blockers: string[] = [];
    if (!campMap) blockers.push("no_active_campaign_mapping");
    if (email && !contactId) blockers.push("contact_not_found");
    if (!email) blockers.push("no_email_in_payload");

    previews.push({
      event_id: e.id,
      received_at: e.received_at,
      provider_event_type: evt,
      provider_campaign_id: e.provider_campaign_id,
      provider_lead_id: e.provider_lead_id,
      email,
      would_map_to: MAPPING_TARGET[evt] ?? "ignored / manual review",
      matched_contact_id: contactId,
      matched_liftor_campaign_id: campMap?.liftor_campaign_id ?? null,
      matched_business_id: campMap?.business_id ?? null,
      processing_status: e.processing_status,
      operational_mutation_applied: e.operational_mutation_applied,
      mapping_blockers: blockers,
    });
  }

  return json({
    ok: true,
    webhook_secret_present: SECRET_PRESENT,
    capture_mode: SECRET_PRESENT ? "enabled" : "disabled",
    event_count: previews.length,
    counts_by_type: counts,
    previews,
    mapping_targets: MAPPING_TARGET,
    apply_available: false,
    apply_disabled_reason: "operational_mapping_not_built",
    notes:
      "Read-only. No writes. No contact / queue / compliance / conversation / communications mutation. Smartlead webhook not registered by Liftor.",
  });
});