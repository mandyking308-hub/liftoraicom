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

// ============================================================================
// Decision discipline + Build handoff layer
// ============================================================================

// ---- Kill Rules ------------------------------------------------------------

export const KILL_REASONS = [
  "NO_RECURRING_REVENUE","NO_CUSTOMER_PAYMENT_EVIDENCE","NO_DISTRIBUTION_ROUTE",
  "TOO_CAPITAL_HEAVY","TOO_REGULATED","NO_WHITE_SPACE","WINNER_TAKES_MOST",
  "COMMODITY_TRAP","HIGH_LEGAL_IP_RISK","NO_LIFTOR_ADVANTAGE",
  "TOO_MUCH_FOUNDER_ATTENTION","PORTFOLIO_COLLISION","PARK_FOR_LATER",
] as const;
export type KillReason = typeof KILL_REASONS[number];

export const KILL_REASON_LABEL: Record<KillReason, string> = {
  NO_RECURRING_REVENUE: "No recurring revenue",
  NO_CUSTOMER_PAYMENT_EVIDENCE: "No customer payment evidence",
  NO_DISTRIBUTION_ROUTE: "No distribution route",
  TOO_CAPITAL_HEAVY: "Too capital heavy",
  TOO_REGULATED: "Too regulated before MVP",
  NO_WHITE_SPACE: "No white space",
  WINNER_TAKES_MOST: "Winner-takes-most market",
  COMMODITY_TRAP: "Commodity trap",
  HIGH_LEGAL_IP_RISK: "High legal/IP risk",
  NO_LIFTOR_ADVANTAGE: "No Liftor advantage",
  TOO_MUCH_FOUNDER_ATTENTION: "Too much founder attention",
  PORTFOLIO_COLLISION: "Portfolio collision",
  PARK_FOR_LATER: "Park for later",
};

export type KillRuleInput = {
  recurring_revenue_score?: number | null;
  willingness_to_pay_evidence_count?: number | null;
  distribution_route_present?: boolean | null;
  capital_intensity_score?: number | null; // 0-100, higher = more capital heavy
  regulatory_friction_score?: number | null; // 0-100, higher = more regulation
  white_space_score?: number | null;
  market_recommendation?: string | null; // entry strategy from market map
  legal_ip_safety_score?: number | null; // higher = safer
  capital_efficiency_advantage_score?: number | null;
  ai_automation_advantage_score?: number | null;
  founder_attention_score?: number | null; // higher = more attention required
  portfolio_collision_detected?: boolean | null;
  founder_park?: boolean | null;
};

export type KillRuleHit = { reason: KillReason; severity: "block" | "warn" };

export function evaluateKillRules(input: KillRuleInput): KillRuleHit[] {
  const hits: KillRuleHit[] = [];
  if ((input.recurring_revenue_score ?? 0) < 30) hits.push({ reason: "NO_RECURRING_REVENUE", severity: "block" });
  if ((input.willingness_to_pay_evidence_count ?? 0) < 1) hits.push({ reason: "NO_CUSTOMER_PAYMENT_EVIDENCE", severity: "block" });
  if (input.distribution_route_present === false) hits.push({ reason: "NO_DISTRIBUTION_ROUTE", severity: "block" });
  if ((input.capital_intensity_score ?? 0) >= 70) hits.push({ reason: "TOO_CAPITAL_HEAVY", severity: "block" });
  if ((input.regulatory_friction_score ?? 0) >= 70) hits.push({ reason: "TOO_REGULATED", severity: "block" });
  if ((input.white_space_score ?? 50) < 25) hits.push({ reason: "NO_WHITE_SPACE", severity: "warn" });
  if (input.market_recommendation === "AVOID_WINNER_TAKES_MOST") hits.push({ reason: "WINNER_TAKES_MOST", severity: "block" });
  if (input.market_recommendation === "AVOID_TOO_SATURATED") hits.push({ reason: "COMMODITY_TRAP", severity: "block" });
  if ((input.legal_ip_safety_score ?? 80) < 50) hits.push({ reason: "HIGH_LEGAL_IP_RISK", severity: "block" });
  const adv = Math.max(Number(input.capital_efficiency_advantage_score ?? 0), Number(input.ai_automation_advantage_score ?? 0));
  if (adv < 50) hits.push({ reason: "NO_LIFTOR_ADVANTAGE", severity: "block" });
  if ((input.founder_attention_score ?? 0) >= 80) hits.push({ reason: "TOO_MUCH_FOUNDER_ATTENTION", severity: "warn" });
  if (input.portfolio_collision_detected === true) hits.push({ reason: "PORTFOLIO_COLLISION", severity: "warn" });
  if (input.founder_park === true) hits.push({ reason: "PARK_FOR_LATER", severity: "warn" });
  return hits;
}

