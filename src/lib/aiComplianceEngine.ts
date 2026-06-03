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

/* ---------------- Module scan registry (idempotent backfill) ---------------- */

export type ModuleSeed = {
  /** stable canonical name used as the lookup key in ai_compliance_systems.system_name */
  key: string;
  system_type: SystemType;
  autonomy_level: AutonomyLevel;
  internal_or_external: "internal" | "external" | "mixed";
  external_action_capable: boolean;
  uses_personal_data: boolean;
  uses_sensitive_data: boolean;
  handles_children_data?: boolean;
  handles_health_data?: boolean;
  handles_financial_data?: boolean;
  handles_legal_data?: boolean;
  default_risk: RiskLevel;
  purpose: string;
  owner_role?: string;
  current_status?: SystemStatus;
};

/**
 * Conservative defaults. External-action-capable modules default to high/critical.
 * Outreach / publishing / payments / contracts / pricing / data export must be high+ unless founder-confirmed otherwise.
 * Records are inserted with founder_confirmed=false and current_status='under_review'.
 */
export const MODULE_SCAN_REGISTRY: ModuleSeed[] = [
  { key: "AI Gateway", system_type: "gateway", autonomy_level: "approval_required", internal_or_external: "internal", external_action_capable: false, uses_personal_data: true, uses_sensitive_data: false, default_risk: "medium", purpose: "Routes AI model requests across providers." },
  { key: "Liftor Brain", system_type: "agent", autonomy_level: "recommend_only", internal_or_external: "internal", external_action_capable: false, uses_personal_data: true, uses_sensitive_data: true, default_risk: "high", purpose: "Central reasoning, strategy and decision support for founder." },
  { key: "AI Usage Ledger", system_type: "analytics", autonomy_level: "assistive", internal_or_external: "internal", external_action_capable: false, uses_personal_data: false, uses_sensitive_data: false, default_risk: "low", purpose: "Records AI request usage, cost and provider routing." },
  { key: "AI Approval Gates", system_type: "workflow", autonomy_level: "approval_required", internal_or_external: "internal", external_action_capable: false, uses_personal_data: true, uses_sensitive_data: false, default_risk: "medium", purpose: "Enforces founder/human approval before sensitive or external actions." },
  { key: "AI Security Centre", system_type: "analytics", autonomy_level: "assistive", internal_or_external: "internal", external_action_capable: false, uses_personal_data: true, uses_sensitive_data: true, default_risk: "high", purpose: "Detects misuse, leakage and security anomalies across AI surfaces." },
  { key: "AI Queue Control", system_type: "workflow", autonomy_level: "approval_required", internal_or_external: "internal", external_action_capable: false, uses_personal_data: false, uses_sensitive_data: false, default_risk: "medium", purpose: "Holds and releases queued AI jobs with rate and safety controls." },
  { key: "AI Live Operations", system_type: "automation", autonomy_level: "semi_autonomous", internal_or_external: "internal", external_action_capable: false, uses_personal_data: true, uses_sensitive_data: false, default_risk: "high", purpose: "Runs continuous AI operational loops across businesses." },
  { key: "Agent Capabilities", system_type: "agent", autonomy_level: "recommend_only", internal_or_external: "internal", external_action_capable: false, uses_personal_data: false, uses_sensitive_data: false, default_risk: "medium", purpose: "Catalogue of agent skills and tool grants." },
  { key: "Business Compliance Rules", system_type: "workflow", autonomy_level: "approval_required", internal_or_external: "internal", external_action_capable: false, uses_personal_data: true, uses_sensitive_data: true, default_risk: "high", purpose: "Per-business compliance profile, triggers and adviser flags." },
  { key: "Privacy", system_type: "workflow", autonomy_level: "approval_required", internal_or_external: "internal", external_action_capable: false, uses_personal_data: true, uses_sensitive_data: true, default_risk: "high", purpose: "Privacy posture, DSAR, retention and processors register." },
  { key: "Incidents", system_type: "workflow", autonomy_level: "approval_required", internal_or_external: "internal", external_action_capable: false, uses_personal_data: true, uses_sensitive_data: true, default_risk: "high", purpose: "Incident intake, severity classification and escalation." },
  { key: "Audit Ledger", system_type: "analytics", autonomy_level: "assistive", internal_or_external: "internal", external_action_capable: false, uses_personal_data: true, uses_sensitive_data: false, default_risk: "medium", purpose: "Append-only audit ledger of system actions and approvals." },
  { key: "Policies", system_type: "legal_tax", autonomy_level: "approval_required", internal_or_external: "internal", external_action_capable: false, uses_personal_data: false, uses_sensitive_data: false, default_risk: "medium", purpose: "Internal and public policy and legal page versions." },
  { key: "Connectors", system_type: "connector", autonomy_level: "approval_required", internal_or_external: "external", external_action_capable: false, uses_personal_data: true, uses_sensitive_data: false, default_risk: "high", purpose: "Third-party integration registry and credentials." },
  { key: "Scheduled Jobs", system_type: "automation", autonomy_level: "semi_autonomous", internal_or_external: "internal", external_action_capable: false, uses_personal_data: false, uses_sensitive_data: false, default_risk: "medium", purpose: "Cron/scheduled job control and observability." },
  { key: "Data Ingestion Centre", system_type: "automation", autonomy_level: "approval_required", internal_or_external: "external", external_action_capable: false, uses_personal_data: true, uses_sensitive_data: true, default_risk: "high", purpose: "Ingests external data sources into Liftor systems." },
  { key: "Smartlead Outreach", system_type: "outreach", autonomy_level: "external_action_capable", internal_or_external: "external", external_action_capable: true, uses_personal_data: true, uses_sensitive_data: false, default_risk: "critical", purpose: "Outbound email outreach campaign delivery (founder approval-gated)." },
  { key: "Apollo Lead Sourcing", system_type: "connector", autonomy_level: "approval_required", internal_or_external: "external", external_action_capable: true, uses_personal_data: true, uses_sensitive_data: false, default_risk: "high", purpose: "Sources prospects via Apollo (founder approval-gated)." },
  { key: "Social Publishing (Metricool)", system_type: "outreach", autonomy_level: "external_action_capable", internal_or_external: "external", external_action_capable: true, uses_personal_data: false, uses_sensitive_data: false, default_risk: "critical", purpose: "Public social media publishing (founder approval-gated)." },
  { key: "Revenue Autopilot", system_type: "finance", autonomy_level: "approval_required", internal_or_external: "internal", external_action_capable: false, uses_personal_data: true, uses_sensitive_data: false, handles_financial_data: true, default_risk: "high", purpose: "Revenue automation and pricing intelligence." },
  { key: "Customer Sales", system_type: "workflow", autonomy_level: "approval_required", internal_or_external: "internal", external_action_capable: false, uses_personal_data: true, uses_sensitive_data: false, handles_financial_data: true, default_risk: "high", purpose: "Customer sales pipeline and proposal generation." },
  { key: "Quote to Cash", system_type: "finance", autonomy_level: "approval_required", internal_or_external: "internal", external_action_capable: false, uses_personal_data: true, uses_sensitive_data: false, handles_financial_data: true, handles_legal_data: true, default_risk: "high", purpose: "Quote, contract and invoice flow." },
  { key: "M&A Portfolio Exit Intelligence", system_type: "analytics", autonomy_level: "recommend_only", internal_or_external: "internal", external_action_capable: false, uses_personal_data: true, uses_sensitive_data: true, handles_financial_data: true, handles_legal_data: true, default_risk: "critical", purpose: "M&A, valuation and exit intelligence — strictly confidential." },
];

