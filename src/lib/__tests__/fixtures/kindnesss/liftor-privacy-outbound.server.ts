/**
 * KND-003 Kindnesss -> Liftor privacy-workstream notification contract.
 *
 * PREPARED ONLY — default OFF. No network I/O or database access here. The wire
 * event is METADATA ONLY: kind, opaque request reference, request type and
 * internal due date, plus source/business identifiers. It never carries a
 * requester or child name, email, relationship, details or notes. The builder
 * rejects any outbox payload that has keys beyond the four allowlisted ones.
 *
 * Uses its own enable flag, URL and secret (never the commercial secret), so
 * enabling commercial enquiry delivery can never start privacy delivery.
 */
import { createHmac, timingSafeEqual } from "crypto";
import {
  LIFTOR_BUSINESS_ID,
  LIFTOR_MAX_SKEW_SECONDS,
  LIFTOR_SCHEMA_VERSION,
  LIFTOR_SOURCE,
  isAllowedLiftorUrl,
} from "./liftor-outbound.server";

export const PRIVACY_EVENT_TYPE = "privacy_request.notification" as const;
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
export const PRIVACY_PAYLOAD_KEYS = ["due_at", "kind", "request_ref", "request_type"] as const;
export const PRIVACY_KINDS = ["new_request", "overdue"] as const;
/** Mirrors privacy_requests_type_chk. */
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

export type PrivacyConfig = { enabled: true; url: string; secret: string };
export function resolveLiftorPrivacyConfig(
  env: Record<string, string | undefined>,
): PrivacyConfig | null {
  if (env["LIFTOR_PRIVACY_OUTBOUND_ENABLED"] !== "true") return null;
  const url = env["LIFTOR_PRIVACY_WEBHOOK_URL"] ?? "";
  const secret = env["LIFTOR_PRIVACY_WEBHOOK_SECRET"] ?? "";
  if (!isAllowedLiftorUrl(url) || secret.length < 32) return null;
  if (secret === (env["LIFTOR_WEBHOOK_SECRET"] ?? "")) return null; // key separation
  return { enabled: true, url, secret };
}

export type PrivacyOutboxRow = {
  id: string;
  request_id: string;
  kind: string;
  payload: unknown;
  created_at: string;
  attempts: number;
};

export type PrivacyWireEvent = {
  schema_version: 1;
  event_type: typeof PRIVACY_EVENT_TYPE;
  event_id: string;
  source: typeof LIFTOR_SOURCE;
  business_id: typeof LIFTOR_BUSINESS_ID;
  occurred_at: string;
  kind: (typeof PRIVACY_KINDS)[number];
  request_ref: string;
  request_type: (typeof PRIVACY_REQUEST_TYPES)[number];
  due_at: string;
};

export class PrivacyContractError extends Error {}
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

/** Builds the exact flat event. Throws (never sends) on any unexpected shape. */
export function buildPrivacyEvent(row: PrivacyOutboxRow): PrivacyWireEvent {
  if (!UUID.test(row.id)) throw new PrivacyContractError("invalid_event_id");
  if (!UUID.test(row.request_id)) throw new PrivacyContractError("invalid_request_ref");
  const p = row.payload;
  if (!p || typeof p !== "object" || Array.isArray(p))
    throw new PrivacyContractError("invalid_payload");
  const keys = Object.keys(p).sort();
  if (keys.join(",") !== [...PRIVACY_PAYLOAD_KEYS].join(","))
    throw new PrivacyContractError("unexpected_payload_keys");
  const v = p as Record<string, unknown>;
  if (v["request_ref"] !== row.request_id) throw new PrivacyContractError("request_ref_mismatch");
  if (v["kind"] !== row.kind || !(PRIVACY_KINDS as readonly unknown[]).includes(v["kind"]))
    throw new PrivacyContractError("invalid_kind");
  if (!(PRIVACY_REQUEST_TYPES as readonly unknown[]).includes(v["request_type"]))
    throw new PrivacyContractError("invalid_request_type");
  if (
    typeof v["due_at"] !== "string" ||
    !ISO.test(v["due_at"]) ||
    Number.isNaN(Date.parse(v["due_at"]))
  )
    throw new PrivacyContractError("invalid_due_at");
  if (Number.isNaN(Date.parse(row.created_at)))
    throw new PrivacyContractError("invalid_occurred_at");
  return {
    schema_version: LIFTOR_SCHEMA_VERSION,
    event_type: PRIVACY_EVENT_TYPE,
    event_id: row.id,
    source: LIFTOR_SOURCE,
    business_id: LIFTOR_BUSINESS_ID,
    occurred_at: new Date(row.created_at).toISOString(),
    kind: v["kind"] as PrivacyWireEvent["kind"],
    request_ref: row.request_id,
    request_type: v["request_type"] as PrivacyWireEvent["request_type"],
    due_at: new Date(v["due_at"]).toISOString(),
  };
}

