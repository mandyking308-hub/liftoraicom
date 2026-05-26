import { supabase } from "@/integrations/supabase/client";

export type RiskStatus = "low" | "watch" | "high" | "critical";
export type ItemSeverity = "low" | "medium" | "high" | "critical";
export type ItemStatus = "open" | "acknowledged" | "resolved" | "accepted";

export const RISK_CATEGORIES = [
  "legal", "tax", "data_privacy", "ai_cost", "delivery", "customer",
  "reputation", "compliance", "cashflow", "integration", "dependency", "founder_overload",
] as const;
export type RiskCategory = typeof RISK_CATEGORIES[number];

export type RiskScore = {
  id: string;
  business_id: string;
  period_start: string;
  period_end: string;
  legal_risk: number;
  tax_risk: number;
  data_privacy_risk: number;
  ai_cost_risk: number;
  delivery_risk: number;
  customer_risk: number;
  reputation_risk: number;
  compliance_risk: number;
  cashflow_risk: number;
  integration_risk: number;
  dependency_risk: number;
  founder_overload_risk: number;
  total_risk_score: number;
  risk_status: RiskStatus;
  created_at: string;
  audit_metadata: Record<string, unknown>;
};

export type RiskItem = {
  id: string;
  business_id: string;
  risk_category: RiskCategory | string;
  risk_summary: string;
  severity: ItemSeverity;
  recommended_action: string | null;
  owner: string | null;
  status: ItemStatus;
  created_at: string;
  updated_at: string;
};

export type RiskSignals = {
  business_id: string;
  legal: number; tax: number; data_privacy: number; ai_cost: number;
  delivery: number; customer: number; reputation: number; compliance: number;
  cashflow: number; integration: number; dependency: number; founder_overload: number;
};

const clamp = (n: number, min = 0, max = 10) => Math.max(min, Math.min(max, n));

export function statusFor(total: number): RiskStatus {
  if (total >= 8) return "critical";
  if (total >= 6) return "high";
  if (total >= 4) return "watch";
  return "low";
}

export function computeRisk(s: RiskSignals) {
  const f = {
    legal_risk: clamp(s.legal),
    tax_risk: clamp(s.tax),
    data_privacy_risk: clamp(s.data_privacy),
    ai_cost_risk: clamp(s.ai_cost),
    delivery_risk: clamp(s.delivery),
    customer_risk: clamp(s.customer),
    reputation_risk: clamp(s.reputation),
    compliance_risk: clamp(s.compliance),
    cashflow_risk: clamp(s.cashflow),
    integration_risk: clamp(s.integration),
    dependency_risk: clamp(s.dependency),
    founder_overload_risk: clamp(s.founder_overload),
  };
  // Weighted: legal/tax/compliance/data-privacy/cashflow weighted higher
  const total =
    f.legal_risk * 0.13 +
    f.tax_risk * 0.11 +
    f.data_privacy_risk * 0.11 +
    f.compliance_risk * 0.12 +
    f.cashflow_risk * 0.11 +
    f.customer_risk * 0.08 +
    f.reputation_risk * 0.07 +
    f.delivery_risk * 0.07 +
    f.ai_cost_risk * 0.05 +
    f.integration_risk * 0.05 +
    f.dependency_risk * 0.05 +
    f.founder_overload_risk * 0.05;
  return { ...f, total_risk_score: Number(total.toFixed(2)), risk_status: statusFor(total) };
}

const sb = () => supabase as any;

export async function fetchRiskScores(): Promise<RiskScore[]> {
  const { data, error } = await sb().from("portfolio_risk_scores").select("*").order("created_at", { ascending: false });
  if (error) throw error; return data ?? [];
}
export async function fetchRiskItems(): Promise<RiskItem[]> {
  const { data, error } = await sb().from("portfolio_risk_items").select("*").order("created_at", { ascending: false });
  if (error) throw error; return data ?? [];
}

export async function scoreBusinessRisk(signals: RiskSignals): Promise<RiskScore> {
  const computed = computeRisk(signals);
  const row = {
    business_id: signals.business_id,
    ...computed,
    audit_metadata: { signals },
  };
  const { data, error } = await sb().from("portfolio_risk_scores").insert(row).select().single();
  if (error) throw error; return data as RiskScore;
}

export async function createRiskItem(input: {
  business_id: string; risk_category: RiskCategory | string; risk_summary: string;
  severity?: ItemSeverity; recommended_action?: string; owner?: string;
}): Promise<RiskItem> {
  const row = {
    business_id: input.business_id,
    risk_category: input.risk_category,
    risk_summary: input.risk_summary,
    severity: input.severity ?? "low",
    recommended_action: input.recommended_action ?? null,
    owner: input.owner ?? null,
    status: "open" as const,
  };
  const { data, error } = await sb().from("portfolio_risk_items").insert(row).select().single();
  if (error) throw error; return data as RiskItem;
}

export async function updateRiskItemStatus(id: string, status: ItemStatus): Promise<void> {
  const { error } = await sb().from("portfolio_risk_items").update({ status }).eq("id", id);
  if (error) throw error;
}

export function latestPerBusiness(scores: RiskScore[]): RiskScore[] {
  const map = new Map<string, RiskScore>();
  for (const s of scores) {
    const existing = map.get(s.business_id);
    if (!existing || new Date(s.created_at) > new Date(existing.created_at)) map.set(s.business_id, s);
  }
  return Array.from(map.values()).sort((a, b) => b.total_risk_score - a.total_risk_score);
}