export type ScanResult = {
  inserted: number;
  updated: number;
  skipped: number;
  details: { key: string; action: "inserted" | "updated" | "skipped"; reason?: string }[];
};

/**
 * Idempotent inventory backfill. Founder-only.
 * - Looks up by system_name === key (global rows: business_id IS NULL).
 * - Inserts when missing.
 * - Updates ONLY missing/blank fields when found AND founder_confirmed = false.
 * - Never overwrites a founder-confirmed record.
 */
export async function scanInternalModules(): Promise<ScanResult> {
  const existing = await fetchSystems();
  const byKey = new Map<string, AIComplianceSystem>();
  for (const s of existing) {
    if (s.business_id == null) byKey.set(s.system_name, s);
  }
  const out: ScanResult = { inserted: 0, updated: 0, skipped: 0, details: [] };

  for (const seed of MODULE_SCAN_REGISTRY) {
    const found = byKey.get(seed.key);
    if (!found) {
      const row: Partial<AIComplianceSystem> = {
        business_id: null,
        system_name: seed.key,
        system_type: seed.system_type,
        owner_role: seed.owner_role ?? "founder",
        provider: null,
        purpose: seed.purpose,
        internal_or_external: seed.internal_or_external,
        autonomy_level: seed.autonomy_level,
        uses_personal_data: !!seed.uses_personal_data,
        uses_sensitive_data: !!seed.uses_sensitive_data,
        handles_children_data: !!seed.handles_children_data,
        handles_health_data: !!seed.handles_health_data,
        handles_financial_data: !!seed.handles_financial_data,
        handles_legal_data: !!seed.handles_legal_data,
        external_action_capable: !!seed.external_action_capable,
        current_status: seed.current_status ?? "under_review",
        risk_level: seed.default_risk,
        founder_confirmed: false,
      };
      await upsertSystem(row);
      out.inserted++;
      out.details.push({ key: seed.key, action: "inserted" });
      continue;
    }
    if (found.founder_confirmed) {
      out.skipped++;
      out.details.push({ key: seed.key, action: "skipped", reason: "founder-confirmed; not overwritten" });
      continue;
    }
    const patch: Partial<AIComplianceSystem> = { id: found.id };
    let changed = false;
    const fill = <K extends keyof AIComplianceSystem>(k: K, v: AIComplianceSystem[K], blankOk: (cur: AIComplianceSystem[K]) => boolean) => {
      if (blankOk(found[k])) { (patch as any)[k] = v; changed = true; }
    };
    fill("purpose", seed.purpose as any, c => !c);
    fill("system_type", seed.system_type as any, c => !c || c === "other");
    fill("autonomy_level", seed.autonomy_level as any, c => !c);
    fill("internal_or_external", seed.internal_or_external as any, c => !c);
    fill("owner_role", (seed.owner_role ?? "founder") as any, c => !c);
    // Risk: only raise, never lower automatically.
    const rank: Record<RiskLevel, number> = { low: 0, medium: 1, high: 2, critical: 3 };
    if (rank[seed.default_risk] > rank[found.risk_level]) {
      (patch as any).risk_level = seed.default_risk; changed = true;
    }
    if (changed) {
      await upsertSystem(patch);
      out.updated++;
      out.details.push({ key: seed.key, action: "updated" });
    } else {
      out.skipped++;
      out.details.push({ key: seed.key, action: "skipped", reason: "already complete" });
    }
  }
  return out;
}

/* ---------------- Extended gap synthesis (hardened, idempotent) ---------------- */

const STALE_REVIEW_DAYS = 180;
const REGULATED_DATA = (s: AIComplianceSystem) =>
  s.uses_sensitive_data || s.handles_children_data || s.handles_health_data ||
  s.handles_financial_data || s.handles_legal_data;

