export const KINDNESS_HABITS_BUSINESS_ID = "640de582-a112-4d16-a221-03c27f00c6ec";
export const KINDNESS_HABITS_FEED_URL = "https://joinkindnesss.com/api/public/liftor-summary-feed";

export const KINDNESS_HABITS_FEED_FIELDS = [
  "generated_at",
  "signups_total",
  "signups_last_24h",
  "signups_last_7d",
  "paying_customers_by_plan",
  "active_subscriptions",
  "cancellations_last_7d",
  "refunds_last_7d",
  "open_enquiries",
  "oldest_open_enquiry_at",
  "open_privacy_requests",
  "oldest_open_privacy_request_at",
  "active_users_last_7d",
] as const;

export type KindnessHabitsSummary = {
  generated_at: string;
  signups_total: number;
  signups_last_24h: number;
  signups_last_7d: number;
  paying_customers_by_plan: Record<string, number>;
  active_subscriptions: number;
  cancellations_last_7d: number;
  refunds_last_7d: number;
  open_enquiries: number;
  oldest_open_enquiry_at: string | null;
  open_privacy_requests: number;
  oldest_open_privacy_request_at: string | null;
  active_users_last_7d: number;
};

type ParseResult =
  | { ok: true; summary: KindnessHabitsSummary }
  | { ok: false; error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validCount(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function validDate(value: unknown, nullable: boolean): value is string | null {
  if (nullable && value === null) return true;
  return typeof value === "string" && value.length <= 40 && Number.isFinite(Date.parse(value));
}

/** Accept only the documented aggregate contract. Unknown fields fail closed. */
export function parseKindnessHabitsSummary(input: unknown): ParseResult {
  if (!isRecord(input)) return { ok: false, error: "summary_not_an_object" };
  const keys = Object.keys(input);
  if (keys.length !== KINDNESS_HABITS_FEED_FIELDS.length ||
      keys.some((key) => !(KINDNESS_HABITS_FEED_FIELDS as readonly string[]).includes(key))) {
    return { ok: false, error: "unexpected_summary_fields" };
  }

  const countFields = [
    "signups_total", "signups_last_24h", "signups_last_7d", "active_subscriptions",
    "cancellations_last_7d", "refunds_last_7d", "open_enquiries",
    "open_privacy_requests", "active_users_last_7d",
  ] as const;
  if (countFields.some((key) => !validCount(input[key]))) {
    return { ok: false, error: "invalid_summary_count" };
  }
  if (!validDate(input.generated_at, false) ||
      !validDate(input.oldest_open_enquiry_at, true) ||
      !validDate(input.oldest_open_privacy_request_at, true)) {
    return { ok: false, error: "invalid_summary_date" };
  }
  if (!isRecord(input.paying_customers_by_plan)) {
    return { ok: false, error: "invalid_plan_summary" };
  }

  const planEntries = Object.entries(input.paying_customers_by_plan);
  if (planEntries.length > 50 || planEntries.some(([plan, count]) =>
    !/^[a-z0-9][a-z0-9_-]{0,63}$/.test(plan) || !validCount(count)
  )) {
    return { ok: false, error: "invalid_plan_summary" };
  }
  const payingCustomersByPlan = Object.fromEntries(planEntries) as Record<string, number>;
  const planTotal = Object.values(payingCustomersByPlan).reduce((sum, count) => sum + count, 0);
  if (planTotal !== input.active_subscriptions) {
    return { ok: false, error: "inconsistent_plan_summary" };
  }
  if ((input.signups_last_24h as number) > (input.signups_last_7d as number) ||
      (input.signups_last_7d as number) > (input.signups_total as number) ||
      (input.active_users_last_7d as number) > (input.signups_total as number)) {
    return { ok: false, error: "inconsistent_signup_summary" };
  }

  return {
    ok: true,
    summary: {
      generated_at: input.generated_at as string,
      signups_total: input.signups_total as number,
      signups_last_24h: input.signups_last_24h as number,
      signups_last_7d: input.signups_last_7d as number,
      paying_customers_by_plan: payingCustomersByPlan,
      active_subscriptions: input.active_subscriptions as number,
      cancellations_last_7d: input.cancellations_last_7d as number,
      refunds_last_7d: input.refunds_last_7d as number,
      open_enquiries: input.open_enquiries as number,
      oldest_open_enquiry_at: input.oldest_open_enquiry_at as string | null,
      open_privacy_requests: input.open_privacy_requests as number,
      oldest_open_privacy_request_at: input.oldest_open_privacy_request_at as string | null,
      active_users_last_7d: input.active_users_last_7d as number,
    },
  };
}
