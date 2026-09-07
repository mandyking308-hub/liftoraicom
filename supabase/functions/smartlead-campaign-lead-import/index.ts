import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  buildLeadMappingRow,
  buildLeadsPath,
  classifySmartleadHttp,
  clampOffset,
  clampPageLimit,
  computeContinuation,
  emptyCounters,
  type ExistingContact,
  mapSmartleadLead,
  type MappingRow,
  parseLeadsEnvelope,
  planContactWrite,
  resolveMapping,
  tally,
} from "../_shared/smartleadLeadImport.ts";

const SMARTLEAD_BASE_URL = "https://server.smartlead.ai/api/v1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

/** READ-ONLY GET to Smartlead. The API key never leaves this function and is never logged. */
async function getJson(path: string, apiKey: string, timeoutMs = 20_000) {
  const sep = path.includes("?") ? "&" : "?";
  const url = `${SMARTLEAD_BASE_URL}${path}${sep}api_key=${encodeURIComponent(apiKey)}`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { method: "GET", signal: ctrl.signal });
    const text = await res.text();
    let parsed: unknown = null;
    try { parsed = JSON.parse(text); } catch { /* non-JSON */ }
    return { status: res.status, body: parsed };
  } catch {
    return { status: 0, body: null };
  } finally {
    clearTimeout(t);
  }
}

