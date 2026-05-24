import { supabase } from "@/integrations/supabase/client";

/**
 * AI Approval Gate.
 * Wraps the existing `founder_approval_items` table to handle AI-driven
 * approval requests. AI-specific fields (ledger id, task id, risk reason,
 * value at stake, cost) are stored inside metadata since the underlying
 * table is shared with other Liftor approval flows.
 *
 * No external sending happens here. This is approval infrastructure only.
 */

export type ApprovalStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "needs_changes"
  | "expired";

export type RiskLevel = "low" | "standard" | "high" | "critical";

/** Categories that ALWAYS require founder approval before any external/material action. */
export const APPROVAL_REQUIRED_CATEGORIES = [
  "legal_sensitive",
  "financial_sensitive",
  "compliance_sensitive",
  "valuation_analysis",
  "investor_analysis",
  "m_and_a_research",
  "acquisition_contact",
  "partnership_offer",
  "high_value_outbound_email",
  "contract_language",
  "public_reputation_sensitive",
  "external_sending",
] as const;

export type ApprovalCategory = (typeof APPROVAL_REQUIRED_CATEGORIES)[number] | string;

export function requiresHumanApproval(category: string | null | undefined, risk_level?: RiskLevel | null): boolean {
  if (!category) return false;
  if ((APPROVAL_REQUIRED_CATEGORIES as readonly string[]).includes(category)) return true;
  if (category === "founder_strategy" && (risk_level === "high" || risk_level === "critical")) return true;
  return false;
}

export function reasonForApproval(category: string, risk_level?: RiskLevel | null): string {
  const map: Record<string, string> = {
    legal_sensitive: "Legal-sensitive output requires founder review before any external use.",
    financial_sensitive: "Financial-sensitive output requires founder review.",
    compliance_sensitive: "Compliance-sensitive output requires founder review.",
    valuation_analysis: "Valuation analysis carries reputational and financial risk.",
    investor_analysis: "Investor-facing analysis must be founder approved.",
    m_and_a_research: "M&A research is confidential and high impact.",
    acquisition_contact: "Acquisition outreach must be approved before any contact.",
    partnership_offer: "Partnership offers commit Liftor to terms.",
    high_value_outbound_email: "High-value outbound email carries reputational risk.",
    contract_language: "Contract language must be founder approved.",
    public_reputation_sensitive: "Public reputation risk — founder approval required.",
    external_sending: "Any external send must be approved.",
    founder_strategy: "Strategy decision flagged high risk.",
  };
  return map[category] ?? `Category ${category} requires founder approval (risk: ${risk_level ?? "standard"}).`;
}

export interface CreateApprovalInput {
  business_id?: string | null;
  agent_id?: string | null;
  campaign_id?: string | null;
  task_id?: string | null;
  ai_usage_ledger_id?: string | null;
  approval_type: ApprovalCategory;
  risk_level: RiskLevel;
  title: string;
  summary?: string | null;
  proposed_action?: string | null;
  reason_approval_required?: string | null;
  estimated_cost?: number | null;
  value_at_stake?: number | null;
  draft_subject?: string | null;
  draft_body?: string | null;
}

export interface ApprovalRecord {
  id: string;
  business_id: string | null;
  agent_key: string | null;
  approval_type: string;
  status: ApprovalStatus;
  priority_level: string;
  title: string;
  summary: string | null;
  recommended_action: string | null;
  founder_notes: string | null;
  founder_decision: string | null;
  draft_subject: string | null;
  draft_body: string | null;
  metadata: Record<string, unknown>;
  risk_flags: Record<string, unknown>;
  created_at: string;
  decided_at: string | null;
  updated_at: string;
}

/** Create an approval request and (if provided) flag the ledger row as human_review_required. */
export async function createApprovalRequest(input: CreateApprovalInput): Promise<{ id: string }> {
  const priority_level =
    input.risk_level === "critical" ? "critical"
    : input.risk_level === "high" ? "high"
    : input.risk_level === "low" ? "low"
    : "standard";

  const metadata = {
    ai_usage_ledger_id: input.ai_usage_ledger_id ?? null,
    task_id: input.task_id ?? null,
    campaign_id: input.campaign_id ?? null,
    agent_id: input.agent_id ?? null,
    estimated_cost: input.estimated_cost ?? null,
    value_at_stake: input.value_at_stake ?? null,
    proposed_action: input.proposed_action ?? null,
    reason_approval_required:
      input.reason_approval_required ?? reasonForApproval(input.approval_type, input.risk_level),
    source: "ai_cost_governor",
  };

  const risk_flags = {
    risk_level: input.risk_level,
    external_action_blocked: true,
    requires_founder_review: true,
  };

  const { data, error } = await supabase
    .from("founder_approval_items")
    .insert({
      business_id: input.business_id ?? null,
      agent_key: input.agent_id ?? null,
      approval_type: input.approval_type,
      title: input.title,
      summary: input.summary ?? null,
      recommended_action: input.proposed_action ?? null,
      draft_subject: input.draft_subject ?? null,
      draft_body: input.draft_body ?? null,
      priority_level,
      status: "pending",
      send_allowed: false,
      execution_enabled: false,
      auto_execute_allowed: false,
      source_system: "ai_cost_governor",
      source_table: "ai_usage_ledger",
      source_id: input.ai_usage_ledger_id ?? null,
      metadata,
      risk_flags,
      compliance_flags: {},
    })
    .select("id")
    .single();
  if (error) throw error;

  if (input.ai_usage_ledger_id) {
    await supabase
      .from("ai_usage_ledger")
      .update({ status: "human_review_required", human_approved: false })
      .eq("id", input.ai_usage_ledger_id);
  }

  await maybeRaiseQueueOverloadAlert();

  return { id: data.id };
}

