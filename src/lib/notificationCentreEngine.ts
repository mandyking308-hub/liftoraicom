import { supabase } from "@/integrations/supabase/client";

export type Notification = {
  id: string;
  business_id: string | null;
  source_module: string;
  source_table: string | null;
  source_record_id: string | null;
  notification_type: string;
  title: string;
  message: string | null;
  severity: "info" | "low" | "medium" | "high" | "critical";
  priority: "low" | "normal" | "high" | "urgent" | "critical";
  notification_status: "new" | "seen" | "acknowledged" | "snoozed" | "resolved" | "archived";
  action_required: boolean;
  action_url: string | null;
  related_work_item_id: string | null;
  related_approval_item_id: string | null;
  due_at: string | null;
  snoozed_until: string | null;
  is_test_data: boolean;
  resolved_at: string | null;
  audit_metadata: any;
  created_at: string;
  updated_at: string;
};

export type Escalation = {
  id: string;
  business_id: string | null;
  notification_id: string | null;
  source_module: string;
  escalation_type: string;
  escalation_reason: string | null;
  severity: "low" | "medium" | "high" | "critical";
  escalation_status: "open" | "acknowledged" | "in_progress" | "resolved" | "cancelled";
  assigned_to_type: string;
  assigned_to: string | null;
  due_at: string | null;
  resolved_at: string | null;
  audit_metadata: any;
  created_at: string;
  updated_at: string;
};