export function isKillBlocked(input: KillRuleInput): boolean {
  return evaluateKillRules(input).some((h) => h.severity === "block");
}

// ---- Source Quality + Confidence ------------------------------------------

export const SOURCE_TYPES = [
  "funding_announcement","investor_page","company_website","customer_review","case_study",
  "testimonial","pricing_page","job_advert","press_article","regulatory_update",
  "employee_review","founder_interview","partner_announcement","public_financial_filing",
  "manual_founder_note","uploaded_csv","other",
] as const;
export type SourceType = typeof SOURCE_TYPES[number];

export const SOURCE_RELIABILITY_DEFAULT: Record<SourceType, number> = {
  funding_announcement: 85, investor_page: 80, company_website: 70, customer_review: 60,
  case_study: 75, testimonial: 55, pricing_page: 90, job_advert: 70, press_article: 65,
  regulatory_update: 95, employee_review: 50, founder_interview: 70, partner_announcement: 70,
  public_financial_filing: 95, manual_founder_note: 75, uploaded_csv: 65, other: 40,
};

export type SourceModality = "public" | "licensed" | "manual" | "uploaded" | "inferred";

export type SourceQualityInput = {
  source_type?: SourceType | null;
  source_modality?: SourceModality | null;
  signal_date?: string | null;
  reported_confidence?: number | null;
  conflicts_with_other_signal?: boolean | null;
  verified?: boolean | null;
};

export function ageInDaysFrom(iso?: string | null): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return Math.floor((Date.now() - t) / (24 * 3600 * 1000));
}

export const AGE_LABELS = ["Fresh","Current","Ageing","Stale","Contradicted","Needs verification"] as const;
export type AgeLabel = typeof AGE_LABELS[number];

export function deriveAgeLabel(input: SourceQualityInput): AgeLabel {
  if (input.conflicts_with_other_signal) return "Contradicted";
  if (input.verified === false) return "Needs verification";
  const days = ageInDaysFrom(input.signal_date);
  if (days === null) return "Needs verification";
  if (days <= 30) return "Fresh";
  if (days <= 90) return "Current";
  if (days <= 180) return "Ageing";
  return "Stale";
}

export function freshnessScore(input: SourceQualityInput): number {
  const days = ageInDaysFrom(input.signal_date);
  if (days === null) return 30;
  if (days <= 30) return 100;
  if (days <= 90) return 80;
  if (days <= 180) return 55;
  if (days <= 365) return 30;
  return 10;
}

export function reliabilityScore(input: SourceQualityInput): number {
  const base = input.source_type ? SOURCE_RELIABILITY_DEFAULT[input.source_type] : 40;
  const modBonus = input.source_modality === "licensed" ? 10
    : input.source_modality === "public" ? 0
    : input.source_modality === "manual" ? -5
    : input.source_modality === "uploaded" ? -10
    : input.source_modality === "inferred" ? -20 : -10;
  const verifiedBonus = input.verified ? 5 : -5;
  return Math.max(0, Math.min(100, base + modBonus + verifiedBonus));
}

