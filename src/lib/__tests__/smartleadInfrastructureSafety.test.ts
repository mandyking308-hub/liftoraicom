import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
const read = (p: string) => stripComments(readFileSync(resolve(process.cwd(), p), "utf8"));

const webhook = read("supabase/functions/smartlead-webhook/index.ts");
const leadPreview = read("supabase/functions/smartlead-lead-push-preview/index.ts");
const dryRun = read("supabase/functions/smartlead-send-dry-run/index.ts");
const register = read("supabase/functions/mailbox-estate-register/index.ts");
const discovery = read("supabase/functions/smartlead-mailbox-discovery/index.ts");
const mappingApply = read("supabase/functions/smartlead-campaign-mapping-apply/index.ts");

describe("smartlead webhook return loop", () => {
  it("uses the shared event normaliser and a stable idempotency key", () => {
    expect(webhook).toContain("_shared/smartleadEventNormalizer.ts");
    expect(webhook).toContain("buildIdempotencyKey");
    expect(webhook).toContain("idempotency_key");
  });

  it("collapses duplicate deliveries without a second transition", () => {
    expect(webhook).toContain("duplicate: true");
    expect(webhook).toContain('"23505"');
    expect(webhook).toContain("operational_mutation_applied: false");
  });

  it("escalates canonical CRM state and stops pending queue sends", () => {
    expect(webhook).toContain("deriveContactMutation");
    expect(webhook).toContain('from("contacts")');
    expect(webhook).toContain('from("email_queue")');
    expect(webhook).toContain('status: "cancelled"');
  });

  it("keeps the header-only shared secret and never calls Smartlead", () => {
    expect(webhook).toContain("SMARTLEAD_WEBHOOK_SECRET");
    expect(webhook).toContain("invalid_or_missing_secret");
    expect(webhook).not.toContain("server.smartlead.ai");
    expect(webhook).not.toContain("api.smartlead.ai");
  });

  it("stores unknown events safely and pauses a failing mailbox", () => {
    expect(webhook).toContain("stored_unknown_event");
    expect(webhook).toContain("deriveMailboxMutation");
    expect(webhook).toContain('from("inboxes")');
  });

  it("fails closed when the provider lead identity is ambiguous", () => {
    expect(webhook).toContain("length === 1");
  });
});

describe("lead push preview stays a true dry run", () => {
  it("uses the shared sendability gate", () => {
    expect(leadPreview).toContain("_shared/outboundSendability.ts");
    expect(leadPreview).toContain("evaluateOutboundSendability");
  });

  it("makes no provider write of any kind", () => {
    expect(leadPreview).not.toContain("api.smartlead.ai");
    expect(leadPreview).toContain("dry_run: true");
    expect(leadPreview).toContain("No emails sent");
  });
});

describe("send dry run performs zero provider mutation", () => {
  it("never issues a provider POST/PUT/PATCH/DELETE", () => {
    expect(dryRun).not.toMatch(/method:\s*["'](POST|PUT|PATCH|DELETE)["']/);
    expect(dryRun).not.toContain("api.smartlead.ai");
  });

  it("reports blocked cleanly when no mailbox is eligible", () => {
    expect(dryRun).toMatch(/not_ready|blocked/);
  });
});

describe("mailbox estate registration and discovery", () => {
  it("registration is preview-first and idempotent", () => {
    expect(register).toMatch(/dry_run/);
    expect(register).toContain("_shared/mailboxRegistrationParser.ts");
  });

  it("provider mailbox discovery is read-only", () => {
    expect(discovery).not.toMatch(/method:\s*["'](POST|PUT|PATCH|DELETE)["']/);
  });

  it("legacy Neon Candy stays segregated from education estates", () => {
    const parser = read("supabase/functions/_shared/mailboxRegistrationParser.ts");
    const allocator = read("supabase/functions/_shared/mailboxAllocator.ts");
    expect(parser).toContain("neon-candy-legacy");
    expect(allocator).toMatch(/allowed_business_names|estate_key/);
    expect(allocator).toMatch(/excluded_from_allocation/);
  });
});

describe("campaign mapping apply cannot create provider campaigns in this build", () => {
  it("binds to an existing provider campaign or stays blocked", () => {
    expect(mappingApply).not.toMatch(/campaigns\/create/);
    expect(mappingApply).toContain("provider_campaign_id");
  });
});