export function synthesizeGapsExtended(input: {
  profiles: ComplianceProfile[];
  systems: AIComplianceSystem[];
  flows: AIDataFlowRecord[];
  oversight: AIHumanOversightRecord[];
  evidence: AIComplianceEvidenceItem[];
  triggers: ApprovalTrigger[];
}): SynthGap[] {
  const base = synthesizeGaps({
    profiles: input.profiles, systems: input.systems,
    flows: input.flows, oversight: input.oversight, triggers: input.triggers,
  });
  const extra: SynthGap[] = [];
  const { systems, evidence } = input;

  if (systems.length === 0) {
    extra.push({
      business_id: null, system_id: null,
      gap_title: "No AI systems inventoried",
      gap_description: "Run a module scan or add systems manually.",
      severity: "high", source: "module_scan",
      required_action: "Run Module Scan or add systems in AI Compliance → Systems.",
      action_owner: "founder", due_date: null, status: "open",
      founder_decision_required: true,
    });
  }

  const evBySys = new Map<string, AIComplianceEvidenceItem[]>();
  for (const e of evidence) {
    if (!e.system_id) continue;
    const arr = evBySys.get(e.system_id) ?? []; arr.push(e); evBySys.set(e.system_id, arr);
  }
  const evidenceTypes = new Set(evidence.map(e => e.evidence_type));

  for (const s of systems) {
    if ((s.risk_level === "critical" || s.risk_level === "high") && !s.founder_confirmed) {
      extra.push({
        business_id: s.business_id, system_id: s.id,
        gap_title: `High/critical system not founder-confirmed: ${s.system_name}`,
        gap_description: "High/critical risk system has not been confirmed by the founder.",
        severity: "high", source: "ai_compliance_systems",
        required_action: "Founder must review and confirm system inventory entry.",
        action_owner: "founder", due_date: null, status: "open",
        founder_decision_required: true,
      });
    }
    if (!s.next_review_due_at) {
      extra.push({
        business_id: s.business_id, system_id: s.id,
        gap_title: `No next-review date: ${s.system_name}`,
        gap_description: "System has no scheduled review.",
        severity: "low", source: "ai_compliance_systems",
        required_action: "Set a next review date.",
        action_owner: "founder", due_date: null, status: "open",
        founder_decision_required: false,
      });
    } else if (s.last_reviewed_at && (Date.now() - new Date(s.last_reviewed_at).getTime()) > STALE_REVIEW_DAYS * 86400000) {
      extra.push({
        business_id: s.business_id, system_id: s.id,
        gap_title: `Stale review: ${s.system_name}`,
        gap_description: `Last reviewed > ${STALE_REVIEW_DAYS} days ago.`,
        severity: "medium", source: "ai_compliance_systems",
        required_action: "Re-review system and update review dates.",
        action_owner: "founder", due_date: null, status: "open",
        founder_decision_required: false,
      });
    }
    if ((s.risk_level === "critical" || s.risk_level === "high") && (evBySys.get(s.id) ?? []).length === 0) {
      extra.push({
        business_id: s.business_id, system_id: s.id,
        gap_title: `Evidence pack missing for high/critical system: ${s.system_name}`,
        gap_description: "No evidence items attached to this system.",
        severity: "high", source: "ai_compliance_evidence_items",
        required_action: "Attach evidence (policy, audit, approval log, data flow).",
        action_owner: "founder", due_date: null, status: "open",
        founder_decision_required: true,
      });
    }
    if (REGULATED_DATA(s) && (evBySys.get(s.id) ?? []).filter(e => e.evidence_type === "risk_assessment" || e.evidence_type === "approval_log").length === 0) {
      extra.push({
        business_id: s.business_id, system_id: s.id,
        gap_title: `No review evidence for regulated-data system: ${s.system_name}`,
        gap_description: "Regulated data (health/finance/legal/children) without review evidence.",
        severity: "critical", source: "ai_compliance_evidence_items",
        required_action: "Attach a risk assessment or approval log; consider adviser review.",
        action_owner: "founder", due_date: null, status: "open",
        founder_decision_required: true,
      });
    }
    if (s.external_action_capable && (evBySys.get(s.id) ?? []).filter(e => e.evidence_type === "approval_log" || e.evidence_type === "audit_log").length === 0) {
      extra.push({
        business_id: s.business_id, system_id: s.id,
        gap_title: `External-action system without oversight evidence: ${s.system_name}`,
        gap_description: "External-action capable system has no oversight/approval evidence.",
        severity: "critical", source: "ai_human_oversight_records",
        required_action: "Attach approval log or audit log proving founder oversight.",
        action_owner: "founder", due_date: null, status: "open",
        founder_decision_required: true,
      });
    }
  }

  const has = (t: string) => evidenceTypes.has(t as any);
  if (!has("policy")) {
    extra.push({
      business_id: null, system_id: null,
      gap_title: "No policy evidence registered",
      gap_description: "No AI usage / privacy / security / automation safety policy evidence on file.",
      severity: "medium", source: "policies",
      required_action: "Attach links to current policies in Evidence Pack.",
      action_owner: "founder", due_date: null, status: "open",
      founder_decision_required: false,
    });
  }
  if (!has("incident_record")) {
    extra.push({
      business_id: null, system_id: null,
      gap_title: "No incident escalation evidence",
      gap_description: "No evidence of incident escalation paths for AI harm, wrong-send, data leak, hallucinated claim or external-action failure.",
      severity: "high", source: "incidents",
      required_action: "Attach escalation path evidence to Evidence Pack.",
      action_owner: "founder", due_date: null, status: "open",
      founder_decision_required: true,
    });
  }

  // Dedupe by stable key — never emit two synthesised rows for the same gap.
  const seen = new Set<string>();
  const all = [...base, ...extra].filter(g => {
    const k = gapDedupKey(g);
    if (seen.has(k)) return false;
    seen.add(k); return true;
  });
  return all;
}

