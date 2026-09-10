// Portfolio-wide Apollo Credit Firewall (Stage 4).
//
// EVERY paid Apollo endpoint (/people/match, /people/bulk_match, any reveal or
// waterfall call) must pass through this helper. Free People Search
// (/mixed_people/api_search) does NOT need it, because it spends no credits.
//
// Enforcement lives in Postgres (apollo_credit_reserve / apollo_credit_settle /
// apollo_credit_release) so concurrent edge invocations are serialised against
// the same portfolio limit. This module is a thin, deterministic client.

export interface FirewallPolicyStatus {
  ok: boolean;
  reason?: string;
  provider?: string;
  paid_enrichment_enabled: boolean;
  hard_credit_limit: number;
  safety_reserve: number;
  per_run_cap: number;
  allow_phone_reveal: boolean;
  allow_personal_email_reveal: boolean;
  allow_waterfall: boolean;
  credits_used: number;
  credits_reserved: number;
  credits_remaining: number;
}

export interface ReservationResult {
  allowed: boolean;
  reason?: string;
  idempotent?: boolean;
  reservation_id?: string;
  operation_key?: string;
  estimated_credits?: number;
  credits_available_after?: number;
  existing_status?: string;
  per_run_cap?: number;
  requested?: number;
  credits_available?: number;
}

export interface SettleResult {
  ok: boolean;
  reason?: string;
  idempotent?: boolean;
  ledger_id?: string;
  reservation_id?: string;
  actual_credits?: number;
}

const DEFAULT_STATUS: FirewallPolicyStatus = {
  ok: false,
  reason: "policy_unavailable",
  paid_enrichment_enabled: false,
  hard_credit_limit: 0,
  safety_reserve: 0,
  per_run_cap: 0,
  allow_phone_reveal: false,
  allow_personal_email_reveal: false,
  allow_waterfall: false,
  credits_used: 0,
  credits_reserved: 0,
  credits_remaining: 0,
};

/** Normalise a token so operation keys are stable across retries. */
export function normaliseKeyPart(value: unknown): string {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9:_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Deterministic operation key. The SAME logical paid operation must always
 * produce the SAME key, so a retry can never reserve or settle twice.
 * Person IDs are sorted so ordering differences cannot fork the key.
 */
export function buildOperationKey(input: {
  function_source: string;
  scope: string;
  apollo_person_ids?: string[];
  attempt?: string;
}): string {
  const ids = [...(input.apollo_person_ids ?? [])]
    .map((id) => normaliseKeyPart(id))
    .filter(Boolean)
    .sort();
  const idPart = ids.length ? ids.join(".") : "no-ids";
  const parts = [
    normaliseKeyPart(input.function_source),
    normaliseKeyPart(input.scope),
    idPart,
  ];
  if (input.attempt) parts.push(normaliseKeyPart(input.attempt));
  return parts.join("|");
}

export async function getFirewallStatus(admin: any): Promise<FirewallPolicyStatus> {
  const { data, error } = await admin.rpc("apollo_credit_status");
  if (error || !data) return { ...DEFAULT_STATUS, reason: error?.message ?? "policy_unavailable" };
  return { ...DEFAULT_STATUS, ...(data as Record<string, unknown>) } as FirewallPolicyStatus;
}

/** Reserve credits before a paid Apollo request. Fails closed on any error. */
export async function reserveCredits(admin: any, input: {
  operation_key: string;
  function_source: string;
  estimated_credits: number;
  business_name?: string | null;
  business_id?: string | null;
  run_id?: string | null;
  apollo_person_ids?: string[];
  metadata?: Record<string, unknown>;
}): Promise<ReservationResult> {
  const { data, error } = await admin.rpc("apollo_credit_reserve", {
    _operation_key: input.operation_key,
    _function_source: input.function_source,
    _estimated_credits: Math.max(0, Math.trunc(input.estimated_credits)),
    _business_name: input.business_name ?? null,
    _business_id: input.business_id ?? null,
    _run_id: input.run_id ?? null,
    _apollo_person_ids: input.apollo_person_ids ?? [],
    _metadata: input.metadata ?? {},
  });
  if (error) return { allowed: false, reason: `firewall_error:${error.message}` };
  if (!data) return { allowed: false, reason: "firewall_no_response" };
  return data as ReservationResult;
}

/** Settle a reservation exactly once. Writes into apollo_credit_ledger. */
export async function settleCredits(admin: any, input: {
  operation_key: string;
  actual_credits: number;
  no_email_person_ids?: string[];
  revealed_person_ids?: string[];
  metadata?: Record<string, unknown>;
}): Promise<SettleResult> {
  const { data, error } = await admin.rpc("apollo_credit_settle", {
    _operation_key: input.operation_key,
    _actual_credits: Math.max(0, Math.trunc(input.actual_credits)),
    _no_email_person_ids: input.no_email_person_ids ?? [],
    _revealed_person_ids: input.revealed_person_ids ?? [],
    _metadata: input.metadata ?? {},
  });
  if (error) return { ok: false, reason: `firewall_error:${error.message}` };
  return (data ?? { ok: false, reason: "firewall_no_response" }) as SettleResult;
}

/** Release an unused reservation (nothing was spent). */
export async function releaseCredits(admin: any, operation_key: string, reason: string) {
  const { data, error } = await admin.rpc("apollo_credit_release", {
    _operation_key: operation_key,
    _reason: reason,
  });
  if (error) return { ok: false, reason: `firewall_error:${error.message}` };
  return data as { ok: boolean; reason?: string };
}

/**
 * Apollo person IDs already paid for with a no-email outcome. Callers must
 * exclude these by default so the portfolio cannot silently re-spend.
 */
export async function loadNoEmailPersonIds(admin: any, personIds: string[]): Promise<Set<string>> {
  const ids = personIds.filter(Boolean);
  if (!ids.length) return new Set();
  const found = new Set<string>();
  for (let i = 0; i < ids.length; i += 500) {
    const { data } = await admin
      .from("apollo_paid_attempts")
      .select("apollo_person_id")
      .eq("outcome", "no_email")
      .in("apollo_person_id", ids.slice(i, i + 500));
    for (const r of data ?? []) found.add(String(r.apollo_person_id));
  }
  return found;
}

export const FIREWALL_BLOCK_MESSAGES: Record<string, string> = {
  paid_enrichment_disabled: "Apollo paid enrichment is disabled by the portfolio credit firewall.",
  hard_credit_limit_zero: "Portfolio Apollo hard credit limit is 0. No paid Apollo call is permitted.",
  hard_limit_would_be_exceeded: "Portfolio Apollo credit limit would be exceeded.",
  per_run_cap_exceeded: "Requested Apollo credits exceed the portfolio per-run cap.",
  duplicate_operation_key: "This paid Apollo operation was already reserved. Refusing to double-spend.",
  policy_missing: "Portfolio Apollo credit policy is not configured. Failing closed.",
};

export function blockedResponseBody(result: ReservationResult) {
  return {
    error: "apollo_credit_firewall_blocked",
    firewall_reason: result.reason ?? "unknown",
    detail: FIREWALL_BLOCK_MESSAGES[result.reason ?? ""] ??
      "Blocked by the portfolio Apollo credit firewall.",
    credits_available: result.credits_available ?? null,
    per_run_cap: result.per_run_cap ?? null,
  };
}
