/**
 * GSM Outbound Infrastructure — deterministic readiness, capacity and pool logic.
 *
 * PURE. No IO, no secrets, no provider calls.
 *
 * Global Solutions Management LLC (GSM) owns ONE shared portfolio sending estate:
 * up to 10 GSM-controlled sending domains carrying ~50 mailboxes, split into a
 * Launch Lane (target 30, lent to the business currently launching) and an
 * Evergreen Lane (target 20, small persistent allocations per graduated business).
 *
 * Physical mailboxes are GSM-owned for their whole life. Only the ALLOCATION
 * moves between pools / businesses / campaigns. An in-flight allocation is
 * sticky: reallocating launch capacity must never rewrite a live thread.
 */

export const GSM_ESTATE_VERSION = "gsm-sender-estate-1.0.0";

export const GSM_OWNER_LEGAL_ENTITY = "Global Solutions Management LLC";
export const GSM_TARGET_TOTAL_MAILBOXES = 50;
export const GSM_TARGET_MAX_DOMAINS = 10;
export const GSM_LAUNCH_POOL_KEY = "gsm_launch_lane";
export const GSM_EVERGREEN_POOL_KEY = "gsm_evergreen_lane";
export const GSM_QUARANTINE_POOL_KEY = "gsm_quarantine";
export const GSM_LAUNCH_TARGET_CAPACITY = 30;
export const GSM_EVERGREEN_TARGET_CAPACITY = 20;
export const GSM_EVERGREEN_DEFAULT_PER_BUSINESS = 5;

/** Legacy estate that must never be pulled into the GSM portfolio estate. */
export const NON_GSM_EXCLUDED_EMAILS = ["hello@neoncandy.online"];
export const NON_GSM_EXCLUDED_DOMAINS = ["neoncandy.online"];
export const EXTERNAL_NON_GSM = "external_non_gsm";

/** Field names that must never be persisted onto a GSM mailbox/domain row. */
export const FORBIDDEN_SECRET_FIELDS = [
  "smtp_password",
  "imap_password",
  "password",
  "api_key",
  "api_token",
  "winnr_api_token",
  "smartlead_api_key",
  "access_token",
  "refresh_token",
  "client_secret",
  "secret",
];

export type GsmReadinessState =
  | "provisioned_pending"
  | "dns_pending"
  | "smtp_failed"
  | "imap_failed"
  | "smartlead_disconnected"
  | "warming"
  | "campaign_ready"
  | "quarantined"
  | "retired";

export interface GsmDomainSignals {
  id?: string;
  domain?: string | null;
  provisioning_status?: string | null;
  dns_status?: string | null;
  spf_ok?: boolean | null;
  dkim_ok?: boolean | null;
  dmarc_ok?: boolean | null;
}

export interface GsmMailboxSignals {
  id: string;
  email: string;
  sending_domain_id?: string | null;
  provider?: string | null;
  provider_mailbox_id?: string | null;
  smartlead_email_account_id?: string | null;
  smtp_status?: string | null;
  imap_status?: string | null;
  smartlead_status?: string | null;
  warmup_status?: string | null;
  provider_health?: string | null;
  configured_daily_limit?: number | null;
  quarantined_reason?: string | null;
  retired?: boolean | null;
  active?: boolean | null;
  estate_classification?: string | null;
}

export interface GsmReadinessResult {
  mailbox_id: string;
  email: string;
  readiness_state: GsmReadinessState;
  campaign_ready: boolean;
  reasons: string[];
  usable_daily_capacity: number;
  engine_version: string;
}

function norm(v: unknown): string {
  return String(v ?? "").trim().toLowerCase();
}

const OK_SMTP = new Set(["ok", "success", "passed", "connected", "true", "verified"]);
const OK_IMAP = OK_SMTP;
const OK_SMARTLEAD = new Set(["connected", "active", "ok", "linked"]);
const WARM_DONE = new Set(["completed", "complete", "warm", "ready", "finished", "not_required"]);
const WARMING = new Set(["warming", "in_progress", "running", "started", "active"]);
const BAD_HEALTH = new Set(["unhealthy", "critical", "error", "failing", "suspended", "blocked"]);

export function emailDomain(email: string): string {
  const at = String(email ?? "").lastIndexOf("@");
  return at === -1 ? "" : norm(String(email).slice(at + 1));
}

/** Legacy Neon Candy infrastructure can never join or be allocated from the GSM estate. */
export function isExcludedFromGsmEstate(email: string): boolean {
  const e = norm(email);
  if (!e) return true;
  if (NON_GSM_EXCLUDED_EMAILS.map(norm).includes(e)) return true;
  return NON_GSM_EXCLUDED_DOMAINS.map(norm).includes(emailDomain(e));
}