export function gapDedupKey(g: Pick<SynthGap, "business_id" | "system_id" | "gap_title">): string {
  return `${g.business_id ?? "_"}|${g.system_id ?? "_"}|${g.gap_title}`;
}

/**
 * Materialise only synth gaps that don't already exist as open/in_progress/blocked rows.
 * Done/parked gaps are NOT reopened automatically.
 */
export async function materialiseGapsIdempotent(synth: SynthGap[]): Promise<{ inserted: number; skipped: number }> {
  if (synth.length === 0) return { inserted: 0, skipped: 0 };
  const existing = await fetchGapActions();
  const active = new Set(existing.filter(g => g.status !== "done" && g.status !== "parked").map(gapDedupKey));
  const fresh = synth.filter(s => !active.has(gapDedupKey(s)));
  if (fresh.length === 0) return { inserted: 0, skipped: synth.length };
  const { error } = await sb().from("ai_compliance_gap_actions").insert(fresh);
  if (error) throw error;
  return { inserted: fresh.length, skipped: synth.length - fresh.length };
}

/* ---------------- Command Centre aggregator ---------------- */

export type CommandCentreStatus = "clear" | "needs_review" | "blocked";

export type CommandCentreSummary = {
  status: CommandCentreStatus;
  systems: number;
  critical_or_high: number;
  external_action: number;
  sensitive_data: number;
  open_gaps: number;
  founder_decisions_required: number;
  next_review_due_at: string | null;
  blocking_reasons: string[];
  founder_items: {
    title: string;
    severity: SynthGap["severity"];
    source: string | null;
    business_id: string | null;
    system_id: string | null;
    due_date: string | null;
  }[];
  /** Persisted (tracked) gap rows that are open or in_progress. */
  materialised_gaps: number;
  /** Live-computed review items synthesised from current state. */
  computed_review_items: number;
  /** Count of blocking reasons (external-action without oversight, sensitive without flow, etc.). */
  blocking_issues: number;
  /** Top three founder items, oldest-style preview for Command Centre. */
  top_items: CommandCentreSummary["founder_items"];
};

export function aggregateCommandCentre(input: {
  systems: AIComplianceSystem[];
  flows: AIDataFlowRecord[];
  oversight: AIHumanOversightRecord[];
  evidence: AIComplianceEvidenceItem[];
  gaps: AIComplianceGapAction[];
  profiles: ComplianceProfile[];
  triggers: ApprovalTrigger[];
}): CommandCentreSummary {
  const { systems, flows, oversight, evidence, gaps, profiles, triggers } = input;
  const sum = summarizeCompliance({ systems, flows, oversight, evidence, gaps });
  const synth = synthesizeGapsExtended({ profiles, systems, flows, oversight, evidence, triggers });

  const flowsBySys = new Set(flows.map(f => f.system_id).filter(Boolean) as string[]);
  const oversightBySys = new Set(oversight.map(o => o.system_id).filter(Boolean) as string[]);

  const founder_items_src: SynthGap[] = [
    ...gaps
      .filter(g => (g.founder_decision_required || g.severity === "critical" || g.severity === "high") &&
                   g.status !== "done" && g.status !== "parked")
      .map(g => ({
        business_id: g.business_id, system_id: g.system_id,
        gap_title: g.gap_title, gap_description: g.gap_description,
        severity: g.severity, source: g.source,
        required_action: g.required_action, action_owner: g.action_owner,
        due_date: g.due_date, status: g.status,
        founder_decision_required: g.founder_decision_required,
      })),
    ...synth.filter(s => s.founder_decision_required || s.severity === "critical" || s.severity === "high"),
    ...systems
      .filter(s => (s.risk_level === "critical" || s.risk_level === "high") && !s.founder_confirmed)
      .map(s => ({
        business_id: s.business_id, system_id: s.id,
        gap_title: `Confirm high/critical system: ${s.system_name}`,
        gap_description: null, severity: "high" as const,
        source: "ai_compliance_systems", required_action: "Founder confirmation required.",
        action_owner: "founder", due_date: null, status: "open" as const,
        founder_decision_required: true,
      })),
    ...systems
      .filter(s => (s.uses_sensitive_data || s.handles_children_data || s.handles_health_data) && !flowsBySys.has(s.id))
      .map(s => ({
        business_id: s.business_id, system_id: s.id,
        gap_title: `Sensitive-data system without data-flow: ${s.system_name}`,
        gap_description: null, severity: "critical" as const,
        source: "ai_data_flow_records", required_action: "Document data flow.",
        action_owner: "founder", due_date: null, status: "open" as const,
        founder_decision_required: true,
      })),
    ...systems
      .filter(s => s.external_action_capable && !oversightBySys.has(s.id))
      .map(s => ({
        business_id: s.business_id, system_id: s.id,
        gap_title: `External-action system without oversight: ${s.system_name}`,
        gap_description: null, severity: "critical" as const,
        source: "ai_human_oversight_records", required_action: "Attach approval/oversight evidence.",
        action_owner: "founder", due_date: null, status: "open" as const,
        founder_decision_required: true,
      })),
  ];

  // Dedupe.
  const seen = new Set<string>();
  const founder_items = founder_items_src
    .filter(g => { const k = gapDedupKey(g); if (seen.has(k)) return false; seen.add(k); return true; })
    .map(g => ({
      title: g.gap_title, severity: g.severity, source: g.source,
      business_id: g.business_id, system_id: g.system_id, due_date: g.due_date,
    }));

  const blocking_reasons: string[] = [];
  for (const s of systems) {
    if (s.external_action_capable && !oversightBySys.has(s.id))
      blocking_reasons.push(`External-action system without oversight: ${s.system_name}`);
    if ((s.uses_sensitive_data || s.handles_children_data || s.handles_health_data) && !flowsBySys.has(s.id))
      blocking_reasons.push(`Sensitive-data system without data-flow: ${s.system_name}`);
  }

  let status: CommandCentreStatus = "clear";
  const criticalActive = gaps.some(g => g.severity === "critical" && g.status !== "done" && g.status !== "parked");
  if (blocking_reasons.length > 0 || criticalActive) status = "blocked";
  else if (sum.open_gaps > 0 || founder_items.length > 0 || systems.length === 0) status = "needs_review";

  return {
    status,
    systems: sum.systems,
    critical_or_high: sum.critical_or_high,
    external_action: sum.external_action,
    sensitive_data: sum.sensitive_data,
    open_gaps: sum.open_gaps,
    founder_decisions_required: founder_items.length,
    next_review_due_at: sum.next_review_due_at,
    blocking_reasons: Array.from(new Set(blocking_reasons)),
    founder_items: founder_items.slice(0, 25),
    materialised_gaps: sum.open_gaps,
    computed_review_items: synth.length,
    blocking_issues: new Set(blocking_reasons).size,
    top_items: founder_items.slice(0, 3),
  };
}

