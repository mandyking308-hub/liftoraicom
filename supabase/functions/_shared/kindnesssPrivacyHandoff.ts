/**
 * KND-003 Kindnesss privacy metadata notification protocol.
 * Independent from commercial enquiry ingestion and disabled by default.
 *
 * Signature: sha256=HMAC-SHA256(privacySecret, `${timestamp}.${eventId}.${rawBody}`).
 * The body is authenticated as raw bytes before UTF-8 decoding or JSON parsing.
 */

export const KINDNESSS_PRIVACY_BUSINESS_ID = "640de582-a112-4d16-a221-03c27f00c6ec";
export const KINDNESSS_PRIVACY_SOURCE = "kindnesss";
export const KINDNESSS_PRIVACY_EVENT_TYPE = "privacy_request.notification";
export const KINDNESSS_PRIVACY_SCHEMA_VERSION = 1;
export const KINDNESSS_PRIVACY_MAX_SKEW_SECONDS = 300;
export const KINDNESSS_PRIVACY_MAX_BODY_BYTES = 4_096;

export const PRIVACY_WIRE_KEYS = [
  "schema_version",
  "event_type",
  "event_id",
  "source",
  "business_id",
  "occurred_at",
  "kind",
  "request_ref",
  "request_type",
  "due_at",
] as const;

export const PRIVACY_KINDS = ["new_request", "overdue"] as const;
export const PRIVACY_REQUEST_TYPES = [
  "access",
  "correction",
  "deletion",
  "restriction_objection",
  "stop_child_collection",
  "withdraw_consent",
  "billing_data",
  "other",
] as const;

export interface PrivacyNotificationEvent {
  schema_version: 1;
  event_type: typeof KINDNESSS_PRIVACY_EVENT_TYPE;
  event_id: string;
  source: typeof KINDNESSS_PRIVACY_SOURCE;
  business_id: typeof KINDNESSS_PRIVACY_BUSINESS_ID;
  occurred_at: string;
  kind: typeof PRIVACY_KINDS[number];
  request_ref: string;
  request_type: typeof PRIVACY_REQUEST_TYPES[number];
  due_at: string;
}

export interface PrivacyNotificationHeaders {
  source: string | null;
  eventType: string | null;
  eventId: string | null;
  timestamp: string | null;
  signature: string | null;
}

export type PrivacyRejectReason =
  | "receiver_disabled"
  | "body_too_large"
  | "missing_or_shared_secret"
  | "bad_signature"
  | "stale_or_future_timestamp"
  | "unknown_source"
  | "malformed_json"
  | "schema_invalid"
  | "tenant_mismatch"
  | "forbidden_field";

export type PrivacyAuthResult =
  | { outcome: "reject"; reason: PrivacyRejectReason; httpStatus: number }
  | { outcome: "authenticated"; event: PrivacyNotificationEvent };

export interface PrivacyAuthInput {
  enabledFlag: string | null | undefined;
  secret: string | null | undefined;
  commercialSecret?: string | null | undefined;
  rawBody: Uint8Array;
  headers: PrivacyNotificationHeaders;
  nowSeconds: number;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;
const ALLOWED_KEYS = new Set<string>(PRIVACY_WIRE_KEYS);
const FORBIDDEN_KEY = /(requester|name|email|details|notes?|message|child|children|pupil|student|parent|guardian|family|relationship|passport|dob|date_of_birth|address|phone|safeguard|medical)/i;

function reject(reason: PrivacyRejectReason, httpStatus: number): PrivacyAuthResult {
  return { outcome: "reject", reason, httpStatus };
}

function rawBytes(value: Uint8Array): Uint8Array<ArrayBuffer> {
  const copy = new Uint8Array(value.byteLength);
  copy.set(value);
  return copy;
}

function signedContent(timestamp: string, eventId: string, body: Uint8Array): Uint8Array<ArrayBuffer> {
  const prefix = new TextEncoder().encode(`${timestamp}.${eventId}.`);
  const content = new Uint8Array(prefix.byteLength + body.byteLength);
  content.set(prefix, 0);
  content.set(rawBytes(body), prefix.byteLength);
  return content;
}

function hexToBytes(hex: string): Uint8Array<ArrayBuffer> | null {
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) return null;
  const out = new Uint8Array(32);
  for (let index = 0; index < out.length; index += 1) out[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  return out;
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.byteLength !== b.byteLength) return false;
  let difference = 0;
  for (let index = 0; index < a.byteLength; index += 1) difference |= a[index] ^ b[index];
  return difference === 0;
}

