/**
 * Kindnesss commercial-enquiry RECEIVER handler — runtime code, NOT DEPLOYED.
 *
 * No edge-function entrypoint exists for this handler on purpose: adding
 * `supabase/functions/kindnesss-enquiry-receiver/index.ts` (template in the
 * operator guide) is an approval step. Even then it fails closed (503) until
 * KINDNESSS_HANDOFF_RECEIVER_ENABLED === "true", the signing secret exists and
 * the review-only table is migrated.
 *
 * Order: authenticate raw bytes -> ATOMIC unique claim (durable first write)
 * -> business-scoped exact contact lookup -> finalise route. Never sends.
 */
import {
  MAX_ATTEMPTS, authenticateAndValidate, normaliseEmail,
  type ContactResolution, type KindnesssEnquiryEvent,
} from "./kindnesssEnquiryHandoff.ts";

export type ClaimResult =
  | { state: "claimed"; recordId: string; attempts: number }
  | { state: "duplicate"; recordId: string; status: "processed" | "dead_letter" | "received" }
  | { state: "store_unavailable"; detail: string };

/** Persistence port. Real adapter must use INSERT ... ON CONFLICT (business_id, idempotency_key). */
export interface HandoffStore {
  /**
   * Atomically insert-or-reclaim. Only a row with status 'failed' and
   * attempts < MAX_ATTEMPTS may be reclaimed (attempts incremented in the same
   * statement). Everything else returns duplicate.
   */
  claim(row: {
    businessId: string; idempotencyKey: string; event: KindnesssEnquiryEvent; emailNormalised: string;
  }): Promise<ClaimResult>;
  finalise(recordId: string, update: {
    status: "processed" | "failed" | "dead_letter";
    route: "conversation" | "quarantine" | null;
    quarantineReason: string | null;
    contactId: string | null; relationshipId: string | null; error: string | null;
  }): Promise<void>;
  audit(entry: { businessId: string | null; action: string; detail: Record<string, unknown> }): Promise<void>;
}

export interface ReceiverDeps {
  enabledFlag: string | null | undefined;
  secret: string | null | undefined;
  nowSeconds: number;
  store: HandoffStore;
  resolveContact: (businessId: string, normalisedEmail: string) => Promise<ContactResolution>;
}

export interface ReceiverResponse { status: number; body: Record<string, unknown> }

export async function handleKindnesssEnquiry(
  rawBody: string,
  headers: { source: string | null; timestamp: string | null; signature: string | null },
  deps: ReceiverDeps,
): Promise<ReceiverResponse> {
  const auth = await authenticateAndValidate({ enabledFlag: deps.enabledFlag, secret: deps.secret, rawBody, headers, nowSeconds: deps.nowSeconds });
  if (auth.outcome === "reject") {
    // Never echo payload; reason codes only. Disabled receiver is not audited (no noise, no write).
    if (auth.reason !== "receiver_disabled") {
      await deps.store.audit({ businessId: null, action: "kindnesss_handoff_rejected", detail: { reason: auth.reason } }).catch(() => {});
    }
    return { status: auth.httpStatus, body: { ok: false, reason: auth.reason } };
  }

  const { businessId, event, idempotencyKey } = auth;
  const claim = await deps.store.claim({ businessId, idempotencyKey, event, emailNormalised: normaliseEmail(event.contact_email) });
  if (claim.state === "store_unavailable") return { status: 503, body: { ok: false, reason: "store_unavailable" } };
  if (claim.state === "duplicate") return { status: 200, body: { ok: true, duplicate: true } };

  let resolution: ContactResolution;
  try {
    resolution = await deps.resolveContact(businessId, normaliseEmail(event.contact_email));
  } catch (e) {
    const exhausted = claim.attempts >= MAX_ATTEMPTS;
    await deps.store.finalise(claim.recordId, {
      status: exhausted ? "dead_letter" : "failed", route: null, quarantineReason: null,
      contactId: null, relationshipId: null, error: String((e as Error)?.message ?? e).slice(0, 300),
    });
    await deps.store.audit({ businessId, action: exhausted ? "kindnesss_handoff_dead_letter" : "kindnesss_handoff_failed", detail: { idempotencyKey } });
    // 503 lets the sender retry; record is durable, retry reclaims it atomically.
    return { status: exhausted ? 202 : 503, body: { ok: false, reason: exhausted ? "dead_letter" : "retry" } };
  }

  const matched = resolution.kind === "matched";
  await deps.store.finalise(claim.recordId, {
    status: "processed",
    route: matched ? "conversation" : "quarantine",
    quarantineReason: matched ? null : resolution.kind === "ambiguous" ? "ambiguous_contact" : "no_contact_match",
    contactId: matched ? resolution.contactId : null,
    relationshipId: matched ? resolution.relationshipId : null,
    error: null,
  });
  await deps.store.audit({ businessId, action: "kindnesss_handoff_processed", detail: { idempotencyKey, route: matched ? "conversation" : "quarantine" } });
  return { status: 202, body: { ok: true, route: matched ? "conversation" : "quarantine" } };
}
