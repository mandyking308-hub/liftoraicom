/**
 * Kindnesss -> Liftor outbound contract for `commercial_enquiry.submitted`.
 *
 * PREPARED ONLY — default OFF. No network I/O, no database access, no
 * scheduling. A future outbox worker (schema not yet approved, see
 * docs/approval/liftor-outbox-candidate.sql) would call these helpers.
 *
 * Wire format mirrors Liftor's receiver `validateEvent` exactly: a FLAT object
 * with exactly the 15 keys below and nothing else. Parity is proven offline
 * against a verbatim fixture of the receiver (tests/fixtures/liftor-receiver.ts).
 *
 * Data boundary: business contact fields only. `message` is ALWAYS null; no
 * child, parent, pupil, class, family, Circle or Kindness Passport data. An
 * event is built only when stored consent to contact is explicitly true.
 */
import { createHmac, timingSafeEqual } from "crypto";

export const LIFTOR_SCHEMA_VERSION = 1 as const;
export const LIFTOR_EVENT_TYPE = "commercial_enquiry.submitted" as const;
export const LIFTOR_SOURCE = "kindnesss" as const;
export const LIFTOR_BUSINESS_ID = "640de582-a112-4d16-a221-03c27f00c6ec" as const;
export const LIFTOR_MAX_ATTEMPTS = 6;
export const LIFTOR_MAX_DELAY_SECONDS = 3600;
export const LIFTOR_MAX_SKEW_SECONDS = 300;

export const LIFTOR_WIRE_KEYS = [
  "schema_version",
  "event_type",
  "event_id",
  "source",
  "business_id",
  "occurred_at",
  "enquiry_id",
  "contact_name",
  "contact_email",
  "organisation_name",
  "role_title",
  "country",
  "enquiry_type",
  "message",
  "consent_contact",
] as const;

/** Default OFF. Enabled only when explicitly configured AND all values present. */
export type LiftorConfig = { enabled: true; url: string; secret: string };
export function resolveLiftorConfig(env: Record<string, string | undefined>): LiftorConfig | null {
  if (env["LIFTOR_OUTBOUND_ENABLED"] !== "true") return null;
  const url = env["LIFTOR_WEBHOOK_URL"] ?? "";
  const secret = env["LIFTOR_WEBHOOK_SECRET"] ?? "";
  if (!isAllowedLiftorUrl(url) || secret.length < 32) return null;
  return { enabled: true, url, secret };
}

/**
 * HTTPS-only allowlist for the receiver. Only Liftor's own domain or a Supabase
 * Functions endpoint path are accepted; credentials, ports and other hosts fail.
 */
export const LIFTOR_ALLOWED_HOST_SUFFIXES = ["liftorai.com", "supabase.co"] as const;
export function isAllowedLiftorUrl(raw: string): boolean {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return false;
  }
  if (u.protocol !== "https:" || u.username || u.password || u.port) return false;
  const h = u.hostname.toLowerCase();
  if (h === "liftorai.com" || h.endsWith(".liftorai.com")) return true;
  return h.endsWith(".supabase.co") && u.pathname.startsWith("/functions/v1/");
}

/** Stored enquiry fields. Consent must come from storage; unknown is never true. */
export type EnquiryRecord = {
  id: string;
  created_at: string;
  enquiry_type?: string | null;
  organisation_name?: string | null;
  contact_name?: string | null;
  work_email?: string | null;
  country_region?: string | null;
  role_title?: string | null;
  consent_contact?: boolean | null;
};