export function classifyEstate(email: string): "gsm" | typeof EXTERNAL_NON_GSM {
  return isExcludedFromGsmEstate(email) ? EXTERNAL_NON_GSM : "gsm";
}

/** Strip anything that looks like a credential before persisting a provider payload. */
export function stripSecretFields<T extends Record<string, unknown>>(row: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    const key = norm(k);
    const looksSecret =
      FORBIDDEN_SECRET_FIELDS.includes(key) ||
      key.includes("password") ||
      key.includes("api_key") ||
      key.includes("apikey") ||
      key.includes("token") ||
      key.includes("secret") ||
      key.includes("credential");
    if (looksSecret) continue;
    out[k] = v;
  }
  return out as T;
}

export function domainReady(d?: GsmDomainSignals | null): boolean {
  if (!d) return false;
  if (norm(d.provisioning_status) !== "provisioned" && norm(d.provisioning_status) !== "active") return false;
  if (norm(d.dns_status) !== "verified" && norm(d.dns_status) !== "ok") return false;
  return d.spf_ok === true && d.dkim_ok === true && d.dmarc_ok === true;
}

/**
 * Deterministic readiness. Existing is NOT ready. Order matters: the first
 * failing gate names the state so the founder always sees the true blocker.
 */
export function evaluateMailboxReadiness(
  m: GsmMailboxSignals,
  domain?: GsmDomainSignals | null,
): GsmReadinessResult {
  const reasons: string[] = [];
  let state: GsmReadinessState | null = null;

  const setState = (s: GsmReadinessState, reason: string) => {
    reasons.push(reason);
    if (state === null) state = s;
  };

  if (isExcludedFromGsmEstate(m.email) || norm(m.estate_classification) === EXTERNAL_NON_GSM) {
    setState("retired", "external_non_gsm_mailbox");
  }
  if (m.retired === true) setState("retired", "retired");
  if (m.active === false) setState("retired", "inactive");
  if (m.quarantined_reason) setState("quarantined", `quarantined:${m.quarantined_reason}`);
  if (BAD_HEALTH.has(norm(m.provider_health))) setState("quarantined", "provider_health_bad");

  if (!m.provider_mailbox_id && !m.smartlead_email_account_id) {
    setState("provisioned_pending", "no_provider_identifier");
  }
  if (!m.sending_domain_id || !domainReady(domain)) {
    setState("dns_pending", "sending_domain_not_verified");
  }
  if (!OK_SMTP.has(norm(m.smtp_status))) setState("smtp_failed", "smtp_not_ok");
  if (!OK_IMAP.has(norm(m.imap_status))) setState("imap_failed", "imap_not_ok");
  if (!m.smartlead_email_account_id || !OK_SMARTLEAD.has(norm(m.smartlead_status))) {
    setState("smartlead_disconnected", "smartlead_account_not_connected");
  }
  if (!WARM_DONE.has(norm(m.warmup_status))) {
    setState("warming", WARMING.has(norm(m.warmup_status)) ? "warmup_in_progress" : "warmup_not_started");
  }
  const limit = Number(m.configured_daily_limit ?? 0);
  if (!Number.isFinite(limit) || limit <= 0) setState("provisioned_pending", "no_configured_daily_limit");

  const finalState: GsmReadinessState = state ?? "campaign_ready";
  return {
    mailbox_id: m.id,
    email: m.email,
    readiness_state: finalState,
    campaign_ready: finalState === "campaign_ready",
    reasons,
    usable_daily_capacity: finalState === "campaign_ready" ? Math.max(0, Math.floor(limit)) : 0,
    engine_version: GSM_ESTATE_VERSION,
  };
}

// ---------------------------------------------------------------------------
// Pool allocation
// ---------------------------------------------------------------------------

export interface GsmAllocationRecord {
  id: string;
  mailbox_id: string;
  pool_id?: string | null;
  pool_key?: string | null;
  business_id?: string | null;
  liftor_campaign_id?: string | null;
  allocation_status?: string | null;
  in_flight?: boolean | null;
  sticky_until?: string | null;
}

export interface GsmSelectionRequest {
  pool_key: string;
  requested_count: number;
  business_id?: string | null;
  liftor_campaign_id?: string | null;
  now?: string;
  /** Founder override may re-prioritise, never bypass a hard safety block. */
  founder_override?: boolean;
}

export interface GsmSelectionCandidate {
  mailbox_id: string;
  email: string;
  readiness_state: GsmReadinessState;
  usable_daily_capacity: number;
}

export interface GsmSelectionRejection {
  mailbox_id: string;
  email: string;
  codes: string[];
}

export interface GsmSelectionResult {
  ok: boolean;
  pool_key: string;
  requested_count: number;
  selected: GsmSelectionCandidate[];
  rejected: GsmSelectionRejection[];
  shortfall: number;
  total_daily_capacity: number;
  decision: "selected" | "partial" | "blocked_no_ready_mailbox";
  decision_reason: string | null;
  engine_version: string;
}

