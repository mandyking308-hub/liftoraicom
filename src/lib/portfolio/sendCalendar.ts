// Shared portfolio send calendar rules. Planning only: nothing here sends email.
// A business campaign is a five-email sequence sent to thousands of recipients across
// the whole shared GSM pool. Different businesses take turns on dates/times; two
// businesses can never hold the same mailbox at overlapping times.
// The database trigger validate_portfolio_send_booking enforces the same rules.
export const SEQUENCE_STEPS = 5;

export type Booking = {
  id: string; business_id: string; campaign_label: string; mailbox_id: string;
  starts_at: string; ends_at: string; sequence_step: number; recipients_planned: number;
  status: "planned" | "cancelled"; booking_group?: string | null;
};
export type Window = { business_id: string; campaign_label: string; sequence_step: number; starts_at: string; ends_at: string };

const overlaps = (a: Pick<Booking, "starts_at" | "ends_at">, b: Pick<Booking, "starts_at" | "ends_at">) =>
  new Date(a.starts_at) < new Date(b.ends_at) && new Date(b.starts_at) < new Date(a.ends_at);

/** Mailboxes (from the requested list) already held by another business during the window. */
export function clashingMailboxes(existing: Booking[], w: Window, mailboxIds: string[]): string[] {
  const wanted = new Set(mailboxIds);
  return [...new Set(existing.filter((b) => b.status === "planned" && wanted.has(b.mailbox_id)
    && b.business_id !== w.business_id && overlaps(b, w)).map((b) => b.mailbox_id))];
}

export function checkWindow(existing: Booking[], w: Window, mailboxIds: string[]): string | null {
  if (!(new Date(w.ends_at) > new Date(w.starts_at))) return "End time must be after the start time.";
  if (!Number.isInteger(w.sequence_step) || w.sequence_step < 1 || w.sequence_step > SEQUENCE_STEPS) return `Choose email 1 to ${SEQUENCE_STEPS}.`;
  if (mailboxIds.length === 0) return "Choose at least one mailbox.";
  const clash = clashingMailboxes(existing, w, mailboxIds);
  if (clash.length) return `${clash.length} mailbox(es) are already booked by another business for that time.`;
  const dup = existing.some((b) => b.status === "planned" && b.business_id === w.business_id && b.campaign_label === w.campaign_label
    && b.sequence_step === w.sequence_step && mailboxIds.includes(b.mailbox_id));
  if (dup) return `Email ${w.sequence_step} of this campaign is already booked.`;
  return null;
}

/** Split recipients evenly across mailboxes (first mailboxes take the remainder). */
export function splitRecipients(total: number, mailboxCount: number): number[] {
  const base = Math.floor(total / mailboxCount), extra = total % mailboxCount;
  return Array.from({ length: mailboxCount }, (_, i) => base + (i < extra ? 1 : 0));
}

export function stepsBooked(existing: Booking[], businessId: string, campaignLabel: string): number[] {
  return [...new Set(existing.filter((b) => b.status === "planned" && b.business_id === businessId && b.campaign_label === campaignLabel)
    .map((b) => b.sequence_step))].sort();
}

export type OnboardingInput = {
  businessExists: boolean; manualStatus: string | null; campaignDrafts: number;
  socialDrafts: number; socialRequired: boolean; bookings: number; inboxLive: boolean;
};
export type StepState = "done" | "todo" | "optional" | "blocked";
export function onboardingSteps(i: OnboardingInput): { key: string; label: string; state: StepState; note: string }[] {
  return [
    { key: "business", label: "Add the business", state: i.businessExists ? "done" : "todo", note: "One record, no duplicates" },
    { key: "manual", label: "Load the business manual", state: i.manualStatus && i.manualStatus !== "draft" && i.manualStatus !== "empty" ? "done" : "todo", note: i.manualStatus ? `Manual: ${i.manualStatus}` : "No manual yet" },
    { key: "emails", label: "Prepare the five emails", state: i.campaignDrafts > 0 ? "done" : "todo", note: `${i.campaignDrafts} campaign draft(s)` },
    { key: "social", label: "Social media", state: !i.socialRequired ? "optional" : i.socialDrafts > 0 ? "done" : "todo", note: `${i.socialDrafts} draft post(s)` },
    { key: "calendar", label: "Book on the shared calendar", state: i.bookings > 0 ? "done" : "todo", note: `${i.bookings} mailbox booking(s)` },
    { key: "tagging", label: "Business tag on every send", state: i.bookings > 0 ? "done" : "todo", note: "Every booking carries its business" },
    { key: "inbox", label: "Replies into the shared inbox", state: i.inboxLive ? "done" : "blocked", note: i.inboxLive ? "Live" : "Reply collection is switched off" },
  ];
}
