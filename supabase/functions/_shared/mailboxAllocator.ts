/**
 * Deterministic mailbox allocation engine.
 *
 * PURE. No IO. Given the mailbox estate and a request, it always produces the
 * same auditable answer: which mailbox was chosen, which were rejected and why.
 *
 * Safety rules baked in:
 *  - Business/estate segregation is enforced first (legacy Neon Candy can never
 *    be pulled into an education send).
 *  - Fresh mailboxes are ramp-capped; we never assume hundreds/day.
 *  - Paused / unhealthy / failing / not-warmed / not-provider-ready are excluded.
 *  - Load is spread least-loaded-first, so no mailbox is disproportionately hit.
 *  - Scales to thousands of mailboxes (single sort, no cross products).
 */

export const MAILBOX_ALLOCATOR_VERSION = "mailbox-allocator-1.0.0";

export type MailboxRejectionCode =
  | "inactive"
  | "excluded_from_allocation"
  | "estate_mismatch"
  | "business_not_permitted"
  | "segregation_locked_to_other_business"
  | "provider_not_ready"
  | "smtp_not_ready"
  | "imap_not_ready"
  | "warmup_not_ready"
  | "paused"
  | "provider_blocked"
  | "unhealthy"
  | "consecutive_failures"
  | "bounce_rate_too_high"
  | "daily_cap_reached";

export interface MailboxRecord {
  id: string;
  email_address: string;
  business_name?: string | null;
  estate_key?: string | null;
  allowed_business_names?: string[] | null;
  segregation_locked?: boolean | null;
  active?: boolean | null;
  excluded_from_allocation?: boolean | null;
  provider_ready?: boolean | null;
  smtp_ready?: boolean | null;
  imap_ready?: boolean | null;
  warmup_ready?: boolean | null;
  warmup_status?: string | null;
  paused_reason?: string | null;
  provider_blocked_until?: string | null;
  health_status?: string | null;
  consecutive_failures?: number | null;
  bounce_rate_per_inbox?: number | null;
  daily_send_limit?: number | null;
  ramp_daily_cap?: number | null;
  emails_sent_today?: number | null;
  current_send_count?: number | null;
}

export interface AllocationRequest {
  business_name: string;
  estate_key?: string | null;
  requested_count: number;
  now?: string;
  /** Reject a mailbox whose bounce rate exceeds this (percent). */
  max_bounce_rate?: number;
  /** Reject a mailbox with this many consecutive failures or more. */
  max_consecutive_failures?: number;
}

export interface MailboxRejection {
  inbox_id: string;
  email_address: string;
  codes: MailboxRejectionCode[];
}

export interface EligibleMailbox {
  inbox_id: string;
  email_address: string;
  effective_cap: number;
  used_today: number;
  remaining_capacity: number;
  load_ratio: number;
}

export interface AllocationAssignment {
  inbox_id: string;
  email_address: string;
  assigned: number;
}

export interface AllocationResult {
  ok: boolean;
  decision: "allocated" | "partially_allocated" | "blocked_no_eligible_mailbox" | "blocked_no_capacity";
  decision_reason: string | null;
  business_name: string;
  estate_key: string | null;
  requested_count: number;
  allocated_count: number;
  considered_count: number;
  eligible: EligibleMailbox[];
  assignments: AllocationAssignment[];
  rejected: MailboxRejection[];
  /** Convenience: first assigned mailbox, or null when blocked. */
  primary_inbox_id: string | null;
  primary_email: string | null;
  allocator_version: string;
}

const UNHEALTHY = new Set(["unhealthy", "critical", "error", "failing", "suspended"]);
const WARMED = new Set(["completed", "complete", "ready", "warm", "finished", "not_required"]);

function norm(s: unknown): string {
  return String(s ?? "").trim().toLowerCase();
}

/** Effective daily cap = the SMALLER of the configured limit and the ramp ceiling. */
export function effectiveDailyCap(m: MailboxRecord): number {
  const limit = Number.isFinite(Number(m.daily_send_limit)) ? Number(m.daily_send_limit) : 0;
  const ramp = Number.isFinite(Number(m.ramp_daily_cap)) ? Number(m.ramp_daily_cap) : 0;
  const candidates = [limit, ramp].filter((n) => n > 0);
  if (candidates.length === 0) return 0;
  return Math.min(...candidates);
}

export function usedToday(m: MailboxRecord): number {
  const a = Number(m.emails_sent_today ?? 0);
  const b = Number(m.current_send_count ?? 0);
  return Math.max(Number.isFinite(a) ? a : 0, Number.isFinite(b) ? b : 0);
}

