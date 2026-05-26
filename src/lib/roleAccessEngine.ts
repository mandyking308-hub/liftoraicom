import { supabase } from "@/integrations/supabase/client";

export type RoleDefinition = {
  id: string;
  role_code: string;
  role_name: string;
  role_description: string | null;
  default_permissions: any;
  sensitivity_level: "low" | "medium" | "high" | "critical";
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type UserRoleAssignment = {
  id: string;
  user_id: string | null;
  email: string | null;
  display_name: string | null;
  role_id: string | null;
  business_id: string | null;
  assignment_scope: "global" | "business" | "module" | "temporary";
  access_status: "proposed" | "requested" | "active" | "suspended" | "revoked" | "expired";
  granted_by: string | null;
  granted_at: string | null;
  expires_at: string | null;
  revoked_at: string | null;
  is_test_data: boolean;
  audit_metadata: any;
  created_at: string;
  updated_at: string;
};

export type PermissionRow = {
  id: string;
  role_id: string;
  module_name: string;
  business_id: string | null;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_approve: boolean;
  can_export: boolean;
  can_delete: boolean;
  can_manage_settings: boolean;
  can_trigger_external_action: boolean;
  sensitivity_notes: string | null;
};

export type AccessRequest = {
  id: string;
  requester_name: string | null;
  requester_email: string | null;
  requested_role_id: string | null;
  business_id: string | null;
  requested_scope: string | null;
  reason: string | null;
  request_status: "draft" | "pending_founder" | "approved" | "rejected" | "expired" | "revoked";
  founder_approval_required: boolean;
  reviewed_by: string | null;
  reviewed_at: string | null;
  is_test_data: boolean;
  audit_metadata: any;
  created_at: string;
  updated_at: string;
};

export type AccessReviewEvent = {
  id: string;
  user_role_assignment_id: string | null;
  review_type: "periodic" | "offboarding" | "risk" | "manual" | "expiry";
  review_status: "pending" | "approved_continue" | "revoke_recommended" | "revoked" | "extended";
  notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  is_test_data: boolean;
  audit_metadata: any;
  created_at: string;
};

/** Modules where elevated roles are required and external-action permission must remain rare. */
export const SENSITIVE_MODULES: Array<{ module: string; reason: string }> = [
  { module: "provider_pricing",      reason: "Cost / margin exposure" },
  { module: "budgets",               reason: "Financial controls" },
  { module: "agent_controls",        reason: "Operational risk" },
  { module: "kill_switch",           reason: "System-wide stop" },
  { module: "external_action_gates", reason: "Customer-impacting" },
  { module: "approvals",             reason: "Override risk" },
  { module: "finance_revenue",       reason: "Money movement" },
  { module: "contracts",             reason: "Legal binding" },
  { module: "privacy",               reason: "Regulatory exposure" },
  { module: "access_secrets",        reason: "Credential exposure" },
  { module: "legal_tax_entity_map",  reason: "Legal exposure" },
  { module: "portfolio_exit",        reason: "Confidential M&A" },
  { module: "customer_data",         reason: "PII exposure" },
  { module: "seller_payouts",        reason: "Money movement" },
  { module: "payment_invoice",       reason: "Money movement" },
];

export const SENSITIVITY_META: Record<string, { label: string; cls: string }> = {
  critical: { label: "Critical", cls: "bg-red-500/15 text-red-400 border-red-500/30" },
  high:     { label: "High",     cls: "bg-orange-500/15 text-orange-300 border-orange-500/30" },
  medium:   { label: "Medium",   cls: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30" },
  low:      { label: "Low",      cls: "bg-blue-500/15 text-blue-300 border-blue-500/30" },
};

export const STATUS_META: Record<string, { label: string; cls: string }> = {
  proposed:  { label: "Proposed",  cls: "bg-blue-500/15 text-blue-300 border-blue-500/30" },
  requested: { label: "Requested", cls: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30" },
  active:    { label: "Active",    cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  suspended: { label: "Suspended", cls: "bg-orange-500/15 text-orange-300 border-orange-500/30" },
  revoked:   { label: "Revoked",   cls: "bg-muted text-muted-foreground border-border/50" },
  expired:   { label: "Expired",   cls: "bg-red-500/15 text-red-400 border-red-500/30" },
};

export async function fetchRoles(): Promise<RoleDefinition[]> {
  const sb: any = supabase as any;
  const { data, error } = await sb.from("role_definitions").select("*").order("sensitivity_level", { ascending: false }).order("role_name");
  if (error) return [];
  return (data ?? []) as RoleDefinition[];
}

export async function fetchAssignments(): Promise<UserRoleAssignment[]> {
  const sb: any = supabase as any;
  const { data, error } = await sb.from("user_role_assignments").select("*").order("created_at", { ascending: false });
  if (error) return [];
  return (data ?? []) as UserRoleAssignment[];
}

export async function fetchPermissions(): Promise<PermissionRow[]> {
  const sb: any = supabase as any;
  const { data, error } = await sb.from("module_permission_matrix").select("*").order("module_name");
  if (error) return [];
  return (data ?? []) as PermissionRow[];
}

export async function fetchRequests(): Promise<AccessRequest[]> {
  const sb: any = supabase as any;
  const { data, error } = await sb.from("access_requests").select("*").order("created_at", { ascending: false });
  if (error) return [];
  return (data ?? []) as AccessRequest[];
}

export async function fetchReviewEvents(): Promise<AccessReviewEvent[]> {
  const sb: any = supabase as any;
  const { data, error } = await sb.from("access_review_events").select("*").order("created_at", { ascending: false });
  if (error) return [];
  return (data ?? []) as AccessReviewEvent[];
}

export type RoleAccessSummary = {
  active_users: number;
  proposed: number;
  requested: number;
  expiring_30d: number;
  expired: number;
  pending_requests: number;
  pending_reviews: number;
  over_permissioned: number;
  external_action_grants: number;
  test_records: number;
  top_action: string | null;
};

export function summarize(
  roles: RoleDefinition[],
  assigns: UserRoleAssignment[],
  perms: PermissionRow[],
  requests: AccessRequest[],
  reviews: AccessReviewEvent[],
): RoleAccessSummary {
  const live = assigns.filter(a => !a.is_test_data);
  const now = Date.now();
  const horizon = now + 30 * 24 * 3600 * 1000;
  const active = live.filter(a => a.access_status === "active");
  const proposed = live.filter(a => a.access_status === "proposed").length;
  const requested = live.filter(a => a.access_status === "requested").length;
  const expiring_30d = active.filter(a => a.expires_at && Date.parse(a.expires_at) < horizon && Date.parse(a.expires_at) > now).length;
  const expired = live.filter(a => a.expires_at && Date.parse(a.expires_at) < now && a.access_status !== "revoked").length;
  const pending_requests = requests.filter(r => !r.is_test_data && (r.request_status === "draft" || r.request_status === "pending_founder")).length;
  const pending_reviews = reviews.filter(r => !r.is_test_data && r.review_status === "pending").length;
  const external_action_grants = perms.filter(p => p.can_trigger_external_action).length;

  // Over-permissioned: non-founder role with external-action permission, or sensitive module access by a low-sensitivity role.
  const roleById = new Map(roles.map(r => [r.id, r]));
  const sensitiveSet = new Set(SENSITIVE_MODULES.map(s => s.module));
  const over_permissioned = perms.filter(p => {
    const r = roleById.get(p.role_id);
    if (!r) return false;
    const elevated = r.sensitivity_level === "critical";
    if (p.can_trigger_external_action && !elevated) return true;
    if (sensitiveSet.has(p.module_name) && (r.sensitivity_level === "low" || r.sensitivity_level === "medium") && (p.can_edit || p.can_approve || p.can_delete)) return true;
    return false;
  }).length;

  let top_action: string | null = null;
  if (pending_requests > 0) top_action = `${pending_requests} access request${pending_requests > 1 ? "s" : ""} awaiting founder approval`;
  else if (expired > 0) top_action = `${expired} expired assignment${expired > 1 ? "s" : ""} need revocation`;
  else if (expiring_30d > 0) top_action = `${expiring_30d} assignment${expiring_30d > 1 ? "s" : ""} expiring in 30 days`;
  else if (over_permissioned > 0) top_action = `${over_permissioned} over-permissioned grant${over_permissioned > 1 ? "s" : ""} to review`;
  else if (pending_reviews > 0) top_action = `${pending_reviews} access review${pending_reviews > 1 ? "s" : ""} pending`;

  return {
    active_users: active.length,
    proposed, requested, expiring_30d, expired, pending_requests, pending_reviews,
    over_permissioned, external_action_grants,
    test_records: assigns.filter(a => a.is_test_data).length,
    top_action,
  };
}

/** Delegation Agent: classify a work-item title/type as founder-only vs safe to delegate. */
export function classifyDelegation(input: { title?: string; module?: string; external_action?: boolean }): { safe_for: "va_operator" | "business_operator" | "adviser_read_only" | "founder_only"; reason: string } {
  const m = (input.module ?? "").toLowerCase();
  const t = (input.title ?? "").toLowerCase();
  const sensitive = SENSITIVE_MODULES.some(s => m.includes(s.module));
  if (input.external_action) return { safe_for: "founder_only", reason: "External-impact action — founder approval required." };
  if (sensitive) return { safe_for: "founder_only", reason: "Sensitive module — elevated role only." };
  if (/approve|payment|payout|invoice|contract|legal|privacy|secret/.test(t)) return { safe_for: "founder_only", reason: "Title implies money/legal/privacy/secret risk." };
  if (/review|read|report|summary|report/.test(t)) return { safe_for: "adviser_read_only", reason: "Read-only review work." };
  return { safe_for: "va_operator", reason: "Routine operational task — safe for VA/operator." };
}