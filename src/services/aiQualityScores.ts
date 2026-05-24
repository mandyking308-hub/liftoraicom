import { supabase } from "@/integrations/supabase/client";
import { redactSensitive } from "@/services/aiSecurityGuard";

/**
 * AI Quality Scoring + Human Feedback Loop.
 *
 * Cheap AI is only valuable if output is good enough. This module captures
 * founder feedback against ai_usage_ledger entries and rolls it up by
 * agent, prompt template, task category and model tier.
 *
 * Quality-adjusted ROI is exposed via {@link qualityFactorForScope} so the
 * ROI engine can dampen "cheap but bad" outputs instead of rewarding them.
 */

export type FeedbackLabel =
  | "excellent"
  | "good"
  | "usable_with_edits"
  | "poor"
  | "rejected"
  | "risky"
  | "inaccurate"
  | "wrong_tone"
  | "too_expensive_for_result";

export const FEEDBACK_LABELS: { value: FeedbackLabel; label: string; description: string }[] = [
  { value: "excellent", label: "Excellent", description: "Approved without edits, strong output." },
  { value: "good", label: "Good", description: "Approved without edits, minor polish at most." },
  { value: "usable_with_edits", label: "Usable with edits", description: "Edited before approval." },
  { value: "poor", label: "Poor", description: "Low quality but not harmful." },
  { value: "rejected", label: "Rejected", description: "Not usable. Will not be sent." },
  { value: "risky", label: "Risky", description: "Reputational or compliance risk if used." },
  { value: "inaccurate", label: "Inaccurate", description: "Factually wrong or misleading." },
  { value: "wrong_tone", label: "Wrong tone", description: "Off-brand voice or register." },
  { value: "too_expensive_for_result", label: "Too expensive for result", description: "Output not worth the spend." },
];

interface LabelMapping {
  output_quality_score: number;
  approved_without_edit: boolean;
  edited_before_approval: boolean;
  rejected: boolean;
  accuracy_score?: number;
  brand_fit_score?: number;
  risk_score?: number;
  usefulness_score?: number;
}

function mapLabel(label: FeedbackLabel): LabelMapping {
  switch (label) {
    case "excellent":
      return { output_quality_score: 5, approved_without_edit: true, edited_before_approval: false, rejected: false, accuracy_score: 5, brand_fit_score: 5, usefulness_score: 5, risk_score: 1 };
    case "good":
      return { output_quality_score: 4, approved_without_edit: true, edited_before_approval: false, rejected: false, accuracy_score: 4, brand_fit_score: 4, usefulness_score: 4, risk_score: 1 };
    case "usable_with_edits":
      return { output_quality_score: 3, approved_without_edit: false, edited_before_approval: true, rejected: false, usefulness_score: 3 };
    case "poor":
      return { output_quality_score: 2, approved_without_edit: false, edited_before_approval: false, rejected: false, usefulness_score: 2 };
    case "rejected":
      return { output_quality_score: 1, approved_without_edit: false, edited_before_approval: false, rejected: true, usefulness_score: 1 };
    case "risky":
      return { output_quality_score: 1, approved_without_edit: false, edited_before_approval: false, rejected: true, risk_score: 5, usefulness_score: 1 };
    case "inaccurate":
      return { output_quality_score: 2, approved_without_edit: false, edited_before_approval: false, rejected: true, accuracy_score: 1, usefulness_score: 1 };
    case "wrong_tone":
      return { output_quality_score: 2, approved_without_edit: false, edited_before_approval: true, rejected: false, brand_fit_score: 1, usefulness_score: 2 };
    case "too_expensive_for_result":
      return { output_quality_score: 2, approved_without_edit: false, edited_before_approval: false, rejected: false, usefulness_score: 2 };
  }
}

export interface RecordFeedbackInput {
  ai_usage_ledger_id: string;
  label: FeedbackLabel;
  notes?: string | null;
  edit_summary?: string | null;
  rejection_reason?: string | null;
  founder_rating?: number | null; // 0..5
  reviewer_id?: string | null;
}

