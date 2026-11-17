import { describe, it, expect } from "vitest";
import { checkWindow, splitRecipients, onboardingSteps, type Booking, type Window } from "./sendCalendar";
const pool = Array.from({ length: 180 }, (_, i) => `m${i}`);
const w = (o: Partial<Window> = {}): Window => ({ business_id: "A", campaign_label: "c1", sequence_step: 1,
  starts_at: "2026-12-01T09:00:00Z", ends_at: "2026-12-01T17:00:00Z", ...o });
const booked = (o: Partial<Booking>): Booking => ({ id: "x", recipients_planned: 10, status: "planned", mailbox_id: "m0", ...w(), ...o });

describe("shared send calendar", () => {
  it("lets one business campaign use all 180 mailboxes", () => {
    expect(checkWindow([], w(), pool)).toBeNull();
  });
  it("blocks a second business on the same mailboxes at the same time", () => {
    const existing = pool.map((m, i) => booked({ id: `${i}`, mailbox_id: m }));
    expect(checkWindow(existing, w({ business_id: "B", starts_at: "2026-12-01T12:00:00Z" }), pool)).toMatch(/180 mailbox/);
  });
  it("lets a second business use the whole pool on a different date", () => {
    const existing = pool.map((m, i) => booked({ id: `${i}`, mailbox_id: m }));
    expect(checkWindow(existing, w({ business_id: "B", starts_at: "2026-12-02T09:00:00Z", ends_at: "2026-12-02T17:00:00Z" }), pool)).toBeNull();
  });
  it("allows only emails 1 to 5 in a campaign", () => {
    expect(checkWindow([], w({ sequence_step: 6 }), pool)).toMatch(/1 to 5/);
    expect(checkWindow([], w({ sequence_step: 5 }), pool)).toBeNull();
  });
  it("does not book the same email twice", () => {
    expect(checkWindow([booked({})], w({ starts_at: "2026-12-05T09:00:00Z", ends_at: "2026-12-05T10:00:00Z" }), pool)).toMatch(/already booked/);
  });
  it("spreads thousands of recipients across 180 mailboxes", () => {
    const s = splitRecipients(5000, 180);
    expect(s.reduce((a, b) => a + b, 0)).toBe(5000);
    expect(Math.max(...s) - Math.min(...s)).toBeLessThanOrEqual(1);
  });
  it("never marks the shared inbox done while reply collection is off", () => {
    const s = onboardingSteps({ businessExists: true, manualStatus: "approved", campaignDrafts: 1, socialDrafts: 0, socialRequired: false, bookings: 1, inboxLive: false });
    expect(s.find((x) => x.key === "inbox")?.state).toBe("blocked");
  });
});
