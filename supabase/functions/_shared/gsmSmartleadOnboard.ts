import {
  GSM_ESTATE_KEY,
  domainOfEmail,
  isGsmEstateEmail,
} from "./senderEstates.ts";

/** Pure, side-effect-free helpers for the GSM -> Smartlead onboarding bridge. */

export const GSM_ONBOARD_CONFIRMATION = "CONNECT GSM MAILBOXES TO SMARTLEAD";
export const GSM_EXPORT_DOMAIN_CHUNK = 5;

export interface GsmRegistryRow {
  email: string;
  estate_classification?: string | null;
  [k: string]: unknown;
}

/** Apply needs BOTH apply === true and the exact confirmation string. */
export function isOnboardApplyAuthorized(apply: unknown, confirmation: unknown): boolean {
  return apply === true && String(confirmation ?? "") === GSM_ONBOARD_CONFIRMATION;
}

/** GSM-only scope: registry classification AND address-level estate check. */
export function selectGsmRegistry<T extends GsmRegistryRow>(rows: T[]): T[] {
  return rows.filter(
    (r) => r.estate_classification === GSM_ESTATE_KEY && isGsmEstateEmail(String(r.email ?? "")),
  );
}

export function partitionAgainstSmartlead<T extends GsmRegistryRow>(
  gsmRegistry: T[],
  smartleadEmails: Set<string>,
): { alreadyConnected: T[]; missing: T[] } {
  const alreadyConnected: T[] = [];
  const missing: T[] = [];
  for (const r of gsmRegistry) {
    (smartleadEmails.has(String(r.email).trim().toLowerCase()) ? alreadyConnected : missing).push(r);
  }
  return { alreadyConnected, missing };
}

export function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export function domainsOf(rows: GsmRegistryRow[]): string[] {
  return Array.from(new Set(rows.map((r) => domainOfEmail(String(r.email))).filter(Boolean))).sort();
}

export const GSM_ONBOARD_MAX_APPLY_EMAILS = 10;

export type WhitelistResult =
  | { ok: true; requested: string[]; scoped: GsmRegistryRow[] | null }
  | { ok: false; blocker: string; invalid?: string[] };

/** Normalize a requested mailbox whitelist (lowercase, trimmed, deduped). */
export function normalizeRequestedEmails(raw: unknown): string[] | null {
  if (raw == null) return [];
  if (!Array.isArray(raw)) return null;
  const out = new Set<string>();
  for (const e of raw) {
    if (typeof e !== "string") return null;
    const n = e.trim().toLowerCase();
    if (n) out.add(n);
  }
  return Array.from(out);
}

/**
 * Resolve the optional whitelist against the already-safe GSM registry.
 * Apply REQUIRES 1..10 emails; any out-of-scope email blocks the whole call.
 * scoped === null means "whole GSM estate" (preview only).
 */
export function resolveOnboardWhitelist<T extends GsmRegistryRow>(
  rawEmails: unknown,
  safeGsmRegistry: T[],
  apply: boolean,
): { ok: true; requested: string[]; scoped: T[] | null } | { ok: false; blocker: string; invalid?: string[] } {
  const requested = normalizeRequestedEmails(rawEmails);
  if (requested === null) return { ok: false, blocker: "invalid_emails_payload" };
  if (requested.length === 0) {
    return apply ? { ok: false, blocker: "emails_required_for_apply" } : { ok: true, requested, scoped: null };
  }
  if (apply && requested.length > GSM_ONBOARD_MAX_APPLY_EMAILS) {
    return { ok: false, blocker: "too_many_emails_for_apply" };
  }
  const byEmail = new Map(safeGsmRegistry.map((r) => [String(r.email).trim().toLowerCase(), r] as const));
  const invalid = requested.filter((e) => !byEmail.has(e) || !isGsmEstateEmail(e));
  if (invalid.length > 0) return { ok: false, blocker: "invalid_requested_email", invalid };
  return { ok: true, requested, scoped: requested.map((e) => byEmail.get(e)!) };
}