/** Is this allocation locked to its current owner (live thread protection)? */
export function isStickyAllocation(a: GsmAllocationRecord, now = new Date().toISOString()): boolean {
  if (norm(a.allocation_status) !== "active") return false;
  if (a.in_flight === true) return true;
  if (a.sticky_until) {
    const t = new Date(a.sticky_until).getTime();
    if (Number.isFinite(t) && t > new Date(now).getTime()) return true;
  }
  return false;
}

/**
 * Choose GSM mailboxes for a Launch or Evergreen allocation.
 * Selection is by stable mailbox id, never by email string matching.
 */
export function selectGsmMailboxes(
  mailboxes: GsmMailboxSignals[],
  domains: GsmDomainSignals[],
  allocations: GsmAllocationRecord[],
  req: GsmSelectionRequest,
): GsmSelectionResult {
  const now = req.now ?? new Date().toISOString();
  const domainById = new Map(domains.filter((d) => d.id).map((d) => [d.id as string, d]));
  const activeByMailbox = new Map<string, GsmAllocationRecord>();
  for (const a of allocations) {
    if (norm(a.allocation_status) === "active") activeByMailbox.set(a.mailbox_id, a);
  }

  const selected: GsmSelectionCandidate[] = [];
  const rejected: GsmSelectionRejection[] = [];

  const scored = mailboxes
    .map((m) => ({ m, r: evaluateMailboxReadiness(m, m.sending_domain_id ? domainById.get(m.sending_domain_id) : null) }))
    .sort(
      (a, b) =>
        b.r.usable_daily_capacity - a.r.usable_daily_capacity ||
        a.m.email.localeCompare(b.m.email),
    );

  for (const { m, r } of scored) {
    const codes: string[] = [];

    // Hard safety blocks — a founder override can never bypass these.
    if (isExcludedFromGsmEstate(m.email)) codes.push("excluded_non_gsm_neon_candy");
    if (!r.campaign_ready) codes.push(`not_campaign_ready:${r.readiness_state}`);

    const active = activeByMailbox.get(m.id);
    if (active) {
      const sameOwner =
        (active.pool_key ? norm(active.pool_key) === norm(req.pool_key) : true) &&
        (req.business_id ? active.business_id === req.business_id : !active.business_id);
      if (isStickyAllocation(active, now) && !sameOwner) {
        codes.push("sticky_in_flight_allocation");
      } else if (!sameOwner && !req.founder_override) {
        codes.push("allocated_to_other_owner");
      }
    }

    if (codes.length > 0) {
      rejected.push({ mailbox_id: m.id, email: m.email, codes });
      continue;
    }
    if (selected.length < Math.max(0, Math.floor(req.requested_count))) {
      selected.push({
        mailbox_id: m.id,
        email: m.email,
        readiness_state: r.readiness_state,
        usable_daily_capacity: r.usable_daily_capacity,
      });
    }
  }

  const requested = Math.max(0, Math.floor(req.requested_count));
  const shortfall = Math.max(0, requested - selected.length);
  const decision =
    selected.length === 0 ? "blocked_no_ready_mailbox" : shortfall > 0 ? "partial" : "selected";

  return {
    ok: selected.length > 0 && shortfall === 0,
    pool_key: req.pool_key,
    requested_count: requested,
    selected,
    rejected,
    shortfall,
    total_daily_capacity: selected.reduce((s, c) => s + c.usable_daily_capacity, 0),
    decision,
    decision_reason:
      decision === "selected"
        ? null
        : mailboxes.length === 0
          ? "no_gsm_mailboxes_registered"
          : `only_${selected.length}_of_${requested}_campaign_ready`,
    engine_version: GSM_ESTATE_VERSION,
  };
}

/** Which allocations may be released back to GSM when a launch finishes. */
export function releasableAllocations(
  allocations: GsmAllocationRecord[],
  now = new Date().toISOString(),
): { releasable: string[]; retained_sticky: string[] } {
  const releasable: string[] = [];
  const retained: string[] = [];
  for (const a of allocations) {
    if (norm(a.allocation_status) !== "active") continue;
    if (isStickyAllocation(a, now)) retained.push(a.id);
    else releasable.push(a.id);
  }
  return { releasable, retained_sticky: retained };
}

// ---------------------------------------------------------------------------
// Campaign / business sender readiness  (canonical source for the education gate)
// ---------------------------------------------------------------------------

export interface GsmSenderReadinessInput {
  mailboxes: GsmMailboxSignals[];
  domains: GsmDomainSignals[];
  allocations: GsmAllocationRecord[];
  business_id?: string | null;
  pool_key?: string;
  minimum_mailboxes?: number;
  now?: string;
}

