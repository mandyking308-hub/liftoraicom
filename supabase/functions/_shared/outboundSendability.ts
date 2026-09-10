/**
 * Outbound sendability / compliance gate for provider lead pushes.
 *
 * PURE. No IO, no provider calls. Shared by the Smartlead lead-push preview,
 * lead-push apply and dry-run test paths so all three agree exactly.
 *
 * CANONICAL TRUTH RULE
 * --------------------
 * Liftor CRM (public.contacts) is the only source of suppression truth.
 * This module READS canonical fields and never invents competing state.
 * Provider data may never weaken a Liftor block.
 */

export const SENDABILITY_VERSION = "outbound-sendability-1.0.0";

export type SendabilityBlockCode =
  | "globally_suppressed"
  | "do_not_contact"
  | "unsubscribed"
  | "hard_bounced"
  | "missing_email"
  | "invalid_email"
  | "email_not_verified"
  | "not_sendable_status"
  | "compliance_not_cleared"
  | "contact_status_blocked"
  | "reveal_not_completed";

export interface SendabilityContact {
  id: string;
  email?: string | null;
  email_verified_status?: string | null;
  sendable_status?: string | null;
  reveal_status?: string | null;
  status?: string | null;
  compliance_status?: string | null;
  is_globally_suppressed?: boolean | null;
  global_suppression_at?: string | null;
  hard_bounced?: boolean | null;
  unsubscribed_at?: string | null;
  do_not_contact_at?: string | null;
  do_not_contact_reason?: string | null;
  conversation_active?: boolean | null;
}

export interface SendabilitySnapshot {
  contact_id: string;
  email_lower: string | null;
  is_globally_suppressed: boolean;
  hard_bounced: boolean;
  unsubscribed: boolean;
  do_not_contact: boolean;
  email_verified_status: string | null;
  sendable_status: string | null;
  compliance_status: string | null;
  conversation_active: boolean;
  captured_at: string;
  version: string;
}

export interface SendabilityResult {
  sendable: boolean;
  blockers: SendabilityBlockCode[];
  /** Blockers that can NEVER be overridden by anyone, including the founder. */
  hard_blockers: SendabilityBlockCode[];
  reason: string | null;
  snapshot: SendabilitySnapshot;
  version: string;
}

/** Suppression states that are permanent and may never be pushed, ever. */
export const HARD_BLOCK_CODES: readonly SendabilityBlockCode[] = [
  "globally_suppressed",
  "do_not_contact",
  "unsubscribed",
  "hard_bounced",
] as const;

const ACCEPTABLE_SENDABLE_STATUS = new Set(["sendable", "verified_sendable", "ready"]);
const UNACCEPTABLE_VERIFIED_STATUS = new Set(["invalid", "unknown", "catch_all_risky", "risky"]);
const BLOCKED_CONTACT_STATUS = new Set(["bounced", "unsubscribed", "suppressed", "do_not_contact", "invalid"]);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isHardBlock(code: SendabilityBlockCode): boolean {
  return (HARD_BLOCK_CODES as readonly string[]).includes(code);
}

export function evaluateOutboundSendability(
  contact: SendabilityContact,
  opts: { now?: string; require_reveal?: boolean } = {},
): SendabilityResult {
  const now = opts.now ?? new Date().toISOString();
  const blockers: SendabilityBlockCode[] = [];

  const email = (contact.email ?? "").trim();
  const emailLower = email ? email.toLowerCase() : null;

  // --- Permanent suppression truth (never overridable) ---
  if (contact.is_globally_suppressed === true || !!contact.global_suppression_at) {
    blockers.push("globally_suppressed");
  }
  if (contact.do_not_contact_at) blockers.push("do_not_contact");
  if (contact.unsubscribed_at) blockers.push("unsubscribed");
  if (contact.hard_bounced === true) blockers.push("hard_bounced");

  // --- Deliverability truth ---
  if (!email) {
    blockers.push("missing_email");
  } else if (!EMAIL_RE.test(email)) {
    blockers.push("invalid_email");
  }

  const verified = (contact.email_verified_status ?? "").toLowerCase();
  if (verified && UNACCEPTABLE_VERIFIED_STATUS.has(verified)) blockers.push("email_not_verified");

  const sendableStatus = (contact.sendable_status ?? "").toLowerCase();
  if (sendableStatus && !ACCEPTABLE_SENDABLE_STATUS.has(sendableStatus)) {
    blockers.push("not_sendable_status");
  }

  const status = (contact.status ?? "").toLowerCase();
  if (status && BLOCKED_CONTACT_STATUS.has(status)) blockers.push("contact_status_blocked");

  const compliance = (contact.compliance_status ?? "").toLowerCase();
  if (compliance && ["blocked", "failed", "rejected", "non_compliant"].includes(compliance)) {
    blockers.push("compliance_not_cleared");
  }

  if (opts.require_reveal) {
    const reveal = (contact.reveal_status ?? "").toLowerCase();
    if (reveal && !["revealed", "verified", "complete", "completed"].includes(reveal)) {
      blockers.push("reveal_not_completed");
    }
  }

  const unique = Array.from(new Set(blockers));
  const hard = unique.filter(isHardBlock);

  const snapshot: SendabilitySnapshot = {
    contact_id: contact.id,
    email_lower: emailLower,
    is_globally_suppressed: contact.is_globally_suppressed === true || !!contact.global_suppression_at,
    hard_bounced: contact.hard_bounced === true,
    unsubscribed: !!contact.unsubscribed_at,
    do_not_contact: !!contact.do_not_contact_at,
    email_verified_status: contact.email_verified_status ?? null,
    sendable_status: contact.sendable_status ?? null,
    compliance_status: contact.compliance_status ?? null,
    conversation_active: contact.conversation_active === true,
    captured_at: now,
    version: SENDABILITY_VERSION,
  };

  return {
    sendable: unique.length === 0,
    blockers: unique,
    hard_blockers: hard,
    reason: unique.length === 0 ? null : unique.join(","),
    snapshot,
    version: SENDABILITY_VERSION,
  };
}

/**
 * Never let provider-supplied data weaken canonical Liftor truth.
 * Returns ONLY the fields that are safe to write back to public.contacts.
 */
export function mergeProviderTruthSafely(
  canonical: SendabilityContact,
  provider: { hard_bounced?: boolean; unsubscribed?: boolean; do_not_contact?: boolean },
): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  // Only escalation is allowed. A provider can add a block; it can never remove one.
  if (provider.hard_bounced === true && canonical.hard_bounced !== true) patch.hard_bounced = true;
  if (provider.unsubscribed === true && !canonical.unsubscribed_at) {
    patch.unsubscribed_at = new Date().toISOString();
  }
  if (provider.do_not_contact === true && !canonical.do_not_contact_at) {
    patch.do_not_contact_at = new Date().toISOString();
  }
  return patch;
}
