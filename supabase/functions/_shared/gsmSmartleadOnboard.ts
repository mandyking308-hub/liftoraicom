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
