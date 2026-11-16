import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { verifySmartleadWebhookSignature } from "../../../supabase/functions/_shared/smartleadWebhookAuth";
import { SMARTLEAD_STANDARD_WEBHOOK_FIXTURE as fixture } from "./fixtures/smartleadStandardWebhookContract";

const receiver = readFileSync("supabase/functions/smartlead-webhook/index.ts", "utf8");
const checklist = readFileSync("docs/candidates/smartlead-standard-webhooks-compatibility-2026-11-16.md", "utf8");

describe("Smartlead Standard Webhooks source-only compatibility contract", () => {
  it("pins a valid synthetic v1 fixture using the whsec_ key and exact raw-body signed content", () => {
    const key = Buffer.from(fixture.secret.slice("whsec_".length), "base64");
    expect(key).toHaveLength(32);
    const signedContent = `${fixture.headers["webhook-id"]}.${fixture.headers["webhook-timestamp"]}.${fixture.rawBody}`;
    const expected = `v1,${createHmac("sha256", key).update(signedContent).digest("base64")}`;
    expect(fixture.headers["webhook-signature"]).toBe(expected);
    expect(JSON.parse(fixture.rawBody)).toMatchObject({ is_test: true, event_id: "synthetic-event-001" });
  });

  it("confirms the unchanged legacy verifier fails closed on the valid Standard Webhooks fixture", async () => {
    expect(await verifySmartleadWebhookSignature(
      fixture.rawBody,
      fixture.headers["webhook-signature"],
      fixture.secret,
    )).toBe(false);
    expect(await verifySmartleadWebhookSignature(fixture.rawBody, null, fixture.secret)).toBe(false);
    expect(receiver).toContain('req.headers.get("x-smartlead-signature")');
    expect(receiver).not.toContain('req.headers.get("webhook-signature")');
    expect(receiver).toContain('if (!signature) return json({ ok: false, error: "invalid_signature" }, 401)');
    expect(receiver).toContain("SMARTLEAD_WEBHOOK_RECEIVER_ENABLED");
  });

  it("makes verified signed test delivery a precondition for any receiver activation", () => {
    expect(checklist).toContain("https://helpcenter.smartlead.ai/en/articles/470-secure-your-smartlead-webhooks-with-signing-hmac");
    expect(checklist).toContain("Do not enable `SMARTLEAD_WEBHOOK_RECEIVER_ENABLED`");
    expect(checklist).toContain("signed Smartlead **Send Test** delivery has been verified");
    expect(checklist).toContain("No unsigned, legacy-header or alternate-protocol fallback may be added silently");
    expect(checklist).toContain("NOT IMPLEMENTED IN THE ACTIVE RECEIVER");
  });
});