export function signalConfidenceScore(input: SourceQualityInput): number {
  const rel = reliabilityScore(input);
  const fresh = freshnessScore(input);
  const reported = Number(input.reported_confidence ?? 60);
  const conflictPenalty = input.conflicts_with_other_signal ? 25 : 0;
  return Math.max(0, Math.min(100, Math.round(rel * 0.5 + fresh * 0.3 + reported * 0.2 - conflictPenalty)));
}

/** Decay weighting for old signals — multiply downstream scores by this. */
export function ageingWeight(input: SourceQualityInput): number {
  const label = deriveAgeLabel(input);
  switch (label) {
    case "Fresh": return 1.0;
    case "Current": return 0.85;
    case "Ageing": return 0.6;
    case "Stale": return 0.3;
    case "Contradicted": return 0.2;
    case "Needs verification": return 0.5;
  }
}

// ---- Willingness-to-Pay Gate ----------------------------------------------

export const WTP_EVIDENCE_TYPES = [
  "visible_pricing","case_study","paid_customer_logo","testimonial","procurement_language",
  "enterprise_plan","renewal_retention_signal","marketplace_transaction","job_demand_signal",
  "review_evidence_real_usage","manual_founder_approved",
] as const;
export type WtpEvidenceType = typeof WTP_EVIDENCE_TYPES[number];

export function hasWillingnessToPayEvidence(types: WtpEvidenceType[] | null | undefined): boolean {
  return Array.isArray(types) && types.length >= 1;
}

// ---- Distribution Route Gate ----------------------------------------------

export type DistributionGateInput = {
  first_customer_segment?: string | null;
  first_100_customer_route?: string | null;
  likely_acquisition_channel?: string | null;
  outreach_plan?: string | null;
  buyer_contact_type?: string | null;
  expected_sales_cycle?: string | null;
  founder_approval_required_before_outreach?: boolean | null;
};

export function evaluateDistributionGate(d: DistributionGateInput): { ok: boolean; missing: string[]; recommendation: "BUILD" | "WATCH" | "PARK" } {
  const missing: string[] = [];
  if (!d.first_customer_segment) missing.push("first_customer_segment");
  if (!d.first_100_customer_route) missing.push("first_100_customer_route");
  if (!d.likely_acquisition_channel) missing.push("likely_acquisition_channel");
  if (!d.outreach_plan) missing.push("outreach_plan");
  if (!d.buyer_contact_type) missing.push("buyer_contact_type");
  const ok = missing.length === 0;
  const recommendation: "BUILD" | "WATCH" | "PARK" = ok ? "BUILD" : missing.length >= 3 ? "PARK" : "WATCH";
  return { ok, missing, recommendation };
}

// ---- Portfolio Collision Check --------------------------------------------

export type PortfolioItemLite = { id: string; name?: string | null; sector?: string | null; description?: string | null; tags?: string[] | null };

export type CollisionRecommendation =
  | "build_new_business" | "add_feature_to_existing" | "create_vertical_version"
  | "merge_into_existing_template" | "park_to_avoid_distraction" | "reject_due_to_duplication";

export function detectPortfolioCollision(opp: { name: string; sector?: string | null; cluster?: string | null }, portfolio: PortfolioItemLite[]): {
  collision: boolean; matches: PortfolioItemLite[]; recommendation: CollisionRecommendation;
} {
  const tokens = `${opp.name} ${opp.sector ?? ""} ${opp.cluster ?? ""}`.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length >= 4);
  const matches = portfolio.filter((p) => {
    const hay = `${p.name ?? ""} ${p.sector ?? ""} ${p.description ?? ""} ${(p.tags ?? []).join(" ")}`.toLowerCase();
    return tokens.some((t) => hay.includes(t));
  });
  if (matches.length === 0) return { collision: false, matches: [], recommendation: "build_new_business" };
  if (matches.length >= 3) return { collision: true, matches, recommendation: "reject_due_to_duplication" };
  if (matches.length === 2) return { collision: true, matches, recommendation: "merge_into_existing_template" };
  return { collision: true, matches, recommendation: "add_feature_to_existing" };
}

