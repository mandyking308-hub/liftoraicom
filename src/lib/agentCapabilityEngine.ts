import { supabase } from "@/integrations/supabase/client";

const sb: any = supabase as any;

export interface AgentRegistry {
  id: string; agent_name: string; business_scope: string; module_scope: string[];
  description: string|null; status: string; max_ai_cost_usd: number; allowed_model_tier: string;
  required_context_fields: string[]; human_handoff_rule: string|null; failure_behaviour: string;
  owner_role: string; is_test_data: boolean; trace_id: string|null; created_at: string;
}
export interface AgentCapability {
  id: string; agent_id: string|null; capability: string; mode: string; notes: string|null;
  is_test_data: boolean; trace_id: string|null; created_at: string;
}
export interface AgentProhibited {
  id: string; agent_id: string|null; action: string; reason: string|null; severity: string;
  is_test_data: boolean; trace_id: string|null; created_at: string;
}
export interface AgentApprovalRequirement {
  id: string; agent_id: string|null; action: string; required_approver: string;
  rule_summary: string|null; is_pre_approved: boolean;
  is_test_data: boolean; trace_id: string|null; created_at: string;
}
export interface AgentEscalationTrigger {
  id: string; agent_id: string|null; trigger_type: string; threshold: string|null;
  escalate_to: string; notes: string|null;
  is_test_data: boolean; trace_id: string|null; created_at: string;
}
export interface AgentModulePermission {
  id: string; agent_id: string|null; module: string; permission: string; notes: string|null;
  is_test_data: boolean; trace_id: string|null; created_at: string;
}
export interface AgentBoundaryViolation {
  id: string; agent_id: string|null; agent_name: string; violation_type: string;
  attempted_action: string; severity: string; status: string; detail: string|null;
  resolution: string|null; is_test_data: boolean; trace_id: string|null; created_at: string;
}

export async function listAgents(): Promise<AgentRegistry[]> {
  const { data } = await sb.from("agent_registry").select("*").order("agent_name").limit(500);
  return (data ?? []) as AgentRegistry[];
}
export async function listCapabilities(): Promise<AgentCapability[]> {
  const { data } = await sb.from("agent_capabilities").select("*").order("capability").limit(2000);
  return (data ?? []) as AgentCapability[];
}
export async function listProhibited(): Promise<AgentProhibited[]> {
  const { data } = await sb.from("agent_prohibited_actions").select("*").order("severity").limit(2000);
  return (data ?? []) as AgentProhibited[];
}
export async function listApprovalRequirements(): Promise<AgentApprovalRequirement[]> {
  const { data } = await sb.from("agent_approval_requirements").select("*").order("required_approver").limit(2000);
  return (data ?? []) as AgentApprovalRequirement[];
}
export async function listEscalations(): Promise<AgentEscalationTrigger[]> {
  const { data } = await sb.from("agent_escalation_triggers").select("*").order("escalate_to").limit(2000);
  return (data ?? []) as AgentEscalationTrigger[];
}
export async function listModulePermissions(): Promise<AgentModulePermission[]> {
  const { data } = await sb.from("agent_module_permissions").select("*").order("module").limit(2000);
  return (data ?? []) as AgentModulePermission[];
}
export async function listViolations(): Promise<AgentBoundaryViolation[]> {
  const { data } = await sb.from("agent_boundary_violations").select("*").order("created_at",{ascending:false}).limit(500);
  return (data ?? []) as AgentBoundaryViolation[];
}

export interface AgentRegistrySummary {
  agents: number; activeAgents: number; capabilities: number; prohibitedActions: number;
  approvalRequired: number; preApprovedRules: number; escalationTriggers: number;
  openViolations: number; criticalViolations: number; capabilityGaps: number;
  watchItems: string[];
}

export async function summariseAgentRegistry(): Promise<AgentRegistrySummary> {
  const [agents, caps, prohibited, approvals, escalations, viol] = await Promise.all([
    listAgents(), listCapabilities(), listProhibited(), listApprovalRequirements(), listEscalations(), listViolations()
  ]);
  const agentIds = new Set(agents.map(a => a.id));
  const agentsWithCaps = new Set(caps.map(c => c.agent_id));
  const agentsWithEsc = new Set(escalations.map(e => e.agent_id));
  const capabilityGaps = agents.filter(a => !agentsWithCaps.has(a.id) || !agentsWithEsc.has(a.id)).length;
  const openViolations = viol.filter(v => v.status === "open").length;
  const criticalViolations = viol.filter(v => v.severity === "critical" || (v.severity === "high" && v.status === "open")).length;
  const watch: string[] = [];
  if (openViolations) watch.push(`${openViolations} open boundary violation(s) require review`);
  if (capabilityGaps) watch.push(`${capabilityGaps} agent(s) missing capabilities or escalation triggers`);
  const agentsWithoutHandoff = agents.filter(a => !a.human_handoff_rule).length;
  if (agentsWithoutHandoff) watch.push(`${agentsWithoutHandoff} agent(s) missing human handoff rule`);
  void agentIds;
  return {
    agents: agents.length,
    activeAgents: agents.filter(a => a.status === "active").length,
    capabilities: caps.length,
    prohibitedActions: prohibited.length,
    approvalRequired: approvals.filter(a => !a.is_pre_approved).length,
    preApprovedRules: approvals.filter(a => a.is_pre_approved).length,
    escalationTriggers: escalations.length,
    openViolations, criticalViolations, capabilityGaps,
    watchItems: watch,
  };
}