import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  buildLeadsPath,
  classifySmartleadHttp,
  clampOffset,
  clampPageLimit,
  computeContinuation,
  emptyCounters,
  type ExistingContact,
  mapSmartleadLead,
  type MappingRow,
  normaliseEmail,
  parseLeadsEnvelope,
  resolveMapping,
} from "../_shared/smartleadLeadImport.ts";
import {
  type ImportStore,
  type LeadMappingRecord,
  type RelationshipRecord,
  runImportPage,
} from "../_shared/smartleadImportRunner.ts";

const SMARTLEAD_BASE_URL = "https://server.smartlead.ai/api/v1";

const CONTACT_COLUMNS =
  "id,email,first_name,last_name,name,company,role,linkedin_url,phone,country,email_verified_status,sendable_status,do_not_contact_at,is_globally_suppressed,hard_bounced,unsubscribed_at,archived_at,assigned_business,source_record_id";

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

function throwOn(error: { message: string; code?: string } | null, what: string) {
  if (!error) return;
  const code = error.code ?? "";
  if (code === "23514") {
    throw new Error(
      `${what}_check_constraint_violation: outbound_provider_lead_mappings.push_status does not yet allow 'imported_from_provider'. Apply the prepared idempotency migration first.`,
    );
  }
  throw new Error(`${what}: ${error.message}`);
}

