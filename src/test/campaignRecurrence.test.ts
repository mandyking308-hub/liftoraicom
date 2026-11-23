import { describe, it, expect } from "vitest";
import { addMonths, hasMoreRounds, filterRound, sequenceProblems, roundCritical, SEQUENCE_STEPS, type RoundContact } from "../../supabase/functions/_shared/campaignRecurrence";

const ok: RoundContact = { id: "1", email: "a@school.org", first_name: "Ann", suppressed: false, do_not_contact_business: false, history: false, email_status: "Verified", catch_all: "Not Catch-all" };

describe("quarterly campaign repeat", () => {
  it("next round is 3 months later", () => {
    expect(addMonths("2026-11-24T10:00:00.000Z")).toBe("2027-02-24T10:00:00.000Z");
    expect(addMonths("2026-11-30T10:00:00.000Z")).toBe("2027-02-28T10:00:00.000Z");
  });
  it("runs forever when no limit is set", () => {
    expect(hasMoreRounds(1000, null)).toBe(true);
  });
  it("each round has 4 emails", () => {
    expect(SEQUENCE_STEPS).toBe(4);
    const three = [1, 2, 3].map((n) => ({ seq_number: n, subject: "s", body: "%unsubscribe-text%" }));
    expect(sequenceProblems(three, null)).toContain("sequence_steps_3");
  });
  it("drops unsubscribed, bounced/replied, unverified and catch-all people", () => {
    const { eligible, held } = filterRound([
      ok,
      { ...ok, id: "2", email: "b@x.org", suppressed: true },
      { ...ok, id: "3", email: "c@x.org", history: true },
      { ...ok, id: "4", email: "d@x.org", email_status: "unverified" },
      { ...ok, id: "5", email: "e@x.org", catch_all: "Catch-all" },
    ]);
    expect(eligible.map((c) => c.id)).toEqual(["1"]);
    expect(held).toEqual({ suppressed: 1, prior_bounce_or_reply: 1, not_verified: 1, catch_all: 1 });
  });
  it("pilot plan skips re-verification but still drops suppressed and bounced/replied people", () => {
    const emailed = { ...ok, email_status: null, catch_all: null };
    const { eligible, held } = filterRound([
      emailed,
      { ...emailed, id: "2", email: "b@x.org", suppressed: true },
      { ...emailed, id: "3", email: "c@x.org", history: true },
    ], true);
    expect(eligible.map((c) => c.id)).toEqual(["1"]);
    expect(held).toEqual({ suppressed: 1, prior_bounce_or_reply: 1 });
    // Without the flag the same contact is still held as unverified.
    expect(filterRound([emailed]).held).toEqual({ not_verified: 1 });
  });
  it("stays paused when a check fails", () => {
    expect(roundCritical({ eligible: 10, healthySenders: 5, charitySender: false, sequence: [], calendarClash: false })).toEqual([]);
    expect(roundCritical({ eligible: 10, healthySenders: 5, charitySender: true, sequence: [], calendarClash: true }).length).toBe(2);
  });
});
