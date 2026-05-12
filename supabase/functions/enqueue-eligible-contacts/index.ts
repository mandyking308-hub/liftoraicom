import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

/**
 * Enqueue Step 1 rows for promoted contacts using a balanced selector.
 * dry_run by default. Never sends.
 * Selector rules:
 *  - contact must be ACTIVE, sendable, not bounced/suppressed/replied/DNC
 *  - no existing pending Step 1
 *  - no existing real-SMTP Step 1 sent
 *  - active campaign with assigned inbox
 *  - cap per email_domain per batch (default 2)
 *  - balance across campaign_fit buckets (round-robin)
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

  let body: { dry_run?: boolean; batch_size?: number; campaign_id?: string; per_domain_cap?: number } = {};
  try { body = await req.json(); } catch { /* allow empty */ }
  const dryRun = body.dry_run !== false;
  const batchSize = Math.min(Math.max(body.batch_size ?? 25, 1), 500);
  const perDomainCap = Math.min(Math.max(body.per_domain_cap ?? 2, 1), 50);

  // Fetch promoted contacts via the apollo_raw_leads view (gives us campaign_fit + contact_id)
  let q = admin.from("apollo_raw_leads")
    .select("apollo_lead_id,promoted_contact_id,campaign_fit,email_domain,business_name")
    .eq("quality_status", "promoted_to_contact")
    .not("promoted_contact_id", "is", null)
    .limit(2000);
  const { data: candidates, error: cErr } = await q;
  if (cErr) return json({ error: cErr.message }, 500);

  const contactIds = Array.from(new Set((candidates ?? []).map((c) => c.promoted_contact_id).filter(Boolean)));
  if (contactIds.length === 0) {
    return json({ ok: true, dry_run: dryRun, summary: { candidates: 0, eligible: 0, selected: 0, enqueued: 0 }, selected_sample: [], note: "No promoted contacts found." });
  }

  // Pull contact details
  const { data: contacts } = await admin.from("contacts")
    .select("id,email,status,sendable_status,hard_bounced,is_globally_suppressed,assigned_business,assigned_inbox_id,active_campaign_id")
    .in("id", contactIds);
  const contactMap = new Map<string, any>();
  for (const c of contacts ?? []) contactMap.set(c.id, c);

  // Pull existing queue rows for these contacts
  const { data: queueRows } = await admin.from("email_queue")
    .select("contact_id,sequence_step,status,delivery_kind,campaign_id")
    .in("contact_id", contactIds);
  const queueByContact = new Map<string, any[]>();
  for (const q of queueRows ?? []) {
    if (!queueByContact.has(q.contact_id)) queueByContact.set(q.contact_id, []);
    queueByContact.get(q.contact_id)!.push(q);
  }

  // Active campaigns
  const { data: campaigns } = await admin.from("outreach_campaigns").select("id,status,business_name");
  const campaignMap = new Map<string, any>();
  for (const c of campaigns ?? []) campaignMap.set(c.id, c);

  type Eligible = { contact_id: string; email_domain: string; campaign_fit: string | null; business_name: string; campaign_id: string; inbox_id: string | null; reason_blocked?: string };
  const eligible: Eligible[] = [];
  const blocked: Array<{ contact_id: string; reason: string }> = [];

  for (const cand of candidates ?? []) {
    const c = contactMap.get(cand.promoted_contact_id);
    if (!c) { blocked.push({ contact_id: cand.promoted_contact_id, reason: "contact missing" }); continue; }
    if (String(c.status).toUpperCase() === "DO_NOT_CONTACT") { blocked.push({ contact_id: c.id, reason: "DNC" }); continue; }
    if (c.hard_bounced) { blocked.push({ contact_id: c.id, reason: "bounced" }); continue; }
    if (c.is_globally_suppressed || c.sendable_status === "suppressed") { blocked.push({ contact_id: c.id, reason: "suppressed" }); continue; }
    if (String(c.status).toUpperCase() === "REPLIED") { blocked.push({ contact_id: c.id, reason: "replied" }); continue; }
    const cqRows = queueByContact.get(c.id) ?? [];
    if (cqRows.some((r) => r.sequence_step === 1 && r.status === "pending")) { blocked.push({ contact_id: c.id, reason: "pending_step1_exists" }); continue; }
    if (cqRows.some((r) => r.sequence_step === 1 && r.status === "sent" && r.delivery_kind === "smtp_real")) { blocked.push({ contact_id: c.id, reason: "step1_already_sent" }); continue; }

    const campaignId = body.campaign_id ?? c.active_campaign_id;
    if (!campaignId) { blocked.push({ contact_id: c.id, reason: "no campaign" }); continue; }
    const camp = campaignMap.get(campaignId);
    if (!camp || String(camp.status).toLowerCase() !== "active") { blocked.push({ contact_id: c.id, reason: "campaign_inactive" }); continue; }
    if (!c.assigned_inbox_id) { blocked.push({ contact_id: c.id, reason: "no_inbox" }); continue; }

    eligible.push({
      contact_id: c.id,
      email_domain: cand.email_domain ?? "",
      campaign_fit: cand.campaign_fit ?? null,
      business_name: c.assigned_business ?? cand.business_name ?? "",
      campaign_id: campaignId,
      inbox_id: c.assigned_inbox_id,
    });
  }

  // Balanced selection: round-robin by campaign_fit, capped per domain
  const buckets = new Map<string, Eligible[]>();
  for (const e of eligible) {
    const k = e.campaign_fit ?? "unknown";
    if (!buckets.has(k)) buckets.set(k, []);
    buckets.get(k)!.push(e);
  }
  const bucketKeys = Array.from(buckets.keys());
  const selected: Eligible[] = [];
  const domainCount = new Map<string, number>();
  let safety = 0;
  while (selected.length < batchSize && safety++ < batchSize * 10) {
    let pickedAny = false;
    for (const k of bucketKeys) {
      const arr = buckets.get(k)!;
      while (arr.length > 0) {
        const cand = arr.shift()!;
        const dc = domainCount.get(cand.email_domain) ?? 0;
        if (dc >= perDomainCap) continue;
        selected.push(cand);
        domainCount.set(cand.email_domain, dc + 1);
        pickedAny = true;
        break;
      }
      if (selected.length >= batchSize) break;
    }
    if (!pickedAny) break;
  }

  let enqueued = 0;
  if (!dryRun && selected.length > 0) {
    const newRows = selected.map((s) => ({
      contact_id: s.contact_id,
      campaign_id: s.campaign_id,
      sequence_step: 1,
      status: "pending" as const,
      scheduled_at: new Date().toISOString(),
      priority: 5,
      inbox_id: s.inbox_id,
      business_name: s.business_name,
    }));
    const { count, error: iErr } = await admin.from("email_queue").insert(newRows, { count: "exact" });
    if (iErr) return json({ error: `enqueue failed: ${iErr.message}` }, 500);
    enqueued = count ?? 0;
    await admin.from("system_events").insert({
      event_type: "contacts_enqueued", severity: "low", business_name: "",
      message: `Founder ${userEmail} enqueued ${enqueued} Step 1 row(s) via balanced selector.`,
      metadata: { actor: userEmail, count: enqueued, per_domain_cap: perDomainCap }, resolved: true,
    });
  }

  return json({
    ok: true, dry_run: dryRun,
    summary: {
      candidates: candidates?.length ?? 0,
      eligible: eligible.length,
      blocked: blocked.length,
      selected: selected.length,
      enqueued,
      per_domain_cap: perDomainCap,
      fit_distribution: Array.from(buckets.entries()).map(([k, v]) => ({ fit: k, available: v.length + (selected.filter((s) => (s.campaign_fit ?? "unknown") === k).length) })),
    },
    selected_sample: selected.slice(0, 25),
    blocked_sample: blocked.slice(0, 25),
  });
});