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
 * Smartlead Lead Push Preview — DRY-RUN ONLY.
 *
 * Returns eligible Liftor contacts that COULD be pushed to a mapped Smartlead
 * campaign, plus the exact Smartlead lead payload preview. No POST to
 * Smartlead. No DB mutation to operational tables.
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
  const limit = Math.min(Math.max(Number(body.limit ?? 25), 1), 100);
  const campaign_mapping_id: string | null = body.campaign_mapping_id ?? null;

  // Resolve mapping (must be active + mapped)
  let mappingQ = admin
    .from("outbound_provider_campaign_mappings")
    .select("id, business_id, liftor_campaign_id, provider_campaign_id, provider_campaign_name, mapping_status, is_active")
    .eq("provider_type", "smartlead")
    .eq("mapping_status", "mapped")
    .eq("is_active", true);
  if (campaign_mapping_id) mappingQ = mappingQ.eq("id", campaign_mapping_id);
  const { data: mappings } = await mappingQ.limit(1);
  const mapping = mappings?.[0] ?? null;

  if (!mapping) {
    return json({
      ok: true,
      dry_run: true,
      lead_push_ready: false,
      blocker: "no_active_campaign_mapping",
      eligible_count: 0,
      excluded_count: 0,
      excluded_reasons: {},
      preview: [],
      notes: "No leads pushed. No Smartlead POST calls. No emails sent.",
    });
  }

  const business_id = mapping.business_id;
  const liftor_campaign_id = mapping.liftor_campaign_id;
  const provider_campaign_id = mapping.provider_campaign_id;

  // Already-pushed guard
  const { data: alreadyPushed } = await admin
    .from("outbound_provider_lead_mappings")
    .select("contact_email, push_status")
    .eq("provider_type", "smartlead")
    .eq("provider_campaign_id", provider_campaign_id ?? "")
    .in("push_status", ["pushed", "pushing"]);
  const pushedEmails = new Set(
    (alreadyPushed ?? []).map((r: any) => (r.contact_email ?? "").toLowerCase().trim()),
  );

  let q = admin
    .from("contacts")
    .select(
      "id, email, first_name, last_name, name, company, linkedin_url, source_platform, lawful_basis, unsubscribe_token, sendable_status, is_globally_suppressed, hard_bounced, unsubscribed_at, archived_at, founder_review_requested_at, assigned_business, active_campaign_id, compliance_status, do_not_contact",
    )
    .limit(500);
  if (business_id) q = q.eq("assigned_business", business_id);
  if (liftor_campaign_id) q = q.eq("active_campaign_id", liftor_campaign_id);
  const { data: contacts, error: cErr } = await q;
  if (cErr) return json({ ok: false, error: "contacts_query_failed", detail: cErr.message }, 500);

  const ids = (contacts ?? []).map((c: any) => c.id);
  const { data: queueRows } = ids.length
    ? await admin
        .from("email_queue")
        .select("id, contact_id, sequence_step, status")
        .in("contact_id", ids)
    : { data: [] as any[] };
  const queueByContact = new Map<string, any[]>();
  for (const r of queueRows ?? []) {
    const arr = queueByContact.get(r.contact_id) ?? [];
    arr.push(r);
    queueByContact.set(r.contact_id, arr);
  }

  const eligible: any[] = [];
  const excluded: { id: string; reason: string }[] = [];
  const seenEmails = new Set<string>();

  for (const c of contacts ?? []) {
    const exclude = (reason: string) => excluded.push({ id: c.id, reason });
    if (!c.email) { exclude("missing_email"); continue; }
    const emailKey = String(c.email).toLowerCase().trim();
    if (seenEmails.has(emailKey)) { exclude("duplicate_email"); continue; }
    if (pushedEmails.has(emailKey)) { exclude("already_pushed_to_smartlead_campaign"); continue; }
    if (business_id && c.assigned_business && c.assigned_business !== business_id) {
      exclude("wrong_business"); continue;
    }
    if (c.archived_at) { exclude("archived"); continue; }
    if (c.do_not_contact) { exclude("do_not_contact"); continue; }
    if (c.is_globally_suppressed) { exclude("suppressed"); continue; }
    if (c.hard_bounced) { exclude("bounced"); continue; }
    if (c.unsubscribed_at) { exclude("unsubscribed"); continue; }
    if (c.compliance_status && c.compliance_status !== "outreach_allowed") {
      exclude(`compliance_${c.compliance_status}`); continue;
    }
    if (!c.lawful_basis) { exclude("missing_lawful_basis"); continue; }
    if (!c.unsubscribe_token) { exclude("missing_unsubscribe_token"); continue; }
    if (c.sendable_status && c.sendable_status !== "sendable") {
      exclude(`sendable_status_${c.sendable_status}`); continue;
    }
    if (c.founder_review_requested_at) { exclude("review_required"); continue; }

    const queue = queueByContact.get(c.id) ?? [];
    const step4Review = queue.find((q: any) => q.sequence_step === 4 && q.status === "review_required");
    if (step4Review) { exclude("review_required_step_4"); continue; }
    const unsafeQueue = queue.find((q: any) =>
      ["pending", "sending", "sent", "delayed", "throttled"].includes(q.status),
    );
    if (unsafeQueue) {
      exclude(`already_in_queue_${unsafeQueue.status}_step_${unsafeQueue.sequence_step}`);
      continue;
    }

    seenEmails.add(emailKey);
    eligible.push(c);
    if (eligible.length >= limit) break;
  }

  const preview = eligible.map((c) => {
    const first = c.first_name ?? c.name?.split(" ")?.[0] ?? "";
    const last = c.last_name ?? c.name?.split(" ")?.slice(1).join(" ") ?? "";
    return {
      email: c.email,
      first_name: first,
      last_name: last,
      company_name: c.company ?? "",
      website: null,
      linkedin_profile: c.linkedin_url ?? null,
      company_url: null,
      custom_fields: {
        liftor_contact_id: c.id,
        business_id: c.assigned_business ?? business_id,
        business_name: c.assigned_business ?? null,
        liftor_campaign_id: c.active_campaign_id ?? liftor_campaign_id,
        source_platform: c.source_platform ?? null,
        lawful_basis: c.lawful_basis,
        compliance_status: c.compliance_status ?? null,
        unsubscribe_token_present: !!c.unsubscribe_token,
        campaign_fit: null,
        sequence_step: 1,
      },
    };
  });

  return json({
    ok: true,
    dry_run: true,
    lead_push_ready: eligible.length > 0,
    campaign_mapping_id: mapping.id,
    provider_campaign_id,
    provider_campaign_name: mapping.provider_campaign_name,
    liftor_campaign_id,
    business_id,
    eligible_count: eligible.length,
    excluded_count: excluded.length,
    excluded_reasons: excluded.reduce<Record<string, number>>((acc, x) => {
      acc[x.reason] = (acc[x.reason] ?? 0) + 1;
      return acc;
    }, {}),
    preview,
    apply_disabled: true,
    apply_disabled_reasons: ["smartlead_lead_push_disabled", "feature_flag_off"],
    notes: "No leads pushed. No Smartlead POST calls. No emails sent.",
  });
});