/* ---------------- Evidence roll-up ---------------- */

export type EvidenceCategory =
  | "ai_gateway" | "ai_usage_ledger" | "approval_gates" | "audit_ledger"
  | "business_compliance" | "privacy" | "incidents" | "policies"
  | "security_access" | "connectors" | "scheduled_jobs"
  | "external_action_gates" | "technical_manual" | "user_manual" | "other";

export type EvidenceRollupRow = {
  category: EvidenceCategory;
  label: string;
  count: number;
  current: number;
  stale: number;
  missing: boolean;
};

const EVIDENCE_CATEGORY_MAP: { category: EvidenceCategory; label: string; match: (e: AIComplianceEvidenceItem) => boolean }[] = [
  { category: "ai_gateway", label: "AI Gateway requests", match: e => /gateway/i.test(e.source_module ?? "") },
  { category: "ai_usage_ledger", label: "AI usage ledger", match: e => /usage/i.test(e.source_module ?? "") },
  { category: "approval_gates", label: "Approval gates", match: e => e.evidence_type === "approval_log" || /approval/i.test(e.source_module ?? "") },
  { category: "audit_ledger", label: "Audit ledger", match: e => e.evidence_type === "audit_log" || /audit/i.test(e.source_module ?? "") },
  { category: "business_compliance", label: "Business compliance profiles/rules/triggers", match: e => /compliance/i.test(e.source_module ?? "") },
  { category: "privacy", label: "Privacy / DSAR / retention / processors", match: e => /privacy|dsar|retention|processor/i.test(`${e.source_module ?? ""} ${e.title}`) },
  { category: "incidents", label: "Incidents", match: e => e.evidence_type === "incident_record" || /incident/i.test(e.source_module ?? "") },
  { category: "policies", label: "Policies / legal pages", match: e => e.evidence_type === "policy" },
  { category: "security_access", label: "Security / access governance", match: e => /security|access/i.test(e.source_module ?? "") },
  { category: "connectors", label: "Connectors / vendor records", match: e => e.evidence_type === "vendor_record" || /connector|vendor/i.test(e.source_module ?? "") },
  { category: "scheduled_jobs", label: "Scheduled jobs / cron controls", match: e => /schedul|cron/i.test(`${e.source_module ?? ""} ${e.title}`) },
  { category: "external_action_gates", label: "External action gates", match: e => /external|smartlead|metricool|apollo|publish/i.test(`${e.source_module ?? ""} ${e.title}`) },
  { category: "technical_manual", label: "Technical manual references", match: e => e.evidence_type === "technical_manual" },
  { category: "user_manual", label: "User manual references", match: e => e.evidence_type === "user_manual" },
];

export function rollupEvidence(evidence: AIComplianceEvidenceItem[]): EvidenceRollupRow[] {
  const out: EvidenceRollupRow[] = [];
  for (const { category, label, match } of EVIDENCE_CATEGORY_MAP) {
    const items = evidence.filter(match);
    out.push({
      category, label,
      count: items.length,
      current: items.filter(i => i.review_status === "current").length,
      stale: items.filter(i => i.review_status === "stale").length,
      missing: items.length === 0,
    });
  }
  return out;
}

/* ---------------- Baseline draft data-flow records ---------------- */

export type BaselineFlowTemplate = {
  source_system: string;
  destination_system: string;
  data_categories: string[];
  personal_data: boolean;
  sensitive_data: boolean;
  lawful_basis: string;
  retention_period: string;
  storage_location: string;
  cross_border_transfer: boolean;
  security_controls: string;
};

const DEFAULT_BASELINE: BaselineFlowTemplate = {
  source_system: "Liftor internal module",
  destination_system: "Liftor internal module",
  data_categories: ["to be confirmed by founder/adviser"],
  personal_data: false,
  sensitive_data: false,
  lawful_basis: "to be confirmed by founder/adviser",
  retention_period: "to be confirmed by founder/adviser",
  storage_location: "Lovable Cloud (EU) — to be confirmed by founder/adviser",
  cross_border_transfer: false,
  security_controls: "RLS, founder-only access, audit ledger — to be confirmed",
};

