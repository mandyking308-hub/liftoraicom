import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Cheap, deterministic, no-AI quality scan over apollo_leads.
 * Default dry_run=true. Writes to lead_quality_profiles only when dry_run=false.
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

  let body: { dry_run?: boolean; limit?: number; only_status?: string[] } = {};
  try { body = await req.json(); } catch { /* allow empty */ }
  const dryRun = body.dry_run !== false;
  const limit = Math.min(Math.max(body.limit ?? 500, 1), 5000);
  const onlyStatus = body.only_status && body.only_status.length
    ? body.only_status
    : ["raw", "reviewed"];

  // Pull leads + their current quality profile
  const { data: rows, error } = await admin
    .from("apollo_raw_leads")
    .select("apollo_lead_id,email,email_domain,title,first_name,last_name,company,apollo_person_id,quality_status,quality_profile_id,risk_flags,promoted_contact_id")
    .in("quality_status", onlyStatus as any)
    .limit(limit);
  if (error) return json({ error: error.message }, 500);

  // Build batch lookups
  const emails = Array.from(new Set((rows ?? []).map((r) => (r.email ?? "").toLowerCase()).filter(Boolean)));
  const personIds = Array.from(new Set((rows ?? []).map((r) => r.apollo_person_id).filter(Boolean)));

  // Existing contacts by email
  const { data: contactsByEmail } = await admin.from("contacts")
    .select("id,email,status,sendable_status,hard_bounced,is_globally_suppressed,apollo_person_id")
    .in("email", emails.length ? emails : ["__none__"]);
  const contactByEmail = new Map<string, any>();
  for (const c of contactsByEmail ?? []) contactByEmail.set((c.email ?? "").toLowerCase(), c);
  const contactByPerson = new Map<string, any>();
  for (const c of contactsByEmail ?? []) if (c.apollo_person_id) contactByPerson.set(c.apollo_person_id, c);

  // Email events: bounced/replied/unsubscribed
  const { data: events } = await admin.from("email_events")
    .select("recipient_email,event_type")
    .in("recipient_email", emails.length ? emails : ["__none__"]);
  const emailEvents = new Map<string, Set<string>>();
  for (const e of events ?? []) {
    const k = (e.recipient_email ?? "").toLowerCase();
    if (!emailEvents.has(k)) emailEvents.set(k, new Set());
    emailEvents.get(k)!.add(String(e.event_type));
  }

  // Queue presence by contact id (for already_queued / already_sent)
  const contactIds = (contactsByEmail ?? []).map((c) => c.id);
  const { data: queueRows } = await admin.from("email_queue")
    .select("contact_id,status,sequence_step,delivery_kind")
    .in("contact_id", contactIds.length ? contactIds : ["00000000-0000-0000-0000-000000000000"]);
  const queueByContact = new Map<string, any[]>();
  for (const q of queueRows ?? []) {
    if (!queueByContact.has(q.contact_id)) queueByContact.set(q.contact_id, []);
    queueByContact.get(q.contact_id)!.push(q);
  }

  // Domain duplicate counts (within this batch + apollo_leads at large)
  const domainCounts = new Map<string, number>();
  for (const r of rows ?? []) {
    const d = r.email_domain;
    if (d) domainCounts.set(d, (domainCounts.get(d) ?? 0) + 1);
  }

  type Decision = {
    apollo_lead_id: string;
    quality_profile_id: string;
    next_status: string;
    risk_flags: string[];
    needs_founder_review: boolean;
    founder_review_reason?: string;
    dup_of_contact_id?: string | null;
  };
  const decisions: Decision[] = [];
  const summary = {
    scanned: 0, raw: 0, reviewed: 0, rejected: 0,
    needs_verification: 0, needs_founder_review: 0,
    suppressed: 0, bounced: 0, already_contacted: 0,
  } as Record<string, number>;

  for (const r of rows ?? []) {
    const flags = new Set<string>(r.risk_flags ?? []);
    const email = (r.email ?? "").toLowerCase();
    const validEmail = !!email && EMAIL_RE.test(email);
    if (!validEmail) flags.add("invalid_email");
    if (!r.title) flags.add("missing_title");

    const c = email ? contactByEmail.get(email) : null;
    const cByPerson = r.apollo_person_id ? contactByPerson.get(r.apollo_person_id) : null;

    let dupContact: string | null = null;
    if (c) { flags.add("duplicate_email"); dupContact = c.id; }
    if (cByPerson && cByPerson.id !== c?.id) { flags.add("duplicate_person_id"); dupContact ??= cByPerson.id; }

    const evts = emailEvents.get(email) ?? new Set<string>();
    if (evts.has("bounced") || c?.hard_bounced) flags.add("bounced");
    if (evts.has("replied")) flags.add("replied");
    if (evts.has("unsubscribed") || c?.is_globally_suppressed || c?.sendable_status === "suppressed") flags.add("suppressed");
    if (String(c?.status ?? "").toUpperCase() === "DO_NOT_CONTACT") flags.add("suppressed");

    const cQueue = c ? (queueByContact.get(c.id) ?? []) : [];
    if (cQueue.some((q) => q.status === "sent" && q.delivery_kind === "smtp_real")) flags.add("already_sent");
    if (cQueue.some((q) => q.status === "pending")) flags.add("already_queued");
    if (c && cQueue.length > 0) flags.add("already_contacted");

    const dom = r.email_domain;
    if (dom && (domainCounts.get(dom) ?? 0) > 5) flags.add("duplicate_domain");

    // Decision
    let next = "reviewed";
    if (flags.has("bounced")) next = "bounced";
    else if (flags.has("suppressed")) next = "suppressed";
    else if (flags.has("already_sent") || flags.has("already_queued") || flags.has("already_contacted")) next = "already_contacted";
    else if (flags.has("invalid_email") || flags.has("missing_title") || flags.has("duplicate_email") || flags.has("duplicate_person_id")) next = "rejected";
    else if (flags.has("duplicate_domain")) next = "needs_founder_review";

    summary.scanned++;
    summary[next] = (summary[next] ?? 0) + 1;

    decisions.push({
      apollo_lead_id: r.apollo_lead_id,
      quality_profile_id: r.quality_profile_id,
      next_status: next,
      risk_flags: Array.from(flags),
      needs_founder_review: next === "needs_founder_review",
      founder_review_reason: next === "needs_founder_review" ? "domain over-represented in raw pool" : undefined,
      dup_of_contact_id: dupContact,
    });
  }

  let applied = 0;
  if (!dryRun && decisions.length > 0) {
    for (const d of decisions) {
      const { error: uErr } = await admin.from("lead_quality_profiles").update({
        quality_status: d.next_status,
        risk_flags: d.risk_flags,
        needs_founder_review: d.needs_founder_review,
        founder_review_reason: d.founder_review_reason ?? null,
        dup_of_contact_id: d.dup_of_contact_id ?? null,
        scanned_at: new Date().toISOString(),
      }).eq("id", d.quality_profile_id);
      if (!uErr) applied++;
    }
    await admin.from("system_events").insert({
      event_type: "lead_quality_scan_applied", severity: "low", business_name: "",
      message: `Founder ${userEmail} applied cheap scan to ${applied}/${decisions.length} leads.`,
      metadata: { actor: userEmail, summary }, resolved: true,
    });
  }

  return json({
    ok: true, dry_run: dryRun, summary, applied,
    sample: decisions.slice(0, 25),
  });
});