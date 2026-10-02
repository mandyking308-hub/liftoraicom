import { describe, expect, it } from "vitest";
import { APOLLO_CONNECTION_UI_COLUMNS } from "../providers/apolloConnectionProjection";
import { assertProviderOperationContext } from "../providers/outreachProviderContract";
import {
  smartleadWebhookReceiverEnabled,
  verifySmartleadWebhookSignature,
} from "../../../supabase/functions/_shared/smartleadWebhookAuth";
import {
  buildIdempotencyKey,
  deriveContactMutation,
  extractEvent,
} from "../../../supabase/functions/_shared/smartleadEventNormalizer";

async function sign(rawBody: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody)));
  return `sha256=${Array.from(signature, (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

describe("Worker 3 provider core", () => {
  it("keeps Apollo ciphertext out of browser connection queries", () => {
    expect(APOLLO_CONNECTION_UI_COLUMNS).toContain("api_key_last4");
    expect(APOLLO_CONNECTION_UI_COLUMNS).not.toMatch(/api_key_cipher|api_key\b/i);
    expect(APOLLO_CONNECTION_UI_COLUMNS).not.toContain("*");
  });

  it("verifies the exact Smartlead raw-body HMAC signature", async () => {
    const body = '{"event_type":"email_reply_received","event_id":"evt-1"}';
    const signature = await sign(body, "business-connection-secret");
    expect(await verifySmartleadWebhookSignature(body, signature, "business-connection-secret")).toBe(true);
    expect(await verifySmartleadWebhookSignature(
      new TextEncoder().encode(body),
      `sha256=${signature.slice("sha256=".length).toUpperCase()}`,
      "business-connection-secret",
    )).toBe(true);
    expect(await verifySmartleadWebhookSignature(`${body} `, signature, "business-connection-secret")).toBe(false);
    expect(await verifySmartleadWebhookSignature(body, `SHA256=${signature.slice("sha256=".length)}`, "business-connection-secret")).toBe(false);
    expect(await verifySmartleadWebhookSignature(body, `${signature} `, "business-connection-secret")).toBe(false);
    expect(await verifySmartleadWebhookSignature(body, `sha256=${"0".repeat(62)}`, "business-connection-secret")).toBe(false);
    expect(await verifySmartleadWebhookSignature(body, "business-connection-secret", "business-connection-secret")).toBe(false);
    expect(await verifySmartleadWebhookSignature(body, signature, null)).toBe(false);
  });

  it("prefers X-Request-Id before provider event/composite keys", () => {
    const event = extractEvent({ event_type: "reply", event_id: "event-1" });
    expect(buildIdempotencyKey(event, "request-1")).toBe("req:request-1");
    expect(buildIdempotencyKey(event, "invalid\nrequest-id")).toBe("evt:event-1");
    expect(buildIdempotencyKey(event, "x".repeat(201))).toBe("evt:event-1");
    expect(buildIdempotencyKey(event)).toBe("evt:event-1");
  });

  it("keeps the Smartlead receiver off unless the deployment opts in literally", () => {
    expect(smartleadWebhookReceiverEnabled(null)).toBe(false);
    expect(smartleadWebhookReceiverEnabled("TRUE")).toBe(false);
    expect(smartleadWebhookReceiverEnabled("true")).toBe(true);
  });

  it("normalizes event timestamps and emits only valid, escalating CRM status values", () => {
    const reply = extractEvent({ event_type: "reply", timestamp: 1_758_000_000 });
    expect(reply.event_occurred_at).toBe(new Date(1_758_000_000_000).toISOString());
    expect(deriveContactMutation(reply).contact_patch).toEqual({ last_replied_at: reply.event_occurred_at });

    const bounce = deriveContactMutation(extractEvent({ event_type: "hard_bounce" }));
    expect(bounce.contact_patch).toMatchObject({
      hard_bounced: true,
      is_globally_suppressed: true,
      sendable_status: "suppressed",
      status: "DO_NOT_CONTACT",
      compliance_status: "hard_bounced",
    });
    expect(JSON.stringify(bounce.contact_patch)).not.toMatch(/"status":"(bounced|replied|unsubscribed)"/);

    const unsubscribe = deriveContactMutation(extractEvent({ event_type: "unsubscribe" }));
    expect(unsubscribe.contact_patch).toMatchObject({ status: "DO_NOT_CONTACT", compliance_status: "unsubscribed" });
  });

  it("requires explicit business and provider-connection scope and blocks mutations", () => {
    const base = { businessId: "b1", providerConnectionId: "pc1", idempotencyKey: "req:1", mode: "read" as const };
    expect(() => assertProviderOperationContext(base)).not.toThrow();
    expect(() => assertProviderOperationContext(base, "b2")).toThrow("provider_business_scope_mismatch");
    expect(() => assertProviderOperationContext({ ...base, providerConnectionId: "" })).toThrow("provider_operation_scope_required");
    expect(() => assertProviderOperationContext({ ...base, mode: "mutate" })).toThrow("provider_mutations_disabled");
  });
});

describe("Worker 3 provider core acceptance closeout", () => {
  it("rejects a signature computed with a different business connection secret", async () => {
    const body = '{"event_type":"email_reply_received","event_id":"evt-2"}';
    const foreign = await sign(body, "other-business-secret");
    expect(await verifySmartleadWebhookSignature(body, foreign, "business-connection-secret")).toBe(false);
    expect(await verifySmartleadWebhookSignature(body, await sign(body, "business-connection-secret"), "")).toBe(false);
  });

  it("produces stable idempotency keys for identical deliveries", () => {
    const a = extractEvent({ event_type: "reply", event_id: "event-9" });
    const b = extractEvent({ event_type: "reply", event_id: "event-9" });
    expect(buildIdempotencyKey(a)).toBe(buildIdempotencyKey(b));
    expect(buildIdempotencyKey(a, "req-x")).toBe(buildIdempotencyKey(b, "req-x"));
  });

  it("blocks cross-business provider operations even in read mode", () => {
    const ctx = { businessId: "b1", providerConnectionId: "pc1", idempotencyKey: "req:1", mode: "read" as const };
    expect(() => assertProviderOperationContext({ ...ctx, businessId: "" })).toThrow();
    expect(() => assertProviderOperationContext(ctx, "b9")).toThrow("provider_business_scope_mismatch");
  });

  it("never exposes encrypted credential columns to browser projections", () => {
    expect(APOLLO_CONNECTION_UI_COLUMNS).not.toMatch(/cipher|secret|encrypted|token/i);
  });
});
