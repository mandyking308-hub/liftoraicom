import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  smartleadWebhookProtocol,
  verifySmartleadWebhookRequest,
  verifySmartleadWebhookSignature,
  type SmartleadWebhookHeaders,
} from "../../../supabase/functions/_shared/smartleadWebhookAuth";
import { SMARTLEAD_STANDARD_WEBHOOK_FIXTURE as fixture } from "./fixtures/smartleadStandardWebhookContract";

const receiver = readFileSync("supabase/functions/smartlead-webhook/index.ts", "utf8");
const checklist = readFileSync("docs/candidates/smartlead-standard-webhooks-compatibility-2026-11-16.md", "utf8");
const NOW_SECONDS = Number(fixture.headers["webhook-timestamp"]);

function headers(overrides: Partial<SmartleadWebhookHeaders> = {}): SmartleadWebhookHeaders {
  return {
    legacySignature: null,
    requestId: null,
    webhookId: fixture.headers["webhook-id"],
    webhookTimestamp: fixture.headers["webhook-timestamp"],
    webhookSignature: fixture.headers["webhook-signature"],
    ...overrides,
  };
}

describe("Smartlead Standard Webhooks source-only compatibility contract", () => {
  it("pins a valid synthetic v1 fixture using the whsec_ key and exact raw-body signed content", () => {
    const key = Buffer.from(fixture.secret.slice("whsec_".length), "base64");
    expect(key).toHaveLength(32);
    const signedContent = `${fixture.headers["webhook-id"]}.${fixture.headers["webhook-timestamp"]}.${fixture.rawBody}`;
    const expected = `v1,${createHmac("sha256", key).update(signedContent).digest("base64")}`;
    expect(fixture.headers["webhook-signature"]).toBe(expected);
    expect(JSON.parse(fixture.rawBody)).toMatchObject({ is_test: true, event_id: "synthetic-event-001" });
  });

  it("verifies the exact configured Standard Webhooks protocol and returns webhook-id for replay protection", async () => {
    expect(await verifySmartleadWebhookRequest({
      protocol: "standard_webhooks",
      rawBody: new TextEncoder().encode(fixture.rawBody),
      headers: headers(),
      secret: fixture.secret,
      nowSeconds: NOW_SECONDS,
    })).toEqual({ ok: true, protocol: "standard_webhooks", requestId: fixture.headers["webhook-id"] });
    const rotatedHeader = `v1,${Buffer.alloc(32, 1).toString("base64")} ${fixture.headers["webhook-signature"]}`;
    expect(await verifySmartleadWebhookRequest({
      protocol: "standard_webhooks",
      rawBody: fixture.rawBody,
      headers: headers({ webhookSignature: rotatedHeader }),
      secret: fixture.secret,
      nowSeconds: NOW_SECONDS,
    })).toMatchObject({ ok: true, requestId: fixture.headers["webhook-id"] });
  });

  it("fails closed on tampering, stale timestamps, bad keys, missing IDs and protocol downgrade", async () => {
    const base = {
      rawBody: fixture.rawBody,
      headers: headers(),
      secret: fixture.secret,
      nowSeconds: NOW_SECONDS,
    };
    expect(await verifySmartleadWebhookRequest({ ...base, protocol: "standard_webhooks", rawBody: `${fixture.rawBody} ` })).toMatchObject({ ok: false, reason: "invalid_signature" });
    expect(await verifySmartleadWebhookRequest({ ...base, protocol: "standard_webhooks", nowSeconds: NOW_SECONDS + 301 })).toMatchObject({ ok: false, reason: "invalid_timestamp" });
    expect(await verifySmartleadWebhookRequest({ ...base, protocol: "standard_webhooks", headers: headers({ webhookId: null }) })).toMatchObject({ ok: false, reason: "missing_webhook_id" });
    expect(await verifySmartleadWebhookRequest({ ...base, protocol: "standard_webhooks", secret: fixture.secret.replace("Bwc", "Cwc") })).toMatchObject({ ok: false });
    expect(await verifySmartleadWebhookRequest({ ...base, protocol: "legacy_hex" })).toMatchObject({ ok: false, reason: "invalid_signature" });
    expect(await verifySmartleadWebhookSignature(fixture.rawBody, fixture.headers["webhook-signature"], fixture.secret)).toBe(false);
    expect(await verifySmartleadWebhookSignature(fixture.rawBody, null, fixture.secret)).toBe(false);
  });

  it("requires an explicit per-connection protocol and keeps the receiver disabled by default", () => {
    expect(smartleadWebhookProtocol({ webhook_protocol: "legacy_hex" })).toBe("legacy_hex");
    expect(smartleadWebhookProtocol({ webhook_protocol: "standard_webhooks" })).toBe("standard_webhooks");
    expect(smartleadWebhookProtocol({})).toBeNull();
    expect(smartleadWebhookProtocol({ webhook_protocol: "auto" })).toBeNull();
    expect(receiver).toContain('webhookSignature: req.headers.get("webhook-signature")');
    expect(receiver).toContain("smartleadWebhookProtocol(connection.settings)");
    expect(receiver).toContain("verifySmartleadWebhookRequest({");
    expect(receiver).toContain("SMARTLEAD_WEBHOOK_RECEIVER_ENABLED");
  });

  it("makes verified signed test delivery a precondition for any receiver activation", () => {
    expect(checklist).toContain("https://helpcenter.smartlead.ai/en/articles/470-secure-your-smartlead-webhooks-with-signing-hmac");
    expect(checklist).toContain("Do not enable `SMARTLEAD_WEBHOOK_RECEIVER_ENABLED`");
    expect(checklist).toContain("signed Smartlead **Send Test** delivery has been verified");
    expect(checklist).toContain("No unsigned, legacy-header or alternate-protocol fallback may be added silently");
    expect(checklist).toContain("SOURCE IMPLEMENTED; NOT DEPLOYED OR ACTIVATED");
  });
});