/**
 * Smartlead -> Liftor contact import.
 *
 * Imports leads that ALREADY exist in a mapped Smartlead campaign into Liftor
 * contacts + business_contact_relationships + outbound_provider_lead_mappings.
 * One page per call (paginated, resumable via `offset`).
 *
 * Never sends, never pushes leads, never mutates Smartlead.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const SMARTLEAD_API_KEY = Deno.env.get("SMARTLEAD_API_KEY") ?? null;

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
  const roleSet = new Set((roles ?? []).map((r: { role: string }) => r.role));
  if (!roleSet.has("founder") && !roleSet.has("admin")) return json({ ok: false, error: "forbidden" }, 403);

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* empty body allowed */ }

  const offset = clampOffset(body.offset ?? 0);
  const limit = clampPageLimit(body.limit ?? 100);
  const dry_run = body.dry_run === true;

  // 1) Resolve the mapping — ownership is never guessed.
  const { data: mappingRows, error: mErr } = await admin
    .from("outbound_provider_campaign_mappings")
    .select("id,business_id,liftor_campaign_id,provider_campaign_id,provider_campaign_name,mapping_status,is_active")
    .eq("provider_type", "smartlead");
  if (mErr) return json({ ok: false, error: "mapping_query_failed", detail: mErr.message }, 500);

  const resolution = resolveMapping((mappingRows ?? []) as MappingRow[], {
    campaign_mapping_id: (body.campaign_mapping_id as string) ?? null,
    provider_campaign_id: (body.provider_campaign_id as string) ?? null,
  });
  if (!resolution.ok) {
    return json({
      ok: false,
      error: resolution.error,
      actionable: resolution.actionable,
      candidates: resolution.candidates.map((c) => ({
        campaign_mapping_id: c.id,
        business_id: c.business_id,
        provider_campaign_id: c.provider_campaign_id,
        provider_campaign_name: c.provider_campaign_name,
      })),
    }, 409);
  }
  const mapping = resolution.mapping;

  if (!SMARTLEAD_API_KEY) {
    return json({
      ok: false,
      error: "smartlead_api_key_missing",
      actionable: "SMARTLEAD_API_KEY is not configured for this environment.",
    }, 424);
  }

  const { data: biz } = await admin.from("businesses").select("id,name").eq("id", mapping.business_id!).maybeSingle();
  const business_name = String((biz as { name?: string } | null)?.name ?? "");

  // 2) Read one page of leads — GET only.
  const res = await getJson(buildLeadsPath(mapping.provider_campaign_id!, offset, limit), SMARTLEAD_API_KEY);
  const envelope = parseLeadsEnvelope(res.body);
  const cls = classifySmartleadHttp(res.status, envelope.malformed);
  if (cls.kind !== "ok") {
    return json({
      ok: false,
      error: `smartlead_${cls.kind}`,
      provider_status: res.status,
      retryable: cls.retryable,
      actionable: cls.actionable,
      distinguishes_empty_list: "This is a provider access error, NOT an empty campaign.",
      resume_offset: offset,
      counters: emptyCounters(),
    }, cls.kind === "unauthorized" || cls.kind === "forbidden" ? 502 : 502);
  }

  const leads = envelope.leads.map(mapSmartleadLead);
  const continuation = computeContinuation(offset, envelope.leads.length, limit, envelope.total_leads);
  const counters = emptyCounters();
  const imported_at = new Date().toISOString();
  const details: Array<Record<string, unknown>> = [];

  if (leads.length === 0) {
    return json({
      ok: true,
      empty_page: true,
      empty_reason: offset === 0 ? "campaign_has_no_leads_for_this_key" : "no_further_leads",
      business_id: mapping.business_id,
      provider_campaign_id: mapping.provider_campaign_id,
      total_leads_reported: envelope.total_leads,
      counters,
      continuation,
      dry_run,
      safety: { smartlead_writes: 0, emails_sent: 0, leads_pushed: 0, mode: "read_only_get" },
    });
  }

  // 3) Existing contacts by normalised email (dedupe) + existing provider lead ids.
  const emails = Array.from(new Set(leads.map((l) => l.email).filter(Boolean))) as string[];
  const providerLeadIds = leads.map((l) => l.provider_lead_id).filter(Boolean) as string[];

  const { data: existingContacts } = emails.length
    ? await admin.from("contacts")
      .select("id,email,first_name,last_name,name,company,role,linkedin_url,phone,country,email_verified_status,sendable_status,do_not_contact_at,is_globally_suppressed,hard_bounced,unsubscribed_at,archived_at,assigned_business,source_record_id")
      .in("email", emails)
    : { data: [] as ExistingContact[] };
  const byEmail = new Map<string, ExistingContact>();
  for (const c of (existingContacts ?? []) as ExistingContact[]) {
    if (c.email) byEmail.set(c.email.trim().toLowerCase(), c);
  }

  const { data: existingLeadMaps } = providerLeadIds.length
    ? await admin.from("outbound_provider_lead_mappings")
      .select("id,provider_lead_id,liftor_contact_id")
      .eq("provider_type", "smartlead")
      .eq("provider_campaign_id", mapping.provider_campaign_id!)
      .in("provider_lead_id", providerLeadIds)
    : { data: [] as Array<{ id: string; provider_lead_id: string | null; liftor_contact_id: string }> };
  const leadMapByProviderId = new Map<string, { id: string; liftor_contact_id: string }>();
  for (const r of (existingLeadMaps ?? []) as Array<{ id: string; provider_lead_id: string | null; liftor_contact_id: string }>) {
    if (r.provider_lead_id) leadMapByProviderId.set(r.provider_lead_id, { id: r.id, liftor_contact_id: r.liftor_contact_id });
  }

  const ctx = {
    business_id: mapping.business_id!,
    business_name,
    provider_campaign_id: mapping.provider_campaign_id!,
    imported_at,
  };

  for (const lead of leads) {
    const knownMap = lead.provider_lead_id ? leadMapByProviderId.get(lead.provider_lead_id) : undefined;
    let existing = lead.email ? byEmail.get(lead.email) ?? null : null;
    if (!existing && knownMap) {
      const { data: c } = await admin.from("contacts")
        .select("id,email,first_name,last_name,name,company,role,linkedin_url,phone,country,email_verified_status,sendable_status,do_not_contact_at,is_globally_suppressed,hard_bounced,unsubscribed_at,archived_at,assigned_business,source_record_id")
        .eq("id", knownMap.liftor_contact_id).maybeSingle();
      existing = (c as ExistingContact | null) ?? null;
    }

    const plan = planContactWrite(lead, existing, ctx);
    if (plan.action === "skip" && !existing) {
      tally(counters, "skip");
      details.push({ email: lead.email, action: "skip", reason: plan.reason });
      continue;
    }

    if (dry_run) {
      tally(counters, plan.action);
      details.push({ email: lead.email, action: plan.action, reason: plan.reason, warnings: plan.warnings });
      continue;
    }

    try {
      let contactId = existing?.id ?? knownMap?.liftor_contact_id ?? null;

      if (plan.action === "create") {
        const { data: ins, error: insErr } = await admin.from("contacts")
          .insert(plan.contact_patch).select("id").single();
        if (insErr) throw new Error(insErr.message);
        contactId = (ins as { id: string }).id;
      } else if (contactId && Object.keys(plan.contact_patch).length > 0) {
        const { error: upErr } = await admin.from("contacts").update(plan.contact_patch).eq("id", contactId);
        if (upErr) throw new Error(upErr.message);
      }
      if (!contactId) throw new Error("contact_id_unresolved");

      // Business association — only the mapped business.
      if (plan.relationship_patch) {
        const { data: rel } = await admin.from("business_contact_relationships")
          .select("id,do_not_contact")
          .eq("contact_id", contactId).eq("business_id", ctx.business_id).maybeSingle();
        const relRow = rel as { id: string; do_not_contact: boolean } | null;
        if (relRow) {
          const patch: Record<string, unknown> = { ...plan.relationship_patch };
          // Never clear an existing do-not-contact on re-import.
          if (relRow.do_not_contact && patch.do_not_contact !== true) delete patch.do_not_contact;
          await admin.from("business_contact_relationships").update(patch).eq("id", relRow.id);
        } else {
          await admin.from("business_contact_relationships")
            .insert({ ...plan.relationship_patch, contact_id: contactId });
        }
      }

      const mapRow = buildLeadMappingRow(lead, {
        ...ctx,
        campaign_mapping_id: mapping.id,
        liftor_campaign_id: mapping.liftor_campaign_id!,
        liftor_contact_id: contactId,
      });
      if (knownMap) {
        await admin.from("outbound_provider_lead_mappings").update(mapRow).eq("id", knownMap.id);
      } else {
        await admin.from("outbound_provider_lead_mappings").insert(mapRow);
      }

      tally(counters, plan.action);
      details.push({ email: lead.email, action: plan.action, reason: plan.reason, warnings: plan.warnings });
    } catch (e) {
      tally(counters, "error");
      details.push({ email: lead.email, action: "error", reason: (e as Error).message });
    }
  }

  await admin.from("outbound_provider_campaign_mappings")
    .update({ last_synced_at: imported_at })
    .eq("id", mapping.id);

  return json({
    ok: true,
    dry_run,
    business_id: mapping.business_id,
    business_name,
    campaign_mapping_id: mapping.id,
    provider_campaign_id: mapping.provider_campaign_id,
    provider_campaign_name: mapping.provider_campaign_name,
    page: { offset, limit, returned: leads.length, total_leads_reported: envelope.total_leads },
    continuation,
    counters,
    details: details.slice(0, 200),
    consent_note: "Smartlead campaign membership is not consent and not send readiness. Imported contacts require review before any outreach.",
    safety: { smartlead_writes: 0, emails_sent: 0, leads_pushed: 0, mode: "read_only_get" },
  });
});