// ---- Founder Capacity Gate ------------------------------------------------

export type CapacityGateInput = {
  build_complexity_score?: number | null;
  operating_complexity_score?: number | null;
  human_oversight_required_score?: number | null;
  founder_attention_score?: number | null;
  current_quarter_active_builds?: number | null;
  active_businesses?: number | null;
  current_launch_priorities?: number | null;
};

export function evaluateCapacityGate(c: CapacityGateInput): { ok: boolean; load: number; reason: string } {
  const load = Math.round(
    Number(c.build_complexity_score ?? 50) * 0.20 +
    Number(c.operating_complexity_score ?? 50) * 0.20 +
    Number(c.human_oversight_required_score ?? 50) * 0.20 +
    Number(c.founder_attention_score ?? 50) * 0.20 +
    Math.min(100, Number(c.current_quarter_active_builds ?? 0) * 50) * 0.20
  );
  const tooManyBuilds = Number(c.current_quarter_active_builds ?? 0) >= 2;
  if (tooManyBuilds) return { ok: false, load, reason: "Already 2 active builds this quarter — capacity exhausted." };
  if (load >= 80) return { ok: false, load, reason: "Combined complexity + oversight + attention load is too high for safe execution." };
  return { ok: true, load, reason: "Within capacity envelope." };
}

// ---- Build Handoff Pack ---------------------------------------------------

export type BuildHandoffPack = {
  generated_at: string;
  candidate: { id: string; name: string; quarter?: number; year?: number };
  thesis: {
    problem_thesis: string | null;
    paying_customer_profile: string | null;
    legally_distinct_product_concept: string | null;
    first_offer: string | null;
  };
  build_plan: {
    mvp_feature_list: string[];
    landing_page_structure: string[];
    crm_pipeline_stages: string[];
    pricing_hypothesis: string | null;
    onboarding_flow: string | null;
    support_flow: string | null;
    compliance_legal_pages_needed: string[];
  };
  go_to_market: {
    first_100_customer_plan: string | null;
    outreach_angle: string | null;
    likely_acquisition_channel: string | null;
    buyer_contact_type: string | null;
    expected_sales_cycle: string | null;
  };
  governance: {
    approval_gates: string[];
    kill_continue_criteria: string[];
    kpis: string[];
  };
  schedule: {
    first_30_day_execution_plan: string[];
    first_90_day_operating_plan: string[];
  };
  connections: {
    launch_factory: string;
    business_templates: string;
    portfolio_commander: string;
    command_centre: string;
  };
  guardrails: { no_external_actions: string[] };
};

export const HANDOFF_DEFAULT_APPROVAL_GATES = [
  "Founder review of thesis & legally distinct concept",
  "Founder approval before any outreach",
  "Founder approval before paid API activation",
  "Founder approval before public publishing of comparisons",
  "Founder approval before opening a data room",
] as const;

export const HANDOFF_DEFAULT_KILL_CONTINUE = [
  "Kill if no paying customer signal within 60 days post-launch",
  "Kill if conversion < 1% across two outreach waves",
  "Kill if founder attention exceeds 1 day/week beyond month 2",
  "Continue if 3+ paying customers within 90 days",
  "Continue if recurring revenue retention >= 80% at 90 days",
] as const;

export const HANDOFF_DEFAULT_KPIS = [
  "Paying customers (count)","MRR","CAC","Activation rate","Retention @ 30/60/90",
  "Founder hours/week","Human oversight hours","AI automation success rate",
] as const;

