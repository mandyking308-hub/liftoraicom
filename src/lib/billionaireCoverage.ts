import { supabase } from "@/integrations/supabase/client";

const sb: any = supabase as any;

export type Coverage = {
  id: string;
  billionaire_id: string;
  full_name: string | null;
  citizenship: string | null;
  primary_industry: string | null;
  verified_institutional_routes: number;
  verified_intermediary_routes: number;
  candidate_route_count: number;
  foundation_count: number;
  family_office_count: number;
  company_route_count: number;
  enrichment_status: string;
  outreach_readiness: string;
  outreach_blocker_reason: string | null;
  last_enriched_at: string | null;
  next_enrichment_priority: number;
  research_confidence: number;
  historical_networth_usd_m: number | null;
  historical_networth_as_of: string | null;
  current_networth_usd_m: number | null;
  current_networth_as_of: string | null;
  wealth_data_freshness: string;
  wealth_trajectory: string;
  liquidity_capacity_score: number;
  urgency_priority_score: number;
  ghat_fit_score: number;
  philanthropy_intensity_score: number;
  health_relevance_score: number;
  africa_relevance_score: number;
  has_foundation: boolean;
  has_family_office: boolean;
  ghat_priority_score: number;
};

export type CoverageFilters = {
  search?: string;
  country?: string;
  industry?: string;
  routeState?: string;      // verified | candidate_only | none
  readiness?: string;
  freshness?: string;
  trajectory?: string;
  minGhat?: number;
  minCapacity?: number;
  routeType?: string;       // foundation | family_office | company
};

export const ROUTE_STATE_LABEL: Record<string, string> = {
  verified: "Verified route",
  candidate_only: "Candidate only (unverified)",
  none: "No route yet",
};

export function routeState(c: Coverage) {
  if (c.verified_institutional_routes + c.verified_intermediary_routes > 0) return "verified";
  if (c.candidate_route_count > 0) return "candidate_only";
  return "none";
}

export function isStaleWealth(c: Coverage) {
  return ["stale", "historical", "unknown"].includes(c.wealth_data_freshness);
}

function applyFilters(q: any, f: CoverageFilters) {
  if (f.search) q = q.ilike("full_name", `%${f.search}%`);
  if (f.country) q = q.eq("citizenship", f.country);
  if (f.industry) q = q.eq("primary_industry", f.industry);
  if (f.readiness) q = q.eq("outreach_readiness", f.readiness);
  if (f.freshness) q = q.eq("wealth_data_freshness", f.freshness);
  if (f.trajectory) q = q.eq("wealth_trajectory", f.trajectory);
  if (f.minGhat) q = q.gte("ghat_priority_score", f.minGhat);
  if (f.minCapacity) q = q.gte("liquidity_capacity_score", f.minCapacity);
  if (f.routeType === "foundation") q = q.gt("foundation_count", 0);
  if (f.routeType === "family_office") q = q.gt("family_office_count", 0);
  if (f.routeType === "company") q = q.gt("company_route_count", 0);
  if (f.routeState === "verified") q = q.or("verified_institutional_routes.gt.0,verified_intermediary_routes.gt.0");
  if (f.routeState === "candidate_only")
    q = q.eq("verified_institutional_routes", 0).eq("verified_intermediary_routes", 0).gt("candidate_route_count", 0);
  if (f.routeState === "none")
    q = q.eq("verified_institutional_routes", 0).eq("verified_intermediary_routes", 0).eq("candidate_route_count", 0);
  return q;
}

export async function fetchCoverage(f: CoverageFilters, limit = 100): Promise<Coverage[]> {
  let q = sb.from("billionaire_coverage").select("*").order("ghat_priority_score", { ascending: false }).limit(limit);
  q = applyFilters(q, f);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Coverage[];
}

async function countWhere(build: (q: any) => any) {
  let q = sb.from("billionaire_coverage").select("id", { count: "exact", head: true });
  q = build(q);
  const { count, error } = await q;
  if (error) throw error;
  return count ?? 0;
}

export type CoverageStats = {
  universe: number;
  verified: number;
  candidate_only: number;
  no_route: number;
  outreach_ready: number;
  stale_wealth: number;
  foundations: number;
  family_offices: number;
  high_priority: number;
  queued: number;
};

export async function fetchCoverageStats(): Promise<CoverageStats> {
  const [universe, verified, candidate_only, no_route, outreach_ready, stale_wealth, foundations, family_offices, high_priority] =
    await Promise.all([
      countWhere(q => q),
      countWhere(q => q.or("verified_institutional_routes.gt.0,verified_intermediary_routes.gt.0")),
      countWhere(q => q.eq("verified_institutional_routes", 0).eq("verified_intermediary_routes", 0).gt("candidate_route_count", 0)),
      countWhere(q => q.eq("verified_institutional_routes", 0).eq("verified_intermediary_routes", 0).eq("candidate_route_count", 0)),
      countWhere(q => q.in("outreach_readiness", ["ready", "ready_low_confidence"])),
      countWhere(q => q.in("wealth_data_freshness", ["stale", "historical", "unknown"])),
      countWhere(q => q.gt("foundation_count", 0)),
      countWhere(q => q.gt("family_office_count", 0)),
      countWhere(q => q.gte("ghat_priority_score", 60)),
    ]);
  const { count: queued } = await sb
    .from("billionaire_enrichment_queue")
    .select("id", { count: "exact", head: true })
    .in("status", ["pending", "in_progress", "needs_manual_review"]);
  return { universe, verified, candidate_only, no_route, outreach_ready, stale_wealth, foundations, family_offices, high_priority, queued: queued ?? 0 };
}

export type QueueItem = {
  id: string;
  billionaire_id: string;
  status: string;
  priority: number;
  attempts: number;
  batch_key: string | null;
  last_checked_at: string | null;
  next_check_at: string;
  source_types_checked: string[];
  notes: string | null;
};

export async function fetchQueue(status: string, limit = 100) {
  let q = sb.from("billionaire_enrichment_queue").select("*").order("priority", { ascending: false }).limit(limit);
  if (status) q = q.eq("status", status);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as QueueItem[];
}

export async function updateQueueBatch(ids: string[], patch: Partial<QueueItem>) {
  const { error } = await sb.from("billionaire_enrichment_queue").update({ ...patch, last_checked_at: new Date().toISOString() }).in("id", ids);
  if (error) throw error;
}

export async function fetchCandidateRoutes(billionaireId: string) {
  const { data, error } = await sb.from("billionaire_candidate_routes").select("*").eq("billionaire_id", billionaireId);
  if (error) throw error;
  return data ?? [];
}

export async function rebuildCoverage() {
  const { data, error } = await sb.rpc("rebuild_billionaire_coverage");
  if (error) throw error;
  return data;
}

export async function fetchFacets() {
  const { data, error } = await sb.from("billionaire_coverage").select("citizenship,primary_industry").limit(3000);
  if (error) throw error;
  const countries = Array.from(new Set((data ?? []).map((r: any) => r.citizenship).filter(Boolean))).sort();
  const industries = Array.from(new Set((data ?? []).map((r: any) => r.primary_industry).filter(Boolean))).sort();
  return { countries: countries as string[], industries: industries as string[] };
}