export type NotificationRule = {
  id: string;
  rule_name: string;
  source_module: string;
  condition_json: any;
  severity: string;
  priority: string;
  create_work_item: boolean;
  create_escalation: boolean;
  escalation_type: string | null;
  suppress_duplicates_window_minutes: number;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export const OPEN_NOTIF_STATUSES: Notification["notification_status"][] = [
  "new", "seen", "acknowledged", "snoozed",
];

/** Source modules the Notification Centre ingests from. Missing tables fail gracefully. */
export const NOTIF_SOURCES: Array<{ module: string; table: string; label: string }> = [
  { module: "work_queue", table: "master_work_items", label: "Master Work Queue" },
  { module: "approval", table: "founder_approval_items", label: "Founder approval items" },
  { module: "ai_cost", table: "ai_cost_alerts", label: "AI cost alerts" },
  { module: "ai_runtime", table: "ai_runtime_events", label: "AI runtime events" },
  { module: "support", table: "support_tickets", label: "Support tickets" },
  { module: "complaint", table: "complaint_cases", label: "Complaints" },
  { module: "privacy", table: "privacy_requests", label: "Privacy requests" },
  { module: "incident", table: "incident_records", label: "Incidents" },
  { module: "delivery", table: "delivery_tasks", label: "Delivery tasks" },
  { module: "onboarding", table: "onboarding_records", label: "Onboarding records" },
  { module: "qtc_invoices", table: "qtc_invoices", label: "Invoices" },
  { module: "qtc_payments", table: "qtc_payments", label: "Payments" },
  { module: "sales_close", table: "customer_sales_close_actions", label: "Sales close actions" },
  { module: "upgrades", table: "customer_upgrade_opportunities", label: "Upgrade opportunities" },
  { module: "marketplace", table: "marketplace_growth_actions", label: "Marketplace actions" },
  { module: "seller_onboarding", table: "seller_onboarding_records", label: "Seller onboarding" },
  { module: "contract", table: "contract_obligations", label: "Contract obligations" },
  { module: "vendor", table: "vendor_subscriptions", label: "Vendor subscriptions" },
  { module: "data_quality", table: "data_quality_findings", label: "Data quality findings" },
  { module: "knowledge", table: "knowledge_conflicts", label: "Knowledge conflicts" },
  { module: "capacity", table: "bottleneck_alerts", label: "Capacity bottlenecks" },
  { module: "portfolio_risk", table: "portfolio_risk_items", label: "Portfolio risk items" },
  { module: "adviser", table: "adviser_questions", label: "Adviser questions" },
  { module: "product_bugs", table: "product_bugs", label: "Product bugs" },
];

export const SEVERITY_META: Record<string, { label: string; cls: string }> = {
  critical: { label: "Critical", cls: "bg-red-500/15 text-red-400 border-red-500/30" },
  high:     { label: "High",     cls: "bg-orange-500/15 text-orange-300 border-orange-500/30" },
  medium:   { label: "Medium",   cls: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30" },
  low:      { label: "Low",      cls: "bg-blue-500/15 text-blue-300 border-blue-500/30" },
  info:     { label: "Info",     cls: "bg-muted text-muted-foreground border-border/50" },
};

export const STATUS_META: Record<string, { label: string; cls: string }> = {
  new:          { label: "New",          cls: "bg-blue-500/15 text-blue-300 border-blue-500/30" },
  seen:         { label: "Seen",         cls: "bg-muted text-muted-foreground border-border/50" },
  acknowledged: { label: "Acknowledged", cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  snoozed:      { label: "Snoozed",      cls: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30" },
  resolved:     { label: "Resolved",     cls: "bg-muted text-muted-foreground border-border/50" },
  archived:     { label: "Archived",     cls: "bg-muted text-muted-foreground border-border/50" },
};

export async function fetchNotifications(filter?: {
  status?: Notification["notification_status"][];
  severity?: Notification["severity"][];
  source_module?: string;
  business_id?: string;
  limit?: number;
}): Promise<Notification[]> {
  const sb: any = supabase as any;
  let q = sb.from("unified_notifications").select("*");
  if (filter?.status) q = q.in("notification_status", filter.status);
  if (filter?.severity) q = q.in("severity", filter.severity);
  if (filter?.source_module) q = q.eq("source_module", filter.source_module);
  if (filter?.business_id) q = q.eq("business_id", filter.business_id);
  q = q.order("created_at", { ascending: false }).limit(filter?.limit ?? 500);
  const { data, error } = await q;
  if (error) return [];
  return (data ?? []) as Notification[];
}

export async function fetchEscalations(filter?: { status?: Escalation["escalation_status"][]; limit?: number }): Promise<Escalation[]> {
  const sb: any = supabase as any;
  let q = sb.from("escalation_records").select("*");
  if (filter?.status) q = q.in("escalation_status", filter.status);
  q = q.order("created_at", { ascending: false }).limit(filter?.limit ?? 500);
  const { data, error } = await q;
  if (error) return [];
  return (data ?? []) as Escalation[];
}

export async function fetchRules(): Promise<NotificationRule[]> {
  const sb: any = supabase as any;
  const { data, error } = await sb.from("notification_rules").select("*").order("rule_name");
  if (error) return [];
  return (data ?? []) as NotificationRule[];
}

export type NotifSummary = {
  total_open: number;
  new_count: number;
  critical: number;
  high: number;
  overdue: number;
  revenue_blocking: number;
  customer_risk: number;
  privacy_compliance: number;
  open_escalations: number;
  test_records: number;
  top_action: Notification | null;
};

const SEV_WEIGHT: Record<string, number> = { critical: 100, high: 70, medium: 40, low: 20, info: 10 };
const PRI_WEIGHT: Record<string, number> = { critical: 100, urgent: 80, high: 60, normal: 30, low: 10 };

export function rankNotification(n: Notification): number {
  const overdueBoost = n.due_at && Date.parse(n.due_at) < Date.now() ? 25 : 0;
  const actionBoost = n.action_required ? 15 : 0;
  return (SEV_WEIGHT[n.severity] ?? 0) + (PRI_WEIGHT[n.priority] ?? 0) + overdueBoost + actionBoost;
}

const REVENUE_TYPES = new Set(["revenue", "approval"]);
const REVENUE_MODULES = new Set(["sales_close", "qtc_invoices", "qtc_payments", "upgrades", "marketplace"]);
const CUSTOMER_TYPES = new Set(["customer", "delivery", "support"]);
const PRIVACY_TYPES = new Set(["privacy", "compliance"]);

export function summarize(items: Notification[], escalations: Escalation[] = []): NotifSummary {
  const live = items.filter(i => !i.is_test_data);
  const open = live.filter(i => OPEN_NOTIF_STATUSES.includes(i.notification_status));
  const now = Date.now();
  const critical = open.filter(i => i.severity === "critical" || i.priority === "critical").length;
  const high = open.filter(i => i.severity === "high" || i.priority === "urgent" || i.priority === "high").length;
  const overdue = open.filter(i => i.due_at && Date.parse(i.due_at) < now).length;
  const revenue_blocking = open.filter(i => REVENUE_TYPES.has(i.notification_type) || REVENUE_MODULES.has(i.source_module)).length;
  const customer_risk = open.filter(i => CUSTOMER_TYPES.has(i.notification_type)).length;
  const privacy_compliance = open.filter(i => PRIVACY_TYPES.has(i.notification_type)).length;
  const open_escalations = escalations.filter(e => e.escalation_status !== "resolved" && e.escalation_status !== "cancelled").length;
  const ranked = [...open].sort((a, b) => rankNotification(b) - rankNotification(a));
  return {
    total_open: open.length,
    new_count: open.filter(i => i.notification_status === "new").length,
    critical, high, overdue, revenue_blocking, customer_risk, privacy_compliance,
    open_escalations,
    test_records: items.filter(i => i.is_test_data).length,
    top_action: ranked[0] ?? null,
  };
}

export async function setStatus(id: string, status: Notification["notification_status"]) {
  const sb: any = supabase as any;
  const patch: any = { notification_status: status };
  if (status === "resolved") patch.resolved_at = new Date().toISOString();
  await sb.from("unified_notifications").update(patch).eq("id", id);
}

export async function snooze(id: string, hours: number) {
  const sb: any = supabase as any;
  await sb.from("unified_notifications").update({
    notification_status: "snoozed",
    snoozed_until: new Date(Date.now() + hours * 3600 * 1000).toISOString(),
  }).eq("id", id);
}

/** Idempotent ingestion: upsert by (source_module, source_table, source_record_id). */
export async function ingestNotification(row: Partial<Notification> & { source_module: string; notification_type: string; title: string }) {
  const sb: any = supabase as any;
  const { data, error } = await sb.from("unified_notifications").upsert(row, {
    onConflict: "source_module,source_table,source_record_id",
  }).select().single();
  if (error) throw error;
  return data as Notification;
}