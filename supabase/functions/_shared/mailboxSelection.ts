/** Picks every GSM mailbox safe for a new campaign slot. Pure: no I/O. */
export type BoxRow = {
  id: string; smartlead_email_account_id: string | number | null; warmup_status: string | null;
  readiness_state: string | null; health_score: number | null; last_provider_check_at: string | null;
  quarantined_reason: string | null;
};
export type BookingRow = { mailbox_id: string; business_id: string; starts_at: string; ends_at: string };

export const WINNR_FRESH_MS = 24 * 60 * 60 * 1000;
export const MIN_HEALTH = 80;

export function selectSlotMailboxes(boxes: BoxRow[], bookings: BookingRow[], businessId: string, slotStart: Date, slotEnd: Date, now = new Date()): BoxRow[] {
  const taken = new Set(bookings
    .filter((b) => b.business_id !== businessId && new Date(b.starts_at) < slotEnd && new Date(b.ends_at) > slotStart)
    .map((b) => b.mailbox_id));
  return boxes.filter((b) =>
    b.smartlead_email_account_id != null && !b.quarantined_reason &&
    String(b.warmup_status).toLowerCase() === "warm" && b.readiness_state === "campaign_ready" &&
    (b.health_score ?? 0) >= MIN_HEALTH &&
    !!b.last_provider_check_at && now.getTime() - new Date(b.last_provider_check_at).getTime() < WINNR_FRESH_MS &&
    !taken.has(b.id));
}
