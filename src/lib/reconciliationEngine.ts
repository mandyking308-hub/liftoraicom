import { supabase } from "@/integrations/supabase/client";

export type ReconSourceType = "bank"|"stripe"|"paypal"|"invoice"|"manual"|"marketplace_payout"|"refund"|"chargeback"|"other";
export type ReconStatus = "unmatched"|"suggested_match"|"matched"|"disputed"|"ignored"|"needs_review";
export type MatchStatus = "suggested"|"approved"|"rejected"|"confirmed";
export type PayoutStatus = "draft"|"approval_required"|"approved"|"scheduled"|"paid"|"failed"|"disputed"|"cancelled";
export type ExceptionType = "unmatched_payment"|"duplicate_payment"|"refund_mismatch"|"chargeback"|"payout_mismatch"|"currency_mismatch"|"amount_mismatch"|"missing_invoice"|"other";
export type Severity = "low"|"medium"|"high"|"critical";
export type ExceptionStatus = "open"|"review_required"|"resolved"|"ignored";

export interface ReconciliationRecord {
  id: string;
  business_id: string | null;
  legal_entity_id: string | null;
  source_type: ReconSourceType;
  source_record_id: string | null;
  amount: number;
  currency: string;
  transaction_date: string | null;
  description: string | null;
  reconciliation_status: ReconStatus;
  matched_table: string | null;
  matched_record_id: string | null;
  confidence_score: number | null;
  created_at: string;
  audit_metadata: any;
}

export interface PaymentReconciliationMatch {
  id: string;
  business_id: string | null;
  payment_id: string | null;
  invoice_id: string | null;
  bank_record_id: string | null;
  payout_record_id: string | null;
  match_status: MatchStatus;
  match_confidence: number | null;
  match_reason: string | null;
  founder_approval_required: boolean;
  approved_at: string | null;
  created_at: string;
  audit_metadata: any;
}

export interface MarketplacePayoutRecord {
  id: string;
  business_id: string | null;
  marketplace_id: string | null;
  seller_id: string | null;
  payout_period_start: string | null;
  payout_period_end: string | null;
  gross_amount: number;
  platform_fee: number;
  commission_amount: number;
  payout_amount: number;
  currency: string;
  payout_status: PayoutStatus;
  payout_provider: string | null;
  provider_payout_id: string | null;
  created_at: string;
  audit_metadata: any;
}

export interface ReconciliationException {
  id: string;
  business_id: string | null;
  exception_type: ExceptionType;
  severity: Severity;
  exception_summary: string;
  recommended_action: string | null;
  status: ExceptionStatus;
  created_at: string;
  audit_metadata: any;
}

