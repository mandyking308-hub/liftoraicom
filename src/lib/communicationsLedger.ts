import { supabase } from "@/integrations/supabase/client";

export type CommChannel = "email"|"voice"|"sms"|"whatsapp"|"social_dm"|"support_portal"|"seller_portal"|"partner_portal"|"adviser"|"manual"|"other";
export type CommDirection = "inbound"|"outbound"|"internal_note";
export type CommStatus = "draft"|"approval_required"|"approved"|"sent"|"received"|"failed"|"blocked"|"cancelled"|"logged";
export type ThreadStatus = "active"|"waiting_reply"|"closed"|"escalated"|"archived";
export type FlagType = "do_not_contact"|"sensitive"|"complaint"|"legal"|"angry_customer"|"vulnerable"|"approval_required"|"prompt_injection"|"unknown_business"|"other";
export type FlagSeverity = "low"|"medium"|"high"|"critical";

export interface CommRecord {
  id: string;
  business_id: string | null;
  identity_profile_id: string | null;
  contact_id: string | null;
  customer_id: string | null;
  seller_id: string | null;
  partner_id: string | null;
  channel: CommChannel;
  direction: CommDirection;
  communication_status: CommStatus;
  subject: string | null;
  summary: string | null;
  content_reference: string | null;
  external_provider: string | null;
  provider_message_id: string | null;
  approval_item_id: string | null;
  sent_at: string | null;
  received_at: string | null;
  created_at: string;
  updated_at: string;
  audit_metadata: Record<string, any>;
}

export interface CommThread {
  id: string;
  business_id: string | null;
  thread_title: string;
  primary_identity_profile_id: string | null;
  thread_status: ThreadStatus;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CommSafetyFlag {
  id: string;
  communication_record_id: string;
  flag_type: FlagType;
  severity: FlagSeverity;
  flag_summary: string | null;
  created_at: string;
  audit_metadata: Record<string, any>;
}

const sb: any = supabase as any;

const SECRET_RX = /(sk_[A-Za-z0-9_-]{8,}|api[_-]?key|bearer\s+[A-Za-z0-9._-]+|password\s*[:=]\s*\S+)/gi;
export function safeSummary(input: string | null | undefined, max = 280): string {
  if (!input) return "";
  let out = String(input).replace(SECRET_RX, "[REDACTED]");
  if (out.length > max) out = out.slice(0, max - 1) + "…";
  return out;
}

export async function listRecords(filters?: { channel?: CommChannel; business_id?: string; identity_profile_id?: string; status?: CommStatus; direction?: CommDirection; limit?: number }) {
  let q = sb.from("communication_records").select("*").order("created_at", { ascending: false }).limit(filters?.limit ?? 200);
  if (filters?.channel) q = q.eq("channel", filters.channel);
  if (filters?.business_id) q = q.eq("business_id", filters.business_id);
  if (filters?.identity_profile_id) q = q.eq("identity_profile_id", filters.identity_profile_id);
  if (filters?.status) q = q.eq("communication_status", filters.status);
  if (filters?.direction) q = q.eq("direction", filters.direction);
  const { data } = await q;
  return (data ?? []) as CommRecord[];
}

export async function listThreads(limit = 200) {
  const { data } = await sb.from("communication_threads").select("*").order("last_message_at", { ascending: false, nullsFirst: false }).limit(limit);
  return (data ?? []) as CommThread[];
}

export async function listFlags(limit = 200) {
  const { data } = await sb.from("communication_safety_flags").select("*").order("created_at", { ascending: false }).limit(limit);
  return (data ?? []) as CommSafetyFlag[];
}

export interface CommSummary {
  total: number;
  drafts: number;
  awaitingApproval: number;
  inbound: number;
  outbound: number;
  blocked: number;
  flagsCritical: number;
  flagsTotal: number;
  dncFlags: number;
  waitingReply: number;
  watchItems: string[];
}

export async function summariseCommunications(): Promise<CommSummary> {
  const [recs, flags, threads] = await Promise.all([
    sb.from("communication_records").select("communication_status,direction").limit(2000),
    sb.from("communication_safety_flags").select("flag_type,severity").limit(1000),
    sb.from("communication_threads").select("thread_status").limit(1000),
  ]);
  const r = (recs.data ?? []) as Array<{ communication_status: string; direction: string }>;
  const f = (flags.data ?? []) as Array<{ flag_type: string; severity: string }>;
  const t = (threads.data ?? []) as Array<{ thread_status: string }>;
  const drafts = r.filter(x => x.communication_status === "draft").length;
  const awaitingApproval = r.filter(x => x.communication_status === "approval_required").length;
  const blocked = r.filter(x => x.communication_status === "blocked").length;
  const inbound = r.filter(x => x.direction === "inbound").length;
  const outbound = r.filter(x => x.direction === "outbound").length;
  const flagsCritical = f.filter(x => x.severity === "critical" || x.severity === "high").length;
  const dnc = f.filter(x => x.flag_type === "do_not_contact").length;
  const waiting = t.filter(x => x.thread_status === "waiting_reply").length;
  const watch: string[] = [];
  if (awaitingApproval > 0) watch.push(`${awaitingApproval} drafts awaiting approval`);
  if (flagsCritical > 0) watch.push(`${flagsCritical} high/critical safety flag(s)`);
  if (dnc > 0) watch.push(`${dnc} do-not-contact flag(s)`);
  if (blocked > 0) watch.push(`${blocked} blocked send(s)`);
  return {
    total: r.length, drafts, awaitingApproval, inbound, outbound, blocked,
    flagsCritical, flagsTotal: f.length, dncFlags: dnc, waitingReply: waiting, watchItems: watch,
  };
}

export function channelLabel(c: CommChannel): string {
  const map: Record<CommChannel, string> = { email:"Email", voice:"Voice", sms:"SMS", whatsapp:"WhatsApp", social_dm:"Social DM", support_portal:"Support", seller_portal:"Seller", partner_portal:"Partner", adviser:"Adviser", manual:"Manual", other:"Other" };
  return map[c];
}

export function statusTone(s: CommStatus): "ok"|"warn"|"bad"|undefined {
  if (s === "sent" || s === "approved" || s === "logged" || s === "received") return "ok";
  if (s === "draft" || s === "approval_required") return "warn";
  if (s === "failed" || s === "blocked" || s === "cancelled") return "bad";
  return undefined;
}
