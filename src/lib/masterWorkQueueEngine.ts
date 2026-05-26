import { supabase } from "@/integrations/supabase/client";

export type WorkItem = {
  id: string;
  business_id: string | null;
  source_module: string;
  source_table: string | null;
  source_record_id: string | null;
  work_type: string;
  title: string;
  description: string | null;
  priority: "low" | "normal" | "high" | "urgent" | "critical";
  value_score: number;
  risk_score: number;
  estimated_value_amount: number | null;
  estimated_value_currency: string | null;
  due_at: string | null;
  status: "new" | "active" | "waiting_approval" | "blocked" | "completed" | "cancelled" | "parked";
  owner_type: "founder" | "ai_agent" | "human_operator" | "external_adviser" | "unassigned";
  owner_id: string | null;
  assigned_agent: string | null;
  approval_required: boolean;
  approval_item_id: string | null;
  blocker_reason: string | null;
  recommended_action: string | null;
  action_url: string | null;
  is_test_data: boolean;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  audit_metadata: any;
};

export const OPEN_STATUSES: WorkItem["status"][] = ["new", "active", "waiting_approval", "blocked"];

/** Source modules the PMO can ingest from. Missing tables fail gracefully. */
export const PMO_SOURCES: Array<{ module: string; table: string; label: string }> = [
  { module: "approval",       table: "founder_approval_items",        label: "Approval queue" },
  { module: "ai_cost",        table: "ai_cost_alerts",                label: "AI cost alerts" },
  { module: "ai_runtime",     table: "ai_runtime_events",             label: "AI runtime events" },
  { module: "ai_usage",       table: "ai_usage_ledger",               label: "AI usage ledger" },
  { module: "sales",          table: "customer_sales_conversations",  label: "Sales conversations" },
  { module: "sales_close",    table: "customer_sales_close_actions",  label: "Sales close actions" },
  { module: "sales_targets",  table: "sales_target_progress",         label: "Sales target progress" },
  { module: "upgrades",       table: "customer_upgrade_opportunities",label: "Upgrade opportunities" },
  { module: "revenue",        table: "revenue_autopilot_tasks",       label: "Revenue autopilot tasks" },
  { module: "qtc_quotes",     table: "qtc_quotes",                    label: "Quotes" },
  { module: "qtc_invoices",   table: "qtc_invoices",                  label: "Invoices" },
  { module: "delivery",       table: "delivery_tasks",                label: "Delivery tasks" },
  { module: "onboarding",     table: "onboarding_checklist_items",    label: "Onboarding checklist" },
  { module: "support",        table: "support_tickets",               label: "Support tickets" },
  { module: "complaint",      table: "complaint_cases",               label: "Complaints" },
  { module: "refund",         table: "refund_requests",               label: "Refund requests" },
  { module: "contract",       table: "contracts",                     label: "Contracts" },
  { module: "vendor",         table: "vendor_subscriptions",          label: "Vendor subscriptions" },
  { module: "human_ops",      table: "human_operator_tasks",          label: "Human operator tasks" },
  { module: "secrets",        table: "secret_inventory",              label: "Secret rotation" },
  { module: "privacy",        table: "privacy_requests",              label: "Privacy requests" },
  { module: "privacy_breach", table: "privacy_breach_events",         label: "Privacy breach events" },
  { module: "incident",       table: "incident_records",              label: "Incidents" },
  { module: "adviser",        table: "adviser_questions",             label: "Adviser questions" },
  { module: "reporting",      table: "founder_report_items",          label: "Founder report items" },
  { module: "product_bugs",   table: "product_bugs",                  label: "Product bugs" },
  { module: "data_quality",   table: "data_quality_findings",         label: "Data quality findings" },
  { module: "knowledge",      table: "knowledge_conflicts",           label: "Knowledge conflicts" },
  { module: "capacity",       table: "bottleneck_alerts",             label: "Capacity bottlenecks" },
  { module: "seller_prospect",table: "seller_prospects",              label: "Seller prospects" },
  { module: "marketplace",    table: "marketplace_growth_actions",    label: "Marketplace growth actions" },
  { module: "portfolio",      table: "portfolio_priority_decisions",  label: "Portfolio decisions" },
  { module: "portfolio_risk", table: "portfolio_risk_items",          label: "Portfolio risk items" },
  { module: "setup",          table: "business_setup_tasks",          label: "Business setup tasks" },
];

