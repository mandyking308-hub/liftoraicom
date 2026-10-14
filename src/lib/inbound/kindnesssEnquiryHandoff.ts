/**
 * Kindnesss commercial-enquiry inbound handoff — REVIEW-ONLY CANDIDATE.
 *
 * Pure, side-effect-free decision core. It performs no database writes, no
 * network calls and reads no secrets itself; a future receiver must inject the
 * secret, the existing-event lookup and the contact lookup. Activation is OFF by
 * default and requires an explicit "true" flag that is not set anywhere.
 *
 * Wire format (sender = Kindnesss outbox, never the browser):
 *   POST body: raw JSON (see KindnesssEnquiryEvent)
 *   X-Liftor-Source: kindnesss
 *   X-Liftor-Timestamp: unix seconds
 *   X-Liftor-Signature: sha256=<hex HMAC-SHA256(secret, `${timestamp}.${rawBody}`)>
 */

export const KINDNESSS_BUSINESS_ID = "640de582-a112-4d16-a221-03c27f00c6ec";
export const KINDNESSS_SOURCE = "kindnesss";
export const EVENT_TYPE = "commercial_enquiry.submitted";
export const SCHEMA_VERSION = 1;
export const MAX_SKEW_SECONDS = 300;
export const MAX_BODY_BYTES = 16_384;
export const MAX_ATTEMPTS = 6;

/** Deterministic allowlist: source -> exactly one business. No fallback. */
export const SOURCE_BUSINESS_ALLOWLIST: Readonly<Record<string, string>> = Object.freeze({
  [KINDNESSS_SOURCE]: KINDNESSS_BUSINESS_ID,
});

export function handoffReceiverEnabled(flag: string | null | undefined): boolean {
  return flag === "true";
}

const ALLOWED_FIELDS = new Set([
  "schema_version", "event_type", "event_id", "source", "business_id", "occurred_at",
  "enquiry_id", "contact_name", "contact_email", "organisation_name", "role_title",
  "country", "enquiry_type", "message", "consent_contact",
]);

/** Field names that must never cross the boundary. */
const FORBIDDEN_KEY = /(child|children|pupil|student|kid|son|daughter|parent|guardian|family|class(_|$|room)|year_group|dob|date_of_birth|passport|kindness_passport|safeguard|medical|sen(_|$)|send_)/i;
/** Free-text indicators of child/private data; message is rejected, never stored. */
const FORBIDDEN_TEXT = /(kindness\s*passport|my\s+(son|daughter|child|kid)|date\s+of\s+birth|\bd\.?o\.?b\b|year\s+\d{1,2}\s+(pupil|student|class)|\bpupil\s+name|\bchild'?s\s+name)/i;

export interface KindnesssEnquiryEvent {
  schema_version: 1;
  event_type: typeof EVENT_TYPE;
  event_id: string;
  source: typeof KINDNESSS_SOURCE;
  business_id: string;
  occurred_at: string;
  enquiry_id: string;
  contact_name: string | null;
  contact_email: string;
  organisation_name: string | null;
  role_title: string | null;
  country: string | null;
  enquiry_type: string | null;
  message: string | null;
  consent_contact: boolean;
}

export type RejectReason =
  | "receiver_disabled" | "body_too_large" | "missing_secret" | "bad_signature"
  | "stale_or_future_timestamp" | "unknown_source" | "malformed_json" | "schema_invalid"
  | "tenant_mismatch" | "forbidden_field" | "forbidden_content";

export type ContactResolution =
  | { kind: "matched"; contactId: string; relationshipId: string }
  | { kind: "none" }
  | { kind: "ambiguous"; candidateCount: number };

export type HandoffDecision =
  | { outcome: "reject"; reason: RejectReason; httpStatus: number }
  | { outcome: "duplicate"; idempotencyKey: string; httpStatus: 200 }
  | {
      outcome: "accept";
      idempotencyKey: string;
      businessId: string;
      event: KindnesssEnquiryEvent;
      route: "conversation" | "quarantine";
      quarantineReason: "no_contact_match" | "ambiguous_contact" | null;
      contactId: string | null;
      relationshipId: string | null;
      autoSend: false;
      httpStatus: 202;
    };

export interface HandoffInput {
  enabledFlag: string | null | undefined;
  secret: string | null | undefined;
  rawBody: string;
  headers: { source: string | null; timestamp: string | null; signature: string | null };
  nowSeconds: number;
  /** Exact idempotency lookup, scoped by business. */
  idempotencyKeyExists: (businessId: string, key: string) => Promise<boolean>;
  /** Exact normalised-email match within business only. */
  resolveContact: (businessId: string, normalisedEmail: string) => Promise<ContactResolution>;
}

const reject = (reason: RejectReason, httpStatus: number): HandoffDecision => ({ outcome: "reject", reason, httpStatus });

function hexToBytes(hex: string): Uint8Array | null {
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) return null;
  const out = new Uint8Array(32);
  for (let i = 0; i < 32; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a[i] ^ b[i];
  return d === 0;
}

export async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message)));
  return Array.from(sig).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function verifySignature(secret: string, timestamp: string, rawBody: string, header: string | null): Promise<boolean> {
  if (!header?.startsWith("sha256=")) return false;
  const received = hexToBytes(header.slice(7));
  if (!received) return false;
  const expected = hexToBytes(await hmacHex(secret, `${timestamp}.${rawBody}`));
  return !!expected && constantTimeEqual(expected, received);
}