export interface DecideApprovalInput {
  approval_id: string;
  decision: "approved" | "rejected" | "needs_changes";
  founder_notes?: string | null;
  reviewed_by?: string | null;
}

/** Apply a founder decision and reflect it in the linked ledger entry. */
export async function decideApproval(input: DecideApprovalInput): Promise<void> {
  const { data: existing, error: fetchErr } = await supabase
    .from("founder_approval_items")
    .select("id,metadata,risk_flags,approval_type")
    .eq("id", input.approval_id)
    .single();
  if (fetchErr) throw fetchErr;

  const meta = (existing?.metadata as any) ?? {};
  const ledgerId: string | null = meta.ai_usage_ledger_id ?? null;

  const newStatus: ApprovalStatus =
    input.decision === "approved" ? "approved"
    : input.decision === "rejected" ? "rejected"
    : "needs_changes";

  const { error: updErr } = await supabase
    .from("founder_approval_items")
    .update({
      status: newStatus,
      founder_decision: input.decision,
      founder_notes: input.founder_notes ?? null,
      decided_at: new Date().toISOString(),
      metadata: { ...meta, reviewed_by: input.reviewed_by ?? null, decision_recorded_at: new Date().toISOString() },
      send_allowed: input.decision === "approved",
      execution_enabled: input.decision === "approved",
    })
    .eq("id", input.approval_id);
  if (updErr) throw updErr;

  if (ledgerId) {
    const ledgerPatch: Record<string, unknown> = {};
    if (input.decision === "approved") {
      ledgerPatch.status = "approved";
      ledgerPatch.human_approved = true;
    } else if (input.decision === "rejected") {
      ledgerPatch.status = "rejected";
      ledgerPatch.human_approved = false;
    } else {
      ledgerPatch.status = "human_review_required";
      ledgerPatch.human_approved = false;
    }
    ledgerPatch.audit_metadata = {
      approval_id: input.approval_id,
      decision: input.decision,
      reviewed_by: input.reviewed_by ?? null,
      founder_notes: input.founder_notes ?? null,
      decided_at: new Date().toISOString(),
    };
    await supabase.from("ai_usage_ledger").update(ledgerPatch).eq("id", ledgerId);
  }
}

/** Detect queue overload and create a cost alert if so. */
const OVERLOAD_THRESHOLDS = { warning: 25, high: 75 };
const STALE_HOURS = 24;

export async function maybeRaiseQueueOverloadAlert(): Promise<void> {
  const { count } = await supabase
    .from("founder_approval_items")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending")
    .eq("source_system", "ai_cost_governor");

  const pending = count ?? 0;
  if (pending < OVERLOAD_THRESHOLDS.warning) return;

  const severity = pending >= OVERLOAD_THRESHOLDS.high ? "high" : "warning";

  // dedupe: only one open alert of this type per day
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count: existing } = await supabase
    .from("ai_cost_alerts")
    .select("id", { count: "exact", head: true })
    .eq("alert_type", "human_review_queue_overloaded")
    .gte("created_at", since);
  if ((existing ?? 0) > 0) return;

  await supabase.from("ai_cost_alerts").insert({
    alert_type: "human_review_queue_overloaded",
    severity,
    recommended_action:
      "Pause lower-value AI tasks or reduce approval-generating workflows until queue is cleared.",
    audit_metadata: { pending_count: pending },
  } as any);
}

export async function listPendingApprovals(): Promise<ApprovalRecord[]> {
  const { data, error } = await supabase
    .from("founder_approval_items")
    .select("*")
    .eq("source_system", "ai_cost_governor")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []) as unknown as ApprovalRecord[];
}

export function isStale(record: ApprovalRecord): boolean {
  if (record.status !== "pending") return false;
  const ageMs = Date.now() - new Date(record.created_at).getTime();
  return ageMs > STALE_HOURS * 60 * 60 * 1000;
}

/** Convenience: gate an AI action and create an approval if required. Does NOT send anything. */
export async function gateAIAction(input: {
  business_id?: string | null;
  agent_id?: string | null;
  campaign_id?: string | null;
  task_id?: string | null;
  task_category: string;
  risk_level?: RiskLevel;
  ai_usage_ledger_id?: string | null;
  title: string;
  summary?: string;
  proposed_action?: string;
  estimated_cost?: number;
  value_at_stake?: number;
  draft_subject?: string;
  draft_body?: string;
}): Promise<{ allowed: boolean; approval_id?: string; reason: string }> {
  if (!requiresHumanApproval(input.task_category, input.risk_level ?? "standard")) {
    return { allowed: true, reason: "No approval required for this category." };
  }
  const reason = reasonForApproval(input.task_category, input.risk_level);
  const created = await createApprovalRequest({
    business_id: input.business_id ?? null,
    agent_id: input.agent_id ?? null,
    campaign_id: input.campaign_id ?? null,
    task_id: input.task_id ?? null,
    ai_usage_ledger_id: input.ai_usage_ledger_id ?? null,
    approval_type: input.task_category,
    risk_level: input.risk_level ?? "high",
    title: input.title,
    summary: input.summary ?? null,
    proposed_action: input.proposed_action ?? null,
    reason_approval_required: reason,
    estimated_cost: input.estimated_cost ?? null,
    value_at_stake: input.value_at_stake ?? null,
    draft_subject: input.draft_subject ?? null,
    draft_body: input.draft_body ?? null,
  });
  return { allowed: false, approval_id: created.id, reason };
}