/** Conservative draft template per system name (key matches MODULE_SCAN_REGISTRY). */
export const BASELINE_FLOW_TEMPLATES: Record<string, Partial<BaselineFlowTemplate>> = {
  "Smartlead Outreach": {
    source_system: "Liftor CRM / outreach queue",
    destination_system: "Smartlead (external SaaS) — founder approval-gated",
    data_categories: ["prospect name", "prospect email", "company"],
    personal_data: true,
  },
  "Apollo Lead Sourcing": {
    source_system: "Apollo (external SaaS)",
    destination_system: "Liftor CRM (founder approval-gated import)",
    data_categories: ["prospect name", "prospect email", "company", "job title"],
    personal_data: true,
    cross_border_transfer: true,
  },
  "Social Publishing (Metricool)": {
    source_system: "Liftor content drafts",
    destination_system: "Metricool → public social channels (founder approval-gated)",
    data_categories: ["public marketing content"],
    personal_data: false,
  },
  "Data Ingestion Centre": {
    source_system: "External data sources (to be enumerated)",
    destination_system: "Liftor Cloud datastores",
    data_categories: ["to be confirmed by founder/adviser"],
    personal_data: true,
    sensitive_data: true,
  },
  "AI Gateway": {
    source_system: "Liftor internal callers",
    destination_system: "AI providers (OpenAI / Google / Lovable AI)",
    data_categories: ["prompts", "context snippets"],
    personal_data: true,
    cross_border_transfer: true,
  },
  "Liftor Brain": {
    source_system: "Liftor internal context fabric",
    destination_system: "AI Gateway → providers",
    data_categories: ["strategy notes", "founder context"],
    personal_data: true,
    sensitive_data: true,
  },
  "AI Usage Ledger": {
    source_system: "AI Gateway",
    destination_system: "Liftor Cloud (ai_usage_log)",
    data_categories: ["request metadata", "token counts", "cost"],
  },
  "AI Approval Gates": {
    source_system: "Initiating module",
    destination_system: "Founder approval queue",
    data_categories: ["proposed action payload"],
    personal_data: true,
  },
  "AI Security Centre": {
    source_system: "Across Liftor surfaces",
    destination_system: "Security telemetry tables",
    data_categories: ["security events", "anomaly signals"],
    personal_data: true,
    sensitive_data: true,
  },
  "Business Compliance Rules": {
    source_system: "Founder configuration",
    destination_system: "Liftor Cloud (compliance tables)",
    data_categories: ["compliance profile fields"],
    sensitive_data: true,
  },
  "Privacy": {
    source_system: "Subject requests / privacy events",
    destination_system: "Liftor Cloud (privacy tables)",
    data_categories: ["DSAR records", "retention notes"],
    personal_data: true,
    sensitive_data: true,
  },
  "Incidents": {
    source_system: "Operational systems",
    destination_system: "Incident ledger",
    data_categories: ["incident reports"],
    personal_data: true,
    sensitive_data: true,
  },
  "Audit Ledger": {
    source_system: "All actioning modules",
    destination_system: "Audit ledger (append-only)",
    data_categories: ["action metadata", "actor", "timestamp"],
    personal_data: true,
  },
  "Policies": {
    source_system: "Policy authoring",
    destination_system: "Public legal pages & internal evidence",
    data_categories: ["policy text"],
  },
  "Connectors": {
    source_system: "External SaaS",
    destination_system: "Liftor connector registry",
    data_categories: ["credentials (encrypted)", "configuration"],
    personal_data: true,
  },
  "Scheduled Jobs": {
    source_system: "Scheduler",
    destination_system: "Worker functions",
    data_categories: ["job metadata"],
  },
  "Revenue Autopilot": {
    source_system: "Liftor finance modules",
    destination_system: "Liftor revenue tables",
    data_categories: ["customer email", "amounts", "pricing"],
    personal_data: true,
  },
  "Customer Sales": {
    source_system: "CRM",
    destination_system: "Sales pipeline tables",
    data_categories: ["contact details", "deal notes"],
    personal_data: true,
  },
  "Quote to Cash": {
    source_system: "Proposal / quote engine",
    destination_system: "Contracts + invoices",
    data_categories: ["customer billing", "contract text"],
    personal_data: true,
    sensitive_data: true,
  },
  "M&A Portfolio Exit Intelligence": {
    source_system: "Portfolio assets",
    destination_system: "Founder-only M&A workspace",
    data_categories: ["valuation", "buyer notes", "deal terms"],
    personal_data: true,
    sensitive_data: true,
    cross_border_transfer: false,
  },
};

function buildDraftFlow(s: AIComplianceSystem): Partial<AIDataFlowRecord> {
  const tpl = { ...DEFAULT_BASELINE, ...(BASELINE_FLOW_TEMPLATES[s.system_name] ?? {}) };
  return {
    business_id: s.business_id,
    system_id: s.id,
    source_system: tpl.source_system ?? DEFAULT_BASELINE.source_system,
    destination_system: tpl.destination_system ?? DEFAULT_BASELINE.destination_system,
    data_categories: tpl.data_categories ?? DEFAULT_BASELINE.data_categories,
    personal_data: tpl.personal_data ?? s.uses_personal_data,
    sensitive_data: tpl.sensitive_data ?? s.uses_sensitive_data,
    children_data: s.handles_children_data,
    lawful_basis: tpl.lawful_basis ?? DEFAULT_BASELINE.lawful_basis,
    processor_or_controller_note: "Draft — to be confirmed by founder/adviser.",
    retention_period: tpl.retention_period ?? DEFAULT_BASELINE.retention_period,
    storage_location: tpl.storage_location ?? DEFAULT_BASELINE.storage_location,
    cross_border_transfer: tpl.cross_border_transfer ?? false,
    transfer_jurisdiction: null,
    security_controls: tpl.security_controls ?? DEFAULT_BASELINE.security_controls,
    founder_confirmed: false,
    review_status: s.uses_sensitive_data || s.external_action_capable ? "needs_adviser" : "draft",
  };
}