export function buildHandoffPack(args: {
  candidate: { id: string; candidate_name: string; description?: string | null; quarter?: number | null; year?: number | null;
    build_thesis?: string | null; revenue_model?: string | null; target_customer?: string | null; target_buyer_type?: string | null };
  shortlist?: { build_thesis?: string | null; capital_efficiency_summary?: string | null } | null;
  company?: { company_name?: string | null; revenue_model_pattern?: string | null; pricing_logic?: string | null; distinct_execution_route?: string | null } | null;
  cluster?: { cluster_name?: string | null; problem_thesis?: string | null; customer_pain?: string | null; distinct_execution_route?: string | null } | null;
  distribution?: DistributionGateInput | null;
}): BuildHandoffPack {
  const c = args.candidate;
  const cl = args.cluster ?? {};
  const co = args.company ?? {};
  const sl = args.shortlist ?? {};
  const d = args.distribution ?? {};
  return {
    generated_at: new Date().toISOString(),
    candidate: { id: c.id, name: c.candidate_name, quarter: c.quarter ?? undefined, year: c.year ?? undefined },
    thesis: {
      problem_thesis: cl.problem_thesis ?? sl.build_thesis ?? c.build_thesis ?? c.description ?? null,
      paying_customer_profile: c.target_customer ?? cl.customer_pain ?? null,
      legally_distinct_product_concept: co.distinct_execution_route ?? cl.distinct_execution_route ?? null,
      first_offer: sl.capital_efficiency_summary ?? c.revenue_model ?? null,
    },
    build_plan: {
      mvp_feature_list: [],
      landing_page_structure: ["Hero with problem statement","Proof of paying customer pattern","Distinct execution angle","Pricing","FAQ","Founder-led CTA"],
      crm_pipeline_stages: ["New lead","Qualified","Demo/scoping","Proposal","Won","Onboarding","Live","Renewal"],
      pricing_hypothesis: co.pricing_logic ?? null,
      onboarding_flow: null,
      support_flow: null,
      compliance_legal_pages_needed: ["Terms","Privacy","DPA","AUP","Security disclosure"],
    },
    go_to_market: {
      first_100_customer_plan: d.first_100_customer_route ?? null,
      outreach_angle: d.outreach_plan ?? null,
      likely_acquisition_channel: d.likely_acquisition_channel ?? null,
      buyer_contact_type: d.buyer_contact_type ?? c.target_buyer_type ?? null,
      expected_sales_cycle: d.expected_sales_cycle ?? null,
    },
    governance: {
      approval_gates: [...HANDOFF_DEFAULT_APPROVAL_GATES],
      kill_continue_criteria: [...HANDOFF_DEFAULT_KILL_CONTINUE],
      kpis: [...HANDOFF_DEFAULT_KPIS],
    },
    schedule: {
      first_30_day_execution_plan: [
        "Confirm thesis with 5 manual founder conversations (existing network only)",
        "Build MVP scope + landing page",
        "Define legally distinct concept & legal/compliance pages",
        "Wire CRM pipeline + first-100 plan into Launch Factory",
      ],
      first_90_day_operating_plan: [
        "Reach 3+ paying customers",
        "Confirm retention pattern at 30/60 days",
        "Activate Portfolio Commander tracking",
        "Decide kill/continue at day 90 against criteria",
      ],
    },
    connections: {
      launch_factory: "/founder/launch-factory",
      business_templates: "/founder/business-templates",
      portfolio_commander: "/founder/portfolio-exit",
      command_centre: "/founder/command-centre",
    },
    guardrails: { no_external_actions: [...WATCHLIST_FORBIDDEN_ACTIONS] },
  };
}

// ---- Quarterly Production Build Machine -----------------------------------

export type ProductionClassification =
  | "PRIMARY_BUILD"
  | "BACKUP_BUILD"
  | "WATCH_NEXT_QUARTER"
  | "PARK"
  | "KILL";

