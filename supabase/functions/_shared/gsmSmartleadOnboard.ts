import {
  GSM_ESTATE_KEY,
  domainOfEmail,
  isGsmEstateEmail,
} from "./senderEstates.ts";

/** Pure, side-effect-free helpers for the GSM -> Smartlead onboarding bridge. */

export const GSM_ONBOARD_CONFIRMATION = "CONNECT GSM MAILBOXES TO SMARTLEAD";
export const GSM_EXPORT_DOMAIN_CHUNK = 5;
export const GSM_ONBOARD_MAX_EMAILS = 10;

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

export function normalizeRequestedEmails(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(
    value
      .map((v) => String(v ?? "").trim().toLowerCase())
      .filter(Boolean),
  ));
}

export function scopeRequestedGsmRegistry<T extends GsmRegistryRow>(
  gsmRegistry: T[],
  requestedEmails: string[],
): { scoped: T[]; invalid: string[] } {
  if (requestedEmails.length === 0) return { scoped: gsmRegistry, invalid: [] };
  const byEmail = new Map(
    gsmRegistry.map((r) => [String(r.email ?? "").trim().toLowerCase(), r] as const),
  );
  const invalid = requestedEmails.filter((email) => !byEmail.has(email));
  const scoped = requestedEmails
    .map((email) => byEmail.get(email))
    .filter((row): row is T => Boolean(row));
  return { scoped, invalid };
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
