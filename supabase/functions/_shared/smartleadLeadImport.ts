/**
 * Smartlead -> Liftor contact import logic (pure, testable).
 *
 * SAFETY CONTRACT (enforced by these functions and by the calling edge function):
 *  - Smartlead access is READ-ONLY GET only. Nothing here builds a POST/PUT/PATCH.
 *  - Campaign membership is NEVER treated as consent or send readiness.
 *  - Suppression / do-not-contact / bounce / unsubscribe flags can only be set,
 *    never cleared, by an import.
 *  - Verified data is never replaced by blank, masked or unknown data.
 *  - Records are associated only to the business of the selected campaign mapping.
 *
 * Docs: GET /api/v1/campaigns/{campaign_id}/leads?offset=&limit= (limit <= 100)
 * https://api.smartlead.ai/api-reference/leads/get-by-campaign
 */

export const SMARTLEAD_LEADS_MAX_LIMIT = 100;
export const SMARTLEAD_IMPORT_PUSH_STATUS = "imported_from_provider";

export type ImportAction = "create" | "update" | "hold" | "skip";

export interface SmartleadLeadRaw {
  [k: string]: unknown;
}

export interface NormalisedLead {
  provider_lead_id: string | null;
  email: string | null;
  email_key: string | null;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  company: string | null;
  role: string | null;
  linkedin_url: string | null;
  phone: string | null;
  country: string | null;
  website: string | null;
  /** Only what the provider actually supplied. Missing => "unknown". */
  verification_status: string;
  campaign_lead_status: string | null;
  is_unsubscribed: boolean;
  is_bounced: boolean;
  has_replied: boolean;
  is_paused: boolean;
  source_created_at: string | null;
  source_updated_at: string | null;
  raw: SmartleadLeadRaw;
}

export interface HttpClassification {
  kind:
    | "ok"
    | "unauthorized"
    | "forbidden"
    | "not_found"
    | "rate_limited"
    | "server_error"
    | "network_error"
    | "bad_response";
  retryable: boolean;
  actionable: string;
}

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

const MASKED_RE = /^[*x•.\s]+$/i;

export function normaliseEmail(value: unknown): string | null {
  const s = String(value ?? "").trim().toLowerCase();
  if (!s || !s.includes("@")) return null;
  return s;
}

/** Blank, whitespace, literal "null"/"unknown" or fully masked values are meaningless. */
export function isMeaningful(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  const s = String(value).trim();
  if (!s) return false;
  if (["null", "undefined", "n/a", "na", "unknown", "-"].includes(s.toLowerCase())) return false;
  if (MASKED_RE.test(s)) return false;
  if (s.includes("***")) return false;
  return true;
}

function str(v: unknown): string | null {
  return isMeaningful(v) ? String(v).trim() : null;
}

function bool(v: unknown): boolean {
  if (v === true) return true;
  const s = String(v ?? "").trim().toLowerCase();
  return s === "true" || s === "1" || s === "yes";
}