export const PRODUCTION_CLASSIFICATION_LABEL: Record<ProductionClassification, string> = {
  PRIMARY_BUILD: "Primary build",
  BACKUP_BUILD: "Backup build",
  WATCH_NEXT_QUARTER: "Watch next quarter",
  PARK: "Park",
  KILL: "Kill",
};

export type ProductionGateInput = {
  candidate: { id: string; candidate_name: string; total_build_score?: number | null;
    recommendation_status?: string | null; quarter?: number | null; year?: number | null;
    funding_company_id?: string | null; funding_cluster_id?: string | null;
    funding_shortlist_id?: string | null;
    build_thesis?: string | null; description?: string | null; revenue_model?: string | null;
    target_customer?: string | null; target_buyer_type?: string | null;
    rejection_reason?: string | null;
  };
  shortlist?: {
    build_thesis?: string | null; capital_efficiency_summary?: string | null;
    recurring_revenue_score?: number | null; willingness_to_pay_evidence_score?: number | null;
    capital_efficiency_advantage_score?: number | null; legal_ip_safety_score?: number | null;
  } | null;
  market?: {
    market_name?: string | null; recommended_entry_strategy?: string | null;
    crowding_level?: string | null; saturation_risk?: string | null;
    white_space_score?: number | null; liftor_entry_score?: number | null;
    avoid_reason?: string | null;
  } | null;
  whiteSpace?: { score?: number | null; underserved_segment?: string | null } | null;
  killHits?: KillRuleHit[];
  capacity?: ReturnType<typeof evaluateCapacityGate> | null;
  collision?: ReturnType<typeof detectPortfolioCollision> | null;
};

export function classifyProductionCandidate(g: ProductionGateInput): {
  classification: ProductionClassification;
  score: number;
  reasons: string[];
  blockers: string[];
} {
  const reasons: string[] = [];
  const blockers: string[] = [];
  const kill = (g.killHits ?? []).filter((h) => h.severity === "block");
  const sl = g.shortlist ?? {};
  const m = g.market ?? {};

  if (kill.length > 0) {
    blockers.push(...kill.map((h) => h.reason));
    return { classification: "KILL", score: 0, reasons: [], blockers };
  }

  if (m.recommended_entry_strategy === "AVOID_TOO_SATURATED") {
    blockers.push("Market saturated — no viable wedge");
    return { classification: "PARK", score: 0, reasons: [], blockers };
  }

  const collisionRec: string | undefined = g.collision?.recommendation;
  if (collisionRec === "reject_due_to_duplication") {
    blockers.push("Portfolio collision: duplicates an existing Liftor asset");
    return { classification: "KILL", score: 0, reasons: [], blockers };
  }

  if (g.capacity && !g.capacity.ok) {
    blockers.push(`Capacity gate: ${g.capacity.reason}`);
    return { classification: "WATCH_NEXT_QUARTER", score: 0, reasons: [], blockers };
  }

  const components = [
    Number(g.candidate.total_build_score ?? 0) * 0.30,
    Number(sl.capital_efficiency_advantage_score ?? 0) * 0.15,
    Number(sl.recurring_revenue_score ?? 0) * 0.15,
    Number(sl.willingness_to_pay_evidence_score ?? 0) * 0.15,
    Number(sl.legal_ip_safety_score ?? 70) * 0.10,
    Number(m.liftor_entry_score ?? m.white_space_score ?? 0) * 0.15,
  ];
  const score = Math.round(components.reduce((a, b) => a + b, 0));

  if ((sl.recurring_revenue_score ?? 0) >= 60) reasons.push("Recurring revenue evidence");
  if ((sl.willingness_to_pay_evidence_score ?? 0) >= 60) reasons.push("Willingness-to-pay evidence");
  if ((sl.capital_efficiency_advantage_score ?? 0) >= 60) reasons.push("Capital efficiency advantage");
  if ((m.white_space_score ?? 0) >= 50) reasons.push("White space available");
  if (m.recommended_entry_strategy && m.recommended_entry_strategy !== "AVOID_TOO_SATURATED") {
    reasons.push(`Entry strategy: ${ENTRY_STRATEGY_LABEL[m.recommended_entry_strategy as EntryStrategy] ?? m.recommended_entry_strategy}`);
  }
  if (collisionRec && collisionRec !== "build_new_business" && collisionRec !== "reject_due_to_duplication") {
    reasons.push(`Portfolio synergy: ${collisionRec.replace(/_/g, " ")}`);
  }

  let classification: ProductionClassification = "WATCH_NEXT_QUARTER";
  if (score >= 70) classification = "PRIMARY_BUILD";
  else if (score >= 55) classification = "BACKUP_BUILD";
  else if (score >= 35) classification = "WATCH_NEXT_QUARTER";
  else classification = "PARK";

  return { classification, score, reasons, blockers };
}

