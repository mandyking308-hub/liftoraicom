/** Private admissions metadata only; no school records or external integrations. */
export const ADMISSIONS_STATUSES = ["not_started", "enquiring", "awaiting_response", "applying", "submitted", "assessment", "waitlisted", "offer_received", "accepted", "declined", "withdrawn"] as const;
export const DIARY_STATUSES = ["unknown", "not_requested", "requested", "offered", "awaiting_confirmation", "confirmed", "completed", "cancelled", "conflict"] as const;
export type AdmissionsStatus = typeof ADMISSIONS_STATUSES[number];
export type DiaryStatus = typeof DIARY_STATUSES[number];

export interface Admissions {
  status: AdmissionsStatus;
  entry_route: string;
  latest_email_date: string;
  latest_email_summary: string;
  application_deadline: string;
  diary_status: DiaryStatus;
  diary_date: string;
  conflict_notes: string;
  next_action: string;
  action_owner: string;
  follow_up_date: string;
}
export interface AdmissionsRecord {
  id: string;
  school_name: string;
  record_kind: string;
  structured_observations: unknown;
}

export const asObject = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};

export function validDate(value: unknown): string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return "";
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value ? value : "";
}

export function readAdmissions(observations: unknown): Admissions {
  const a = asObject(asObject(observations).admissions);
  const text = (key: string) => typeof a[key] === "string" ? a[key] as string : "";
  return {
    status: ADMISSIONS_STATUSES.includes(a.status as AdmissionsStatus) ? a.status as AdmissionsStatus : "not_started",
    entry_route: text("entry_route"), latest_email_date: validDate(a.latest_email_date),
    latest_email_summary: text("latest_email_summary"), application_deadline: validDate(a.application_deadline),
    diary_status: DIARY_STATUSES.includes(a.diary_status as DiaryStatus) ? a.diary_status as DiaryStatus : "unknown",
    diary_date: validDate(a.diary_date), conflict_notes: text("conflict_notes"), next_action: text("next_action"),
    action_owner: text("action_owner"), follow_up_date: validDate(a.follow_up_date),
  };
}

/** Explicit status only: entering a date can never confirm a booking. */
export function isConfirmedBooking(a: Admissions): boolean {
  return a.diary_status === "confirmed" && validDate(a.diary_date) !== "";
}

export function mergeAdmissions(existing: unknown, draft: Admissions): Record<string, unknown> {
  const previous = asObject(existing);
  return { ...previous, admissions: { ...asObject(previous.admissions), ...readAdmissions({ admissions: draft }) } };
}

const closed = (a: Admissions) => ["accepted", "declined", "withdrawn"].includes(a.status);
export function filterAdmissions(records: AdmissionsRecord[], search: string, status = "all", diary = "all", kind = "all"): AdmissionsRecord[] {
  const q = search.trim().toLocaleLowerCase();
  return records.filter((r) => {
    const a = readAdmissions(r.structured_observations);
    return (status === "all" || a.status === status) && (diary === "all" || a.diary_status === diary)
      && (kind === "all" || r.record_kind === kind)
      && [r.school_name, a.entry_route, a.next_action, a.action_owner, a.latest_email_summary, a.conflict_notes].some((v) => v.toLocaleLowerCase().includes(q));
  }).sort((left, right) => {
    const a = readAdmissions(left.structured_observations), b = readAdmissions(right.structured_observations);
    return Number(closed(a)) - Number(closed(b))
      || (a.application_deadline || "9999-12-31").localeCompare(b.application_deadline || "9999-12-31")
      || (a.follow_up_date || "9999-12-31").localeCompare(b.follow_up_date || "9999-12-31")
      || left.school_name.localeCompare(right.school_name);
  });
}

export interface AdmissionsStore {
  read: (id: string) => Promise<unknown>;
  // Compare-and-set must match both record ID and the complete original JSONB.
  compareAndSet: (id: string, previous: unknown, next: Record<string, unknown>) => Promise<boolean>;
}
export async function saveAdmissions(store: AdmissionsStore, id: string, draft: Admissions): Promise<void> {
  if (!id) throw new Error("Select a school before saving.");
  if (draft.diary_status === "confirmed" && !validDate(draft.diary_date)) throw new Error("A confirmed booking needs a valid date.");
  for (const key of ["latest_email_date", "application_deadline", "diary_date", "follow_up_date"] as const) {
    if (draft[key] && !validDate(draft[key])) throw new Error("Enter a valid date or leave it unknown.");
  }
  const previous = await store.read(id);
  const saved = await store.compareAndSet(id, previous, mergeAdmissions(previous, draft));
  if (!saved) throw new Error("This school changed while saving. Reload it before trying again.");
}