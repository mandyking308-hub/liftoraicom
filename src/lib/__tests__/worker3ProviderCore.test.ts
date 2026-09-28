import { describe, expect, it } from "vitest";
import { APOLLO_CONNECTION_UI_COLUMNS } from "../providers/apolloConnectionProjection";
import { assertProviderOperationContext } from "../providers/outreachProviderContract";
import { verifySmartleadWebhookSignature } from "../../../supabase/functions/_shared/smartleadWebhookAuth";
import { buildIdempotencyKey, extractEvent } from "../../../supabase/functions/_shared/smartleadEventNormalizer";

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
    expect(await verifySmartleadWebhookSignature(`${body} `, signature, "business-connection-secret")).toBe(false);
    expect(await verifySmartleadWebhookSignature(body, "business-connection-secret", "business-connection-secret")).toBe(false);
    expect(await verifySmartleadWebhookSignature(body, signature, null)).toBe(false);
  });

  it("prefers X-Request-Id before provider event/composite keys", () => {
    const event = extractEvent({ event_type: "reply", event_id: "event-1" });
    expect(buildIdempotencyKey(event, "request-1")).toBe("req:request-1");
    expect(buildIdempotencyKey(event)).toBe("evt:event-1");
  });

  it("requires explicit business and provider-connection scope and blocks mutations", () => {
    const base = { businessId: "b1", providerConnectionId: "pc1", idempotencyKey: "req:1", mode: "read" as const };
    expect(() => assertProviderOperationContext(base)).not.toThrow();
    expect(() => assertProviderOperationContext(base, "b2")).toThrow("provider_business_scope_mismatch");
    expect(() => assertProviderOperationContext({ ...base, providerConnectionId: "" })).toThrow("provider_operation_scope_required");
    expect(() => assertProviderOperationContext({ ...base, mode: "mutate" })).toThrow("provider_mutations_disabled");
  });
});