export function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Exact key: source + business + sender event id. No hashing of mutable content. */
export function idempotencyKeyFor(source: string, businessId: string, eventId: string): string {
  return `inbound:${source}:${businessId}:${eventId}`;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;

function optStr(v: unknown, max: number): v is string | null {
  return v === null || (typeof v === "string" && v.length <= max);
}

function containsForbiddenKey(value: unknown, depth = 0): boolean {
  if (depth > 4 || value === null || typeof value !== "object") return false;
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (FORBIDDEN_KEY.test(k)) return true;
    if (containsForbiddenKey(v, depth + 1)) return true;
  }
  return false;
}

export function validateEvent(parsed: unknown): { ok: true; event: KindnesssEnquiryEvent } | { ok: false; reason: RejectReason } {
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return { ok: false, reason: "schema_invalid" };
  if (containsForbiddenKey(parsed)) return { ok: false, reason: "forbidden_field" };
  const o = parsed as Record<string, unknown>;
  for (const k of Object.keys(o)) if (!ALLOWED_FIELDS.has(k)) return { ok: false, reason: "schema_invalid" };
  const valid =
    o.schema_version === SCHEMA_VERSION && o.event_type === EVENT_TYPE && o.source === KINDNESSS_SOURCE &&
    typeof o.event_id === "string" && UUID.test(o.event_id) &&
    typeof o.enquiry_id === "string" && UUID.test(o.enquiry_id) &&
    typeof o.business_id === "string" && UUID.test(o.business_id) &&
    typeof o.occurred_at === "string" && !Number.isNaN(Date.parse(o.occurred_at)) &&
    typeof o.contact_email === "string" && EMAIL.test(o.contact_email.trim()) &&
    typeof o.consent_contact === "boolean" &&
    optStr(o.contact_name, 200) && optStr(o.organisation_name, 200) && optStr(o.role_title, 120) &&
    optStr(o.country, 80) && optStr(o.enquiry_type, 60) && optStr(o.message, 4000);
  if (!valid) return { ok: false, reason: "schema_invalid" };
  for (const f of ["contact_name", "organisation_name", "role_title", "enquiry_type", "message"] as const) {
    const v = o[f];
    if (typeof v === "string" && FORBIDDEN_TEXT.test(v)) return { ok: false, reason: "forbidden_content" };
  }
  return { ok: true, event: o as unknown as KindnesssEnquiryEvent };
}

export async function decideHandoff(input: HandoffInput): Promise<HandoffDecision> {
  if (!handoffReceiverEnabled(input.enabledFlag)) return reject("receiver_disabled", 503);
  if (new TextEncoder().encode(input.rawBody).length > MAX_BODY_BYTES) return reject("body_too_large", 413);
  if (!input.secret) return reject("missing_secret", 503);

  const source = input.headers.source;
  const ts = input.headers.timestamp;
  if (!source || !Object.prototype.hasOwnProperty.call(SOURCE_BUSINESS_ALLOWLIST, source)) return reject("unknown_source", 401);
  if (!ts || !/^\d{9,11}$/.test(ts) || Math.abs(input.nowSeconds - Number(ts)) > MAX_SKEW_SECONDS) {
    return reject("stale_or_future_timestamp", 401);
  }
  // Signature checked on raw bytes before parsing.
  if (!(await verifySignature(input.secret, ts, input.rawBody, input.headers.signature))) return reject("bad_signature", 401);

  let parsed: unknown;
  try { parsed = JSON.parse(input.rawBody); } catch { return reject("malformed_json", 400); }
  const v = validateEvent(parsed);
  if (!v.ok) return reject(v.reason, v.reason === "schema_invalid" ? 400 : 422);

  const businessId = SOURCE_BUSINESS_ALLOWLIST[source];
  if (v.event.source !== source || v.event.business_id !== businessId) return reject("tenant_mismatch", 403);

  const key = idempotencyKeyFor(source, businessId, v.event.event_id);
  if (await input.idempotencyKeyExists(businessId, key)) return { outcome: "duplicate", idempotencyKey: key, httpStatus: 200 };

  const res = await input.resolveContact(businessId, normaliseEmail(v.event.contact_email));
  const base = { outcome: "accept" as const, idempotencyKey: key, businessId, event: v.event, autoSend: false as const, httpStatus: 202 as const };
  if (res.kind === "matched") {
    return { ...base, route: "conversation", quarantineReason: null, contactId: res.contactId, relationshipId: res.relationshipId };
  }
  return {
    ...base, route: "quarantine",
    quarantineReason: res.kind === "ambiguous" ? "ambiguous_contact" : "no_contact_match",
    contactId: null, relationshipId: null,
  };
}

/** Sender-side retry policy (exponential backoff with cap) -> dead letter. */
export function nextRetry(attempt: number, httpStatus: number | null): { action: "retry"; delaySeconds: number } | { action: "dead_letter" } | { action: "done" } {
  if (httpStatus !== null && httpStatus >= 200 && httpStatus < 300) return { action: "done" };
  // 4xx (except 408/429) is a permanent contract failure: do not hammer.
  if (httpStatus !== null && httpStatus >= 400 && httpStatus < 500 && httpStatus !== 408 && httpStatus !== 429) return { action: "dead_letter" };
  if (attempt >= MAX_ATTEMPTS) return { action: "dead_letter" };
  return { action: "retry", delaySeconds: Math.min(30 * 2 ** attempt, 3600) };
}
