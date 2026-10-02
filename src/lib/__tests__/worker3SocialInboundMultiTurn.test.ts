import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  analyzeInboundSocialTurn,
  appendRetainedSocialTurn,
  buildSocialAIDraftMessages,
  buildSafeSocialResponseDraft,
  buildSocialInboundIdempotencyKey,
  expectedSocialInboundSecretRef,
  normalizeInboundSocialEvent,
  sanitizeSocialAIDraft,
  socialInboundReceiverEnabled,
  verifySocialInboundSignature,
  type NormalizedInboundSocialEvent,
  type RetainedTurn,
} from "../../../supabase/functions/_shared/socialInboundMultiTurn.ts";

const migration = readFileSync("supabase/migrations/20260928150000_worker3b_social_inbound_multiturn.sql", "utf8");
const receiver = readFileSync("supabase/functions/social-engagement-provider-event-receiver/index.ts", "utf8");
const supabaseConfig = readFileSync("supabase/config.toml", "utf8");

function event(overrides: Partial<NormalizedInboundSocialEvent> = {}): NormalizedInboundSocialEvent {
  return {
    provider: "meta",
    platform: "instagram",
    accountExternalId: "brand-account-1",
    externalEventId: "event-1",
    externalThreadId: "thread-1",
    externalUserId: "user-1",
    eventType: "dm",
    messageText: "I'm interested in learning more.",
    handle: "fan_one",
    displayName: "Fan One",
    receivedAt: "2026-09-28T14:00:00.000Z",
    ...overrides,
  };
}

function state(overrides: Partial<{
  businessId: string;
  providerConnectionId: string;
  socialAccountId: string;
  platform: string;
  externalThreadId: string;
  externalUserId: string;
  turnCount: number;
  turnHistory: readonly RetainedTurn[];
  escalationPending: boolean;
}> = {}) {
  return {
    businessId: "business-1",
    providerConnectionId: "connection-1",
    socialAccountId: "account-1",
    platform: "instagram",
    externalThreadId: "thread-1",
    externalUserId: "user-1",
    turnCount: 1,
    turnHistory: [] as readonly RetainedTurn[],
    ...overrides,
  };
}

