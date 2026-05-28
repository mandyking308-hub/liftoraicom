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