export type LiftorWireEvent = {
  schema_version: 1;
  event_type: typeof LIFTOR_EVENT_TYPE;
  event_id: string;
  source: typeof LIFTOR_SOURCE;
  business_id: typeof LIFTOR_BUSINESS_ID;
  occurred_at: string;
  enquiry_id: string;
  contact_name: string | null;
  contact_email: string;
  organisation_name: string | null;
  role_title: string | null;
  country: string | null;
  enquiry_type: string | null;
  message: null;
  consent_contact: true;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;
const ENQUIRY_TYPE = /^[a-z][a-z0-9_-]{0,59}$/;
const opt = (v: unknown, max: number): string | null => {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t ? t.slice(0, max) : null;
};

export class LiftorContractError extends Error {}

/**
 * Builds the exact flat wire event. Throws (never sends) when the enquiry id,
 * timestamp or business contact email is invalid, or when stored consent to
 * contact is not explicitly true. event_id = enquiry_id, stable across retries.
 */
export function buildEnquiryEvent(r: EnquiryRecord): LiftorWireEvent {
  if (!UUID.test(r.id)) throw new LiftorContractError("invalid_enquiry_id");
  if (typeof r.created_at !== "string" || Number.isNaN(Date.parse(r.created_at)))
    throw new LiftorContractError("invalid_occurred_at");
  const email = typeof r.work_email === "string" ? r.work_email.trim() : "";
  if (!EMAIL.test(email)) throw new LiftorContractError("missing_contact_email");
  if (r.consent_contact !== true) throw new LiftorContractError("no_stored_consent");
  const type = opt(r.enquiry_type, 60);
  return {
    schema_version: LIFTOR_SCHEMA_VERSION,
    event_type: LIFTOR_EVENT_TYPE,
    event_id: r.id,
    source: LIFTOR_SOURCE,
    business_id: LIFTOR_BUSINESS_ID,
    occurred_at: new Date(r.created_at).toISOString(),
    enquiry_id: r.id,
    contact_name: opt(r.contact_name, 200),
    contact_email: email,
    organisation_name: opt(r.organisation_name, 200),
    role_title: opt(r.role_title, 120),
    country: opt(r.country_region, 80),
    enquiry_type: type && ENQUIRY_TYPE.test(type) ? type : null,
    message: null,
    consent_contact: true,
  };
}

export function signLiftorRequest(secret: string, timestamp: string, rawBody: string): string {
  return "sha256=" + createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
}

export function verifyLiftorSignature(
  secret: string,
  timestamp: string,
  rawBody: string,
  header: string,
): boolean {
  const a = Buffer.from(signLiftorRequest(secret, timestamp, rawBody));
  const b = Buffer.from(header);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Exact request (no I/O). Timestamp = unix seconds at send time (receiver allows ±300 s). */
export function buildLiftorRequest(cfg: LiftorConfig, event: LiftorWireEvent, nowMs: number) {
  const rawBody = JSON.stringify(event);
  const timestamp = String(Math.floor(nowMs / 1000));
  return {
    url: cfg.url,
    method: "POST" as const,
    body: rawBody,
    headers: {
      "Content-Type": "application/json",
      "X-Liftor-Source": LIFTOR_SOURCE,
      "X-Liftor-Timestamp": timestamp,
      "X-Liftor-Signature": signLiftorRequest(cfg.secret, timestamp, rawBody),
    },
  };
}

export type DeliveryDecision =
  { action: "done" } | { action: "retry"; delaySeconds: number } | { action: "dead_letter" };

/**
 * Mirrors Liftor's sender policy `nextRetry`: 2xx done; 4xx except 408/429
 * dead-letters; otherwise retry with min(30·2^attempt, 3600) s until 6 attempts.
 */
export function deliveryDecision(attempt: number, status: number | null): DeliveryDecision {
  if (status !== null && status >= 200 && status < 300) return { action: "done" };
  if (status !== null && status >= 400 && status < 500 && status !== 408 && status !== 429)
    return { action: "dead_letter" };
  if (attempt >= LIFTOR_MAX_ATTEMPTS) return { action: "dead_letter" };
  return { action: "retry", delaySeconds: Math.min(30 * 2 ** attempt, LIFTOR_MAX_DELAY_SECONDS) };
}