export type DraftFlowResult = { inserted: number; skipped: number; protected: number; details: { system: string; action: "inserted" | "skipped" | "protected" }[] };

/**
 * Idempotent baseline draft data-flow creation.
 * - Skips systems that already have any data-flow record.
 * - Does NOT overwrite founder_confirmed records (counted as "protected").
 * - Always inserts as draft / needs_adviser; never founder_confirmed.
 */
export async function createDraftBaselineFlows(opts?: { systemNames?: string[] }): Promise<DraftFlowResult> {
  const [systems, flows] = await Promise.all([fetchSystems(), fetchFlows()]);
  const flowsBySys = new Map<string, AIDataFlowRecord[]>();
  for (const f of flows) {
    if (!f.system_id) continue;
    const arr = flowsBySys.get(f.system_id) ?? []; arr.push(f); flowsBySys.set(f.system_id, arr);
  }
  const out: DraftFlowResult = { inserted: 0, skipped: 0, protected: 0, details: [] };
  const filter = opts?.systemNames ? new Set(opts.systemNames) : null;
  for (const s of systems) {
    if (filter && !filter.has(s.system_name)) continue;
    const existing = flowsBySys.get(s.id) ?? [];
    if (existing.some(f => f.founder_confirmed)) {
      out.protected++; out.details.push({ system: s.system_name, action: "protected" }); continue;
    }
    if (existing.length > 0) {
      out.skipped++; out.details.push({ system: s.system_name, action: "skipped" }); continue;
    }
    const draft = buildDraftFlow(s);
    const { error } = await sb().from("ai_data_flow_records").insert(draft);
    if (error) throw error;
    out.inserted++; out.details.push({ system: s.system_name, action: "inserted" });
  }
  return out;
}

/* ---------------- Founder review packet ---------------- */

export type ReviewPacketItem = {
  system: AIComplianceSystem;
  external_action: boolean;
  has_flow: boolean;
  has_oversight: boolean;
  founder_confirmed: boolean;
  needs_adviser: boolean;
  next_safe_action: string;
};
export type ReviewPacket = {
  priority1_external_action: ReviewPacketItem[];
  priority2_sensitive_data: ReviewPacketItem[];
  priority3_internal_control: ReviewPacketItem[];
};

const INTERNAL_CONTROL_KEYS = new Set([
  "AI Gateway", "Liftor Brain", "AI Usage Ledger", "AI Approval Gates",
  "AI Security Centre", "Business Compliance Rules", "Privacy", "Incidents",
  "Audit Ledger", "Policies", "Connectors", "Scheduled Jobs",
]);

function nextSafeAction(s: AIComplianceSystem, hasFlow: boolean, hasOversight: boolean): string {
  if (s.external_action_capable && !hasOversight) return "Record founder oversight before external send is permitted.";
  if (!hasFlow) return "Create draft data-flow record (review with adviser).";
  if (!s.founder_confirmed && (s.risk_level === "critical" || s.risk_level === "high")) return "Founder review required — default to needs adviser.";
  if (!s.founder_confirmed) return "Confirm inventory entry (founder).";
  return "Schedule next review.";
}

export function buildReviewPacket(input: {
  systems: AIComplianceSystem[];
  flows: AIDataFlowRecord[];
  oversight: AIHumanOversightRecord[];
}): ReviewPacket {
  const flowsBySys = new Set(input.flows.map(f => f.system_id).filter(Boolean) as string[]);
  const oversightBySys = new Set(input.oversight.map(o => o.system_id).filter(Boolean) as string[]);
  const toItem = (s: AIComplianceSystem): ReviewPacketItem => {
    const hasFlow = flowsBySys.has(s.id);
    const hasOversight = oversightBySys.has(s.id);
    const needsAdviser =
      s.external_action_capable ||
      s.uses_sensitive_data || s.handles_children_data || s.handles_health_data ||
      s.handles_financial_data || s.handles_legal_data ||
      s.risk_level === "critical" || s.risk_level === "high";
    return {
      system: s, external_action: s.external_action_capable,
      has_flow: hasFlow, has_oversight: hasOversight,
      founder_confirmed: s.founder_confirmed,
      needs_adviser: needsAdviser,
      next_safe_action: nextSafeAction(s, hasFlow, hasOversight),
    };
  };
  const sensitive = (s: AIComplianceSystem) =>
    s.uses_sensitive_data || s.handles_children_data || s.handles_health_data ||
    s.handles_financial_data || s.handles_legal_data;
  return {
    priority1_external_action: input.systems.filter(s => s.external_action_capable).map(toItem),
    priority2_sensitive_data: input.systems.filter(s => !s.external_action_capable && sensitive(s)).map(toItem),
    priority3_internal_control: input.systems
      .filter(s => !s.external_action_capable && !sensitive(s) && INTERNAL_CONTROL_KEYS.has(s.system_name))
      .map(toItem),
  };
}

/* ---------------- Founder review action ---------------- */

export type FounderReviewDecision = "needs_adviser" | "parked" | "blocked" | "approved_as_draft";

