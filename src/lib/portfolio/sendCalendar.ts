// Shared portfolio send calendar rules. Planning only: nothing here sends email.
// The database trigger validate_portfolio_send_booking enforces the same rules.
export const CAMPAIGN_EMAIL_CAP = 5;

export type Booking = {
  id: string; business_id: string; campaign_label: string; mailbox_id: string;
  starts_at: string; ends_at: string; emails_planned: number; status: "planned" | "cancelled";
};

const overlaps = (a: Booking, b: Pick<Booking, "starts_at" | "ends_at">) =>
  new Date(a.starts_at) < new Date(b.ends_at) && new Date(b.starts_at) < new Date(a.ends_at);

export function findMailboxClash(existing: Booking[], next: Omit<Booking, "id" | "status"> & { id?: string }) {
  return existing.find((b) => b.status === "planned" && b.id !== next.id && b.mailbox_id === next.mailbox_id && overlaps(b, next)) ?? null;
}

export function emailsBooked(existing: Booking[], businessId: string, campaignLabel: string, excludeId?: string) {
  return existing
    .filter((b) => b.status === "planned" && b.id !== excludeId && b.business_id === businessId && b.campaign_label === campaignLabel)
    .reduce((n, b) => n + b.emails_planned, 0);
}

export function checkBooking(existing: Booking[], next: Omit<Booking, "id" | "status"> & { id?: string }): string | null {
  if (!(new Date(next.ends_at) > new Date(next.starts_at))) return "End time must be after the start time.";
  if (next.emails_planned < 1) return "Plan at least one email.";
  const clash = findMailboxClash(existing, next);
  if (clash) return "This mailbox is already booked for that time.";
  const used = emailsBooked(existing, next.business_id, next.campaign_label, next.id);
  if (used + next.emails_planned > CAMPAIGN_EMAIL_CAP) return `This campaign is limited to ${CAMPAIGN_EMAIL_CAP} emails in total (${used} already booked).`;
  return null;
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
    { key: "emails", label: "Prepare the emails", state: i.campaignDrafts > 0 ? "done" : "todo", note: `${i.campaignDrafts} campaign draft(s), max ${CAMPAIGN_EMAIL_CAP} emails` },
    { key: "social", label: "Social media", state: !i.socialRequired ? "optional" : i.socialDrafts > 0 ? "done" : "todo", note: `${i.socialDrafts} draft post(s)` },
    { key: "calendar", label: "Book on the shared calendar", state: i.bookings > 0 ? "done" : "todo", note: `${i.bookings} booking(s)` },
    { key: "tagging", label: "Business tag on every send", state: i.bookings > 0 ? "done" : "todo", note: "Every booking carries its business" },
    { key: "inbox", label: "Replies into the shared inbox", state: i.inboxLive ? "done" : "blocked", note: i.inboxLive ? "Live" : "Reply collection is switched off" },
  ];
}