describe("Worker 3B inbound social multi-turn", () => {
  it("keeps the receiver and per-connection feature gates closed by default", () => {
    expect(socialInboundReceiverEnabled(null)).toBe(false);
    expect(socialInboundReceiverEnabled("TRUE")).toBe(false);
    expect(socialInboundReceiverEnabled("true")).toBe(true);
    expect(expectedSocialInboundSecretRef("123e4567-e89b-12d3-a456-426614174000"))
      .toBe("LIFTOR_SOCIAL_INBOUND_123E4567E89B12D3A456426614174000_WEBHOOK_SECRET");
    expect(migration).toContain("inbound_receiver_enabled boolean NOT NULL DEFAULT false");
    expect(migration).toContain("SOCIAL_INBOUND_'");
  });

  it("authenticates the exact raw body with a connection-scoped sha256 signature", async () => {
    const body = new TextEncoder().encode('{"event_id":"evt-1","text":"hello"}');
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode("connection-secret"), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const digest = new Uint8Array(await crypto.subtle.sign("HMAC", key, body));
    const signature = `sha256=${Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
    expect(await verifySocialInboundSignature(body, signature, "connection-secret")).toBe(true);
    expect(await verifySocialInboundSignature(new TextEncoder().encode(`${new TextDecoder().decode(body)} `), signature, "connection-secret")).toBe(false);
    expect(await verifySocialInboundSignature(body, signature, null)).toBe(false);
    expect(await verifySocialInboundSignature(body, signature.replace("sha256=", "SHA256="), "connection-secret")).toBe(false);
  });

  it("normalizes only provider/account/thread/user identity and does not use email", () => {
    const normalized = normalizeInboundSocialEvent({
      provider: "META",
      platform: "instagram",
      account_id: "brand-account-1",
      event_id: "evt-1",
      thread_id: "thread-1",
      sender: { id: "external-user-1", username: "@fan" },
      message: { text: "Hello there?" },
      email: "global@example.test",
    });
    expect(normalized).toMatchObject({
      provider: "meta",
      accountExternalId: "brand-account-1",
      externalEventId: "evt-1",
      externalThreadId: "thread-1",
      externalUserId: "external-user-1",
      handle: "fan",
    });
    expect(normalized).not.toHaveProperty("email");
    expect(normalizeInboundSocialEvent({ provider: "meta", platform: "instagram", account_id: "acct", event_id: "evt", text: "Hi" }))
      .toBeNull();
  });

  it("deduplicates by provider event ID even when request IDs differ", () => {
    expect(buildSocialInboundIdempotencyKey("provider-event-9", "delivery-1")).toBe("evt:provider-event-9");
    expect(buildSocialInboundIdempotencyKey("provider-event-9", "delivery-2")).toBe("evt:provider-event-9");
    expect(buildSocialInboundIdempotencyKey("", "delivery-1")).toBe("req:delivery-1");
  });

  it.each([
    ["I want to file a complaint about this", "complaint"],
    ["I dispute this charge", "dispute"],
    ["Please transfer me to a human", "explicit_human_request"],
    ["Human, please", "explicit_human_request"],
    ["I am contacting a lawyer about this", "legal_compliance"],
    ["Can you guarantee a cure?", "unsupported_claim"],
    ["hi", "low_confidence"],
  ])("escalates %s for %s", (text, expectedReason) => {
    const result = analyzeInboundSocialTurn({ text });
    expect(result.decision).toBe("escalate");
    expect(result.escalationReasons).toContain(expectedReason);
    expect(buildSafeSocialResponseDraft(result)).toBeNull();
  });

  it("retains context across two inbound events and prepares a second response draft", () => {
    const firstEvent = event({ externalEventId: "event-1", messageText: "I'm interested in learning more." });
    const first = appendRetainedSocialTurn({
      state: null,
      event: firstEvent,
      businessId: "business-1",
      providerConnectionId: "connection-1",
      socialAccountId: "account-1",
      idempotencyKey: "evt:event-1",
    });
    expect(first.analysis.decision).toBe("draft");
    expect(first.draftText).toBeTruthy();
    expect(first.turnHistory.map((turn) => turn.role)).toEqual(["inbound", "assistant_draft"]);

    const secondEvent = event({ externalEventId: "event-2", messageText: "Could you show me a demo?" });
    const second = appendRetainedSocialTurn({
      state: state({ turnCount: first.turnCount, turnHistory: first.turnHistory }),
      event: secondEvent,
      businessId: "business-1",
      providerConnectionId: "connection-1",
      socialAccountId: "account-1",
      idempotencyKey: "evt:event-2",
    });
    expect(second.turnCount).toBe(2);
    expect(second.analysis.intent).toBe("demo_request");
    expect(second.draftText).toContain("earlier interest");
    expect(second.turnHistory.filter((turn) => turn.role === "inbound")).toHaveLength(2);
    expect(second.turnHistory[second.turnHistory.length - 1]).toMatchObject({ role: "assistant_draft", sent: false });

    const duplicate = appendRetainedSocialTurn({
      state: state({ turnCount: second.turnCount, turnHistory: second.turnHistory }),
      event: secondEvent,
      businessId: "business-1",
      providerConnectionId: "connection-1",
      socialAccountId: "account-1",
      idempotencyKey: "evt:event-2",
    });
    expect(duplicate.duplicate).toBe(true);
    expect(duplicate.turnCount).toBe(2);
    expect(duplicate.turnHistory).toHaveLength(second.turnHistory.length);

    const secondPrompt = buildSocialAIDraftMessages({
      businessName: "NeonCandy",
      currentMessage: secondEvent.messageText,
      analysis: second.analysis,
      previousTurns: first.turnHistory,
    });
    const serializedPrompt = secondPrompt.map((message) => message.content).join("\n");
    expect(serializedPrompt).toContain("I'm interested in learning more.");
    expect(serializedPrompt).toContain("unsent_assistant_draft");
    expect(serializedPrompt).toContain("Could you show me a demo?");
  });

  it("rejects unsafe model text before it can become an internal response draft", () => {
    expect(sanitizeSocialAIDraft("We guarantee a cure in two weeks.")).toBeNull();
    expect(sanitizeSocialAIDraft("Our price is £50.")).toBeNull();
    expect(sanitizeSocialAIDraft("Thanks for clarifying. What would you like the demonstration to cover?")).toBeTruthy();
  });

  it("rejects retained state from a different business or account", () => {
    expect(() => appendRetainedSocialTurn({
      state: state({ businessId: "business-2" }),
      event: event(),
      businessId: "business-1",
      providerConnectionId: "connection-1",
      socialAccountId: "account-1",
      idempotencyKey: "evt:event-1",
    })).toThrow("social_conversation_scope_mismatch");
    expect(() => appendRetainedSocialTurn({
      state: state({ socialAccountId: "account-2" }),
      event: event(),
      businessId: "business-1",
      providerConnectionId: "connection-1",
      socialAccountId: "account-1",
      idempotencyKey: "evt:event-1",
    })).toThrow("social_conversation_scope_mismatch");
  });

  it("binds receipt, identity, contact, BCR, and retained state to one business/account", () => {
    expect(migration).toContain("UNIQUE (business_id, social_account_id, provider, platform, external_user_id)");
    expect(migration).toContain("FOREIGN KEY (social_account_id, business_id)");
    expect(migration).toContain("FOREIGN KEY (business_contact_relationship_id, business_id, contact_id)");
    expect(migration).toContain("UNIQUE (social_account_id, external_event_id)");
    expect(migration).toContain("ON public.social_engagement_events (social_account_id, external_event_id)");
    expect(migration).toContain("turn_history jsonb NOT NULL DEFAULT '[]'::jsonb");
    expect(receiver).toContain(".eq(\"business_id\", account.business_id)");
    expect(receiver).toContain(".eq(\"social_account_id\", account.id)");
    expect(supabaseConfig).toMatch(/\[functions\.social-engagement-provider-event-receiver\]\s+verify_jwt = false/);
  });

  it("never calls a social provider or sends drafts, and keeps execution controls off", () => {
    expect(receiver).not.toMatch(/fetch\s*\(/);
    expect(receiver).not.toMatch(/\.from\(["']social_reply_jobs["']\)/);
    expect(receiver).not.toMatch(/sendMessage|sendReply|publishPost|createComment/i);
    expect(receiver).toContain("callAIGateway");
    expect(receiver).toContain("approval_required: true");
    expect(receiver).toContain("buildSocialAIDraftMessages");
    expect(migration).toContain("founder_review_required, external_send_allowed, metadata");
    expect(migration).toContain("true, false,");
    expect(migration).toContain("provider_calls, dms_sent, comments_sent, external_actions, crm_records_created");
    expect(migration).not.toMatch(/\b(DROP\s+TABLE|DROP\s+COLUMN|TRUNCATE|DELETE\s+FROM)\b/i);
  });
});

describe("Worker 3B inbound social acceptance closeout", () => {
  const inventory = JSON.parse(readFileSync("docs/liftor-rebuild/jwt-off-perimeter-inventory.json", "utf8"));

  it("is classified in the JWT-off perimeter inventory with its implemented HMAC perimeter", () => {
    const entry = inventory.functions["social-engagement-provider-event-receiver"];
    expect(entry.perimeter).toBe("provider_hmac_signature");
    expect(entry.mechanism).toContain("SOCIAL_INBOUND_WEBHOOK_RECEIVER_ENABLED");
    expect(entry.mechanism).toContain("x-social-signature");
    expect(entry.write_capable).toBe(true);
    expect(entry.writes).toContain("process_social_inbound_multiturn_event");
  });

  it("checks the feature gate and signature before any write RPC", () => {
    const gate = receiver.indexOf("socialInboundReceiverEnabled(");
    const sig = receiver.indexOf("verifySocialInboundSignature(");
    const rpc = receiver.indexOf('rpc("process_social_inbound_multiturn_event"');
    expect(gate).toBeGreaterThan(-1);
    expect(sig).toBeGreaterThan(gate);
    expect(rpc).toBeGreaterThan(sig);
    expect(receiver).not.toMatch(/\.(insert|update|upsert|delete)\(/);
  });

  it("binds the webhook secret reference to one provider connection id", () => {
    expect(expectedSocialInboundSecretRef("not-a-uuid")).toBeNull();
    const ref = expectedSocialInboundSecretRef("12345678-1234-1234-1234-1234567890ab");
    expect(ref).toBe("LIFTOR_SOCIAL_INBOUND_123456781234123412341234567890AB_WEBHOOK_SECRET");
    expect(receiver).toContain("connection.webhook_secret_ref !== expectedSecretRef");
  });

  it("rejects missing secrets and malformed signature headers", async () => {
    const body = new TextEncoder().encode('{"a":1}');
    expect(await verifySocialInboundSignature(body, "sha256=" + "a".repeat(64), "")).toBe(false);
    expect(await verifySocialInboundSignature(body, "a".repeat(64), "s")).toBe(false);
    expect(await verifySocialInboundSignature(body, null, "s")).toBe(false);
  });

  it("is idempotent on duplicate provider event ids and returns the prior receipt", () => {
    expect(buildSocialInboundIdempotencyKey("event-1", "r1")).toBe(buildSocialInboundIdempotencyKey("event-1", "r2"));
    expect(receiver).toContain("duplicate: true");
    expect(receiver).toContain('.eq("external_event_id", event.externalEventId)');
  });

  it("keeps the receiver literally opt-in", () => {
    expect(socialInboundReceiverEnabled("TRUE")).toBe(false);
    expect(socialInboundReceiverEnabled("1")).toBe(false);
    expect(socialInboundReceiverEnabled(undefined)).toBe(false);
  });
});
