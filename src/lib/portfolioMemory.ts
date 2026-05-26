import { supabase } from "@/integrations/supabase/client";

export type SummaryType = "founder"|"operator"|"adviser"|"buyer"|"technical"|"customer"|"seller"|"finance"|"legal"|"weekly"|"monthly";
export type PackType = "operator"|"adviser"|"buyer"|"va"|"technical"|"founder"|"emergency"|"full_portfolio";
export type PackStatus = "draft"|"review_required"|"approved"|"exported"|"shared"|"archived";
export type Sensitivity = "internal"|"confidential"|"restricted"|"legal_sensitive"|"financial_sensitive";
export type ItemType = "overview"|"metrics"|"risks"|"decisions"|"contacts"|"documents"|"products"|"offers"|"systems"|"access"|"finance"|"legal"|"technical"|"next_actions"|"warnings";
export type HistoryEventType = "created"|"launched"|"paused"|"revenue_started"|"product_added"|"risk_flagged"|"decision_made"|"stage_changed"|"exit_ready"|"sold_closed"|"other";

export interface MemorySummary {
  id: string; business_id: string|null; summary_type: SummaryType;
  summary_title: string; summary_body: string|null; current_status: string|null;
  key_metrics: any; open_risks: any[]; open_decisions: any[]; open_work_items: any[];
  last_generated_at: string|null; generated_by: string|null;
  audit_metadata: any; created_at: string; updated_at: string;
}
export interface HandoverPack {
  id: string; business_id: string|null; pack_type: PackType; pack_status: PackStatus;
  pack_title: string; pack_summary: string|null; included_sections: string[];
  sensitivity_level: Sensitivity; founder_approval_required: boolean;
  audit_metadata: any; created_at: string; updated_at: string;
}
export interface HandoverPackItem {
  id: string; pack_id: string; business_id: string|null;
  item_type: ItemType; item_summary: string|null;
  source_table: string|null; source_record_id: string|null;
  audit_metadata: any; created_at: string;
}
export interface HistoryEvent {
  id: string; business_id: string|null; event_type: HistoryEventType;
  event_summary: string|null; event_date: string;
  source_module: string|null; source_record_id: string|null;
  audit_metadata: any; created_at: string;
}

