import { describe, it, expect } from "vitest";
import { scheduleBetween, nextEmail } from "./campaignSchedule";

const start = new Date("2026-11-24T10:00:00Z");

describe("campaign rhythm", () => {
  it("each round has 4 emails, 7 days apart", () => {
    const r1 = scheduleBetween(start, start, new Date("2027-01-01Z")).filter((e) => e.round === 1);
    expect(r1.map((e) => e.at.toISOString().slice(0, 10))).toEqual(["2026-11-24", "2026-12-01", "2026-12-08", "2026-12-15"]);
  });
  it("next round starts 3 months later", () => {
    const r2 = scheduleBetween(start, start, new Date("2027-03-31Z")).find((e) => e.round === 2)!;
    expect(r2.at.toISOString().slice(0, 10)).toBe("2027-02-24");
  });
  it("keeps repeating with no end", () => {
    expect(nextEmail(start, new Date("2031-06-01Z")).round).toBeGreaterThan(18);
  });
});
