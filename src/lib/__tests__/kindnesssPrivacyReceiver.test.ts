import { createHash, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import {
  buildPrivacyEvent,
  buildPrivacyRequest,
  PRIVACY_WIRE_KEYS,
  signPrivacyRequest,
  type PrivacyOutboxRow,
  type PrivacyWireEvent,
} from "./fixtures/kindnesss/liftor-privacy-outbound.server";
import { handleKindnesssPrivacyNotification } from "../../../supabase/functions/_shared/kindnesssPrivacyReceiver";
import type { PrivacyNotificationStore } from "../../../supabase/functions/_shared/kindnesssPrivacyReceiver";

const SECRET = "synthetic-privacy-signing-secret-40-bytes!!!";
const COMMERCIAL_SECRET = "different-commercial-signing-secret-32bytes";
const NOW_MS = Date.parse("2026-11-16T10:05:00.000Z");
const REQUEST_REF = "11111111-2222-4333-8444-555555555555";

function outbox(overrides: Partial<PrivacyOutboxRow> = {}): PrivacyOutboxRow {
  return {
    id: randomUUID(),
    request_id: REQUEST_REF,
    kind: "new_request",
    payload: {
      kind: "new_request",
      request_ref: REQUEST_REF,
      request_type: "deletion",
      due_at: "2026-12-16T10:00:00.000Z",
    },
    created_at: "2026-11-16T10:00:00.000Z",
    attempts: 0,
    ...overrides,
  };
}

function request(event: PrivacyWireEvent, nowMs = NOW_MS, secret = SECRET): { url: string; method: "POST"; body: string; headers: Record<string, string> } {
  return buildPrivacyRequest({ enabled: true, url: "https://liftorai.com/functions/v1/kindnesss-privacy-receiver", secret }, event, nowMs);
}

function memoryStore(): PrivacyNotificationStore & { deliveries: Map<string, { deliveryId: string; privacyRequestId: string; event: PrivacyWireEvent }> } {
  const deliveries = new Map<string, { deliveryId: string; privacyRequestId: string; event: PrivacyWireEvent }>();
  const cases = new Map<string, string>();
  return {
    deliveries,
    async receive(event) {
      const existing = deliveries.get(event.event_id);
      if (existing) return { ...existing, duplicate: true };
      let privacyRequestId = cases.get(event.request_ref);
      if (!privacyRequestId) {
        privacyRequestId = randomUUID();
        cases.set(event.request_ref, privacyRequestId);
      }
      const receipt = { deliveryId: randomUUID(), privacyRequestId, event };
      deliveries.set(event.event_id, receipt);
      return { ...receipt, duplicate: false };
    },
  };
}

function receive(req: ReturnType<typeof request>, store: PrivacyNotificationStore, nowMs = NOW_MS) {
  return handleKindnesssPrivacyNotification(new TextEncoder().encode(req.body), {
    source: req.headers["X-Liftor-Source"],
    eventType: req.headers["X-Liftor-Event-Type"],
    eventId: req.headers["X-Liftor-Event-Id"],
    timestamp: req.headers["X-Liftor-Timestamp"],
    signature: req.headers["X-Liftor-Signature"],
  }, {
    enabledFlag: "true",
    secret: SECRET,
    commercialSecret: COMMERCIAL_SECRET,
    store,
    now: () => new Date(nowMs),
  });
}

describe("KND-003 exact Kindnesss privacy sender to Liftor receiver", () => {
  it("pins the verbatim Kindnesss sender fixture to the reviewed cross-repository snapshot", () => {
    const source = readFileSync("src/lib/__tests__/fixtures/kindnesss/liftor-privacy-outbound.server.ts");
    expect(createHash("sha256").update(source).digest("hex")).toBe("24719b0e32a52d3d9409172ec19670b0eeb139391fc82ad54fc0002a69778902");
  });

  it("accepts the exact ten-key signed bytes only after durable storage and dedupes by event ID", async () => {
    const store = memoryStore();
    const event = buildPrivacyEvent(outbox());
    expect(Object.keys(event).sort()).toEqual([...PRIVACY_WIRE_KEYS].sort());
    expect(PRIVACY_WIRE_KEYS).toHaveLength(10);
    const req = request(event);
    expect(await receive(req, store)).toMatchObject({ status: 202, body: { duplicate: false, autoSend: false } });
    expect(await receive(req, store)).toMatchObject({ status: 200, body: { duplicate: true } });
    expect(store.deliveries.size).toBe(1);
    expect(JSON.stringify([...store.deliveries.values()])).not.toMatch(/requester|email|child_name|details|notes/i);
  });

  it("rejects wrong secrets, stale timestamps, tampering, header/business mismatch and added PII without writes", async () => {
    const store = memoryStore();
    const event = buildPrivacyEvent(outbox());
    const valid = request(event);
    expect((await receive(valid, store, NOW_MS + 301_000)).status).toBe(401);
    expect((await receive(request(event, NOW_MS, "wrong-privacy-signing-secret-32-bytes!!!"), store)).status).toBe(401);
    expect((await receive({ ...valid, body: valid.body.replace("deletion", "access") }, store)).status).toBe(401);
    expect((await receive({ ...valid, headers: { ...valid.headers, "X-Liftor-Source": "other" } }, store)).status).toBe(401);
    expect((await receive({ ...valid, headers: { ...valid.headers, "X-Liftor-Event-Id": randomUUID() } }, store)).status).toBe(401);

    for (const extra of [{ requester_email: "person@example.invalid" }, { child_name: "Synthetic child" }, { notes: "Sensitive prose" }, { unexpected: true }]) {
      const body = JSON.stringify({ ...event, ...extra });
      const timestamp = valid.headers["X-Liftor-Timestamp"];
      const signed = signPrivacyRequest(SECRET, timestamp, event.event_id, body);
      const response = await receive({ ...valid, body, headers: { ...valid.headers, "X-Liftor-Signature": signed } }, store);
      expect([400, 422]).toContain(response.status);
    }
    const otherBusiness = JSON.stringify({ ...event, business_id: randomUUID() });
    const signature = signPrivacyRequest(SECRET, valid.headers["X-Liftor-Timestamp"], event.event_id, otherBusiness);
    expect((await receive({ ...valid, body: otherBusiness, headers: { ...valid.headers, "X-Liftor-Signature": signature } }, store)).status).toBe(400);
    expect(store.deliveries.size).toBe(0);
  });

  it("fails closed when disabled, missing a secret or reusing the commercial secret", async () => {
    const store = memoryStore();
    const req = request(buildPrivacyEvent(outbox()));
    const rawBody = new TextEncoder().encode(req.body);
    const headers = {
      source: req.headers["X-Liftor-Source"], eventType: req.headers["X-Liftor-Event-Type"],
      eventId: req.headers["X-Liftor-Event-Id"], timestamp: req.headers["X-Liftor-Timestamp"], signature: req.headers["X-Liftor-Signature"],
    };
    for (const overrides of [{ enabledFlag: undefined }, { secret: null }, { commercialSecret: SECRET }]) {
      const response = await handleKindnesssPrivacyNotification(rawBody, headers, {
        enabledFlag: "true", secret: SECRET, commercialSecret: COMMERCIAL_SECRET, store, ...overrides,
      });
      expect(response.status).toBe(503);
    }
    expect(store.deliveries.size).toBe(0);
  });

  it("returns retryable 503 on storage outage and succeeds on a later retry", async () => {
    const store = memoryStore();
    const req = request(buildPrivacyEvent(outbox()));
    const unavailable: PrivacyNotificationStore = { receive: async () => { throw new Error("synthetic database outage"); } };
    expect((await receive(req, unavailable)).status).toBe(503);
    expect((await receive(req, store)).status).toBe(202);
    expect(store.deliveries.size).toBe(1);
  });

  it("keeps two event IDs independent while linking one opaque request reference", async () => {
    const store = memoryStore();
    const first = buildPrivacyEvent(outbox());
    const second = buildPrivacyEvent(outbox({ id: randomUUID(), kind: "overdue", payload: { kind: "overdue", request_ref: REQUEST_REF, request_type: "deletion", due_at: "2026-12-16T10:00:00.000Z" } }));
    const one = await receive(request(first), store);
    const two = await receive(request(second), store);
    expect(one.body.privacy_request_id).toBe(two.body.privacy_request_id);
    expect(one.body.delivery_id).not.toBe(two.body.delivery_id);
    expect(store.deliveries.size).toBe(2);
  });

  it("has a real default-off entrypoint with no send, payload logging or commercial receiver import", () => {
    const source = readFileSync("supabase/functions/kindnesss-privacy-receiver/index.ts", "utf8");
    expect(source).toContain("KINDNESSS_PRIVACY_RECEIVER_ENABLED");
    expect(source).toContain("KINDNESSS_PRIVACY_SIGNING_SECRET");
    expect(source).toContain("KINDNESSS_HANDOFF_SIGNING_SECRET");
    expect(source).not.toContain("kindnesssUnifiedReceiver");
    expect(source).not.toMatch(/console\.|fetch\s*\(/);
    const fetchSpy = vi.fn();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