export const SEVERITY_META: Record<Severity, { label: string; cls: string; weight: number }> = {
  low: { label: "Low", cls: "bg-muted text-muted-foreground border-border/50", weight: 1 },
  medium: { label: "Medium", cls: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30", weight: 2 },
  high: { label: "High", cls: "bg-orange-500/15 text-orange-300 border-orange-500/30", weight: 3 },
  critical: { label: "Critical", cls: "bg-red-500/15 text-red-300 border-red-500/30", weight: 4 },
};

export const STATUS_META: Record<ReconStatus, { label: string; cls: string }> = {
  unmatched:       { label: "Unmatched",      cls: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30" },
  suggested_match: { label: "Suggested",      cls: "bg-blue-500/15 text-blue-300 border-blue-500/30" },
  matched:         { label: "Matched",        cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  disputed:        { label: "Disputed",       cls: "bg-red-500/15 text-red-300 border-red-500/30" },
  ignored:         { label: "Ignored",        cls: "bg-muted text-muted-foreground border-border/50" },
  needs_review:    { label: "Review",         cls: "bg-orange-500/15 text-orange-300 border-orange-500/30" },
};

export const MATCH_STATUS_META: Record<MatchStatus, { label: string; cls: string }> = {
  suggested: { label: "Suggested", cls: "bg-blue-500/15 text-blue-300 border-blue-500/30" },
  approved:  { label: "Approved",  cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  rejected:  { label: "Rejected",  cls: "bg-muted text-muted-foreground border-border/50" },
  confirmed: { label: "Confirmed", cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
};

export const PAYOUT_STATUS_META: Record<PayoutStatus, { label: string; cls: string }> = {
  draft:             { label: "Draft",             cls: "bg-muted text-muted-foreground border-border/50" },
  approval_required: { label: "Approval required", cls: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30" },
  approved:          { label: "Approved",          cls: "bg-blue-500/15 text-blue-300 border-blue-500/30" },
  scheduled:         { label: "Scheduled",         cls: "bg-blue-500/15 text-blue-300 border-blue-500/30" },
  paid:              { label: "Paid",              cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  failed:            { label: "Failed",            cls: "bg-red-500/15 text-red-300 border-red-500/30" },
  disputed:          { label: "Disputed",          cls: "bg-red-500/15 text-red-300 border-red-500/30" },
  cancelled:         { label: "Cancelled",         cls: "bg-muted text-muted-foreground border-border/50" },
};

export const SOURCE_META: Record<ReconSourceType, string> = {
  bank: "Bank", stripe: "Stripe", paypal: "PayPal", invoice: "Invoice",
  manual: "Manual", marketplace_payout: "Marketplace payout",
  refund: "Refund", chargeback: "Chargeback", other: "Other",
};

function isTest(meta: any): boolean {
  if (!meta || typeof meta !== "object") return false;
  return meta.live_internal_test === true || meta.is_test_data === true || meta.test === true;
}

export async function fetchReconRecords(opts: { status?: ReconStatus[]; source?: ReconSourceType[] } = {}): Promise<ReconciliationRecord[]> {
  let q = (supabase as any).from("reconciliation_records").select("*").order("transaction_date", { ascending: false }).order("created_at", { ascending: false });
  if (opts.status?.length) q = q.in("reconciliation_status", opts.status);
  if (opts.source?.length) q = q.in("source_type", opts.source);
  const { data, error } = await q;
  if (error) { console.warn("reconciliation_records fetch failed", error); return []; }
  return (data ?? []) as ReconciliationRecord[];
}

export async function fetchMatches(): Promise<PaymentReconciliationMatch[]> {
  const { data, error } = await (supabase as any).from("payment_reconciliation_matches").select("*").order("created_at", { ascending: false });
  if (error) { console.warn("payment_reconciliation_matches fetch failed", error); return []; }
  return (data ?? []) as PaymentReconciliationMatch[];
}

export async function fetchPayouts(): Promise<MarketplacePayoutRecord[]> {
  const { data, error } = await (supabase as any).from("marketplace_payout_records").select("*").order("payout_period_end", { ascending: false }).order("created_at", { ascending: false });
  if (error) { console.warn("marketplace_payout_records fetch failed", error); return []; }
  return (data ?? []) as MarketplacePayoutRecord[];
}

export async function fetchExceptions(opts: { status?: ExceptionStatus[] } = {}): Promise<ReconciliationException[]> {
  let q = (supabase as any).from("reconciliation_exceptions").select("*").order("severity", { ascending: false }).order("created_at", { ascending: false });
  if (opts.status?.length) q = q.in("status", opts.status);
  const { data, error } = await q;
  if (error) { console.warn("reconciliation_exceptions fetch failed", error); return []; }
  return (data ?? []) as ReconciliationException[];
}

export interface ReconSummary {
  total_records: number;
  unmatched: number;
  suggested: number;
  matched: number;
  needs_review: number;
  open_exceptions: number;
  critical_exceptions: number;
  pending_matches: number;
  payouts_awaiting_approval: number;
  payouts_total_due: number;
  confirmed_revenue: number;
  pending_revenue: number;
  test_records: number;
  top_exception: ReconciliationException | null;
}

export function summarize(
  records: ReconciliationRecord[],
  matches: PaymentReconciliationMatch[],
  payouts: MarketplacePayoutRecord[],
  exceptions: ReconciliationException[],
): ReconSummary {
  const liveRecords = records.filter(r => !isTest(r.audit_metadata));
  const livePayouts = payouts.filter(p => !isTest(p.audit_metadata));

  const confirmed_revenue = liveRecords
    .filter(r => r.reconciliation_status === "matched" && (r.source_type === "stripe" || r.source_type === "paypal" || r.source_type === "bank" || r.source_type === "invoice"))
    .reduce((s, r) => s + Number(r.amount || 0), 0);
  const pending_revenue = liveRecords
    .filter(r => r.reconciliation_status === "unmatched" || r.reconciliation_status === "suggested_match" || r.reconciliation_status === "needs_review")
    .reduce((s, r) => s + Number(r.amount || 0), 0);

  const openEx = exceptions.filter(e => e.status === "open" || e.status === "review_required");
  const top = openEx.slice().sort((a,b) => SEVERITY_META[b.severity].weight - SEVERITY_META[a.severity].weight)[0] ?? null;

  return {
    total_records: records.length,
    unmatched: records.filter(r => r.reconciliation_status === "unmatched").length,
    suggested: records.filter(r => r.reconciliation_status === "suggested_match").length,
    matched:   records.filter(r => r.reconciliation_status === "matched").length,
    needs_review: records.filter(r => r.reconciliation_status === "needs_review").length,
    open_exceptions: openEx.length,
    critical_exceptions: openEx.filter(e => e.severity === "critical" || e.severity === "high").length,
    pending_matches: matches.filter(m => m.match_status === "suggested" || m.founder_approval_required).length,
    payouts_awaiting_approval: livePayouts.filter(p => p.payout_status === "approval_required" || p.payout_status === "draft").length,
    payouts_total_due: livePayouts.filter(p => p.payout_status !== "paid" && p.payout_status !== "cancelled").reduce((s,p) => s + Number(p.payout_amount || 0), 0),
    confirmed_revenue,
    pending_revenue,
    test_records: records.filter(r => isTest(r.audit_metadata)).length + payouts.filter(p => isTest(p.audit_metadata)).length,
    top_exception: top,
  };
}

export function formatMoney(n: number, ccy = "USD"): string {
  try { return new Intl.NumberFormat(undefined, { style: "currency", currency: ccy, maximumFractionDigits: 2 }).format(n); }
  catch { return `${ccy} ${n.toFixed(2)}`; }
}

/** Suggested-match heuristic. Never moves money. */
export function suggestMatch(payment: ReconciliationRecord, invoice: ReconciliationRecord): { confidence: number; reason: string } | null {
  if (payment.currency !== invoice.currency) return { confidence: 25, reason: "Currency mismatch" };
  const amtClose = Math.abs(Number(payment.amount) - Number(invoice.amount)) < 0.01;
  if (!amtClose) return null;
  return { confidence: 92, reason: "Amount and currency match" };
}