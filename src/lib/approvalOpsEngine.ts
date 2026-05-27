import { supabase } from "@/integrations/supabase/client";

export type ApprovalRow = {
  id: string;
  business_id: string | null;
  approval_type: string;
  agent_key: string | null;
  title: string;
  summary: string | null;
  draft_subject: string | null;
  draft_body: string | null;
  priority_level: string;
  risk_flags: string[];
  compliance_flags: string[];
  status: string;
  founder_decision: string | null;
  decided_at: string | null;
  created_at: string;
  source_system: string | null;
};

export type EscalationRow = {
  id: string;
  business_id: string | null;
  source_module: string;
  escalation_type: string;
  severity: string;
  escalation_status: string;
  escalation_reason: string | null;
  created_at: string;
  resolved_at: string | null;
};

export type ApprovalFilters = {
  business_id?: string | null;
  severity?: string | null;
  approval_type?: string | null;
  agent_key?: string | null;
  status?: string | null;
};

const STATUS_PENDING = "pending";
const STATUS_PAUSED = "paused";
const STATUS_BLOCKED = "blocked";
const STATUS_FAILED = "failed";

export async function fetchApprovalOps(): Promise<{ approvals: ApprovalRow[]; escalations: EscalationRow[] }> {
  const [a, e] = await Promise.all([
    supabase
      .from("founder_approval_items")
      .select("id,business_id,approval_type,agent_key,title,summary,draft_subject,draft_body,priority_level,risk_flags,compliance_flags,status,founder_decision,decided_at,created_at,source_system")
      .order("created_at", { ascending: false })
      .limit(500),
    supabase
      .from("escalation_records")
      .select("id,business_id,source_module,escalation_type,severity,escalation_status,escalation_reason,created_at,resolved_at")
      .order("created_at", { ascending: false })
      .limit(200),
  ]);
  return {
    approvals: ((a.data ?? []) as any[]).map((r) => ({
      ...r,
      risk_flags: Array.isArray(r.risk_flags) ? r.risk_flags : [],
      compliance_flags: Array.isArray(r.compliance_flags) ? r.compliance_flags : [],
    })) as ApprovalRow[],
    escalations: (e.data ?? []) as EscalationRow[],
  };
}

export function applyFilters(rows: ApprovalRow[], f: ApprovalFilters): ApprovalRow[] {
  return rows.filter((r) => {
    if (f.business_id && r.business_id !== f.business_id) return false;
    if (f.severity && r.priority_level !== f.severity) return false;
    if (f.approval_type && r.approval_type !== f.approval_type) return false;
    if (f.agent_key && r.agent_key !== f.agent_key) return false;
    if (f.status && r.status !== f.status) return false;
    return true;
  });
}

export type ApprovalMetrics = {
  pending: number;
  blocked: number;
  failed: number;
  paused: number;
  approvals_today: number;
  avg_decision_delay_minutes: number;
  founder_load_score: number;
  escalations_open: number;
};

export function computeMetrics(rows: ApprovalRow[], escalations: EscalationRow[]): ApprovalMetrics {
  const now = Date.now();
  const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);
  const dayStartMs = dayStart.getTime();

  const pending = rows.filter((r) => r.status === STATUS_PENDING).length;
  const blocked = rows.filter((r) => r.status === STATUS_BLOCKED).length;
  const failed = rows.filter((r) => r.status === STATUS_FAILED).length;
  const paused = rows.filter((r) => r.status === STATUS_PAUSED).length;

  const decidedToday = rows.filter(
    (r) => r.founder_decision && r.decided_at && new Date(r.decided_at).getTime() >= dayStartMs
  );
  const approvals_today = decidedToday.filter((r) => r.founder_decision === "approve").length;

  const delays = decidedToday
    .filter((r) => r.decided_at)
    .map((r) => (new Date(r.decided_at!).getTime() - new Date(r.created_at).getTime()) / 60_000)
    .filter((n) => Number.isFinite(n) && n >= 0);
  const avg_decision_delay_minutes = delays.length === 0 ? 0 : Math.round(delays.reduce((a, b) => a + b, 0) / delays.length);

  // Founder load score: weighted backlog (urgent×4 + high×2 + normal×1) + open escalations×3, capped.
  const byPriority = (level: string) => rows.filter((r) => r.status === STATUS_PENDING && r.priority_level === level).length;
  const escalations_open = escalations.filter((e) => !e.resolved_at).length;
  const raw = byPriority("urgent") * 4 + byPriority("high") * 2 + byPriority("normal") * 1 + escalations_open * 3;
  const founder_load_score = Math.min(100, raw);

  return {
    pending, blocked, failed, paused,
    approvals_today, avg_decision_delay_minutes, founder_load_score, escalations_open,
  };
}

/** Idempotency key prevents double-submission for the same item+decision. */
const inflight = new Set<string>();
export function reserveDecision(item_id: string, decision: string): boolean {
  const key = `${item_id}:${decision}`;
  if (inflight.has(key)) return false;
  inflight.add(key);
  return true;
}
export function releaseDecision(item_id: string, decision: string): void {
  inflight.delete(`${item_id}:${decision}`);
}

export async function submitDecision(
  item_id: string,
  decision: "approve" | "reject" | "edit_required" | "escalate" | "park",
  founder_notes?: string
): Promise<{ ok: boolean; blocked?: boolean; reason?: string }> {
  if (!reserveDecision(item_id, decision)) return { ok: false, blocked: true, reason: "duplicate_submission" };
  try {
    const { data, error } = await supabase.functions.invoke("founder-approval-apply", {
      body: { item_id, decision, founder_notes: founder_notes ?? null, confirmation_phrase: "RECORD FOUNDER DECISION", dry_run: false },
    });
    if (error) return { ok: false, reason: error.message };
    if ((data as any)?.blocked) return { ok: false, blocked: true, reason: (data as any).reason };
    return { ok: true };
  } finally {
    releaseDecision(item_id, decision);
  }
}

/** Pause: direct status flip; does not trigger external action. */
export async function pauseApproval(item_id: string): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase
    .from("founder_approval_items")
    .update({ status: STATUS_PAUSED, updated_at: new Date().toISOString() })
    .eq("id", item_id);
  return error ? { ok: false, error: error.message } : { ok: true };
}