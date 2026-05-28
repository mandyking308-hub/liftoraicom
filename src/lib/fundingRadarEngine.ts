import { supabase } from "@/integrations/supabase/client";

export const WEIGHTS = {
  capital_efficiency_advantage_score: 0.30,
  ai_automation_advantage_score: 0.25,
  recurring_revenue_score: 0.15,
  investor_validation_score: 0.15,
  global_expansion_score: 0.15,
} as const;

export type ScoreInput = {
  capital_efficiency_advantage_score?: number | null;
  ai_automation_advantage_score?: number | null;
  recurring_revenue_score?: number | null;
  investor_validation_score?: number | null;
  global_expansion_score?: number | null;
};

export function computeTotalScore(s: ScoreInput): number {
  const total =
    Number(s.capital_efficiency_advantage_score ?? 0) * WEIGHTS.capital_efficiency_advantage_score +
    Number(s.ai_automation_advantage_score ?? 0) * WEIGHTS.ai_automation_advantage_score +
    Number(s.recurring_revenue_score ?? 0) * WEIGHTS.recurring_revenue_score +
    Number(s.investor_validation_score ?? 0) * WEIGHTS.investor_validation_score +
    Number(s.global_expansion_score ?? 0) * WEIGHTS.global_expansion_score;
  return Math.round(total);
}

/**
 * Legal/IP safety: the radar may only extract these public-thesis fields.
 * Anything else (names, branding, copy, UI, code, customer lists, proprietary workflows,
 * confidential documents or restricted scraped data) is forbidden.
 */
export const ALLOWED_EXTRACTION_FIELDS = [
  "problem_thesis",
  "customer_pain",
  "market_validation",
  "buyer_type",
  "pricing_logic",
  "revenue_model_pattern",
  "publicly_visible_weakness",
  "distinct_execution_route",
] as const;

export const FORBIDDEN_EXTRACTION_FIELDS = [
  "company_name_copy",
  "branding",
  "website_copy",
  "ui_design",
  "source_code",
  "customer_lists",
  "proprietary_workflows",
  "confidential_documents",
  "scraped_restricted_data",
] as const;

export function sanitizeExtraction<T extends Record<string, unknown>>(input: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(input)) {
    if ((FORBIDDEN_EXTRACTION_FIELDS as readonly string[]).includes(k)) continue;
    out[k] = input[k];
  }
  return out as Partial<T>;
}

export const CAPITAL_EFFICIENCY_QUESTIONS = [
  { key: "staff_heavy", q: "Is this company staff-heavy?" },
  { key: "sales_heavy", q: "Is it sales-heavy?" },
  { key: "onboarding_heavy", q: "Is onboarding heavy?" },
  { key: "support_heavy", q: "Is support heavy?" },
  { key: "compliance_heavy", q: "Is compliance heavy?" },
  { key: "delivery_manual", q: "Is delivery manual?" },
  { key: "ai_can_collapse_cost", q: "Can AI collapse the operating cost?" },
  { key: "liftor_can_operate", q: "Can Liftor run this with AI + small human oversight?" },
] as const;

export const NEEDS_VERIFICATION = "Needs verification";

/**
 * Canonical CSV import template for the Funding Radar.
 * Order matters — the downloaded template uses this exact column order.
 */
export const FUNDING_CSV_TEMPLATE_COLUMNS = [
  "company_name",
  "website",
  "country",
  "region",
  "sector",
  "subsector",
  "year_founded",
  "latest_funding_round",
  "latest_funding_amount",
  "currency",
  "total_funding_amount",
  "valuation_amount",
  "lead_investor",
  "investors",
  "funding_announcement_date",
  "source_name",
  "source_url",
  "problem_solved",
  "customer_type",
  "evidence_of_customer_traction",
  "evidence_of_recurring_use",
  "pricing_model_visible",
  "problem_recurrence_type",
  "team_heavy_signal",
  "sales_heavy_signal",
  "onboarding_heavy_signal",
  "support_heavy_signal",
  "compliance_heavy_signal",
  "manual_delivery_signal",
  "ai_automation_opportunity",
  "liftor_legally_distinct_angle",
  "legal_ip_risk",
  "compliance_complexity",
  "marketplace_complexity",
  "notes",
] as const;