export async function fetchWorkItems(filter?: {
  status?: WorkItem["status"][];
  priority?: WorkItem["priority"][];
  business_id?: string;
  owner_type?: WorkItem["owner_type"];
  approvals_only?: boolean;
  overdue_only?: boolean;
  high_value_only?: boolean;
  limit?: number;
}): Promise<WorkItem[]> {
  const sb: any = supabase as any;
  let q = sb.from("master_work_items").select("*");
  if (filter?.status) q = q.in("status", filter.status);
  if (filter?.priority) q = q.in("priority", filter.priority);
  if (filter?.business_id) q = q.eq("business_id", filter.business_id);
  if (filter?.owner_type) q = q.eq("owner_type", filter.owner_type);
  if (filter?.approvals_only) q = q.eq("approval_required", true);
  if (filter?.overdue_only) q = q.lt("due_at", new Date().toISOString()).in("status", OPEN_STATUSES);
  if (filter?.high_value_only) q = q.gte("estimated_value_amount", 1000);
  q = q.order("priority", { ascending: false }).order("due_at", { ascending: true }).limit(filter?.limit ?? 500);
  const { data, error } = await q;
  if (error) return [];
  return (data ?? []) as WorkItem[];
}

export type QueueSummary = {
  open_today: number;
  urgent: number;
  overdue: number;
  approvals_blocking: number;
  high_value: number;
  blocked: number;
  test_records: number;
  top_action: WorkItem | null;
  by_business: Record<string, number>;
  by_agent: Record<string, number>;
};

export function summarize(items: WorkItem[]): QueueSummary {
  const open = items.filter(i => OPEN_STATUSES.includes(i.status) && !i.is_test_data);
  const now = Date.now();
  const urgent = open.filter(i => i.priority === "urgent" || i.priority === "critical");
  const overdue = open.filter(i => i.due_at && Date.parse(i.due_at) < now);
  const approvals_blocking = open.filter(i => i.approval_required || i.status === "waiting_approval");
  const high_value = open.filter(i => (i.estimated_value_amount ?? 0) >= 1000);
  const blocked = open.filter(i => i.status === "blocked");
  const test_records = items.filter(i => i.is_test_data).length;
  const ranked = [...open].sort((a, b) => rankScore(b) - rankScore(a));
  const by_business: Record<string, number> = {};
  const by_agent: Record<string, number> = {};
  for (const i of open) {
    const b = i.business_id ?? "—";
    by_business[b] = (by_business[b] ?? 0) + 1;
    const a = i.assigned_agent ?? i.owner_type;
    by_agent[a] = (by_agent[a] ?? 0) + 1;
  }
  return {
    open_today: open.length, urgent: urgent.length, overdue: overdue.length,
    approvals_blocking: approvals_blocking.length, high_value: high_value.length,
    blocked: blocked.length, test_records, top_action: ranked[0] ?? null,
    by_business, by_agent,
  };
}

const PRIORITY_WEIGHT: Record<WorkItem["priority"], number> = {
  critical: 100, urgent: 80, high: 60, normal: 30, low: 10,
};

export function rankScore(i: WorkItem): number {
  const pri = PRIORITY_WEIGHT[i.priority] ?? 30;
  const value = Number(i.value_score ?? 0) + Math.min(40, (Number(i.estimated_value_amount ?? 0) / 250));
  const risk = Number(i.risk_score ?? 0);
  const overdueBoost = i.due_at && Date.parse(i.due_at) < Date.now() ? 25 : 0;
  const approvalBoost = i.approval_required ? 15 : 0;
  return pri + value + risk + overdueBoost + approvalBoost;
}

export function topN(items: WorkItem[], n = 10): WorkItem[] {
  return [...items].filter(i => OPEN_STATUSES.includes(i.status) && !i.is_test_data)
    .sort((a, b) => rankScore(b) - rankScore(a)).slice(0, n);
}

/** Idempotent ingest: upsert by (source_module, source_table, source_record_id). */
export async function ingestWorkItem(row: Partial<WorkItem> & { source_module: string; work_type: string; title: string }) {
  const sb: any = supabase as any;
  const { data, error } = await sb.from("master_work_items").upsert(row, {
    onConflict: "source_module,source_table,source_record_id",
  }).select().single();
  if (error) throw error;
  return data as WorkItem;
}

export const PRIORITY_META: Record<string, { label: string; cls: string }> = {
  critical: { label: "Critical", cls: "bg-red-500/15 text-red-400 border-red-500/30" },
  urgent:   { label: "Urgent",   cls: "bg-orange-500/15 text-orange-300 border-orange-500/30" },
  high:     { label: "High",     cls: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30" },
  normal:   { label: "Normal",   cls: "bg-blue-500/15 text-blue-300 border-blue-500/30" },
  low:      { label: "Low",      cls: "bg-muted text-muted-foreground border-border/50" },
};

export const STATUS_META: Record<string, { label: string; cls: string }> = {
  new:               { label: "New",         cls: "bg-blue-500/15 text-blue-300 border-blue-500/30" },
  active:            { label: "Active",      cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  waiting_approval:  { label: "Waiting approval", cls: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30" },
  blocked:           { label: "Blocked",     cls: "bg-red-500/15 text-red-400 border-red-500/30" },
  completed:         { label: "Completed",   cls: "bg-muted text-muted-foreground border-border/50" },
  cancelled:         { label: "Cancelled",   cls: "bg-muted text-muted-foreground border-border/50" },
  parked:            { label: "Parked",      cls: "bg-muted text-muted-foreground border-border/50" },
};