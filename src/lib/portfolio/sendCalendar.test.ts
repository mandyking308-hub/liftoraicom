import { describe, it, expect } from "vitest";
import { checkBooking, onboardingSteps, type Booking } from "./sendCalendar";
const b = (o: Partial<Booking>): Booking => ({ id: "x", business_id: "A", campaign_label: "c1", mailbox_id: "m1",
  starts_at: "2026-12-01T09:00:00Z", ends_at: "2026-12-01T10:00:00Z", emails_planned: 1, status: "planned", ...o });
const next = (o: Partial<Booking>) => { const { id: _i, status: _s, ...r } = b(o); return r; };

describe("shared send calendar", () => {
  it("blocks two businesses on the same mailbox at the same time", () => {
    expect(checkBooking([b({})], next({ business_id: "B", starts_at: "2026-12-01T09:30:00Z", ends_at: "2026-12-01T10:30:00Z" }))).toMatch(/already booked/);
  });
  it("allows the same mailbox for another business at a different time", () => {
    expect(checkBooking([b({})], next({ business_id: "B", starts_at: "2026-12-01T10:00:00Z", ends_at: "2026-12-01T11:00:00Z" }))).toBeNull();
  });
  it("caps a business campaign at five emails in total", () => {
    const existing = [b({ id: "1", emails_planned: 4, mailbox_id: "m9" })];
    expect(checkBooking(existing, next({ mailbox_id: "m2", emails_planned: 1 }))).toBeNull();
    expect(checkBooking(existing, next({ mailbox_id: "m2", emails_planned: 2 }))).toMatch(/five|5 emails/);
  });
  it("ignores cancelled bookings", () => {
    expect(checkBooking([b({ status: "cancelled", emails_planned: 5 })], next({ emails_planned: 5 }))).toBeNull();
  });
  it("never marks the shared inbox done while reply collection is off", () => {
    const s = onboardingSteps({ businessExists: true, manualStatus: "approved", campaignDrafts: 1, socialDrafts: 0, socialRequired: false, bookings: 1, inboxLive: false });
    expect(s.find((x) => x.key === "inbox")?.state).toBe("blocked");
  });
});