export function selectQuarterlyProduction(
  inputs: ProductionGateInput[]
): {
  primary: (ProductionGateInput & { evaluation: ReturnType<typeof classifyProductionCandidate> }) | null;
  backup: (ProductionGateInput & { evaluation: ReturnType<typeof classifyProductionCandidate> }) | null;
  watch: Array<ProductionGateInput & { evaluation: ReturnType<typeof classifyProductionCandidate> }>;
  park: Array<ProductionGateInput & { evaluation: ReturnType<typeof classifyProductionCandidate> }>;
  kill: Array<ProductionGateInput & { evaluation: ReturnType<typeof classifyProductionCandidate> }>;
} {
  const evaluated = inputs.map((i) => ({ ...i, evaluation: classifyProductionCandidate(i) }));
  evaluated.sort((a, b) => b.evaluation.score - a.evaluation.score);
  const primaries = evaluated.filter((e) => e.evaluation.classification === "PRIMARY_BUILD");
  const backups = evaluated.filter((e) => e.evaluation.classification === "BACKUP_BUILD");
  const primary = primaries[0] ?? null;
  // backup is best of remaining primaries (if multiple) or top backup
  const backup = (primary ? primaries.slice(1)[0] : null) ?? backups[0] ?? null;
  return {
    primary,
    backup,
    watch: evaluated.filter((e) => e.evaluation.classification === "WATCH_NEXT_QUARTER"),
    park: evaluated.filter((e) => e.evaluation.classification === "PARK"),
    kill: evaluated.filter((e) => e.evaluation.classification === "KILL"),
  };
}

export type ProductionBuildPack = BuildHandoffPack & {
  classification: ProductionClassification;
  score: number;
  executive_summary: string;
  why_selected: string[];
  funding_proof: string | null;
  customer_problem_thesis: string | null;
  willingness_to_pay_evidence: string | null;
  market_weakness: string | null;
  watchlist_signal_summary: string | null;
  crowding_white_space: string | null;
  capital_efficiency_advantage: string | null;
  acquirer_pain_thesis: string | null;
  exit_logic: string | null;
  database_schema_needs: string[];
  human_oversight_requirements: string[];
  ai_operator_requirements: string[];
  command_centre_panel_requirements: string[];
  lovable_build_prompt_pack: string[];
  github_task_pack: string[];
  founder_approval_required_before: string[];
};

export const PRODUCTION_FOUNDER_APPROVAL_GATES = [
  "Starting production build",
  "Creating public-facing brand or site",
  "Buying domains",
  "Enabling email sending",
  "Launching outreach",
  "Contacting any external party",
  "Promoting to live business",
  "Creating data room",
  "Sharing financials",
  "Starting sale or acquirer process",
] as const;