export const FUNDING_CSV_REQUIRED_FIELDS = [
  "company_name",
  "latest_funding_round",
  "source_url",
  "problem_solved",
  "customer_type",
  "legal_ip_risk",
] as const;

export function buildCsvTemplate(): string {
  const headers = FUNDING_CSV_TEMPLATE_COLUMNS.join(",");
  const example = [
    "[DEMO] Example Co",
    "https://example.com",
    "USA",
    "North America",
    "fintech",
    "lending",
    "2021",
    "series_b",
    "30000000",
    "USD",
    "55000000",
    "300000000",
    "Acme Ventures",
    "Acme Ventures; Beta Partners",
    "2026-01-15",
    "TechCrunch",
    "https://techcrunch.com/...",
    "Manual loan reconciliation drains ops teams",
    "B2B mid-market lenders",
    "30+ logos cited publicly",
    "Daily reconciliation cycles",
    "per-seat + per-loan fee",
    "recurring",
    "TRUE",
    "TRUE",
    "FALSE",
    "TRUE",
    "TRUE",
    "TRUE",
    "AI can collapse manual reconciliation",
    "Distinct AI-first reconciliation route, no copying",
    "low",
    "medium",
    "low",
    "Demo seed row — replace before live use",
  ].map((c) => (/[",\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(",");
  const note =
    "# Liftor Funding Radar import template. Required: company_name, latest_funding_round, source_url, problem_solved, customer_type, legal_ip_risk. Never include branding, code, customer lists, or restricted scraped data.";
  return [note, headers, example].join("\n");
}

export function validateCsvRow(row: Record<string, string>): string[] {
  const warnings: string[] = [];
  for (const f of FUNDING_CSV_REQUIRED_FIELDS) {
    if (!row[f] || !String(row[f]).trim()) warnings.push(`Missing ${f}`);
  }
  const round = (row.latest_funding_round ?? row.last_funding_round ?? "").toLowerCase();
  if (round && /^(pre[-_ ]?seed|seed)$/.test(round.replace(/\s+/g, ""))) {
    warnings.push("Below seed-eligibility threshold (will be excluded from monthly run)");
  }
  return warnings;
}

export function parseCsv(csv: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = csv
    .split(/\r?\n/)
    .filter((l) => l.trim().length > 0 && !l.trim().startsWith("#"));
  if (lines.length === 0) return { headers: [], rows: [] };
  const splitLine = (line: string): string[] => {
    const out: string[] = [];
    let cur = "";
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') { inQuote = !inQuote; continue; }
      if (c === "," && !inQuote) { out.push(cur); cur = ""; continue; }
      cur += c;
    }
    out.push(cur);
    return out.map((s) => s.trim());
  };
  const headers = splitLine(lines[0]).map((h) => h.toLowerCase().replace(/\s+/g, "_"));
  const rows = lines.slice(1).map((line) => {
    const cells = splitLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = cells[i] ?? ""; });
    return row;
  });
  return { headers, rows };
}

