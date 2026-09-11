/**
 * Pure mapping + reconciliation helpers for the GSM ↔ Smartlead mailbox sync.
 *
 * No I/O, no secrets. The edge function reads SMARTLEAD_API_KEY from the Deno
 * environment and only ever performs a read-only GET /email-accounts. These
 * helpers turn that payload into observed mailbox signals and reconcile them
 * against the existing GSM registry. They can never create a GSM mailbox.
 */

import { EXTERNAL_NON_GSM, classifyEstate, isExcludedFromGsmEstate } from "./gsmSenderEstate.ts";

export interface ObservedSmartleadMailbox {
  smartlead_email_account_id: string | null;
  email: string;
  sender_name: string | null;
  smtp_status: "ok" | "failed" | "unknown";
  imap_status: "ok" | "failed" | "unknown";
  smartlead_status: "connected";
  /**
   * Smartlead only exposes whether warmup is enabled. "warming" therefore never
   * means warmed / campaign_ready — readiness stays with evaluateMailboxReadiness.
   */
  warmup_status: "warming" | "not_started";
  warmup_signal: "enabled" | "not_enabled";
  configured_daily_limit: number;
  estate_classification: "gsm" | typeof EXTERNAL_NON_GSM;
}

export interface GsmRegistryRow {
  id: string;
  email: string;
  smartlead_email_account_id?: string | null;
}

export function extractSmartleadAccounts(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) return payload as Record<string, unknown>[];
  const data = (payload as Record<string, unknown> | null)?.data;
  return Array.isArray(data) ? (data as Record<string, unknown>[]) : [];
}

export function mapSmartleadAccount(a: Record<string, unknown>): ObservedSmartleadMailbox {
  // Smartlead returns the sending address as `from_email`; some payloads use `email`.
  const email = String(a.from_email ?? a.email ?? "").trim().toLowerCase();
  const warmupEnabled = a.warmup_enabled === true || a.warmup_enabled === 1 || a.warmup_enabled === "true";
  return {
    smartlead_email_account_id: a.id != null ? String(a.id) : null,
    email,
    sender_name: a.from_name != null ? String(a.from_name) : null,
    smtp_status: a.is_smtp_success === true ? "ok" : a.is_smtp_success === false ? "failed" : "unknown",
    imap_status: a.is_imap_success === true ? "ok" : a.is_imap_success === false ? "failed" : "unknown",
    smartlead_status: "connected",
    warmup_status: warmupEnabled ? "warming" : "not_started",
    warmup_signal: warmupEnabled ? "enabled" : "not_enabled",
    configured_daily_limit: Number.isFinite(Number(a.daily_limit)) ? Number(a.daily_limit) : 0,
    estate_classification: classifyEstate(email),
  };
}

export interface ReconciliationResult {
  observed: ObservedSmartleadMailbox[];
  /** Accounts with no readable address — never guessed at, never excluded as Neon Candy. */
  unidentified: ObservedSmartleadMailbox[];
  excluded: ObservedSmartleadMailbox[];
  gsm_candidates: ObservedSmartleadMailbox[];
  matched: { registry_id: string; email: string; observed: ObservedSmartleadMailbox }[];
  unmatched: ObservedSmartleadMailbox[];
}

/**
 * Reconcile observed Smartlead accounts against the EXISTING GSM registry.
 * Matching is by Smartlead account id first, then case-insensitive email.
 * Anything excluded (Neon Candy / external_non_gsm) is never a candidate.
 */
export function reconcileSmartleadAccounts(
  observed: ObservedSmartleadMailbox[],
  registry: GsmRegistryRow[],
): ReconciliationResult {
  const unidentified = observed.filter((o) => !o.email);
  const excluded = observed.filter(
    (o) => o.email !== "" && (o.estate_classification === EXTERNAL_NON_GSM || isExcludedFromGsmEstate(o.email)),
  );
  const gsm_candidates = observed.filter((o) => !excluded.includes(o) && !unidentified.includes(o));

  const byId = new Map<string, GsmRegistryRow>();
  const byEmail = new Map<string, GsmRegistryRow>();
  for (const r of registry) {
    if (r.smartlead_email_account_id) byId.set(String(r.smartlead_email_account_id), r);
    if (r.email) byEmail.set(r.email.trim().toLowerCase(), r);
  }

  const matched: ReconciliationResult["matched"] = [];
  const unmatched: ObservedSmartleadMailbox[] = [];
  for (const o of gsm_candidates) {
    const row =
      (o.smartlead_email_account_id ? byId.get(o.smartlead_email_account_id) : undefined) ??
      byEmail.get(o.email);
    if (row) matched.push({ registry_id: row.id, email: o.email, observed: o });
    else unmatched.push(o);
  }

  return { observed, excluded, gsm_candidates, matched, unmatched };
}

/** Fields written back onto an EXISTING gsm_mailboxes row. Never an insert. */
export function buildMailboxUpdate(o: ObservedSmartleadMailbox, now = new Date().toISOString()) {
  return {
    smartlead_email_account_id: o.smartlead_email_account_id,
    sender_name: o.sender_name,
    smtp_status: o.smtp_status,
    imap_status: o.imap_status,
    smartlead_status: o.smartlead_status,
    warmup_status: o.warmup_status,
    configured_daily_limit: o.configured_daily_limit,
    last_provider_check_at: now,
  };
}