/** Record founder feedback for an AI ledger entry and update related rollups. */
export async function recordFeedback(input: RecordFeedbackInput): Promise<{ id: string }> {
  const { data: ledger, error: ledErr } = await supabase
    .from("ai_usage_ledger")
    .select(
      "id,business_id,agent_id,campaign_id,task_category,model_tier,model_provider,model_used,audit_metadata,status,human_approved",
    )
    .eq("id", input.ai_usage_ledger_id)
    .single();
  if (ledErr) throw ledErr;

  const mapped = mapLabel(input.label);
  const meta = (ledger?.audit_metadata as any) ?? {};
  const prompt_template_id: string | null = meta.prompt_template_id ?? meta.template_id ?? null;

  // Redact founder-supplied free text before persisting to scores table.
  const safeNotes = redactSensitive(input.notes ?? null).redacted;
  const safeEdit = redactSensitive(input.edit_summary ?? null).redacted;
  const safeReason = redactSensitive(input.rejection_reason ?? null).redacted;

  const row = {
    ai_usage_ledger_id: ledger!.id,
    business_id: ledger!.business_id,
    agent_id: ledger!.agent_id,
    campaign_id: ledger!.campaign_id,
    task_category: ledger!.task_category,
    model_tier: ledger!.model_tier,
    model_provider: ledger!.model_provider,
    model_used: ledger!.model_used,
    prompt_template_id,
    feedback_label: input.label,
    output_quality_score: mapped.output_quality_score,
    usefulness_score: mapped.usefulness_score ?? null,
    accuracy_score: mapped.accuracy_score ?? null,
    brand_fit_score: mapped.brand_fit_score ?? null,
    risk_score: mapped.risk_score ?? null,
    founder_rating: input.founder_rating ?? mapped.output_quality_score,
    approved_without_edit: mapped.approved_without_edit,
    edited_before_approval: mapped.edited_before_approval,
    rejected: mapped.rejected,
    rejection_reason: mapped.rejected ? (safeReason ?? safeNotes ?? input.label) : null,
    edit_summary: mapped.edited_before_approval ? (safeEdit ?? safeNotes ?? null) : null,
    notes: safeNotes,
    reviewer_id: input.reviewer_id ?? null,
    reviewed_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("ai_quality_scores")
    .insert(row as any)
    .select("id")
    .single();
  if (error) throw error;

  // Mirror feedback into ledger audit_metadata and adjust status when rejected.
  const newAuditMeta = {
    ...meta,
    quality_feedback: {
      score_id: data.id,
      label: input.label,
      output_quality_score: mapped.output_quality_score,
      approved_without_edit: mapped.approved_without_edit,
      edited_before_approval: mapped.edited_before_approval,
      rejected: mapped.rejected,
      reviewer_id: input.reviewer_id ?? null,
      recorded_at: new Date().toISOString(),
    },
  };
  const ledgerPatch: any = { audit_metadata: newAuditMeta };
  if (mapped.rejected) {
    ledgerPatch.status = "rejected";
    ledgerPatch.human_approved = false;
  } else if (mapped.approved_without_edit || mapped.edited_before_approval) {
    ledgerPatch.human_approved = true;
    if (ledger!.status === "human_review_required" || ledger!.status === "pending") {
      ledgerPatch.status = "approved";
    }
  }
  await supabase.from("ai_usage_ledger").update(ledgerPatch).eq("id", ledger!.id);

  return { id: data.id };
}

/* ------------------------------- Rollups ------------------------------- */

export interface QualityRollup {
  key: string | null;
  count: number;
  approved_count: number;
  edited_count: number;
  rejected_count: number;
  avg_quality: number | null;
  approval_rate: number;
  edit_rate: number;
  rejection_rate: number;
  total_spend: number;
  cost_per_approved: number | null;
  cost_per_rejected: number | null;
}

interface JoinedRow {
  ai_usage_ledger_id: string;
  output_quality_score: number | null;
  approved_without_edit: boolean;
  edited_before_approval: boolean;
  rejected: boolean;
  ledger: {
    agent_id: string | null;
    task_category: string | null;
    model_tier: string | null;
    model_provider: string | null;
    model_used: string | null;
    estimated_cost: number | null;
    created_at: string;
  } | null;
  prompt_template_id: string | null;
  created_at: string;
}

async function fetchJoined(opts: { since?: string } = {}): Promise<JoinedRow[]> {
  const since = opts.since ?? new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const [qsRes, ledgerRes] = await Promise.all([
    supabase
      .from("ai_quality_scores")
      .select("ai_usage_ledger_id,output_quality_score,approved_without_edit,edited_before_approval,rejected,prompt_template_id,created_at")
      .gte("created_at", since)
      .limit(5000),
    supabase
      .from("ai_usage_ledger")
      .select("id,agent_id,task_category,model_tier,model_provider,model_used,estimated_cost,created_at")
      .gte("created_at", since)
      .limit(5000),
  ]);
  if (qsRes.error) throw qsRes.error;
  if (ledgerRes.error) throw ledgerRes.error;
  const ledgerMap = new Map<string, any>();
  for (const l of ledgerRes.data ?? []) ledgerMap.set(l.id, l);
  return (qsRes.data ?? []).map((q: any) => ({
    ai_usage_ledger_id: q.ai_usage_ledger_id,
    output_quality_score: q.output_quality_score,
    approved_without_edit: q.approved_without_edit,
    edited_before_approval: q.edited_before_approval,
    rejected: q.rejected,
    prompt_template_id: q.prompt_template_id,
    created_at: q.created_at,
    ledger: ledgerMap.get(q.ai_usage_ledger_id) ?? null,
  }));
}

function summariseGroup(rows: JoinedRow[]): Omit<QualityRollup, "key"> {
  const count = rows.length;
  let sumQ = 0, nQ = 0, approved = 0, edited = 0, rejected = 0;
  let spendApproved = 0, costApprovedN = 0;
  let spendRejected = 0, costRejectedN = 0;
  let totalSpend = 0;
  for (const r of rows) {
    if (r.output_quality_score != null) { sumQ += Number(r.output_quality_score); nQ += 1; }
    if (r.approved_without_edit) approved += 1;
    if (r.edited_before_approval) edited += 1;
    if (r.rejected) rejected += 1;
    const cost = Number(r.ledger?.estimated_cost ?? 0);
    totalSpend += cost;
    if (r.approved_without_edit || r.edited_before_approval) { spendApproved += cost; costApprovedN += 1; }
    if (r.rejected) { spendRejected += cost; costRejectedN += 1; }
  }
  return {
    count,
    approved_count: approved,
    edited_count: edited,
    rejected_count: rejected,
    avg_quality: nQ > 0 ? round(sumQ / nQ, 2) : null,
    approval_rate: count > 0 ? round((approved + edited) / count, 3) : 0,
    edit_rate: count > 0 ? round(edited / count, 3) : 0,
    rejection_rate: count > 0 ? round(rejected / count, 3) : 0,
    total_spend: round(totalSpend),
    cost_per_approved: costApprovedN > 0 ? round(spendApproved / costApprovedN) : null,
    cost_per_rejected: costRejectedN > 0 ? round(spendRejected / costRejectedN) : null,
  };
}

function round(n: number, dp = 2): number { const m = Math.pow(10, dp); return Math.round(n * m) / m; }

function groupBy<T>(rows: T[], pick: (r: T) => string | null): Map<string | null, T[]> {
  const m = new Map<string | null, T[]>();
  for (const r of rows) {
    const k = pick(r);
    if (!m.has(k)) m.set(k, []);
    m.get(k)!.push(r);
  }
  return m;
}

export async function rollupByAgent(since?: string): Promise<QualityRollup[]> {
  const rows = await fetchJoined({ since });
  const grouped = groupBy(rows, (r) => r.ledger?.agent_id ?? null);
  return Array.from(grouped.entries())
    .map(([key, rs]) => ({ key, ...summariseGroup(rs) }))
    .sort((a, b) => b.count - a.count);
}

export async function rollupByTemplate(since?: string): Promise<QualityRollup[]> {
  const rows = await fetchJoined({ since });
  const grouped = groupBy(rows, (r) => r.prompt_template_id);
  return Array.from(grouped.entries())
    .filter(([k]) => k !== null)
    .map(([key, rs]) => ({ key, ...summariseGroup(rs) }))
    .sort((a, b) => b.count - a.count);
}

export interface ModelTierRollup extends QualityRollup {
  task_category: string | null;
  model_tier: string | null;
}

export async function rollupByModelTier(since?: string): Promise<ModelTierRollup[]> {
  const rows = await fetchJoined({ since });
  const grouped = groupBy(rows, (r) => `${r.ledger?.task_category ?? ""}::${r.ledger?.model_tier ?? ""}`);
  return Array.from(grouped.entries()).map(([key, rs]) => {
    const [task_category, model_tier] = (key ?? "::").split("::");
    return {
      key,
      task_category: task_category || null,
      model_tier: model_tier || null,
      ...summariseGroup(rs),
    };
  }).sort((a, b) => (b.count - a.count));
}

/* --------------------------- Recommendations --------------------------- */

export interface QualityRecommendation {
  scope: "agent" | "template" | "task_category";
  key: string;
  severity: "info" | "warning" | "high";
  action: string;
  reason: string;
  metrics: Record<string, number | string | null>;
}

export async function generateRecommendations(): Promise<QualityRecommendation[]> {
  const recs: QualityRecommendation[] = [];

  const agents = await rollupByAgent();
  for (const a of agents) {
    if (a.count < 5 || a.key === null) continue;
    if ((a.avg_quality ?? 5) < 2.5 && a.total_spend > 0) {
      recs.push({
        scope: "agent", key: a.key, severity: "high",
        action: "Downgrade model, change prompt template or require human review.",
        reason: `Agent has low quality (avg ${a.avg_quality}) with spend ${a.total_spend}.`,
        metrics: { avg_quality: a.avg_quality, spend: a.total_spend, rejection_rate: a.rejection_rate },
      });
    }
    if (a.rejection_rate >= 0.4 && a.count >= 10) {
      recs.push({
        scope: "agent", key: a.key, severity: "warning",
        action: "Pause agent or simplify workflow.",
        reason: `Rejection rate ${(a.rejection_rate * 100).toFixed(0)}% over ${a.count} actions.`,
        metrics: { rejection_rate: a.rejection_rate, count: a.count },
      });
    }
    if (a.edit_rate >= 0.6 && a.count >= 10) {
      recs.push({
        scope: "agent", key: a.key, severity: "warning",
        action: "Improve prompt template — outputs almost always need editing.",
        reason: `Edit-before-approval rate ${(a.edit_rate * 100).toFixed(0)}%.`,
        metrics: { edit_rate: a.edit_rate, count: a.count },
      });
    }
  }

  const templates = await rollupByTemplate();
  for (const t of templates) {
    if (t.count < 5 || t.key === null) continue;
    if ((t.avg_quality ?? 5) < 2.5) {
      recs.push({
        scope: "template", key: t.key, severity: "high",
        action: "Retire template.",
        reason: `Template avg quality ${t.avg_quality} across ${t.count} uses.`,
        metrics: { avg_quality: t.avg_quality, count: t.count, rejection_rate: t.rejection_rate },
      });
    } else if ((t.avg_quality ?? 5) < 3.5 || t.rejection_rate >= 0.25) {
      recs.push({
        scope: "template", key: t.key, severity: "warning",
        action: "Improve template.",
        reason: `Quality ${t.avg_quality}, rejection ${(t.rejection_rate * 100).toFixed(0)}%.`,
        metrics: { avg_quality: t.avg_quality, count: t.count, rejection_rate: t.rejection_rate },
      });
    } else {
      recs.push({
        scope: "template", key: t.key, severity: "info",
        action: "Keep template.",
        reason: `Healthy — quality ${t.avg_quality}, approval ${(t.approval_rate * 100).toFixed(0)}%.`,
        metrics: { avg_quality: t.avg_quality, count: t.count, approval_rate: t.approval_rate },
      });
    }
  }

  // Cheap-vs-premium routing recommendation per task category
  const tiers = await rollupByModelTier();
  const byCat = new Map<string, ModelTierRollup[]>();
  for (const t of tiers) {
    if (!t.task_category) continue;
    if (!byCat.has(t.task_category)) byCat.set(t.task_category, []);
    byCat.get(t.task_category)!.push(t);
  }
  for (const [cat, list] of byCat) {
    const cheap = list.find((x) => x.model_tier === "cheap");
    const premium = list.find((x) => x.model_tier === "premium");
    const standard = list.find((x) => x.model_tier === "standard");
    if (cheap && premium && cheap.count >= 5 && premium.count >= 5) {
      const dq = (premium.avg_quality ?? 0) - (cheap.avg_quality ?? 0);
      if (dq <= 0.3) {
        recs.push({
          scope: "task_category", key: cat, severity: "info",
          action: "Route to cheap model — quality is equivalent to premium.",
          reason: `cheap avg ${cheap.avg_quality}, premium avg ${premium.avg_quality} (Δ ${dq.toFixed(2)}).`,
          metrics: { cheap_quality: cheap.avg_quality, premium_quality: premium.avg_quality, cheap_cost_per_approved: cheap.cost_per_approved, premium_cost_per_approved: premium.cost_per_approved },
        });
      }
    }
    if (standard && premium && standard.count >= 5 && premium.count >= 5) {
      const dq = (premium.avg_quality ?? 0) - (standard.avg_quality ?? 0);
      if (dq <= 0.3) {
        recs.push({
          scope: "task_category", key: cat, severity: "info",
          action: "Route to standard model — premium not adding quality.",
          reason: `standard avg ${standard.avg_quality}, premium avg ${premium.avg_quality}.`,
          metrics: { standard_quality: standard.avg_quality, premium_quality: premium.avg_quality },
        });
      }
    }
  }

  return recs;
}

/* ----------------------- Quality-adjusted ROI hook ----------------------- */

export interface QualityFactor {
  factor: number;        // 0..1 multiplier applied to value
  avg_quality: number | null;
  approval_rate: number;
  rejection_rate: number;
  edit_rate: number;
  sample_size: number;
}

/** Compute a 0..1 quality multiplier for the period/scope. Returns 1.0 (neutral) if no feedback. */
export async function qualityFactorForScope(scope: {
  period_start: string;
  period_end: string;
  business_id?: string | null;
  agent_id?: string | null;
  campaign_id?: string | null;
  task_category?: string | null;
}): Promise<QualityFactor> {
  let q = supabase
    .from("ai_quality_scores")
    .select("output_quality_score,approved_without_edit,edited_before_approval,rejected")
    .gte("created_at", scope.period_start)
    .lte("created_at", scope.period_end);
  if (scope.business_id) q = q.eq("business_id", scope.business_id);
  if (scope.agent_id) q = q.eq("agent_id", scope.agent_id);
  if (scope.campaign_id) q = q.eq("campaign_id", scope.campaign_id);
  if (scope.task_category) q = q.eq("task_category", scope.task_category);
  const { data, error } = await q;
  if (error) throw error;
  const rows = data ?? [];
  if (rows.length === 0) {
    return { factor: 1, avg_quality: null, approval_rate: 1, rejection_rate: 0, edit_rate: 0, sample_size: 0 };
  }
  let sumQ = 0, nQ = 0, approved = 0, edited = 0, rejected = 0;
  for (const r of rows) {
    const q = Number((r as any).output_quality_score ?? 0);
    if (q > 0) { sumQ += q; nQ += 1; }
    if ((r as any).approved_without_edit) approved += 1;
    if ((r as any).edited_before_approval) edited += 1;
    if ((r as any).rejected) rejected += 1;
  }
  const avg_quality = nQ > 0 ? sumQ / nQ : null;
  const approval_rate = (approved + edited) / rows.length;
  const rejection_rate = rejected / rows.length;
  const edit_rate = edited / rows.length;
  // Multiplier: quality (0..1 from 5-point scale) * (1 - rejection_rate)
  const qualityPart = avg_quality != null ? Math.max(0, Math.min(1, avg_quality / 5)) : 1;
  const factor = round(Math.max(0, qualityPart * (1 - rejection_rate)), 3);
  return {
    factor,
    avg_quality: avg_quality != null ? round(avg_quality, 2) : null,
    approval_rate: round(approval_rate, 3),
    rejection_rate: round(rejection_rate, 3),
    edit_rate: round(edit_rate, 3),
    sample_size: rows.length,
  };
}