export async function verifyPrivacySignature(
  secret: string,
  timestamp: string,
  eventId: string,
  rawBody: Uint8Array,
  header: string | null,
): Promise<boolean> {
  if (!header?.startsWith("sha256=")) return false;
  const received = hexToBytes(header.slice(7));
  if (!received) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const expected = new Uint8Array(await crypto.subtle.sign("HMAC", key, signedContent(timestamp, eventId, rawBody)));
  return constantTimeEqual(expected, received);
}

function canonicalIso(value: unknown): value is string {
  if (typeof value !== "string" || !ISO.test(value)) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date.toISOString() === value;
}

export function validatePrivacyNotification(parsed: unknown):
  | { ok: true; event: PrivacyNotificationEvent }
  | { ok: false; reason: PrivacyRejectReason; httpStatus: number } {
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { ok: false, reason: "schema_invalid", httpStatus: 400 };
  }
  const value = parsed as Record<string, unknown>;
  const keys = Object.keys(value);
  if (keys.some((key) => FORBIDDEN_KEY.test(key))) return { ok: false, reason: "forbidden_field", httpStatus: 422 };
  if (keys.length !== PRIVACY_WIRE_KEYS.length || keys.some((key) => !ALLOWED_KEYS.has(key))) {
    return { ok: false, reason: "schema_invalid", httpStatus: 400 };
  }
  const valid =
    value.schema_version === KINDNESSS_PRIVACY_SCHEMA_VERSION &&
    value.event_type === KINDNESSS_PRIVACY_EVENT_TYPE &&
    value.source === KINDNESSS_PRIVACY_SOURCE &&
    value.business_id === KINDNESSS_PRIVACY_BUSINESS_ID &&
    typeof value.event_id === "string" && UUID.test(value.event_id) &&
    typeof value.request_ref === "string" && UUID.test(value.request_ref) &&
    canonicalIso(value.occurred_at) && canonicalIso(value.due_at) &&
    (PRIVACY_KINDS as readonly unknown[]).includes(value.kind) &&
    (PRIVACY_REQUEST_TYPES as readonly unknown[]).includes(value.request_type);
  if (!valid) return { ok: false, reason: "schema_invalid", httpStatus: 400 };
  return { ok: true, event: value as unknown as PrivacyNotificationEvent };
}

export async function authenticatePrivacyNotification(input: PrivacyAuthInput): Promise<PrivacyAuthResult> {
  if (input.enabledFlag !== "true") return reject("receiver_disabled", 503);
  if (input.rawBody.byteLength > KINDNESSS_PRIVACY_MAX_BODY_BYTES) return reject("body_too_large", 413);
  if (!input.secret || input.secret.length < 32 || (input.commercialSecret && input.secret === input.commercialSecret)) {
    return reject("missing_or_shared_secret", 503);
  }
  const { source, eventType, eventId, timestamp, signature } = input.headers;
  if (source !== KINDNESSS_PRIVACY_SOURCE || eventType !== KINDNESSS_PRIVACY_EVENT_TYPE) return reject("unknown_source", 401);
  if (!timestamp || !/^\d{9,11}$/.test(timestamp) || Math.abs(input.nowSeconds - Number(timestamp)) > KINDNESSS_PRIVACY_MAX_SKEW_SECONDS) {
    return reject("stale_or_future_timestamp", 401);
  }
  if (!eventId || !UUID.test(eventId) || !(await verifyPrivacySignature(input.secret, timestamp, eventId, input.rawBody, signature))) {
    return reject("bad_signature", 401);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(input.rawBody));
  } catch {
    return reject("malformed_json", 400);
  }
  const validated = validatePrivacyNotification(parsed);
  if (validated.ok === false) return reject(validated.reason, validated.httpStatus);
  if (validated.event.event_id !== eventId || validated.event.source !== source || validated.event.business_id !== KINDNESSS_PRIVACY_BUSINESS_ID) {
    return reject("tenant_mismatch", 403);
  }
  return { outcome: "authenticated", event: validated.event };
}