/**
 * Smartlead -> Liftor contact import.
 *
 * Imports leads that ALREADY exist in a mapped Smartlead campaign into Liftor
 * contacts + business_contact_relationships + outbound_provider_lead_mappings.
 * One page per call (paginated, resumable via `offset`).
 *
 * Never sends, never pushes leads, never mutates Smartlead. `dry_run` performs
 * zero writes of any kind, including mapping metadata.
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
  const { data: roles, error: roleErr } = await admin.from("user_roles").select("role").eq("user_id", u.user.id);
  if (roleErr) return json({ ok: false, error: "role_lookup_failed", detail: roleErr.message }, 500);
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

  // Business lookup is a prerequisite — fail closed rather than importing with a blank name.
  const { data: biz, error: bizErr } = await admin
    .from("businesses").select("id,name").eq("id", mapping.business_id!).maybeSingle();
  if (bizErr) return json({ ok: false, error: "business_lookup_failed", detail: bizErr.message }, 500);
  const business_name = String((biz as { name?: string } | null)?.name ?? "").trim();
  if (!business_name) {
    return json({
      ok: false,
      error: "mapped_business_not_found",
      actionable: "The mapping points at a business row that does not exist. Fix the mapping before importing.",
    }, 409);
  }

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
    }, 502);
  }

  const leads = envelope.leads.map(mapSmartleadLead);
  const continuation = computeContinuation(offset, envelope.leads.length, limit, envelope.total_leads);
  const imported_at = new Date().toISOString();

  if (leads.length === 0) {
    return json({
      ok: true,
      empty_page: true,
      empty_reason: offset === 0 ? "campaign_has_no_leads_for_this_key" : "no_further_leads",
      business_id: mapping.business_id,
      provider_campaign_id: mapping.provider_campaign_id,
      total_leads_reported: envelope.total_leads,
      counters: emptyCounters(),
      continuation,
      dry_run,
      safety: { smartlead_writes: 0, emails_sent: 0, leads_pushed: 0, mode: "read_only_get" },
    });
  }

  // 3) Supabase-backed store. Every read/write surfaces its error (no silent ignores).
  const store: ImportStore = {
    async findContactsByEmails(emails) {
      // Case-insensitive match: contacts.email is a case-sensitive column.
      const or = emails.map((e) => `email.ilike.${e.replace(/[,()]/g, "")}`).join(",");
      const { data, error } = await admin.from("contacts").select(CONTACT_COLUMNS).or(or);
      throwOn(error, "contacts_select_failed");
      return (data ?? []) as ExistingContact[];
    },
    async findContactById(id) {
      const { data, error } = await admin.from("contacts").select(CONTACT_COLUMNS).eq("id", id).maybeSingle();
      throwOn(error, "contact_by_id_failed");
      return (data as ExistingContact | null) ?? null;
    },
    async findLeadMappings(providerCampaignId, emails, providerLeadIds) {
      const { data, error } = await admin
        .from("outbound_provider_lead_mappings")
        .select("id,provider_lead_id,contact_email,liftor_contact_id")
        .eq("provider_type", "smartlead")
        .eq("provider_campaign_id", providerCampaignId);
      throwOn(error, "provider_lead_mapping_select_failed");
      const emailSet = new Set(emails);
      const idSet = new Set(providerLeadIds);
      return ((data ?? []) as LeadMappingRecord[]).filter((r) =>
        (r.provider_lead_id && idSet.has(r.provider_lead_id)) ||
        (normaliseEmail(r.contact_email) && emailSet.has(normaliseEmail(r.contact_email)!))
      );
    },
    async insertContact(patch) {
      const { data, error } = await admin.from("contacts").insert(patch).select("id").single();
      if (error && (error as { code?: string }).code === "23505") {
        // Concurrent import created it first — adopt the existing row instead of failing.
        const email = String(patch.email ?? "");
        const { data: found, error: findErr } = await admin
          .from("contacts").select("id").ilike("email", email).limit(1).maybeSingle();
        throwOn(findErr, "contact_conflict_recovery_failed");
        if (found) return { id: (found as { id: string }).id };
      }
      throwOn(error, "contact_insert_failed");
      return { id: (data as { id: string }).id };
    },
    async updateContact(id, patch) {
      const { error } = await admin.from("contacts").update(patch).eq("id", id);
      throwOn(error, "contact_update_failed");
    },
    async findRelationship(contactId, businessName, businessId) {
      const { data, error } = await admin
        .from("business_contact_relationships")
        .select("id,do_not_contact,business_id,business_name")
        .eq("contact_id", contactId);
      throwOn(error, "relationship_select_failed");
      const rows = (data ?? []) as Array<RelationshipRecord & { business_id: string | null; business_name: string }>;
      return rows.find((r) => r.business_id === businessId || r.business_name === businessName) ?? null;
    },
    async insertRelationship(row) {
      const { error } = await admin.from("business_contact_relationships").insert(row);
      if (error && (error as { code?: string }).code === "23505") return; // unique(contact_id,business_name)
      throwOn(error, "relationship_insert_failed");
    },
    async updateRelationship(id, patch) {
      const { error } = await admin.from("business_contact_relationships").update(patch).eq("id", id);
      throwOn(error, "relationship_update_failed");
    },
    async insertLeadMapping(row) {
      const { data, error } = await admin.from("outbound_provider_lead_mappings").insert(row).select("id").single();
      if (error && (error as { code?: string }).code === "23505") {
        // unique(provider_type, provider_campaign_id, lower(contact_email))
        const { data: found, error: findErr } = await admin
          .from("outbound_provider_lead_mappings").select("id")
          .eq("provider_type", "smartlead")
          .eq("provider_campaign_id", String(row.provider_campaign_id ?? ""))
          .ilike("contact_email", String(row.contact_email ?? ""))
          .limit(1).maybeSingle();
        throwOn(findErr, "lead_mapping_conflict_recovery_failed");
        if (found) {
          const id = (found as { id: string }).id;
          const { error: upErr } = await admin.from("outbound_provider_lead_mappings").update(row).eq("id", id);
          throwOn(upErr, "lead_mapping_conflict_update_failed");
          return { id };
        }
      }
      throwOn(error, "lead_mapping_insert_failed");
      return { id: (data as { id: string }).id };
    },
    async updateLeadMapping(id, patch) {
      const { error } = await admin.from("outbound_provider_lead_mappings").update(patch).eq("id", id);
      throwOn(error, "lead_mapping_update_failed");
    },
    async touchMappingSync(campaignMappingId, at) {
      const { error } = await admin
        .from("outbound_provider_campaign_mappings").update({ last_synced_at: at }).eq("id", campaignMappingId);
      throwOn(error, "mapping_sync_update_failed");
    },
  };

  const result = await runImportPage({ leads, mapping, business_name, imported_at, dry_run, store });

  if (!result.ok) {
    return json({
      ok: false,
      error: result.prerequisite_error,
      detail: result.prerequisite_detail,
      actionable: "Prerequisite lookup failed — nothing was written. Retry; no partial state was created.",
      resume_offset: offset,
      counters: result.counters,
      dry_run,
    }, 500);
  }

  return json({
    ok: true,
    dry_run,
    business_id: mapping.business_id,
    business_name,
    campaign_mapping_id: mapping.id,
    provider_campaign_id: mapping.provider_campaign_id,
    provider_campaign_name: mapping.provider_campaign_name,
    page: { offset, limit, returned: leads.length, total_leads_reported: envelope.total_leads },
    // The checkpoint may only advance when every row of this page resolved.
    page_complete: result.page_complete,
    continuation: result.page_complete
      ? continuation
      : { has_more: continuation.has_more, next_offset: null },
    resume_offset: result.page_complete ? continuation.next_offset : offset,
    unresolved_rows: result.unresolved_rows,
    counters: result.counters,
    details: result.details.slice(0, 200),
    consent_note:
      "Smartlead campaign membership is not consent and not send readiness. Imported contacts follow the existing approved cohort/policy eligibility model; unknown verification or any suppression flag blocks eligibility. No per-contact approval loop is introduced.",
    safety: {
      smartlead_writes: 0,
      emails_sent: 0,
      leads_pushed: 0,
      mode: "read_only_get",
      liftor_writes: dry_run ? 0 : result.writes,
    },
  });
});