export function buildProductionPack(args: {
  gate: ProductionGateInput;
  evaluation: ReturnType<typeof classifyProductionCandidate>;
  handoff: BuildHandoffPack;
}): ProductionBuildPack {
  const { gate, evaluation, handoff } = args;
  const c = gate.candidate;
  const m = gate.market ?? {};
  const sl = gate.shortlist ?? {};
  return {
    ...handoff,
    classification: evaluation.classification,
    score: evaluation.score,
    executive_summary: `${c.candidate_name} — ${PRODUCTION_CLASSIFICATION_LABEL[evaluation.classification]} (score ${evaluation.score}/100). ${(evaluation.reasons[0] ?? "Selected from validated funded category with capital-efficient Liftor execution route.")}`,
    why_selected: evaluation.reasons,
    funding_proof: c.build_thesis ?? sl.build_thesis ?? null,
    customer_problem_thesis: handoff.thesis.problem_thesis,
    willingness_to_pay_evidence: sl.willingness_to_pay_evidence_score != null
      ? `WTP evidence score ${sl.willingness_to_pay_evidence_score}/100${sl.recurring_revenue_score != null ? `, recurring revenue ${sl.recurring_revenue_score}/100` : ""}`
      : null,
    market_weakness: m.avoid_reason ?? null,
    watchlist_signal_summary: sl.capital_efficiency_summary ?? null,
    crowding_white_space: m.market_name
      ? `${m.market_name} — crowding ${m.crowding_level ?? "n/a"}, saturation ${m.saturation_risk ?? "n/a"}, white-space ${m.white_space_score ?? 0}/100, entry ${ENTRY_STRATEGY_LABEL[(m.recommended_entry_strategy ?? "BUILD_NICHE_WEDGE") as EntryStrategy] ?? m.recommended_entry_strategy}`
      : null,
    capital_efficiency_advantage: sl.capital_efficiency_advantage_score != null
      ? `Capital efficiency advantage ${sl.capital_efficiency_advantage_score}/100`
      : null,
    acquirer_pain_thesis: c.target_buyer_type ? `Acquirer pain: ${c.target_buyer_type} pays today via people + tooling; Liftor compresses to AI-operated stack.` : null,
    exit_logic: "Vertical AI-operator with recurring revenue and proprietary playbook → strategic acquirer or PE roll-up post-product-market-fit.",
    database_schema_needs: [
      "customers (auth + billing)",
      "subscriptions (recurring revenue)",
      "agent_runs + agent_audit (AI oversight)",
      "approvals (founder gates)",
      "build_kpis (30/90 day metrics)",
    ],
    human_oversight_requirements: [
      "Founder review of every external action before send",
      "Daily review of agent failures > confidence threshold",
      "Weekly KPI + kill/continue review",
    ],
    ai_operator_requirements: [
      "Agent registry with confidence + escalation rules",
      "Tool/cost ceilings per run",
      "Audit trail of every decision and action",
      "Human approval queue for outbound + spend",
    ],
    command_centre_panel_requirements: [
      "MRR + paying customers + retention",
      "Founder hours/week",
      "Approval queue depth",
      "AI automation success rate",
      "Kill/continue countdown",
    ],
    lovable_build_prompt_pack: [
      `Scaffold ${c.candidate_name} as a Liftor sub-app: auth, billing, CRM pipeline, agent registry, approval queue, KPI dashboard. Use existing tech-card design system.`,
      `Generate landing page sections: ${(handoff.build_plan.landing_page_structure).join(" / ")}.`,
      `Wire CRM pipeline stages: ${(handoff.build_plan.crm_pipeline_stages).join(" → ")}.`,
      "Add compliance pages: Terms, Privacy, DPA, AUP, Security disclosure.",
      "All outbound actions must route through founder approval queue — no direct external calls.",
    ],
    github_task_pack: [
      "epic: scaffold app shell + auth",
      "epic: CRM pipeline + first-100 plan",
      "epic: agent registry + approval queue",
      "epic: KPI dashboard + kill/continue criteria",
      "epic: legal/compliance pages",
      "epic: Launch Factory + Business Template + Portfolio Commander wiring",
    ],
    founder_approval_required_before: [...PRODUCTION_FOUNDER_APPROVAL_GATES],
  };
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