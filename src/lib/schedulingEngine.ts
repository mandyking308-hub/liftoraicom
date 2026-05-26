import { supabase } from "@/integrations/supabase/client";

export type ResourceType = "founder"|"human_operator"|"adviser"|"room"|"location"|"virtual_meeting"|"equipment"|"other";
export type BookingType = "sales_call"|"onboarding"|"support"|"delivery"|"consultation"|"demo"|"review"|"other";
export type BookingStatus = "draft"|"approval_required"|"invited"|"booked"|"completed"|"no_show"|"cancelled"|"rescheduled";
export type BookingEventType = "draft_created"|"invite_prepared"|"booked"|"rescheduled"|"cancelled"|"no_show"|"completed"|"follow_up_created";

export interface SchedulingResource {
  id: string; business_id: string|null; resource_name: string; resource_type: ResourceType;
  timezone: string; availability_summary: string|null; active: boolean;
  created_at: string; updated_at: string; audit_metadata: any;
}
export interface AvailabilityWindow {
  id: string; business_id: string|null; resource_id: string; day_of_week: number;
  start_time: string; end_time: string; timezone: string; active: boolean;
  created_at: string; updated_at: string;
}
export interface BookingRecord {
  id: string; business_id: string|null; contact_id: string|null; customer_id: string|null;
  resource_id: string|null; related_conversation_id: string|null;
  booking_type: BookingType; booking_status: BookingStatus;
  scheduled_start: string|null; scheduled_end: string|null; timezone: string;
  meeting_url: string|null; calendar_provider: string|null; provider_event_id: string|null;
  founder_approval_required: boolean; created_at: string; updated_at: string; audit_metadata: any;
}
export interface BookingEvent {
  id: string; business_id: string|null; booking_id: string; event_type: BookingEventType;
  event_summary: string|null; created_at: string; audit_metadata: any;
}

export const BOOKING_STATUS_META: Record<BookingStatus, { label: string; cls: string }> = {
  draft:             { label: "Draft",             cls: "bg-muted text-muted-foreground border-border/50" },
  approval_required: { label: "Approval required", cls: "bg-orange-500/15 text-orange-300 border-orange-500/30" },
  invited:           { label: "Invited",           cls: "bg-blue-500/15 text-blue-300 border-blue-500/30" },
  booked:            { label: "Booked",            cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  completed:         { label: "Completed",         cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  no_show:           { label: "No-show",           cls: "bg-red-500/15 text-red-300 border-red-500/30" },
  cancelled:         { label: "Cancelled",         cls: "bg-muted text-muted-foreground border-border/50" },
  rescheduled:       { label: "Rescheduled",       cls: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30" },
};

export const RESOURCE_TYPE_LABEL: Record<ResourceType, string> = {
  founder: "Founder", human_operator: "Operator", adviser: "Adviser",
  room: "Room", location: "Location", virtual_meeting: "Virtual room",
  equipment: "Equipment", other: "Other",
};

export const DAY_LABEL = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

export async function fetchResources(): Promise<SchedulingResource[]> {
  const { data } = await (supabase as any).from("scheduling_resources").select("*").order("created_at", { ascending: false });
  return (data ?? []) as SchedulingResource[];
}
export async function fetchAvailability(): Promise<AvailabilityWindow[]> {
  const { data } = await (supabase as any).from("availability_windows").select("*").order("day_of_week", { ascending: true });
  return (data ?? []) as AvailabilityWindow[];
}
export async function fetchBookings(): Promise<BookingRecord[]> {
  const { data } = await (supabase as any).from("booking_records").select("*").order("created_at", { ascending: false });
  return (data ?? []) as BookingRecord[];
}
export async function fetchBookingEvents(): Promise<BookingEvent[]> {
  const { data } = await (supabase as any).from("booking_events").select("*").order("created_at", { ascending: false });
  return (data ?? []) as BookingEvent[];
}

export interface SchedulingSummary {
  resources: number; active_resources: number;
  availability_rows: number;
  bookings: number;
  drafts: number;
  awaiting_approval: number;
  upcoming: number;
  no_shows: number;
  conflicts: number;
  follow_ups_needed: number;
  test_records: number;
  top_alert: { kind: string; summary: string; severity: "low"|"medium"|"high"|"critical" } | null;
}

export function detectConflicts(bookings: BookingRecord[]): Array<{ a: BookingRecord; b: BookingRecord }> {
  const live = bookings.filter(b => b.scheduled_start && b.scheduled_end && b.resource_id
    && !["cancelled","no_show","completed"].includes(b.booking_status));
  const conflicts: Array<{ a: BookingRecord; b: BookingRecord }> = [];
  for (let i=0;i<live.length;i++) for (let j=i+1;j<live.length;j++) {
    const a = live[i], b = live[j];
    if (a.resource_id !== b.resource_id) continue;
    const aS = new Date(a.scheduled_start!).getTime();
    const aE = new Date(a.scheduled_end!).getTime();
    const bS = new Date(b.scheduled_start!).getTime();
    const bE = new Date(b.scheduled_end!).getTime();
    if (aS < bE && bS < aE) conflicts.push({ a, b });
  }
  return conflicts;
}

export function summarize(
  resources: SchedulingResource[],
  windows: AvailabilityWindow[],
  bookings: BookingRecord[],
  events: BookingEvent[],
): SchedulingSummary {
  const now = Date.now();
  const drafts = bookings.filter(b => b.booking_status === "draft").length;
  const approval = bookings.filter(b => b.booking_status === "approval_required" || b.founder_approval_required && b.booking_status === "draft").length;
  const upcoming = bookings.filter(b => b.scheduled_start && new Date(b.scheduled_start).getTime() > now && ["booked","invited"].includes(b.booking_status)).length;
  const noShows = bookings.filter(b => b.booking_status === "no_show").length;
  const conflicts = detectConflicts(bookings).length;
  const followUps = bookings.filter(b => b.booking_status === "completed").filter(b =>
    !events.some(e => e.booking_id === b.id && e.event_type === "follow_up_created")
  ).length;
  const isTest = (m: any) => m && (m.live_internal_test === true || m.is_test_data === true);
  const test = resources.filter(r => isTest(r.audit_metadata)).length
    + bookings.filter(b => isTest(b.audit_metadata)).length;

  let top: SchedulingSummary["top_alert"] = null;
  if (conflicts > 0) top = { kind: "conflict", summary: `${conflicts} resource conflict(s) detected`, severity: "high" };
  else if (approval > 0) top = { kind: "approval", summary: `${approval} booking(s) await founder approval`, severity: "high" };
  else if (noShows > 0) top = { kind: "no_show", summary: `${noShows} no-show(s) need follow-up`, severity: "medium" };
  else if (followUps > 0) top = { kind: "follow_up", summary: `${followUps} completed booking(s) need follow-up task`, severity: "medium" };

  return {
    resources: resources.length,
    active_resources: resources.filter(r => r.active).length,
    availability_rows: windows.length,
    bookings: bookings.length,
    drafts, awaiting_approval: approval, upcoming, no_shows: noShows,
    conflicts, follow_ups_needed: followUps, test_records: test, top_alert: top,
  };
}