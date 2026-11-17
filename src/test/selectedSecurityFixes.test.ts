import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { pickAllowedRecord } from "../../supabase/functions/_shared/writeFieldAllowlist";
import { resolveSelfTestRecipient } from "../../supabase/functions/_shared/founderTestRecipient";

const createFunctions = [
  "client-portal-content-pack-create",
  "customer-winback-plan-generate",
  "customer-welcome-pack-create",
  "customer-onboarding-plan-create",
  "customer-success-profile-create",
  "customer-upsell-opportunity-generate",
];

describe("selected write-field security fixes", () => {
  it("copies only explicitly allowed fields", () => {
    const result = pickAllowedRecord(
      { customer_name: "Example", customer_goal: "A goal" },
      ["customer_name", "customer_goal"],
    );
    expect(result).toEqual({
      ok: true,
      record: { customer_name: "Example", customer_goal: "A goal" },
    });
  });

  it("rejects unknown, protected, and prototype-related fields", () => {
    for (const record of [
      { customer_name: "Example", unexpected: true },
      { approved_at: "2026-01-01" },
      { external_send_allowed: true },
      JSON.parse('{"__proto__":{"isAdmin":true}}'),
    ]) {
      const result = pickAllowedRecord(record, ["customer_name"]);
      expect(result.ok).toBe(false);
    }
  });

  it("rejects arrays and scalar record bodies", () => {
    expect(pickAllowedRecord([], ["customer_name"]).ok).toBe(false);
    expect(pickAllowedRecord("customer_name", ["customer_name"]).ok).toBe(false);
    expect(pickAllowedRecord(null, ["customer_name"])).toEqual({ ok: true, record: {} });
  });

  it.each(createFunctions)("%s uses a fixed allowlist instead of spreading request fields", (fn) => {
    const source = readFileSync(`supabase/functions/${fn}/index.ts`, "utf8");
    expect(source).toContain("const ALLOWED_RECORD_FIELDS = [");
    expect(source).toContain("pickAllowedRecord(body?.record, ALLOWED_RECORD_FIELDS)");
    expect(source).not.toContain("...(body?.record");
    expect(source.indexOf("...picked.record")).toBeLessThan(source.indexOf("business_id: body.business_id"));
  });
});

describe("self-only mailbox test recipient", () => {
  it("accepts only the authenticated user's own normalized email", () => {
    expect(resolveSelfTestRecipient(" Founder@Example.com ", "founder@example.com")).toEqual({
      ok: true,
      email: "founder@example.com",
    });
  });

  it("rejects another recipient before mailbox credentials or SMTP are used", () => {
    const result = resolveSelfTestRecipient("other@example.com", "founder@example.com");
    expect(result).toMatchObject({ ok: false, status: 403, code: "SELF_TEST_ONLY" });
  });

  it("fails closed for missing, malformed, or non-string recipients", () => {
    for (const recipient of [undefined, null, 42, "not-an-email", "a@example.com extra@example.com"]) {
      expect(resolveSelfTestRecipient(recipient, "founder@example.com").ok).toBe(false);
    }
    expect(resolveSelfTestRecipient("founder@example.com", null).ok).toBe(false);
  });

  it("keeps the backend self-check and makes the visible recipient read-only", () => {
    const backend = readFileSync("supabase/functions/outreach-send-test/index.ts", "utf8");
    const ui = readFileSync("src/pages/founder/CRMInboxConfigure.tsx", "utf8");
    expect(backend).toContain("resolveSelfTestRecipient(requestedTo, userData.user.email)");
    expect(backend).toContain("const to = recipient.email");
    expect(backend.indexOf("resolveSelfTestRecipient(requestedTo")).toBeLessThan(backend.indexOf("get_inbox_credentials_for_send"));
    expect(ui).toContain('aria-label="Your signed-in email"');
    expect(ui).toContain("<Input value={testTo} readOnly");
  });
});
