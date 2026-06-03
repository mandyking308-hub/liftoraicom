import { supabase } from "@/integrations/supabase/client";
import type { ComplianceProfile, ApprovalTrigger } from "@/lib/businessComplianceEngine";

export type SystemType =
  | "agent" | "workflow" | "gateway" | "model_route" | "connector"
  | "automation" | "analytics" | "content_generation" | "outreach"
  | "support" | "finance" | "legal_tax" | "other";

export type AutonomyLevel =
  | "assistive" | "recommend_only" | "draft_only" | "approval_required"
  | "semi_autonomous" | "autonomous_internal" | "external_action_capable";

export type RiskLevel = "low" | "medium" | "high" | "critical";
export type SystemStatus = "live" | "paused" | "blocked" | "retired" | "under_review";

export type AIComplianceSystem = {
  id: string;
  business_id: string | null;
  system_name: string;
  system_type: SystemType;
  owner_role: string | null;
  provider: string | null;
  purpose: string | null;
  internal_or_external: "internal" | "external" | "mixed";
  autonomy_level: AutonomyLevel;
  uses_personal_data: boolean;
  uses_sensitive_data: boolean;
  handles_children_data: boolean;
  handles_health_data: boolean;
  handles_financial_data: boolean;
  handles_legal_data: boolean;
  external_action_capable: boolean;
  current_status: SystemStatus;
  risk_level: RiskLevel;
  founder_confirmed: boolean;
  last_reviewed_at: string | null;
  next_review_due_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type AIDataFlowRecord = {
  id: string;
  business_id: string | null;
  system_id: string | null;
  source_system: string;
  destination_system: string;
  data_categories: string[];
  personal_data: boolean;
  sensitive_data: boolean;
  children_data: boolean;
  lawful_basis: string | null;
  processor_or_controller_note: string | null;
  retention_period: string | null;
  storage_location: string | null;
  cross_border_transfer: boolean;
  transfer_jurisdiction: string | null;
  security_controls: string | null;
  founder_confirmed: boolean;
  review_status: "missing" | "draft" | "reviewed" | "approved" | "needs_adviser";
  created_at: string;
  updated_at: string;
};

export type AIHumanOversightRecord = {
  id: string;
  business_id: string | null;
  system_id: string | null;
  oversight_type:
    | "founder_approval" | "human_review" | "escalation"
    | "kill_switch" | "override" | "rejection" | "manual_check";
  trigger_source: string | null;
  trigger_reason: string | null;
  proposed_ai_action: string | null;
  human_decision: "approved" | "rejected" | "changed" | "escalated" | "parked";
  decided_by: string | null;
  decision_notes: string | null;
  external_action_blocked: boolean;
  evidence_url: string | null;
  created_at: string;
};

export type AIComplianceEvidenceItem = {
  id: string;
  business_id: string | null;
  system_id: string | null;
  evidence_type:
    | "policy" | "technical_manual" | "user_manual" | "audit_log"
    | "approval_log" | "data_flow" | "risk_assessment" | "vendor_record"
    | "incident_record" | "test_result" | "screenshot" | "export" | "other";
  title: string;
  summary: string | null;
  source_module: string | null;
  source_table: string | null;
  source_record_id: string | null;
  review_status: "missing" | "draft" | "current" | "stale" | "adviser_review_required";
  owner: string | null;
  next_review_due_at: string | null;
  created_at: string;
  updated_at: string;
};

export type AIComplianceGapAction = {
  id: string;
  business_id: string | null;
  system_id: string | null;
  gap_title: string;
  gap_description: string | null;
  severity: "info" | "low" | "medium" | "high" | "critical";
  source: string | null;
  required_action: string | null;
  action_owner: string | null;
  due_date: string | null;
  status: "open" | "in_progress" | "blocked" | "done" | "parked";
  founder_decision_required: boolean;
  created_at: string;
  updated_at: string;
};

/* ---------------- Risk classifier (deterministic) ---------------- */

const HIGH_AUTONOMY: AutonomyLevel[] = ["semi_autonomous", "autonomous_internal", "external_action_capable"];
const REGULATED_KEYWORDS = [
  "pricing","price","finance","financial","credit","loan","invoice","tax",
  "legal","contract","healthcare","health","medical","patient","education",
  "child","children","minor","employment","hiring","credit","identity",
  "kyc","safety","insurance","regulatory","regulated","claim",
];

export type RiskClassification = {
  level: RiskLevel;
  score: number;
  reasons: string[];
};

export function classifyRisk(
  s: Pick<AIComplianceSystem,
    | "autonomy_level" | "external_action_capable"
    | "uses_personal_data" | "uses_sensitive_data"
    | "handles_children_data" | "handles_health_data"
    | "handles_financial_data" | "handles_legal_data"
    | "founder_confirmed" | "next_review_due_at" | "purpose" | "internal_or_external"
  >,
  ctx?: { hasDataFlow?: boolean; hasOversight?: boolean }
): RiskClassification {
  let score = 0;
  const reasons: string[] = [];
  const add = (n: number, r: string) => { score += n; reasons.push(r); };

  if (s.external_action_capable) add(3, "Capable of taking external actions");
  if (HIGH_AUTONOMY.includes(s.autonomy_level)) add(2, `High autonomy (${s.autonomy_level})`);
  if (s.uses_sensitive_data) add(2, "Processes sensitive data");
  if (s.handles_children_data) add(3, "Handles children's data");
  if (s.handles_health_data) add(3, "Handles health data");
  if (s.handles_financial_data) add(2, "Handles financial data");
  if (s.handles_legal_data) add(2, "Handles legal data");
  if (s.uses_personal_data) add(1, "Processes personal data");
  if (s.internal_or_external !== "internal") add(1, "Has external surface");

  const purpose = (s.purpose ?? "").toLowerCase();
  if (purpose && REGULATED_KEYWORDS.some(k => purpose.includes(k))) {
    add(2, "Purpose touches a regulated domain");
  }

  if (!s.founder_confirmed) add(1, "Not founder-confirmed");
  if (!s.next_review_due_at) add(1, "No scheduled review");
  else if (new Date(s.next_review_due_at).getTime() < Date.now()) add(2, "Review overdue");

  if (ctx?.hasDataFlow === false) add(2, "No data-flow record");
  if (ctx?.hasOversight === false) add(1, "No human oversight events on record");

  let level: RiskLevel = "low";
  if (score >= 9) level = "critical";
  else if (score >= 6) level = "high";
  else if (score >= 3) level = "medium";

  return { level, score, reasons };
}

/* ---------------- Gap synthesis ---------------- */

export type SynthGap = Omit<AIComplianceGapAction, "id" | "created_at" | "updated_at">;

export function synthesizeGaps(input: {
  profiles: ComplianceProfile[];
  systems: AIComplianceSystem[];
  flows: AIDataFlowRecord[];
  oversight: AIHumanOversightRecord[];
  triggers: ApprovalTrigger[];
}): SynthGap[] {
  const { profiles, systems, flows, oversight, triggers } = input;
  const gaps: SynthGap[] = [];

  const sysByBiz = new Map<string, AIComplianceSystem[]>();
  for (const s of systems) {
    if (!s.business_id) continue;
    const arr = sysByBiz.get(s.business_id) ?? [];
    arr.push(s); sysByBiz.set(s.business_id, arr);
  }
  const flowsBySys = new Set(flows.map(f => f.system_id).filter(Boolean) as string[]);
  const oversightBySys = new Set(oversight.map(o => o.system_id).filter(Boolean) as string[]);
  const trigByBiz = new Map<string, ApprovalTrigger[]>();
  for (const t of triggers) {
    const arr = trigByBiz.get(t.business_id) ?? [];
    arr.push(t); trigByBiz.set(t.business_id, arr);
  }

  for (const p of profiles) {
    const sys = sysByBiz.get(p.business_id) ?? [];
    if ((p.compliance_risk_level === "critical" || p.compliance_risk_level === "high") && sys.length === 0) {
      gaps.push({
        business_id: p.business_id, system_id: null,
        gap_title: "No AI systems inventoried for high/critical-risk business",
        gap_description: "This business is classified high or critical risk but has no AI systems registered.",
        severity: "high", source: "business_compliance_profile",
        required_action: "Inventory every AI system, agent, workflow, gateway and connector touching this business.",
        action_owner: "founder", due_date: null, status: "open",
        founder_decision_required: true,
      });
    }
    if (sys.length > 0 && (trigByBiz.get(p.business_id) ?? []).length === 0) {
      gaps.push({
        business_id: p.business_id, system_id: null,
        gap_title: "No approval triggers configured",
        gap_description: "AI systems exist for this business but no approval triggers are defined.",
        severity: "medium", source: "compliance_approval_triggers",
        required_action: "Seed standard approval triggers under Business Compliance → Approval triggers.",
        action_owner: "founder", due_date: null, status: "open",
        founder_decision_required: true,
      });
    }
  }

  for (const s of systems) {
    if (!flowsBySys.has(s.id)) {
      gaps.push({
        business_id: s.business_id, system_id: s.id,
        gap_title: `Missing data-flow record: ${s.system_name}`,
        gap_description: "No data-flow record exists for this system.",
        severity: s.uses_personal_data || s.uses_sensitive_data ? "high" : "medium",
        source: "ai_data_flow_records",
        required_action: "Document source → destination, data categories, lawful basis and retention.",
        action_owner: "founder", due_date: null, status: "open",
        founder_decision_required: false,
      });
    }
    if ((s.uses_personal_data || s.uses_sensitive_data) && !oversightBySys.has(s.id)) {
      gaps.push({
        business_id: s.business_id, system_id: s.id,
        gap_title: `No oversight events: ${s.system_name}`,
        gap_description: "System handles personal/sensitive data but no human oversight events are recorded.",
        severity: "high", source: "ai_human_oversight_records",
        required_action: "Log at least one founder/human review or attach an approval log.",
        action_owner: "founder", due_date: null, status: "open",
        founder_decision_required: true,
      });
    }
    if (s.external_action_capable && s.business_id) {
      const trigs = trigByBiz.get(s.business_id) ?? [];
      if (trigs.length === 0) {
        gaps.push({
          business_id: s.business_id, system_id: s.id,
          gap_title: `External-action capable system without approval triggers: ${s.system_name}`,
          gap_description: "System can take external actions but no approval triggers gate it.",
          severity: "critical", source: "ai_compliance_systems",
          required_action: "Configure founder/legal/compliance approval triggers before this system runs live.",
          action_owner: "founder", due_date: null, status: "open",
          founder_decision_required: true,
        });
      }
    }
    if (!s.founder_confirmed) {
      gaps.push({
        business_id: s.business_id, system_id: s.id,
        gap_title: `System not founder-confirmed: ${s.system_name}`,
        gap_description: "Founder has not confirmed this system's inventory entry.",
        severity: "low", source: "ai_compliance_systems",
        required_action: "Review and confirm system inventory.",
        action_owner: "founder", due_date: null, status: "open",
        founder_decision_required: true,
      });
    }
    if (s.next_review_due_at && new Date(s.next_review_due_at).getTime() < Date.now()) {
      gaps.push({
        business_id: s.business_id, system_id: s.id,
        gap_title: `Review overdue: ${s.system_name}`,
        gap_description: `Scheduled review was due ${s.next_review_due_at}.`,
        severity: "medium", source: "ai_compliance_systems",
        required_action: "Re-review system and update next_review_due_at.",
        action_owner: "founder", due_date: s.next_review_due_at, status: "open",
        founder_decision_required: false,
      });
    }
  }

  return gaps;
}

/* ---------------- Summary ---------------- */

export function summarizeCompliance(input: {
  systems: AIComplianceSystem[];
  flows: AIDataFlowRecord[];
  oversight: AIHumanOversightRecord[];
  evidence: AIComplianceEvidenceItem[];
  gaps: AIComplianceGapAction[];
}) {
  const { systems, flows, oversight, evidence, gaps } = input;
  const now = Date.now();
  const nextReview = systems
    .map(s => s.next_review_due_at ? new Date(s.next_review_due_at).getTime() : null)
    .filter((n): n is number => n !== null && n > now)
    .sort((a, b) => a - b)[0];
  return {
    systems: systems.length,
    critical_or_high: systems.filter(s => s.risk_level === "critical" || s.risk_level === "high").length,
    external_action: systems.filter(s => s.external_action_capable).length,
    sensitive_data: systems.filter(s => s.uses_sensitive_data || s.handles_children_data || s.handles_health_data).length,
    data_flows: flows.length,
    open_gaps: gaps.filter(g => g.status === "open" || g.status === "in_progress").length,
    founder_approvals: oversight.filter(o => o.oversight_type === "founder_approval").length,
    evidence_current: evidence.filter(e => e.review_status === "current").length,
    evidence_total: evidence.length,
    next_review_due_at: nextReview ? new Date(nextReview).toISOString() : null,
  };
}

/* ---------------- Fetchers / writers ---------------- */

const sb = () => supabase as any;

export async function fetchSystems(): Promise<AIComplianceSystem[]> {
  const { data, error } = await sb().from("ai_compliance_systems").select("*").order("updated_at", { ascending: false });
  if (error) throw error; return data ?? [];
}
export async function upsertSystem(row: Partial<AIComplianceSystem>): Promise<AIComplianceSystem> {
  const { data, error } = await sb().from("ai_compliance_systems").upsert(row).select().single();
  if (error) throw error; return data;
}
export async function deleteSystem(id: string): Promise<void> {
  const { error } = await sb().from("ai_compliance_systems").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchFlows(): Promise<AIDataFlowRecord[]> {
  const { data, error } = await sb().from("ai_data_flow_records").select("*").order("updated_at", { ascending: false });
  if (error) throw error; return data ?? [];
}
export async function upsertFlow(row: Partial<AIDataFlowRecord>): Promise<AIDataFlowRecord> {
  const { data, error } = await sb().from("ai_data_flow_records").upsert(row).select().single();
  if (error) throw error; return data;
}
export async function deleteFlow(id: string): Promise<void> {
  const { error } = await sb().from("ai_data_flow_records").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchOversight(): Promise<AIHumanOversightRecord[]> {
  const { data, error } = await sb().from("ai_human_oversight_records").select("*").order("created_at", { ascending: false });
  if (error) throw error; return data ?? [];
}
export async function recordOversight(row: Partial<AIHumanOversightRecord>): Promise<AIHumanOversightRecord> {
  const { data, error } = await sb().from("ai_human_oversight_records").insert(row).select().single();
  if (error) throw error; return data;
}

export async function fetchEvidence(): Promise<AIComplianceEvidenceItem[]> {
  const { data, error } = await sb().from("ai_compliance_evidence_items").select("*").order("updated_at", { ascending: false });
  if (error) throw error; return data ?? [];
}
export async function upsertEvidence(row: Partial<AIComplianceEvidenceItem>): Promise<AIComplianceEvidenceItem> {
  const { data, error } = await sb().from("ai_compliance_evidence_items").upsert(row).select().single();
  if (error) throw error; return data;
}

export async function fetchGapActions(): Promise<AIComplianceGapAction[]> {
  const { data, error } = await sb().from("ai_compliance_gap_actions").select("*").order("created_at", { ascending: false });
  if (error) throw error; return data ?? [];
}
export async function upsertGapAction(row: Partial<AIComplianceGapAction>): Promise<AIComplianceGapAction> {
  const { data, error } = await sb().from("ai_compliance_gap_actions").upsert(row).select().single();
  if (error) throw error; return data;
}
export async function materialiseGaps(rows: SynthGap[]): Promise<number> {
  if (rows.length === 0) return 0;
  const { error, count } = await sb().from("ai_compliance_gap_actions").insert(rows, { count: "exact" });
  if (error) throw error;
  return count ?? rows.length;
}