// Quarterly repeating campaigns — pure rules shared by the edge function and tests.
// Founder decisions (23 Nov 2026): every campaign repeats each quarter forever on its
// own data set, 4 emails per round, and each round starts automatically only if all
// checks pass; on a critical failure the round stays paused and the founder is notified.

export const SEQUENCE_STEPS = 4;
export const INTERVAL_MONTHS = 3;
export const MIN_ROUND_LEADS = 1;
export const MIN_HEALTHY_SENDERS = 1;

/** Same day-of-month, `months` later (clamped to month end), same UTC time. */
export function addMonths(iso: string, months = INTERVAL_MONTHS): string {
  const d = new Date(iso);
  const y = d.getUTCFullYear(), m = d.getUTCMonth() + months;
  const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, m, Math.min(d.getUTCDate(), last), d.getUTCHours(), d.getUTCMinutes())).toISOString();
}

/** Rounds never run out: max_rounds NULL means forever. */
export function hasMoreRounds(roundsCompleted: number, maxRounds: number | null): boolean {
  return maxRounds == null || roundsCompleted < maxRounds;
}

export function isDue(nextRoundAt: string, nowMs: number): boolean {
  return Date.parse(nextRoundAt) <= nowMs;
}

export interface RoundContact {
  id: string; email: string | null; first_name: string | null;
  suppressed: boolean;          // global suppression, unsubscribed, hard bounce, do-not-contact
  do_not_contact_business: boolean;
  history: boolean;             // any past bounce or reply (email history)
  email_status: string | null;  // Apollo "Email Status"
  catch_all: string | null;     // Apollo "Primary Email Catch-all Status"
}
export type HoldReason = "no_email_or_first_name" | "suppressed" | "prior_bounce_or_reply" | "not_verified" | "catch_all" | "catch_all_unassessed";

export function classifyContact(c: RoundContact): HoldReason | null {
  const e = String(c.email ?? "").trim();
  if (!e.includes("@") || !String(c.first_name ?? "").trim()) return "no_email_or_first_name";
  if (c.suppressed || c.do_not_contact_business) return "suppressed";
  if (c.history) return "prior_bounce_or_reply";
  const es = String(c.email_status ?? "").toLowerCase();
  if (es !== "verified" && es !== "valid") return "not_verified";
  const ca = String(c.catch_all ?? "").trim().toLowerCase();
  if (ca === "catch-all") return "catch_all";
  if (ca !== "not catch-all") return "catch_all_unassessed";
  return null;
}

export function filterRound(contacts: RoundContact[]) {
  const eligible: RoundContact[] = []; const held: Record<string, number> = {};
  const seen = new Set<string>();
  for (const c of contacts) {
    const r = classifyContact(c);
    if (r) { held[r] = (held[r] ?? 0) + 1; continue; }
    const k = String(c.email).trim().toLowerCase();
    if (seen.has(k)) continue; seen.add(k); eligible.push(c);
  }
  return { eligible, held };
}

export interface SequenceStep { seq_number: number; subject: string; body: string }
/** Compliance checks on the 4 emails; returns critical problems. */
export function sequenceProblems(steps: SequenceStep[], postalPattern: RegExp | null): string[] {
  const out: string[] = [];
  if (steps.length !== SEQUENCE_STEPS) out.push(`sequence_steps_${steps.length}`);
  for (const s of steps) {
    if (!s.subject.trim()) out.push(`step_${s.seq_number}_no_subject`);
    if (!s.body.includes("%unsubscribe-text%")) out.push(`step_${s.seq_number}_no_unsubscribe`);
    if (postalPattern && !postalPattern.test(s.body)) out.push(`step_${s.seq_number}_no_postal_address`);
    if (/\[[A-Z _]+\]/.test(s.body)) out.push(`step_${s.seq_number}_leftover_placeholder`);
  }
  return out;
}

export function roundCritical(i: { eligible: number; healthySenders: number; charitySender: boolean; sequence: string[]; calendarClash: boolean }): string[] {
  const c: string[] = [];
  if (i.eligible < MIN_ROUND_LEADS) c.push(`only_${i.eligible}_eligible_contacts`);
  if (i.healthySenders < MIN_HEALTHY_SENDERS) c.push(`only_${i.healthySenders}_healthy_mailboxes`);
  if (i.charitySender) c.push("charity_mailbox_attached");
  if (i.calendarClash) c.push("calendar_clash_with_other_business");
  c.push(...i.sequence);
  return c;
}