export async function fetchCompanies() {
  const { data, error } = await (supabase as any)
    .from("funding_radar_companies")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchClusters() {
  const { data, error } = await (supabase as any)
    .from("funding_problem_clusters")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchShortlist() {
  const { data, error } = await (supabase as any)
    .from("funding_shortlist")
    .select("*, funding_radar_companies(company_name, sector, last_funding_amount_usd), funding_problem_clusters(cluster_name)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchMonthlyRuns() {
  const { data, error } = await (supabase as any)
    .from("funding_monthly_runs")
    .select("*")
    .order("year", { ascending: false })
    .order("month", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchImports() {
  const { data, error } = await (supabase as any)
    .from("funding_imports")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchScoresForCompany(id: string) {
  const { data, error } = await (supabase as any)
    .from("funding_radar_scores")
    .select("*")
    .eq("funding_company_id", id)
    .order("scored_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// ============================================================================
// Watchlist + Weakness Signal Engine
// ============================================================================

export const WATCH_PRIORITIES = ["low", "medium", "high", "critical"] as const;
export const WATCH_STATUSES = ["active", "paused", "archived"] as const;

export const SIGNAL_TYPES_NEGATIVE = [
  "customer_complaint","poor_review","support_issue","onboarding_issue","pricing_complaint",
  "product_complexity","slow_implementation","failed_launch","delayed_expansion",
  "leadership_exit","founder_exit","senior_hire_departure","layoffs","hiring_freeze",
  "funding_pressure","down_round","regulatory_pressure","compliance_issue",
  "integration_problem","churn_signal","competitor_pressure","market_confusion",
  "trust_issue","geographic_expansion_problem","marketplace_supply_problem",
  "marketplace_demand_problem",
] as const;

export const SIGNAL_TYPES_POSITIVE = [
  "public_praise","strong_customer_love","strong_growth_signal",
] as const;

export const SIGNAL_TYPES_NEUTRAL = ["neutral_update"] as const;

export const ALL_SIGNAL_TYPES = [
  ...SIGNAL_TYPES_NEGATIVE,
  ...SIGNAL_TYPES_POSITIVE,
  ...SIGNAL_TYPES_NEUTRAL,
] as const;

export type SignalType = (typeof ALL_SIGNAL_TYPES)[number];
export type SignalPolarity = "positive" | "negative" | "neutral";

export function polarityForSignalType(t: string): SignalPolarity {
  if ((SIGNAL_TYPES_POSITIVE as readonly string[]).includes(t)) return "positive";
  if ((SIGNAL_TYPES_NEUTRAL as readonly string[]).includes(t)) return "neutral";
  return "negative";
}

/**
 * Watchlist + Weakness Signal scoring.
 * Inputs are arrays of signals for a single company.
 */
export type SignalLite = {
  signal_type: string;
  signal_polarity?: string | null;
  severity_score?: number | null;
  confidence_score?: number | null;
  relevance_to_liftor_score?: number | null;
  customer_pain_relevance?: number | null;
  capital_efficiency_relevance?: number | null;
};

function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}

/** Severity-weighted average across negative signals only. */
export function computeWeaknessSignalScore(signals: SignalLite[]): number {
  const neg = signals.filter((s) => (s.signal_polarity ?? polarityForSignalType(s.signal_type)) === "negative");
  if (neg.length === 0) return 0;
  const weighted = neg.map((s) => {
    const sev = Number(s.severity_score ?? 0);
    const conf = Number(s.confidence_score ?? 70) / 100;
    return sev * conf;
  });
  return Math.min(100, Math.round(avg(weighted) * Math.min(1, 0.6 + neg.length * 0.05)));
}

export function computeCustomerPainEvidenceScore(signals: SignalLite[]): number {
  const r = signals
    .filter((s) => ["customer_complaint","poor_review","support_issue","onboarding_issue","pricing_complaint","product_complexity","churn_signal","trust_issue"].includes(s.signal_type))
    .map((s) => Number(s.customer_pain_relevance ?? s.severity_score ?? 0));
  return Math.min(100, avg(r));
}

export function computeCapitalDragScore(signals: SignalLite[]): number {
  const r = signals
    .filter((s) => ["layoffs","hiring_freeze","funding_pressure","down_round","slow_implementation","support_issue","onboarding_issue","integration_problem","marketplace_supply_problem","marketplace_demand_problem"].includes(s.signal_type))
    .map((s) => Number(s.capital_efficiency_relevance ?? s.severity_score ?? 0));
  return Math.min(100, avg(r));
}

export function computeExecutionGapScore(signals: SignalLite[]): number {
  const r = signals
    .filter((s) => ["failed_launch","delayed_expansion","slow_implementation","leadership_exit","founder_exit","senior_hire_departure","integration_problem","market_confusion"].includes(s.signal_type))
    .map((s) => Number(s.severity_score ?? 0));
  return Math.min(100, avg(r));
}

export function computeOpportunityTimingScore(signals: SignalLite[]): number {
  // Mix of weakness presence and recency proxy (more signals -> hotter timing).
  const w = computeWeaknessSignalScore(signals);
  const volume = Math.min(100, signals.length * 10);
  return Math.round((w + volume) / 2);
}

export function computeLiftorAdvantageScore(signals: SignalLite[]): number {
  if (signals.length === 0) return 0;
  return Math.min(100, avg(signals.map((s) => Number(s.relevance_to_liftor_score ?? 0))));
}

/** Higher = lower legal risk. Defaults to 70 (cautious-clean) when no notes/signals. */
export function computeLegalIpSafetyScore(legalIpRiskNotesCount: number): number {
  if (legalIpRiskNotesCount === 0) return 80;
  return Math.max(20, 80 - legalIpRiskNotesCount * 15);
}

export function computeWatchPriorityScore(input: {
  weakness: number; capitalDrag: number; executionGap: number; liftorAdvantage: number; timing: number;
}): number {
  return Math.round(
    input.weakness * 0.20 +
    input.capitalDrag * 0.20 +
    input.executionGap * 0.15 +
    input.liftorAdvantage * 0.30 +
    input.timing * 0.15
  );
}

/** Aggregate every score in one pass. */
export function computeWatchlistScores(signals: SignalLite[], legalIpRiskNotesCount = 0) {
  const weakness = computeWeaknessSignalScore(signals);
  const customerPain = computeCustomerPainEvidenceScore(signals);
  const capitalDrag = computeCapitalDragScore(signals);
  const executionGap = computeExecutionGapScore(signals);
  const timing = computeOpportunityTimingScore(signals);
  const liftorAdvantage = computeLiftorAdvantageScore(signals);
  const legalIpSafety = computeLegalIpSafetyScore(legalIpRiskNotesCount);
  const watchPriority = computeWatchPriorityScore({ weakness, capitalDrag, executionGap, liftorAdvantage, timing });
  return { weakness, customerPain, capitalDrag, executionGap, timing, liftorAdvantage, legalIpSafety, watchPriority };
}

export const WEAKNESS_SIGNAL_CSV_COLUMNS = [
  "company_name","website","signal_type","signal_title","signal_summary",
  "source_name","source_url","source_type","signal_date",
  "confidence_score","severity_score","relevance_to_liftor_score","founder_notes",
] as const;

/** Module-level rules: what may NEVER happen with the Watchlist + Weakness Signal Engine. */
export const WATCHLIST_FORBIDDEN_ACTIONS = [
  "Contacting employees","Contacting leavers","Contacting customers","Contacting investors",
  "Contacting acquirers","Contacting competitors","Impersonating anyone",
  "Collecting private information","Scraping restricted platforms","Bypassing terms of service",
  "Publishing allegations","Making defamatory claims","Creating attack campaigns",
  "Harassing competitors",
] as const;

// ============================================================================
// Market Crowding + White Space Engine
// ============================================================================

export const MARKET_STAGES = [
  "emerging","growing","mature","saturated","declining","fragmented","consolidating",
] as const;
export type MarketStage = typeof MARKET_STAGES[number];

export const CROWDING_LEVELS = ["low","moderate","high","extreme"] as const;
export const SATURATION_LEVELS = ["low","moderate","high","extreme"] as const;

export const ENTRY_STRATEGIES = [
  "AVOID_TOO_SATURATED","AVOID_WINNER_TAKES_MOST","WATCH_TOO_EARLY","WATCH_CROWDED_BUT_INTERESTING",
  "BUILD_NICHE_WEDGE","BUILD_VERTICAL_VERSION","BUILD_GEOGRAPHIC_VERSION","BUILD_MANAGED_SERVICE_FIRST",
  "PARTNER_OR_ACQUIRE_LATER",
] as const;
export type EntryStrategy = typeof ENTRY_STRATEGIES[number];

export const ENTRY_STRATEGY_LABEL: Record<EntryStrategy, string> = {
  AVOID_TOO_SATURATED: "Avoid — too saturated",
  AVOID_WINNER_TAKES_MOST: "Avoid — winner takes most",
  WATCH_TOO_EARLY: "Watch — too early",
  WATCH_CROWDED_BUT_INTERESTING: "Watch — crowded but interesting",
  BUILD_NICHE_WEDGE: "Build niche wedge",
  BUILD_VERTICAL_VERSION: "Build vertical version",
  BUILD_GEOGRAPHIC_VERSION: "Build geographic version",
  BUILD_MANAGED_SERVICE_FIRST: "Build managed-service first",
  PARTNER_OR_ACQUIRE_LATER: "Partner / acquire later",
};

export const CROWDED_MARKET_SIGNALS = [
  "Many funded companies solving same problem","Many similar websites/products",
  "Heavy paid advertising competition","Similar positioning across players",
  "Pricing pressure","Feature parity","Customer complaints about sameness",
  "High switching difficulty","Low differentiation","Dominant incumbent control",
  "Marketplace liquidity lock-in","Regulatory lock-in","Distribution channel capture",
  "Long sales-cycle difficulty",
] as const;

export const WHITE_SPACE_SIGNALS = [
  "Underserved niche customer","Underserved geography","Underserved smaller business segment",
  "Expensive incumbent pricing","Poor onboarding feedback","Slow implementation complaints",
  "Weak support complaints","Weak localisation","Bad UX","Compliance/admin burden unresolved",
  "Customers using spreadsheets/workarounds","Strong demand but poor trust",
  "Vertical-specific needs ignored by horizontal platforms","Market fragmented with no trusted operating layer",
] as const;

export type MarketMapInput = {
  number_of_known_competitors?: number | null;
  number_of_funded_companies?: number | null;
  fragmentation_score?: number | null;
  buyer_education_score?: number | null;
  switching_difficulty_score?: number | null;
  distribution_difficulty_score?: number | null;
  pricing_pressure_score?: number | null;
  ai_disruption_potential_score?: number | null;
  white_space_score?: number | null;
  market_stage?: MarketStage | null;
  dominant_players?: any[] | null;
};

export function deriveCrowdingLevel(m: MarketMapInput): "low"|"moderate"|"high"|"extreme" {
  const funded = Number(m.number_of_funded_companies ?? 0);
  const comps = Number(m.number_of_known_competitors ?? 0);
  const total = funded + comps;
  if (total >= 40) return "extreme";
  if (total >= 20) return "high";
  if (total >= 8) return "moderate";
  return "low";
}

export function deriveSaturationRisk(m: MarketMapInput): "low"|"moderate"|"high"|"extreme" {
  const pricing = Number(m.pricing_pressure_score ?? 0);
  const ws = Number(m.white_space_score ?? 50);
  const dom = Array.isArray(m.dominant_players) ? m.dominant_players.length : 0;
  let s = pricing * 0.5 + (100 - ws) * 0.4 + Math.min(50, dom * 10) * 0.1;
  if (m.market_stage === "saturated" || m.market_stage === "declining") s += 20;
  s = Math.min(100, s);
  if (s >= 75) return "extreme";
  if (s >= 55) return "high";
  if (s >= 30) return "moderate";
  return "low";
}

/**
 * Liftor entry score: higher = better fit for Liftor's risk-averse, AI-led, capital-efficient wedge.
 * Rewards AI disruption potential, fragmentation, white space; penalises distribution/switching difficulty
 * and pricing pressure.
 */
export function computeLiftorEntryScore(m: MarketMapInput): number {
  const ai = Number(m.ai_disruption_potential_score ?? 0);
  const ws = Number(m.white_space_score ?? 0);
  const frag = Number(m.fragmentation_score ?? 0);
  const buyerEdu = Number(m.buyer_education_score ?? 50);
  const dist = Number(m.distribution_difficulty_score ?? 50);
  const sw = Number(m.switching_difficulty_score ?? 50);
  const price = Number(m.pricing_pressure_score ?? 50);
  const positive = ai * 0.30 + ws * 0.25 + frag * 0.15 + buyerEdu * 0.10;
  const negative = dist * 0.10 + sw * 0.05 + price * 0.05;
  return Math.max(0, Math.min(100, Math.round(positive - negative + 30)));
}

export function recommendEntryStrategy(m: MarketMapInput & {
  liftor_entry_score?: number | null;
}): { strategy: EntryStrategy; reason: string } {
  const crowding = deriveCrowdingLevel(m);
  const saturation = deriveSaturationRisk(m);
  const ws = Number(m.white_space_score ?? 0);
  const ai = Number(m.ai_disruption_potential_score ?? 0);
  const frag = Number(m.fragmentation_score ?? 0);
  const dom = Array.isArray(m.dominant_players) ? m.dominant_players.length : 0;
  const entry = Number(m.liftor_entry_score ?? computeLiftorEntryScore(m));

  if (saturation === "extreme" && ws < 25)
    return { strategy: "AVOID_TOO_SATURATED", reason: "Saturation risk extreme and visible white space is minimal — commodity trap." };
  if (dom >= 3 && Number(m.switching_difficulty_score ?? 0) >= 70 && ws < 35)
    return { strategy: "AVOID_WINNER_TAKES_MOST", reason: "Few dominant players with high switching cost; winner-takes-most dynamics." };
  if (m.market_stage === "emerging" && Number(m.buyer_education_score ?? 0) < 30)
    return { strategy: "WATCH_TOO_EARLY", reason: "Market still in education phase; revisit when buyers self-pull." };
  if (frag >= 60 && ai >= 60)
    return { strategy: "BUILD_VERTICAL_VERSION", reason: "Fragmented market with high AI disruption potential — vertical AI-native version is the wedge." };
  if (ws >= 60 && entry >= 60 && Number(m.distribution_difficulty_score ?? 0) <= 50)
    return { strategy: "BUILD_NICHE_WEDGE", reason: "Strong white space, low distribution friction — niche wedge entry." };
  if (Number(m.distribution_difficulty_score ?? 0) >= 70 && ai >= 50)
    return { strategy: "BUILD_MANAGED_SERVICE_FIRST", reason: "Distribution is hard; lead with managed service to learn before product." };
  if (ws >= 50 && (m.market_stage === "growing" || m.market_stage === "fragmented"))
    return { strategy: "BUILD_GEOGRAPHIC_VERSION", reason: "Underserved geographies inside a growing market — localise first." };
  if (crowding === "high" || crowding === "extreme")
    return { strategy: "WATCH_CROWDED_BUT_INTERESTING", reason: "Market is crowded but proven — watch for fragmentation or weakness signals before entering." };
  return { strategy: "PARTNER_OR_ACQUIRE_LATER", reason: "Insufficient direct edge — better positioned for partner/acquire path later." };
}

export async function fetchMarketMaps() {
  const { data, error } = await (supabase as any)
    .from("funding_market_maps")
    .select("*, funding_problem_clusters(cluster_name)")
    .order("liftor_entry_score", { ascending: false, nullsFirst: false })
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchWhiteSpaceOpportunities() {
  const { data, error } = await (supabase as any)
    .from("funding_white_space_opportunities")
    .select("*, funding_market_maps(market_name, sector, geography), funding_problem_clusters(cluster_name)")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// CRUD helpers ---------------------------------------------------------------

export async function fetchWatchlist() {
  const { data, error } = await (supabase as any)
    .from("funding_watchlist")
    .select("*, funding_radar_companies(company_name, website, sector, last_funding_round, last_funding_amount_usd, country, cluster_id), funding_problem_clusters(cluster_name)")
    .order("priority", { ascending: false })
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchWatchlistEntry(id: string) {
  const { data, error } = await (supabase as any)
    .from("funding_watchlist")
    .select("*, funding_radar_companies(*), funding_problem_clusters(*)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchSignalsForCompany(companyId: string) {
  const { data, error } = await (supabase as any)
    .from("funding_weakness_signals")
    .select("*")
    .eq("company_id", companyId)
    .order("signal_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchAllSignals() {
  const { data, error } = await (supabase as any)
    .from("funding_weakness_signals")
    .select("*, funding_radar_companies(company_name, sector, cluster_id)")
    .order("signal_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw error;
  return data ?? [];
}