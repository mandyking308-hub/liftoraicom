import { describe, expect, it } from "vitest";
import {
  buildIdempotencyKey,
  deriveContactMutation,
  deriveMailboxMutation,
  extractEvent,
  normalizeEventType,
} from "../../../supabase/functions/_shared/smartleadEventNormalizer";

describe("smartlead event normalizer", () => {
  it("normalises common aliases", () => {
    expect(normalizeEventType("reply")).toBe("reply_received");
    expect(normalizeEventType("bounce")).toBe("email_bounced");
    expect(normalizeEventType("unsubscribe")).toBe("lead_unsubscribed");
    expect(normalizeEventType("open")).toBe("email_opened");
    expect(normalizeEventType("sent")).toBe("email_sent");
    expect(normalizeEventType("unknown_thing")).toBe("unknown");
  });

  it("extracts nested Smartlead payload fields", () => {
    const e = extractEvent({
      event_type: "reply",
      event_id: "evt-1",
      campaign_id: "camp-1",
      lead: { id: "lead-1", email: "JANE@Example.com" },
      message_id: "msg-1",
      event_timestamp: "2026-09-10T10:00:00Z",
    });
    expect(e.canonical_event_type).toBe("reply_received");
    expect(e.provider_event_id).toBe("evt-1");
    expect(e.email).toBe("jane@example.com");
    expect(e.is_operational).toBe(true);
  });

  it("builds stable idempotency keys", () => {
    const e = extractEvent({ event_type: "sent", event_id: "evt-99", campaign_id: "1", lead: { id: "2" }, event_timestamp: "t" });
    expect(buildIdempotencyKey(e)).toContain("evt:");
    const e2 = extractEvent({ event_type: "open", campaign_id: "1", lead: { email: "a@b.com" } });
    expect(buildIdempotencyKey(e2)).toContain("cmp:");
  });

  it("reply opens conversation but does not block sends", () => {
    const m = deriveContactMutation(extractEvent({ event_type: "reply" }));
    expect(m.opens_conversation).toBe(true);
    expect(m.blocks_future_sends).toBe(false);
  });

  it("hard bounce blocks future sends", () => {
    const m = deriveContactMutation(extractEvent({ event_type: "bounce" }), { bounce_type: "hard" });
    expect(m.blocks_future_sends).toBe(true);
    expect(m.contact_patch.hard_bounced).toBe(true);
  });

  it("soft bounce does not suppress", () => {
    const m = deriveContactMutation(extractEvent({ event_type: "bounce" }), { bounce_type: "soft" });
    expect(m.blocks_future_sends).toBe(false);
    expect(Object.keys(m.contact_patch)).toHaveLength(0);
  });

  it("unsubscribe blocks future sends and records source", () => {
    const m = deriveContactMutation(extractEvent({ event_type: "unsubscribe" }));
    expect(m.blocks_future_sends).toBe(true);
    expect(m.contact_patch.unsubscribe_source).toBe("smartlead_webhook");
  });

  it("unknown events cause no state change", () => {
    const m = deriveContactMutation(extractEvent({ event_type: "weird_event" }));
    expect(Object.keys(m.contact_patch)).toHaveLength(0);
    expect(m.transition).toContain("unknown_event");
  });

  it("mailbox error pauses the mailbox", () => {
    const m = deriveMailboxMutation(extractEvent({ event_type: "account_error" }), { error: "smtp auth failed" });
    expect(m.inbox_patch.provider_ready).toBe(false);
  });
});