export const SUMMARY_TYPE_LABEL: Record<SummaryType,string> = {
  founder:"Founder", operator:"Operator", adviser:"Adviser", buyer:"Buyer",
  technical:"Technical", customer:"Customer", seller:"Seller", finance:"Finance",
  legal:"Legal", weekly:"Weekly", monthly:"Monthly",
};
export const PACK_TYPE_LABEL: Record<PackType,string> = {
  operator:"Operator", adviser:"Adviser", buyer:"Buyer", va:"VA",
  technical:"Technical", founder:"Founder", emergency:"Emergency", full_portfolio:"Full portfolio",
};
export const PACK_STATUS_META: Record<PackStatus, { label: string; cls: string }> = {
  draft:           { label:"Draft",            cls:"bg-muted text-muted-foreground border-border/50" },
  review_required: { label:"Review required",  cls:"bg-yellow-500/15 text-yellow-300 border-yellow-500/30" },
  approved:        { label:"Approved",         cls:"bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  exported:        { label:"Exported",         cls:"bg-cyan-500/15 text-cyan-300 border-cyan-500/30" },
  shared:          { label:"Shared",           cls:"bg-cyan-500/15 text-cyan-300 border-cyan-500/30" },
  archived:        { label:"Archived",         cls:"bg-muted text-muted-foreground border-border/50" },
};
export const SENSITIVITY_META: Record<Sensitivity, { label: string; cls: string }> = {
  internal:            { label:"Internal",            cls:"bg-muted text-muted-foreground border-border/50" },
  confidential:        { label:"Confidential",        cls:"bg-yellow-500/15 text-yellow-300 border-yellow-500/30" },
  restricted:          { label:"Restricted",          cls:"bg-orange-500/15 text-orange-300 border-orange-500/30" },
  legal_sensitive:     { label:"Legal sensitive",     cls:"bg-red-500/15 text-red-300 border-red-500/30" },
  financial_sensitive: { label:"Financial sensitive", cls:"bg-red-500/15 text-red-300 border-red-500/30" },
};

const isTest = (m: any) => m && (m.live_internal_test === true || m.is_test_data === true);
const STALE_DAYS = 14;

export async function fetchSummaries(): Promise<MemorySummary[]> {
  const { data } = await (supabase as any).from("business_memory_summaries").select("*").order("created_at",{ascending:false});
  return (data ?? []) as MemorySummary[];
}
export async function fetchPacks(): Promise<HandoverPack[]> {
  const { data } = await (supabase as any).from("handover_packs").select("*").order("created_at",{ascending:false});
  return (data ?? []).map((p: any) => ({ ...p, included_sections: Array.isArray(p.included_sections) ? p.included_sections : [] })) as HandoverPack[];
}
export async function fetchPackItems(): Promise<HandoverPackItem[]> {
  const { data } = await (supabase as any).from("handover_pack_items").select("*").order("created_at",{ascending:true});
  return (data ?? []) as HandoverPackItem[];
}
export async function fetchHistory(): Promise<HistoryEvent[]> {
  const { data } = await (supabase as any).from("portfolio_history_events").select("*").order("event_date",{ascending:false});
  return (data ?? []) as HistoryEvent[];
}

export interface PortfolioMemorySummary {
  summaries: number; live_summaries: number;
  packs: number; packs_draft: number; packs_review: number; packs_approved: number; packs_shared: number;
  sensitive_unapproved: number; stale_summaries: number;
  operator_packs: number; adviser_packs: number; buyer_packs: number;
  history_events: number; test_records: number;
  top_alert: { kind: string; summary: string; severity: "low"|"medium"|"high"|"critical" } | null;
}

export function summarize(
  summaries: MemorySummary[], packs: HandoverPack[], history: HistoryEvent[]
): PortfolioMemorySummary {
  const live = summaries.filter(s => !isTest(s.audit_metadata));
  const now = Date.now();
  const stale = live.filter(s => !s.last_generated_at || (now - new Date(s.last_generated_at).getTime()) > STALE_DAYS * 86400_000).length;

  const draft = packs.filter(p => p.pack_status === "draft").length;
  const review = packs.filter(p => p.pack_status === "review_required").length;
  const approved = packs.filter(p => p.pack_status === "approved").length;
  const shared = packs.filter(p => p.pack_status === "shared" || p.pack_status === "exported").length;

  const sensitiveUnapproved = packs.filter(p =>
    p.sensitivity_level !== "internal"
    && p.founder_approval_required
    && p.pack_status !== "approved"
    && p.pack_status !== "archived"
  ).length;

  const opPacks = packs.filter(p => p.pack_type === "operator").length;
  const advPacks = packs.filter(p => p.pack_type === "adviser").length;
  const buyerPacks = packs.filter(p => p.pack_type === "buyer").length;

  let top: PortfolioMemorySummary["top_alert"] = null;
  if (sensitiveUnapproved > 0) top = { kind:"sensitive_unapproved", summary:`${sensitiveUnapproved} sensitive pack(s) awaiting founder approval before sharing`, severity:"high" };
  else if (stale > 0) top = { kind:"stale", summary:`${stale} business memory summary(s) stale (> ${STALE_DAYS}d)`, severity:"medium" };
  else if (review > 0) top = { kind:"review", summary:`${review} pack(s) in review`, severity:"low" };

  return {
    summaries: summaries.length, live_summaries: live.length,
    packs: packs.length, packs_draft: draft, packs_review: review, packs_approved: approved, packs_shared: shared,
    sensitive_unapproved: sensitiveUnapproved, stale_summaries: stale,
    operator_packs: opPacks, adviser_packs: advPacks, buyer_packs: buyerPacks,
    history_events: history.length,
    test_records: summaries.length - live.length,
    top_alert: top,
  };
}

/** Redact secret-shaped values for buyer/adviser packs. */
export function redactSecrets(input: string | null | undefined): string {
  if (!input) return "";
  return input.replace(/(sk-[A-Za-z0-9]{8,}|api[_-]?key[^\s]*|bearer\s+[A-Za-z0-9\.\-_]+)/gi, "[redacted]");
}