function iso(v: unknown): string | null {
  if (!isMeaningful(v)) return null;
  const d = new Date(String(v));
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/* ------------------------------------------------------------------ */
/* pagination                                                          */
/* ------------------------------------------------------------------ */

export function clampPageLimit(n: unknown): number {
  const v = Math.floor(Number(n));
  if (!Number.isFinite(v) || v < 1) return SMARTLEAD_LEADS_MAX_LIMIT;
  return Math.min(v, SMARTLEAD_LEADS_MAX_LIMIT);
}

export function clampOffset(n: unknown): number {
  const v = Math.floor(Number(n));
  return !Number.isFinite(v) || v < 0 ? 0 : v;
}

export function buildLeadsPath(campaignId: string, offset: number, limit: number): string {
  return `/campaigns/${encodeURIComponent(campaignId)}/leads?offset=${clampOffset(offset)}&limit=${clampPageLimit(limit)}`;
}

export interface LeadsEnvelope {
  leads: SmartleadLeadRaw[];
  total_leads: number | null;
  malformed: boolean;
}

/** Smartlead returns { total_leads, data: [{ lead: {...}, ... }] } — tolerate variants. */
export function parseLeadsEnvelope(body: unknown): LeadsEnvelope {
  if (Array.isArray(body)) return { leads: body as SmartleadLeadRaw[], total_leads: null, malformed: false };
  if (!body || typeof body !== "object") return { leads: [], total_leads: null, malformed: true };
  const o = body as Record<string, unknown>;
  const arr = (Array.isArray(o.data) && o.data) ||
    (Array.isArray(o.leads) && o.leads) ||
    (Array.isArray(o.results) && o.results) ||
    null;
  if (!arr) return { leads: [], total_leads: null, malformed: true };
  const total = Number(o.total_leads ?? o.total ?? NaN);
  return {
    leads: arr as SmartleadLeadRaw[],
    total_leads: Number.isFinite(total) ? total : null,
    malformed: false,
  };
}

export interface Continuation {
  has_more: boolean;
  next_offset: number | null;
}

export function computeContinuation(
  offset: number,
  fetched: number,
  limit: number,
  total: number | null,
): Continuation {
  const consumed = clampOffset(offset) + fetched;
  if (fetched === 0) return { has_more: false, next_offset: null };
  if (total !== null && consumed >= total) return { has_more: false, next_offset: null };
  if (fetched < clampPageLimit(limit) && total === null) return { has_more: false, next_offset: null };
  return { has_more: true, next_offset: consumed };
}

/* ------------------------------------------------------------------ */
/* provider errors                                                     */
/* ------------------------------------------------------------------ */

export function classifySmartleadHttp(status: number, malformed = false): HttpClassification {
  if (status === 0) {
    return { kind: "network_error", retryable: true, actionable: "Smartlead unreachable — retry; no data imported." };
  }
  if (status === 401) {
    return {
      kind: "unauthorized",
      retryable: false,
      actionable: "Smartlead rejected the API key (401). Key invalid or revoked — this is an account/key problem, not an empty campaign.",
    };
  }
  if (status === 403) {
    return {
      kind: "forbidden",
      retryable: false,
      actionable: "Smartlead returned 403 — the key exists but the account/plan does not entitle API access to this campaign. Not an empty campaign. Confirm API entitlement with Smartlead before assuming a plan change fixes it.",
    };
  }
  if (status === 404) {
    return { kind: "not_found", retryable: false, actionable: "Smartlead campaign not found for this key." };
  }
  if (status === 429) {
    return { kind: "rate_limited", retryable: true, actionable: "Smartlead rate limit — resume from the reported next offset later." };
  }
  if (status >= 500) {
    return { kind: "server_error", retryable: true, actionable: "Smartlead server error — resume from the reported next offset." };
  }
  if (!(status >= 200 && status < 300)) {
    return { kind: "bad_response", retryable: false, actionable: `Unexpected Smartlead status ${status}.` };
  }
  if (malformed) {
    return { kind: "bad_response", retryable: false, actionable: "Smartlead response envelope was not recognised; nothing imported." };
  }
  return { kind: "ok", retryable: false, actionable: "" };
}

/* ------------------------------------------------------------------ */
/* lead mapping                                                        */
/* ------------------------------------------------------------------ */

const UNSUB_TOKENS = ["unsubscribed", "opted_out", "opt_out", "do_not_contact", "blocked"];
const BOUNCE_TOKENS = ["bounced", "hard_bounce", "bounce"];
const REPLY_TOKENS = ["replied", "reply", "interested", "not_interested", "meeting_booked"];
const PAUSE_TOKENS = ["paused", "stopped", "on_hold"];

export function mapSmartleadLead(row: SmartleadLeadRaw): NormalisedLead {
  const inner = (row && typeof row === "object" && row.lead && typeof row.lead === "object")
    ? { ...(row.lead as Record<string, unknown>), ...row }
    : (row as Record<string, unknown>);

  const email = normaliseEmail(inner.email);
  const status = str(inner.status ?? inner.lead_status ?? inner.campaign_lead_map_status);
  const statusKey = (status ?? "").toLowerCase();

  const providerId = str(inner.lead_id ?? inner.id ?? (row as Record<string, unknown>).lead_id);

  // Verification status is only what the provider actually supplied.
  const rawVerification = inner.verification_status ?? inner.email_verification_status ??
    inner.is_verified ?? inner.email_status;
  let verification = "unknown";
  if (isMeaningful(rawVerification)) {
    verification = rawVerification === true
      ? "verified"
      : rawVerification === false
      ? "unknown"
      : String(rawVerification).trim().toLowerCase();
  }

  const first = str(inner.first_name);
  const last = str(inner.last_name);
  const full = str(inner.name) ?? [first, last].filter(Boolean).join(" ").trim() || null;

  return {
    provider_lead_id: providerId,
    email,
    email_key: email,
    first_name: first,
    last_name: last,
    full_name: full,
    company: str(inner.company_name ?? inner.company),
    role: str(inner.job_title ?? inner.title ?? inner.role),
    linkedin_url: str(inner.linkedin_profile ?? inner.linkedin_url),
    phone: str(inner.phone_number ?? inner.phone),
    country: str(inner.country ?? inner.location),
    website: str(inner.website ?? inner.company_url),
    verification_status: verification,
    campaign_lead_status: status,
    is_unsubscribed: bool(inner.is_unsubscribed) || UNSUB_TOKENS.some((t) => statusKey.includes(t)),
    is_bounced: bool(inner.is_bounced) || BOUNCE_TOKENS.some((t) => statusKey.includes(t)),
    has_replied: bool(inner.has_replied ?? inner.is_replied) || REPLY_TOKENS.some((t) => statusKey.includes(t)),
    is_paused: bool(inner.is_paused) || PAUSE_TOKENS.some((t) => statusKey.includes(t)),
    source_created_at: iso(inner.created_at),
    source_updated_at: iso(inner.updated_at),
    raw: row,
  };
}

/* ------------------------------------------------------------------ */
/* contact write planning                                              */
/* ------------------------------------------------------------------ */

export interface ExistingContact {
  id: string;
  email: string | null;
  first_name?: string | null;
  last_name?: string | null;
  name?: string | null;
  company?: string | null;
  role?: string | null;
  linkedin_url?: string | null;
  phone?: string | null;
  country?: string | null;
  email_verified_status?: string | null;
  sendable_status?: string | null;
  do_not_contact_at?: string | null;
  is_globally_suppressed?: boolean | null;
  hard_bounced?: boolean | null;
  unsubscribed_at?: string | null;
  archived_at?: string | null;
  assigned_business?: string | null;
  source_record_id?: string | null;
}

export interface PlanContext {
  business_id: string;
  business_name: string;
  provider_campaign_id: string;
  imported_at: string;
}

export interface PlannedWrite {
  action: ImportAction;
  reason: string;
  contact_patch: Record<string, unknown>;
  relationship_patch: Record<string, unknown> | null;
  warnings: string[];
  send_ready: false;
}

const VERIFICATION_RANK: Record<string, number> = {
  verified: 3,
  valid: 3,
  deliverable: 3,
  catch_all: 2,
  risky: 2,
  unverified: 1,
  invalid: 1,
  unknown: 0,
};

export function verificationRank(v: unknown): number {
  const k = String(v ?? "unknown").trim().toLowerCase();
  return VERIFICATION_RANK[k] ?? 1;
}

/** Only fill fields that are empty locally; never overwrite existing data with imports. */
function fillIfEmpty(
  patch: Record<string, unknown>,
  existing: ExistingContact | null,
  key: keyof ExistingContact,
  value: string | null,
) {
  if (!value) return;
  if (existing && isMeaningful(existing[key])) return;
  patch[key as string] = value;
}

export function planContactWrite(
  lead: NormalisedLead,
  existing: ExistingContact | null,
  ctx: PlanContext,
): PlannedWrite {
  const warnings: string[] = [];
  const patch: Record<string, unknown> = {};

  if (!lead.email) {
    return {
      action: "skip",
      reason: "missing_email",
      contact_patch: {},
      relationship_patch: null,
      warnings: ["Smartlead lead had no usable email."],
      send_ready: false,
    };
  }

  // Provenance — always recorded, never destructive.
  const provenance = {
    source_platform: "smartlead",
    source: "smartlead_campaign_import",
    data_source: "smartlead",
    source_record_id: lead.provider_lead_id,
    source_collected_at: lead.source_created_at ?? ctx.imported_at,
  };

  fillIfEmpty(patch, existing, "first_name", lead.first_name);
  fillIfEmpty(patch, existing, "last_name", lead.last_name);
  fillIfEmpty(patch, existing, "company", lead.company);
  fillIfEmpty(patch, existing, "role", lead.role);
  fillIfEmpty(patch, existing, "linkedin_url", lead.linkedin_url);
  fillIfEmpty(patch, existing, "phone", lead.phone);
  fillIfEmpty(patch, existing, "country", lead.country);
  if (lead.full_name && !(existing && isMeaningful(existing.name))) patch.name = lead.full_name;

  // Verification may only be upgraded, never downgraded to unknown/blank.
  const incomingRank = verificationRank(lead.verification_status);
  if (existing) {
    const currentRank = verificationRank(existing.email_verified_status);
    if (incomingRank > currentRank) {
      patch.email_verified_status = lead.verification_status;
    } else if (incomingRank < currentRank) {
      warnings.push("kept_stronger_local_verification");
    }
  } else if (lead.verification_status !== "unknown") {
    patch.email_verified_status = lead.verification_status;
  }

  // Provider negative signals tighten only.
  if (lead.is_unsubscribed) {
    patch.unsubscribed_at = existing?.unsubscribed_at ?? ctx.imported_at;
    patch.unsubscribe_source = "smartlead";
    patch.sendable_status = "suppressed";
  }
  if (lead.is_bounced) {
    patch.hard_bounced = true;
    patch.sendable_status = "suppressed";
  }

  const locallySuppressed = !!(
    existing &&
    (existing.do_not_contact_at || existing.is_globally_suppressed || existing.hard_bounced ||
      existing.unsubscribed_at || existing.archived_at ||
      existing.sendable_status === "suppressed")
  );

  // Suppression flags can never be cleared by an import.
  delete (patch as Record<string, unknown>).do_not_contact_at;
  delete (patch as Record<string, unknown>).is_globally_suppressed;

  const relationship_patch: Record<string, unknown> = {
    business_id: ctx.business_id,
    business_name: ctx.business_name,
    // Campaign membership is not consent — never eligible from an import.
    campaign_eligible: false,
    notes: `Imported from Smartlead campaign ${ctx.provider_campaign_id} on ${ctx.imported_at}. Provider lead status: ${lead.campaign_lead_status ?? "unknown"}. Membership is not send consent.`,
  };
  if (lead.is_unsubscribed || lead.is_bounced || locallySuppressed) {
    relationship_patch.do_not_contact = true;
    relationship_patch.do_not_contact_reason = lead.is_unsubscribed
      ? "smartlead_unsubscribed"
      : lead.is_bounced
      ? "smartlead_hard_bounce"
      : "existing_liftor_suppression";
    relationship_patch.current_stage = "do_not_contact";
  }

  if (existing && locallySuppressed) {
    // Hold: keep provenance + tightening only, no profile edits.
    const held: Record<string, unknown> = {};
    if (patch.unsubscribed_at) held.unsubscribed_at = patch.unsubscribed_at;
    if (patch.unsubscribe_source) held.unsubscribe_source = patch.unsubscribe_source;
    if (patch.hard_bounced) held.hard_bounced = patch.hard_bounced;
    return {
      action: "hold",
      reason: "existing_contact_suppressed_or_do_not_contact",
      contact_patch: held,
      relationship_patch,
      warnings: [...warnings, "suppressed_contact_not_modified"],
      send_ready: false,
    };
  }

  if (!existing) {
    return {
      action: "create",
      reason: "new_contact_from_smartlead_campaign",
      contact_patch: {
        email: lead.email,
        name: lead.full_name ?? lead.email,
        company: lead.company ?? "",
        role: lead.role ?? "",
        status: lead.is_unsubscribed || lead.is_bounced ? "DO_NOT_CONTACT" : "NEW",
        // Membership is never readiness: imported contacts need review before any send.
        sendable_status: lead.is_unsubscribed || lead.is_bounced ? "suppressed" : "needs_review",
        ...provenance,
        ...patch,
      },
      relationship_patch,
      warnings,
      send_ready: false,
    };
  }

  // Existing contact keeps its business assignment; imports never reassign it.
  if (
    existing.assigned_business && isMeaningful(existing.assigned_business) &&
    existing.assigned_business !== ctx.business_id && existing.assigned_business !== ctx.business_name
  ) {
    warnings.push("contact_already_assigned_to_other_business_assignment_left_unchanged");
  }
  if (!isMeaningful(existing.source_record_id) && lead.provider_lead_id) {
    patch.source_record_id = lead.provider_lead_id;
    patch.source_platform = "smartlead";
  }

  return {
    action: Object.keys(patch).length > 0 ? "update" : "skip",
    reason: Object.keys(patch).length > 0 ? "existing_contact_enriched" : "no_new_information",
    contact_patch: patch,
    relationship_patch,
    warnings,
    send_ready: false,
  };
}

/* ------------------------------------------------------------------ */
/* lead mapping row                                                    */
/* ------------------------------------------------------------------ */

export function buildLeadMappingRow(
  lead: NormalisedLead,
  ctx: PlanContext & { campaign_mapping_id: string; liftor_campaign_id: string; liftor_contact_id: string },
) {
  return {
    business_id: ctx.business_id,
    campaign_mapping_id: ctx.campaign_mapping_id,
    liftor_campaign_id: ctx.liftor_campaign_id,
    liftor_contact_id: ctx.liftor_contact_id,
    contact_email: lead.email ?? "",
    provider_type: "smartlead",
    provider_campaign_id: ctx.provider_campaign_id,
    provider_lead_id: lead.provider_lead_id,
    push_status: SMARTLEAD_IMPORT_PUSH_STATUS,
    metadata: {
      direction: "import_from_provider",
      imported_at: ctx.imported_at,
      provider_lead_status: lead.campaign_lead_status,
      provider_flags: {
        unsubscribed: lead.is_unsubscribed,
        bounced: lead.is_bounced,
        replied: lead.has_replied,
        paused: lead.is_paused,
      },
      verification_status_as_supplied: lead.verification_status,
      source_created_at: lead.source_created_at,
      source_updated_at: lead.source_updated_at,
      consent: "campaign_membership_is_not_consent",
    },
    provider_response: lead.raw as unknown,
  };
}

export interface ImportCounters {
  processed: number;
  created: number;
  updated: number;
  held: number;
  skipped: number;
  errors: number;
}

export function emptyCounters(): ImportCounters {
  return { processed: 0, created: 0, updated: 0, held: 0, skipped: 0, errors: 0 };
}

export function tally(counters: ImportCounters, action: ImportAction | "error") {
  counters.processed += 1;
  if (action === "create") counters.created += 1;
  else if (action === "update") counters.updated += 1;
  else if (action === "hold") counters.held += 1;
  else if (action === "skip") counters.skipped += 1;
  else counters.errors += 1;
}

/* ------------------------------------------------------------------ */
/* mapping resolution                                                  */
/* ------------------------------------------------------------------ */

export interface MappingRow {
  id: string;
  business_id: string | null;
  liftor_campaign_id: string | null;
  provider_campaign_id: string | null;
  provider_campaign_name: string | null;
  mapping_status: string;
  is_active: boolean;
}

export type MappingResolution =
  | { ok: true; mapping: MappingRow }
  | { ok: false; error: string; actionable: string; candidates: MappingRow[] };

export function resolveMapping(
  rows: MappingRow[],
  opts: { campaign_mapping_id?: string | null; provider_campaign_id?: string | null },
): MappingResolution {
  let pool = rows.filter((r) => r.is_active && r.mapping_status === "mapped");
  if (opts.campaign_mapping_id) pool = pool.filter((r) => r.id === opts.campaign_mapping_id);
  if (opts.provider_campaign_id) pool = pool.filter((r) => r.provider_campaign_id === opts.provider_campaign_id);

  if (pool.length === 0) {
    return {
      ok: false,
      error: "campaign_not_mapped",
      actionable: "This Smartlead campaign is not mapped to a Liftor business/campaign. Create an active mapping in the Smartlead campaign mapping panel first — ownership is never guessed.",
      candidates: [],
    };
  }
  if (pool.length > 1) {
    return {
      ok: false,
      error: "ambiguous_campaign_mapping",
      actionable: "Several active mappings match. Select one explicitly by campaign_mapping_id — ownership is never guessed.",
      candidates: pool,
    };
  }
  const m = pool[0];
  if (!m.business_id || !m.provider_campaign_id || !m.liftor_campaign_id) {
    return {
      ok: false,
      error: "incomplete_campaign_mapping",
      actionable: "The mapping is missing a business, Liftor campaign or Smartlead campaign id. Complete the mapping before importing.",
      candidates: [m],
    };
  }
  return { ok: true, mapping: m };
}
