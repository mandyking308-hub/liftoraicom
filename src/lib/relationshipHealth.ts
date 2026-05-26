import { supabase } from "@/integrations/supabase/client";

export type RelType = "customer"|"seller"|"partner"|"vendor"|"adviser"|"prospect"|"other";
export type RelStatus = "excellent"|"healthy"|"watch"|"at_risk"|"critical"|"unknown";
export type EventType = "positive_signal"|"complaint"|"missed_response"|"payment_issue"|"support_issue"|"upgrade_signal"|"churn_signal"|"seller_quality_issue"|"partner_signal"|"other";
export type OppType = "upgrade"|"renewal"|"retention"|"referral"|"seller_growth"|"partner_growth"|"recovery"|"human_callback"|"other";
export type OppStatus = "new"|"watch"|"approval_required"|"approved"|"actioned"|"won"|"lost"|"parked";

export interface HealthScore {
  id: string;
  business_id: string | null;
  identity_profile_id: string | null;
  relationship_type: RelType;
  health_score: number;
  value_score: number;
  risk_score: number;
  sentiment_score: number;
  engagement_score: number;
  trust_score: number;
  relationship_status: RelStatus;
  recommended_action: string | null;
  created_at: string;
  updated_at: string;
  audit_metadata: Record<string, any>;
}

export interface HealthEvent {
  id: string;
  health_score_id: string;
  event_type: EventType;
  event_summary: string | null;
  score_impact: number;
  created_at: string;
  audit_metadata: Record<string, any>;
}

export interface Opportunity {
  id: string;
  business_id: string | null;
  identity_profile_id: string | null;
  opportunity_type: OppType;
  opportunity_summary: string | null;
  estimated_value: number | null;
  currency: string | null;
  probability_score: number | null;
  approval_required: boolean;
  status: OppStatus;
  created_at: string;
  updated_at: string;
}

const sb: any = supabase as any;

export async function listScores(type?: RelType, limit = 300) {
  let q = sb.from("relationship_health_scores").select("*").order("health_score", { ascending: true }).limit(limit);
  if (type) q = q.eq("relationship_type", type);
  const { data } = await q;
  return (data ?? []) as HealthScore[];
}

export async function listEvents(scoreId?: string, limit = 200) {
  let q = sb.from("relationship_health_events").select("*").order("created_at", { ascending: false }).limit(limit);
  if (scoreId) q = q.eq("health_score_id", scoreId);
  const { data } = await q;
  return (data ?? []) as HealthEvent[];
}

export async function listOpportunities(filters?: { status?: OppStatus; type?: OppType; limit?: number }) {
  let q = sb.from("relationship_opportunities").select("*").order("created_at", { ascending: false }).limit(filters?.limit ?? 200);
  if (filters?.status) q = q.eq("status", filters.status);
  if (filters?.type) q = q.eq("opportunity_type", filters.type);
  const { data } = await q;
  return (data ?? []) as Opportunity[];
}

export interface RelHealthSummary {
  total: number;
  byStatus: Record<RelStatus, number>;
  byType: Record<RelType, number>;
  atRisk: number;
  critical: number;
  upgradeOpps: number;
  retentionOpps: number;
  oppsAwaitingApproval: number;
  watchItems: string[];
}

const EMPTY_STATUS: Record<RelStatus, number> = { excellent:0, healthy:0, watch:0, at_risk:0, critical:0, unknown:0 };
const EMPTY_TYPE: Record<RelType, number> = { customer:0, seller:0, partner:0, vendor:0, adviser:0, prospect:0, other:0 };

export async function summariseRelationshipHealth(): Promise<RelHealthSummary> {
  const [scores, opps] = await Promise.all([
    sb.from("relationship_health_scores").select("relationship_type,relationship_status").limit(2000),
    sb.from("relationship_opportunities").select("opportunity_type,status").limit(1000),
  ]);
  const s = (scores.data ?? []) as Array<{ relationship_type: RelType; relationship_status: RelStatus }>;
  const o = (opps.data ?? []) as Array<{ opportunity_type: OppType; status: OppStatus }>;
  const byStatus = { ...EMPTY_STATUS };
  const byType = { ...EMPTY_TYPE };
  for (const r of s) { byStatus[r.relationship_status]++; byType[r.relationship_type]++; }
  const atRisk = byStatus.at_risk;
  const critical = byStatus.critical;
  const upgradeOpps = o.filter(x => x.opportunity_type === "upgrade" && x.status !== "lost" && x.status !== "parked").length;
  const retentionOpps = o.filter(x => x.opportunity_type === "retention" && x.status !== "lost").length;
  const awaitingApproval = o.filter(x => x.status === "approval_required").length;
  const watch: string[] = [];
  if (critical > 0) watch.push(`${critical} critical relationship(s)`);
  if (atRisk > 0) watch.push(`${atRisk} at-risk relationship(s)`);
  if (awaitingApproval > 0) watch.push(`${awaitingApproval} opportunity action(s) awaiting approval`);
  return { total: s.length, byStatus, byType, atRisk, critical, upgradeOpps, retentionOpps, oppsAwaitingApproval: awaitingApproval, watchItems: watch };
}

export function statusTone(s: RelStatus): "ok"|"warn"|"bad"|undefined {
  if (s === "excellent" || s === "healthy") return "ok";
  if (s === "watch") return "warn";
  if (s === "at_risk" || s === "critical") return "bad";
  return undefined;
}