/** High/critical systems may never be 'approved_as_draft' via this entry point. */
export function isDecisionAllowed(system: Pick<AIComplianceSystem, "risk_level" | "external_action_capable">, decision: FounderReviewDecision): boolean {
  if (decision === "approved_as_draft") {
    if (system.risk_level === "critical" || system.risk_level === "high") return false;
    if (system.external_action_capable) return false;
  }
  return true;
}

export async function recordFounderReview(opts: {
  system: AIComplianceSystem;
  data_flow_reviewed: boolean;
  external_gates_locked_confirmed: boolean;
  adviser_review_required: boolean;
  notes: string;
  decision: FounderReviewDecision;
  decided_by?: string | null;
}): Promise<AIHumanOversightRecord> {
  if (!isDecisionAllowed(opts.system, opts.decision)) {
    throw new Error("High/critical or external-action systems cannot be approved as draft here — use needs adviser / parked / blocked.");
  }
  const human_decision: AIHumanOversightRecord["human_decision"] =
    opts.decision === "approved_as_draft" ? "approved"
    : opts.decision === "parked" ? "parked"
    : opts.decision === "blocked" ? "rejected"
    : "escalated";
  return recordOversight({
    business_id: opts.system.business_id,
    system_id: opts.system.id,
    oversight_type: "human_review",
    trigger_source: "founder_review_packet",
    trigger_reason: opts.adviser_review_required ? "adviser review required" : "founder review",
    proposed_ai_action: null,
    human_decision,
    decided_by: opts.decided_by ?? "founder",
    decision_notes:
      `decision=${opts.decision}; ` +
      `data_flow_reviewed=${opts.data_flow_reviewed}; ` +
      `external_gates_locked_confirmed=${opts.external_gates_locked_confirmed}; ` +
      `adviser_review_required=${opts.adviser_review_required}; ` +
      `notes=${opts.notes || "—"}`,
    external_action_blocked: !opts.external_gates_locked_confirmed && opts.system.external_action_capable,
    evidence_url: null,
  });
}

export async function confirmInventoryEntry(system: AIComplianceSystem): Promise<AIComplianceSystem> {
  return upsertSystem({
    id: system.id,
    founder_confirmed: true,
    last_reviewed_at: new Date().toISOString(),
  });
}

/**
 * Safer bulk action: confirm inventory only for selected LOW/MEDIUM, internal-only, non-external-action systems.
 * High/critical or external-action systems are skipped (counted as 'skipped').
 */
export async function bulkConfirmLowRiskInternal(systems: AIComplianceSystem[]): Promise<{ confirmed: number; skipped: number; details: { system: string; ok: boolean; reason?: string }[] }> {
  const out = { confirmed: 0, skipped: 0, details: [] as { system: string; ok: boolean; reason?: string }[] };
  for (const s of systems) {
    if (s.risk_level === "high" || s.risk_level === "critical") {
      out.skipped++; out.details.push({ system: s.system_name, ok: false, reason: "risk too high for bulk" }); continue;
    }
    if (s.external_action_capable) {
      out.skipped++; out.details.push({ system: s.system_name, ok: false, reason: "external-action capable" }); continue;
    }
    if (s.internal_or_external !== "internal") {
      out.skipped++; out.details.push({ system: s.system_name, ok: false, reason: "not internal-only" }); continue;
    }
    await confirmInventoryEntry(s);
    out.confirmed++; out.details.push({ system: s.system_name, ok: true });
  }
  return out;
}

/* ---------------- Incident escalation checklist (internal only) ---------------- */

export type IncidentScenario =
  | "wrong_send" | "hallucinated_external_claim" | "data_leak"
  | "unauthorised_external_action" | "sensitive_data_mishandling"
  | "provider_failure" | "approval_bypass_attempt";

export type IncidentChecklistItem = {
  scenario: IncidentScenario;
  label: string;
  internal_only: true;
  steps: string[];
};

/**
 * Internal-only readiness checklist. No external notifications, no adviser contact,
 * no external reports. Liftor founder uses this as preparedness evidence.
 */
export const INCIDENT_ESCALATION_CHECKLIST: IncidentChecklistItem[] = [
  { scenario: "wrong_send", label: "Wrong send (email / social / external action)", internal_only: true,
    steps: ["Halt outbound queue", "Snapshot what was sent and to whom (internal log only)", "Record incident in Incidents module", "Founder decides on internal remediation"] },
  { scenario: "hallucinated_external_claim", label: "Hallucinated external claim", internal_only: true,
    steps: ["Capture exact AI output", "Block the surface that produced it", "Log to Incidents", "Founder reviews policy guardrails"] },
  { scenario: "data_leak", label: "Data leak", internal_only: true,
    steps: ["Rotate impacted secrets (no external notification yet)", "Scope which records were exposed internally", "Log to Incidents with sensitivity flag", "Founder decides next step internally"] },
  { scenario: "unauthorised_external_action", label: "Unauthorised external action", internal_only: true,
    steps: ["Disable the connector or external send flag", "Snapshot the action payload", "Log to Incidents", "Founder reviews approval gate"] },
  { scenario: "sensitive_data_mishandling", label: "Sensitive-data mishandling", internal_only: true,
    steps: ["Identify systems and data categories involved", "Pause the system if necessary", "Log to Incidents with sensitive flag", "Founder reviews data-flow record"] },
  { scenario: "provider_failure", label: "Provider failure (AI / SaaS)", internal_only: true,
    steps: ["Confirm scope of failure", "Switch routing where possible", "Log to Incidents", "Founder decides if a status communication is needed"] },
  { scenario: "approval_bypass_attempt", label: "Approval bypass attempt", internal_only: true,
    steps: ["Block the bypass path", "Snapshot the attempted action", "Log to Incidents", "Founder reviews approval gate hardening"] },
];