/** HMAC-SHA256 over `${timestamp}.${event_id}.${body}` so a signature cannot be moved to another event. */
export function signPrivacyRequest(secret: string, ts: string, eventId: string, body: string) {
  return "sha256=" + createHmac("sha256", secret).update(`${ts}.${eventId}.${body}`).digest("hex");
}

export function buildPrivacyRequest(cfg: PrivacyConfig, event: PrivacyWireEvent, nowMs: number) {
  const body = JSON.stringify(event);
  const ts = String(Math.floor(nowMs / 1000));
  return {
    url: cfg.url,
    method: "POST" as const,
    body,
    headers: {
      "Content-Type": "application/json",
      "X-Liftor-Source": LIFTOR_SOURCE,
      "X-Liftor-Event-Type": PRIVACY_EVENT_TYPE,
      "X-Liftor-Event-Id": event.event_id,
      "X-Liftor-Timestamp": ts,
      "X-Liftor-Signature": signPrivacyRequest(cfg.secret, ts, event.event_id, body),
    },
  };
}

/**
 * Reference receiver-side check (for the Liftor privacy receiver to mirror):
 * signature, ±300 s clock skew, exact business/source, allowlisted keys only,
 * and replay rejection by event_id. `seen` is the receiver's durable dedupe store.
 */
export function verifyPrivacyDelivery(
  secret: string,
  headers: Record<string, string | undefined>,
  body: string,
  nowMs: number,
  seen: Set<string>,
): { ok: true; duplicate: boolean } | { ok: false; status: 400 | 401 } {
  const ts = headers["X-Liftor-Timestamp"] ?? "";
  const id = headers["X-Liftor-Event-Id"] ?? "";
  const sig = headers["X-Liftor-Signature"] ?? "";
  if (!/^\d{1,12}$/.test(ts) || Math.abs(nowMs / 1000 - Number(ts)) > LIFTOR_MAX_SKEW_SECONDS)
    return { ok: false, status: 401 };
  const a = Buffer.from(signPrivacyRequest(secret, ts, id, body));
  const b = Buffer.from(sig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return { ok: false, status: 401 };
  let e: Record<string, unknown>;
  try {
    e = JSON.parse(body);
  } catch {
    return { ok: false, status: 400 };
  }
  if (
    Object.keys(e).sort().join(",") !== [...PRIVACY_WIRE_KEYS].sort().join(",") ||
    e["event_id"] !== id ||
    e["business_id"] !== LIFTOR_BUSINESS_ID ||
    e["source"] !== LIFTOR_SOURCE ||
    e["event_type"] !== PRIVACY_EVENT_TYPE
  )
    return { ok: false, status: 400 };
  if (seen.has(id)) return { ok: true, duplicate: true }; // idempotent 2xx, no second action
  seen.add(id);
  return { ok: true, duplicate: false };
}
