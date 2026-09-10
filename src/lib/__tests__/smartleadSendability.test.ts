import { describe, expect, it } from "vitest";
import {
  evaluateOutboundSendability,
  mergeProviderTruthSafely,
  type SendabilityContact,
} from "../../../supabase/functions/_shared/outboundSendability";

describe("outbound sendability", () => {
  const base: SendabilityContact = {
    id: "c1",
    email: "jane@example.com",
    sendable_status: "sendable",
    email_verified_status: "verified",
  };

  it("allows a clean contact", () => {
    const r = evaluateOutboundSendability(base);
    expect(r.sendable).toBe(true);
    expect(r.blockers).toEqual([]);
    expect(r.hard_blockers).toEqual([]);
  });

  it("hard-blocks globally suppressed", () => {
    const r = evaluateOutboundSendability({ ...base, is_globally_suppressed: true });
    expect(r.sendable).toBe(false);
    expect(r.blockers).toContain("globally_suppressed");
    expect(r.hard_blockers).toContain("globally_suppressed");
  });

  it("hard-blocks DNC, unsubscribed, hard-bounced", () => {
    expect(evaluateOutboundSendability({ ...base, do_not_contact_at: "2026-01-01T00:00:00Z" }).sendable).toBe(false);
    expect(evaluateOutboundSendability({ ...base, unsubscribed_at: "2026-01-01T00:00:00Z" }).sendable).toBe(false);
    expect(evaluateOutboundSendability({ ...base, hard_bounced: true }).sendable).toBe(false);
  });

  it("blocks invalid or missing email", () => {
    expect(evaluateOutboundSendability({ ...base, email: "" }).blockers).toContain("missing_email");
    expect(evaluateOutboundSendability({ ...base, email: "not-an-email" }).blockers).toContain("invalid_email");
  });

  it("blocks risky verified status", () => {
    expect(evaluateOutboundSendability({ ...base, email_verified_status: "catch_all_risky" }).blockers).toContain("email_not_verified");
  });

  it("blocks bad sendable status and compliance", () => {
    expect(evaluateOutboundSendability({ ...base, sendable_status: "not_sendable" }).sendable).toBe(false);
    expect(evaluateOutboundSendability({ ...base, compliance_status: "blocked" }).sendable).toBe(false);
    expect(evaluateOutboundSendability({ ...base, status: "bounced" }).sendable).toBe(false);
  });

  it("optionally requires reveal", () => {
    expect(evaluateOutboundSendability({ ...base }, { require_reveal: true }).sendable).toBe(true);
    expect(evaluateOutboundSendability({ ...base, reveal_status: "pending" }, { require_reveal: true }).sendable).toBe(false);
  });

  it("provider truth only escalates suppression", () => {
    const patch = mergeProviderTruthSafely(base, { hard_bounced: true });
    expect(patch.hard_bounced).toBe(true);
    expect(mergeProviderTruthSafely({ ...base, hard_bounced: true }, { hard_bounced: false }).hard_bounced).toBeUndefined();
  });
});