export interface GsmSenderReadinessSummary {
  /** Canonical value for EligibilityInfrastructure.sender_infrastructure_ready. */
  sender_infrastructure_ready: boolean;
  ready_mailbox_count: number;
  allocated_ready_count: number;
  minimum_required: number;
  total_daily_capacity: number;
  blockers: string[];
  engine_version: string;
}

export function evaluateSenderInfrastructureReadiness(
  input: GsmSenderReadinessInput,
): GsmSenderReadinessSummary {
  const minimum = Math.max(1, Math.floor(input.minimum_mailboxes ?? 1));
  const domainById = new Map(input.domains.filter((d) => d.id).map((d) => [d.id as string, d]));
  const activeAlloc = input.allocations.filter((a) => norm(a.allocation_status) === "active");

  const ready = input.mailboxes
    .filter((m) => !isExcludedFromGsmEstate(m.email))
    .map((m) => evaluateMailboxReadiness(m, m.sending_domain_id ? domainById.get(m.sending_domain_id) : null))
    .filter((r) => r.campaign_ready);

  const readyIds = new Set(ready.map((r) => r.mailbox_id));
  const allocatedReady = activeAlloc.filter(
    (a) =>
      readyIds.has(a.mailbox_id) &&
      (input.business_id ? a.business_id === input.business_id : true) &&
      (input.pool_key ? norm(a.pool_key ?? "") === norm(input.pool_key) || !a.pool_key : true),
  );

  const blockers: string[] = [];
  if (input.mailboxes.length === 0) blockers.push("no_gsm_mailboxes_registered");
  if (ready.length === 0 && input.mailboxes.length > 0) blockers.push("no_campaign_ready_mailbox");
  if (allocatedReady.length < minimum) blockers.push("insufficient_allocated_ready_capacity");

  return {
    sender_infrastructure_ready: blockers.length === 0,
    ready_mailbox_count: ready.length,
    allocated_ready_count: allocatedReady.length,
    minimum_required: minimum,
    total_daily_capacity: ready.reduce((s, r) => s + r.usable_daily_capacity, 0),
    blockers,
    engine_version: GSM_ESTATE_VERSION,
  };
}

// ---------------------------------------------------------------------------
// Estate rollup for the founder surface
// ---------------------------------------------------------------------------

export interface GsmEstateSnapshot {
  target_total_mailboxes: number;
  target_max_domains: number;
  domain_count: number;
  mailbox_count: number;
  smtp_ok_count: number;
  imap_ok_count: number;
  warming_count: number;
  campaign_ready_count: number;
  quarantined_count: number;
  retired_count: number;
  configured_daily_capacity: number;
  launch_target: number;
  launch_allocated: number;
  evergreen_target: number;
  evergreen_allocated: number;
  neon_candy_excluded: true;
  engine_version: string;
}

export function buildEstateSnapshot(
  mailboxes: GsmMailboxSignals[],
  domains: GsmDomainSignals[],
  allocations: GsmAllocationRecord[],
): GsmEstateSnapshot {
  const domainById = new Map(domains.filter((d) => d.id).map((d) => [d.id as string, d]));
  const gsmMailboxes = mailboxes.filter((m) => !isExcludedFromGsmEstate(m.email));
  const results = gsmMailboxes.map((m) =>
    evaluateMailboxReadiness(m, m.sending_domain_id ? domainById.get(m.sending_domain_id) : null),
  );
  const active = allocations.filter((a) => norm(a.allocation_status) === "active");

  return {
    target_total_mailboxes: GSM_TARGET_TOTAL_MAILBOXES,
    target_max_domains: GSM_TARGET_MAX_DOMAINS,
    domain_count: domains.length,
    mailbox_count: gsmMailboxes.length,
    smtp_ok_count: gsmMailboxes.filter((m) => OK_SMTP.has(norm(m.smtp_status))).length,
    imap_ok_count: gsmMailboxes.filter((m) => OK_IMAP.has(norm(m.imap_status))).length,
    warming_count: results.filter((r) => r.readiness_state === "warming").length,
    campaign_ready_count: results.filter((r) => r.campaign_ready).length,
    quarantined_count: results.filter((r) => r.readiness_state === "quarantined").length,
    retired_count: results.filter((r) => r.readiness_state === "retired").length,
    configured_daily_capacity: results.reduce((s, r) => s + r.usable_daily_capacity, 0),
    launch_target: GSM_LAUNCH_TARGET_CAPACITY,
    launch_allocated: active.filter((a) => norm(a.pool_key ?? "") === GSM_LAUNCH_POOL_KEY).length,
    evergreen_target: GSM_EVERGREEN_TARGET_CAPACITY,
    evergreen_allocated: active.filter((a) => norm(a.pool_key ?? "") === GSM_EVERGREEN_POOL_KEY).length,
    neon_candy_excluded: true,
    engine_version: GSM_ESTATE_VERSION,
  };
}
