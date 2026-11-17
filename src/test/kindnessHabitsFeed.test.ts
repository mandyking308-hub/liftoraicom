import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  KINDNESS_HABITS_BUSINESS_ID,
  KINDNESS_HABITS_FEED_FIELDS,
  parseKindnessHabitsSummary,
} from "../../supabase/functions/_shared/kindnessHabitsFeed";
import { KINDNESS_HABITS_BUSINESS_ID as UI_BUSINESS_ID } from "../lib/spokeFeeds";

const validSummary = {
  generated_at: "2026-11-17T22:00:00.000Z",
  signups_total: 120,
  signups_last_24h: 3,
  signups_last_7d: 18,
  paying_customers_by_plan: { family_monthly: 8, school_annual: 2 },
  active_subscriptions: 10,
  cancellations_last_7d: 1,
  refunds_last_7d: 0,
  open_enquiries: 4,
  oldest_open_enquiry_at: "2026-11-15T10:00:00.000Z",
  open_privacy_requests: 1,
  oldest_open_privacy_request_at: "2026-11-16T10:00:00.000Z",
  active_users_last_7d: 42,
};

describe("Kindness Habits private feed contract", () => {
  it("accepts the documented aggregate totals and preserves exact sign-up values", () => {
    const result = parseKindnessHabitsSummary(validSummary);
    expect(result).toEqual({ ok: true, summary: validSummary });
    expect(Object.keys(validSummary).sort()).toEqual([...KINDNESS_HABITS_FEED_FIELDS].sort());
  });

  it("rejects unexpected personal-data fields instead of passing them through", () => {
    for (const extra of [
      { child_name: "Amy" },
      { email: "parent@example.com" },
      { users: [{ name: "Amy" }] },
    ]) {
      const result = parseKindnessHabitsSummary({ ...validSummary, ...extra });
      expect(result).toEqual({ ok: false, error: "unexpected_summary_fields" });
    }
  });

  it("rejects missing, negative, fractional and inconsistent sign-up totals", () => {
    const { signups_total: _removed, ...missing } = validSummary;
    expect(parseKindnessHabitsSummary(missing).ok).toBe(false);
    expect(parseKindnessHabitsSummary({ ...validSummary, signups_total: -1 }).ok).toBe(false);
    expect(parseKindnessHabitsSummary({ ...validSummary, signups_total: 1.5 }).ok).toBe(false);
    expect(parseKindnessHabitsSummary({ ...validSummary, signups_last_24h: 19 }).ok).toBe(false);
    expect(parseKindnessHabitsSummary({ ...validSummary, signups_last_7d: 121 }).ok).toBe(false);
  });

  it("rejects plan keys that could contain names or email addresses", () => {
    for (const plan of ["Amy", "parent@example.com", "Family Plan"]) {
      expect(parseKindnessHabitsSummary({
        ...validSummary,
        paying_customers_by_plan: { [plan]: 10 },
      }).ok).toBe(false);
    }
  });

  it("binds both sides of the bridge to the active Kindnesss business only", () => {
    expect(UI_BUSINESS_ID).toBe(KINDNESS_HABITS_BUSINESS_ID);
    expect(KINDNESS_HABITS_BUSINESS_ID).toBe("640de582-a112-4d16-a221-03c27f00c6ec");
  });

  it("authenticates before fetching and never follows a key-bearing redirect", () => {
    const source = readFileSync("supabase/functions/kindness-habits-summary/index.ts", "utf8");
    expect(source.indexOf("await founderGuard")).toBeLessThan(source.indexOf("await fetch("));
    expect(source).toContain('Deno.env.get("LIFTOR_FEED_KEY")');
    expect(source).toContain('redirect: "error"');
    expect(source).toContain('businessId !== KINDNESS_HABITS_BUSINESS_ID');
    expect(source).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(source).not.toMatch(/\.insert\(|\.update\(|\.delete\(/);
  });
});