export function summarize(scores: RiskScore[], items: RiskItem[]) {
  const latest = latestPerBusiness(scores);
  const byStatus = (s: RiskStatus) => latest.filter(x => x.risk_status === s).length;
  const openItems = items.filter(i => i.status === "open");
  return {
    businesses_scored: latest.length,
    critical: byStatus("critical"),
    high: byStatus("high"),
    watch: byStatus("watch"),
    low: byStatus("low"),
    avg_risk: latest.length ? Number((latest.reduce((a, s) => a + s.total_risk_score, 0) / latest.length).toFixed(2)) : 0,
    open_items: openItems.length,
    critical_items: openItems.filter(i => i.severity === "critical").length,
    high_items: openItems.filter(i => i.severity === "high").length,
  };
}

export function diagnose(scores: RiskScore[], items: RiskItem[]) {
  const out: Array<{ business_id: string; severity: "info" | "warn" | "block"; message: string }> = [];
  const latest = latestPerBusiness(scores);
  for (const s of latest) {
    if (s.risk_status === "critical") out.push({ business_id: s.business_id, severity: "block", message: "Critical portfolio risk — founder review required before any external action." });
    if (s.legal_risk >= 8) out.push({ business_id: s.business_id, severity: "block", message: "Legal risk extreme — adviser review required." });
    if (s.tax_risk >= 8) out.push({ business_id: s.business_id, severity: "block", message: "Tax risk extreme — accountant review required." });
    if (s.data_privacy_risk >= 8) out.push({ business_id: s.business_id, severity: "block", message: "Data-privacy risk extreme — pause external data flows pending review." });
    if (s.compliance_risk >= 7) out.push({ business_id: s.business_id, severity: "warn", message: "Compliance risk high — verify disclaimers/approvals before customer messaging." });
    if (s.cashflow_risk >= 7) out.push({ business_id: s.business_id, severity: "warn", message: "Cashflow risk high — restrict discretionary spend." });
    if (s.customer_risk >= 7) out.push({ business_id: s.business_id, severity: "warn", message: "Customer risk high — review delivery and support before outbound." });
    if (s.founder_overload_risk >= 8) out.push({ business_id: s.business_id, severity: "warn", message: "Founder overload — reduce concurrent priorities." });
  }
  for (const i of items.filter(i => i.status === "open" && i.severity === "critical")) {
    out.push({ business_id: i.business_id, severity: "block", message: `Critical ${i.risk_category} risk: ${i.risk_summary}` });
  }
  return out;
}

export const STATUS_META: Record<RiskStatus, { label: string; cls: string }> = {
  low: { label: "Low", cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  watch: { label: "Watch", cls: "bg-sky-500/15 text-sky-400 border-sky-500/30" },
  high: { label: "High", cls: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30" },
  critical: { label: "Critical", cls: "bg-destructive/15 text-destructive border-destructive/30" },
};

export const SEVERITY_META: Record<ItemSeverity, { label: string; cls: string }> = {
  low: { label: "Low", cls: "bg-muted text-muted-foreground border-border/50" },
  medium: { label: "Medium", cls: "bg-sky-500/15 text-sky-400 border-sky-500/30" },
  high: { label: "High", cls: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30" },
  critical: { label: "Critical", cls: "bg-destructive/15 text-destructive border-destructive/30" },
};

export const CATEGORY_LABEL: Record<string, string> = {
  legal: "Legal", tax: "Tax", data_privacy: "Data privacy", ai_cost: "AI cost",
  delivery: "Delivery", customer: "Customer", reputation: "Reputation",
  compliance: "Compliance", cashflow: "Cashflow", integration: "Integration",
  dependency: "Dependency", founder_overload: "Founder overload",
};

export const RISK_FIELDS: Array<{ key: keyof RiskScore; label: string; category: RiskCategory }> = [
  { key: "legal_risk", label: "Legal", category: "legal" },
  { key: "tax_risk", label: "Tax", category: "tax" },
  { key: "data_privacy_risk", label: "Data privacy", category: "data_privacy" },
  { key: "ai_cost_risk", label: "AI cost", category: "ai_cost" },
  { key: "delivery_risk", label: "Delivery", category: "delivery" },
  { key: "customer_risk", label: "Customer", category: "customer" },
  { key: "reputation_risk", label: "Reputation", category: "reputation" },
  { key: "compliance_risk", label: "Compliance", category: "compliance" },
  { key: "cashflow_risk", label: "Cashflow", category: "cashflow" },
  { key: "integration_risk", label: "Integration", category: "integration" },
  { key: "dependency_risk", label: "Dependency", category: "dependency" },
  { key: "founder_overload_risk", label: "Founder overload", category: "founder_overload" },
];

/** Map a risk category to the founder module that can mitigate it. */
export const CATEGORY_FIX_LINK: Record<string, { to: string; label: string }> = {
  legal: { to: "/founder/business-compliance", label: "Compliance Rules" },
  tax: { to: "/founder/finance", label: "Finance" },
  data_privacy: { to: "/founder/privacy", label: "Privacy" },
  ai_cost: { to: "/founder/ai-cost/budgets", label: "AI Cost Governor" },
  delivery: { to: "/founder/delivery", label: "Delivery" },
  customer: { to: "/founder/customer-success", label: "Customer Success" },
  reputation: { to: "/founder/social", label: "Social / Reputation" },
  compliance: { to: "/founder/business-compliance", label: "Compliance Rules" },
  cashflow: { to: "/founder/finance", label: "Finance" },
  integration: { to: "/founder/integration-map", label: "Integration Map" },
  dependency: { to: "/founder/vendor-management", label: "Vendor Management" },
  founder_overload: { to: "/founder/resource-allocation/founder-attention", label: "Founder Attention" },
};