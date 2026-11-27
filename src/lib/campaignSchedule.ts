/** Campaign rhythm: 4 emails, 7 days apart, then the same 4-email round every 3 months, with no end. */
export const EMAILS_PER_ROUND = 4;
export const DAYS_BETWEEN_EMAILS = 7;
export const MONTHS_BETWEEN_ROUNDS = 3;

/** Page-only retirement: preserve the pilot's records, provider state and background sync. */
export function isEmailOutreachCampaignVisible(businessId: string, campaignReference: string | number | null | undefined): boolean {
  return businessId !== "640de582-a112-4d16-a221-03c27f00c6ec" ||
    !(/(^|\D)4103531(\D|$)/.test(String(campaignReference ?? "")) ||
      campaignReference === "Kindnesss pilot test (5 people)");
}

export type ScheduledEmail = { round: number; step: number; at: Date };

const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400000);
const addMonths = (d: Date, n: number) => { const x = new Date(d); x.setUTCMonth(x.getUTCMonth() + n); return x; };

/** Every email between `from` and `to` for a campaign that first sent at `start`. */
export function scheduleBetween(start: Date, from: Date, to: Date): ScheduledEmail[] {
  const out: ScheduledEmail[] = [];
  for (let round = 1; ; round++) {
    const roundStart = addMonths(start, (round - 1) * MONTHS_BETWEEN_ROUNDS);
    if (roundStart > to) break;
    for (let step = 1; step <= EMAILS_PER_ROUND; step++) {
      const at = addDays(roundStart, (step - 1) * DAYS_BETWEEN_EMAILS);
      if (at >= from && at <= to) out.push({ round, step, at });
    }
  }
  return out;
}

/** The next email due after `now`. Always exists because rounds repeat forever. */
export function nextEmail(start: Date, now: Date): ScheduledEmail {
  return scheduleBetween(start, now, addMonths(now, MONTHS_BETWEEN_ROUNDS + 1))[0];
}

/** Founder rule: each mailbox sends at most 25 emails a day. */
export const MAILBOX_DAILY_LIMIT = 25;

/** Most emails a set of mailboxes can send in one day. */
export const dailyEmailCapacity = (mailboxes: number) => Math.max(0, Math.floor(mailboxes)) * MAILBOX_DAILY_LIMIT;

/** New people per day so first emails plus follow-ups never pass the mailboxes' daily total. */
export const newPeoplePerDay = (mailboxes: number, emailsPerPerson = EMAILS_PER_ROUND) =>
  Math.floor(dailyEmailCapacity(mailboxes) / Math.max(1, emailsPerPerson));