/** Why (if at all) this mailbox cannot be used for this business right now. */
export function screenMailbox(
  m: MailboxRecord,
  req: AllocationRequest,
): MailboxRejectionCode[] {
  const codes: MailboxRejectionCode[] = [];
  const nowMs = new Date(req.now ?? new Date().toISOString()).getTime();
  const business = norm(req.business_name);

  if (m.active === false) codes.push("inactive");
  if (m.excluded_from_allocation === true) codes.push("excluded_from_allocation");

  // --- Segregation, evaluated before anything operational ---
  if (req.estate_key && norm(m.estate_key) !== norm(req.estate_key)) codes.push("estate_mismatch");

  const allowed = (m.allowed_business_names ?? []).map(norm).filter(Boolean);
  if (allowed.length > 0) {
    if (!allowed.includes(business)) codes.push("business_not_permitted");
  } else if (m.segregation_locked === true) {
    // Locked with no explicit allow-list: fall back to its owning business only.
    if (norm(m.business_name) !== business) codes.push("segregation_locked_to_other_business");
  }

  // --- Operational readiness ---
  if (m.provider_ready !== true) codes.push("provider_not_ready");
  if (m.smtp_ready !== true) codes.push("smtp_not_ready");
  if (m.imap_ready !== true) codes.push("imap_not_ready");
  if (m.warmup_ready !== true && !WARMED.has(norm(m.warmup_status))) codes.push("warmup_not_ready");
  if (m.paused_reason) codes.push("paused");

  if (m.provider_blocked_until) {
    const until = new Date(m.provider_blocked_until).getTime();
    if (Number.isFinite(until) && until > nowMs) codes.push("provider_blocked");
  }

  if (UNHEALTHY.has(norm(m.health_status))) codes.push("unhealthy");

  const maxFailures = req.max_consecutive_failures ?? 3;
  if (Number(m.consecutive_failures ?? 0) >= maxFailures) codes.push("consecutive_failures");

  const maxBounce = req.max_bounce_rate ?? 5;
  if (Number(m.bounce_rate_per_inbox ?? 0) > maxBounce) codes.push("bounce_rate_too_high");

  if (effectiveDailyCap(m) - usedToday(m) <= 0) codes.push("daily_cap_reached");

  return codes;
}

export function allocateMailboxes(
  mailboxes: MailboxRecord[],
  req: AllocationRequest,
): AllocationResult {
  const rejected: MailboxRejection[] = [];
  const eligible: EligibleMailbox[] = [];

  for (const m of mailboxes) {
    const codes = screenMailbox(m, req);
    if (codes.length > 0) {
      rejected.push({ inbox_id: m.id, email_address: m.email_address, codes });
      continue;
    }
    const cap = effectiveDailyCap(m);
    const used = usedToday(m);
    eligible.push({
      inbox_id: m.id,
      email_address: m.email_address,
      effective_cap: cap,
      used_today: used,
      remaining_capacity: cap - used,
      load_ratio: cap > 0 ? used / cap : 1,
    });
  }

  // Deterministic order: least loaded first, then most spare capacity,
  // then email address as a stable final tiebreak.
  eligible.sort(
    (a, b) =>
      a.load_ratio - b.load_ratio ||
      b.remaining_capacity - a.remaining_capacity ||
      a.email_address.localeCompare(b.email_address),
  );

  const requested = Math.max(0, Math.floor(req.requested_count));
  const totalCapacity = eligible.reduce((s, e) => s + e.remaining_capacity, 0);

  if (eligible.length === 0) {
    return {
      ok: false,
      decision: "blocked_no_eligible_mailbox",
      decision_reason:
        mailboxes.length === 0
          ? "no_mailboxes_registered_for_estate"
          : "every_mailbox_rejected_by_readiness_or_segregation",
      business_name: req.business_name,
      estate_key: req.estate_key ?? null,
      requested_count: requested,
      allocated_count: 0,
      considered_count: mailboxes.length,
      eligible: [],
      assignments: [],
      rejected,
      primary_inbox_id: null,
      primary_email: null,
      allocator_version: MAILBOX_ALLOCATOR_VERSION,
    };
  }

  // Round-robin across the least-loaded mailboxes so load stays even.
  const remaining = new Map(eligible.map((e) => [e.inbox_id, e.remaining_capacity]));
  const assignedMap = new Map<string, number>();
  let allocated = 0;
  let progressed = true;

  while (allocated < requested && progressed) {
    progressed = false;
    for (const e of eligible) {
      if (allocated >= requested) break;
      const left = remaining.get(e.inbox_id) ?? 0;
      if (left <= 0) continue;
      remaining.set(e.inbox_id, left - 1);
      assignedMap.set(e.inbox_id, (assignedMap.get(e.inbox_id) ?? 0) + 1);
      allocated += 1;
      progressed = true;
    }
  }

  const assignments: AllocationAssignment[] = eligible
    .filter((e) => (assignedMap.get(e.inbox_id) ?? 0) > 0)
    .map((e) => ({
      inbox_id: e.inbox_id,
      email_address: e.email_address,
      assigned: assignedMap.get(e.inbox_id) ?? 0,
    }));

  const decision =
    allocated === 0
      ? "blocked_no_capacity"
      : allocated < requested
        ? "partially_allocated"
        : "allocated";

  return {
    ok: allocated > 0,
    decision,
    decision_reason:
      decision === "allocated"
        ? null
        : decision === "partially_allocated"
          ? `capacity_limited_total_remaining_${totalCapacity}`
          : "no_remaining_daily_capacity",
    business_name: req.business_name,
    estate_key: req.estate_key ?? null,
    requested_count: requested,
    allocated_count: allocated,
    considered_count: mailboxes.length,
    eligible,
    assignments,
    rejected,
    primary_inbox_id: assignments[0]?.inbox_id ?? null,
    primary_email: assignments[0]?.email_address ?? null,
    allocator_version: MAILBOX_ALLOCATOR_VERSION,
  };
}
