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

// ---- Build Pack Validator + Lovable Prompt Queue Controller ---------------

export type BuildPackValidationStatus =
  | "INCOMPLETE"
  | "NEEDS_FOUNDER_INPUT"
  | "NEEDS_ADVISER_REVIEW"
  | "READY_FOR_PROMPT_QUEUE";

export const BUILD_PACK_VALIDATION_LABEL: Record<BuildPackValidationStatus, string> = {
  INCOMPLETE: "Incomplete",
  NEEDS_FOUNDER_INPUT: "Needs founder input",
  NEEDS_ADVISER_REVIEW: "Needs adviser review",
  READY_FOR_PROMPT_QUEUE: "Ready for prompt queue",
};

export type BuildPackRequirementKey =
  | "problem_thesis"
  | "paying_customer_profile"
  | "legally_distinct_concept"
  | "first_offer"
  | "mvp_scope"
  | "database_schema_needs"
  | "landing_page_structure"
  | "crm_pipeline"
  | "onboarding_flow"
  | "support_flow"
  | "pricing_hypothesis"
  | "compliance_legal_checklist"
  | "analytics_kpi_plan"
  | "approval_gates"
  | "human_oversight"
  | "ai_operator_requirement"
  | "first_30_day_plan"
  | "first_90_day_plan"
  | "kill_continue_criteria"
  | "command_centre_panel"
  | "launch_factory_handoff"
  | "business_template_handoff"
  | "portfolio_commander_handoff";

export type BuildPackRequirement = {
  key: BuildPackRequirementKey;
  label: string;
  category: "thesis" | "build" | "operations" | "governance" | "handoff";
  needsAdviser?: boolean;
  needsFounder?: boolean;
};

export const BUILD_PACK_REQUIRED_ITEMS: BuildPackRequirement[] = [
  { key: "problem_thesis", label: "Problem thesis", category: "thesis", needsFounder: true },
  { key: "paying_customer_profile", label: "Paying customer profile", category: "thesis", needsFounder: true },
  { key: "legally_distinct_concept", label: "Legally distinct product concept", category: "thesis", needsAdviser: true },
  { key: "first_offer", label: "First offer", category: "thesis", needsFounder: true },
  { key: "mvp_scope", label: "MVP scope", category: "build", needsFounder: true },
  { key: "database_schema_needs", label: "Database / schema needs", category: "build" },
  { key: "landing_page_structure", label: "Landing page structure", category: "build" },
  { key: "crm_pipeline", label: "CRM pipeline", category: "operations" },
  { key: "onboarding_flow", label: "Customer onboarding flow", category: "operations" },
  { key: "support_flow", label: "Support flow", category: "operations" },
  { key: "pricing_hypothesis", label: "Pricing hypothesis", category: "thesis", needsFounder: true },
  { key: "compliance_legal_checklist", label: "Compliance / legal page checklist", category: "governance", needsAdviser: true },
  { key: "analytics_kpi_plan", label: "Analytics / KPI plan", category: "governance" },
  { key: "approval_gates", label: "Approval gates", category: "governance" },
  { key: "human_oversight", label: "Human oversight requirement", category: "governance" },
  { key: "ai_operator_requirement", label: "AI agent / operator requirement", category: "operations" },
  { key: "first_30_day_plan", label: "First 30-day plan", category: "build" },
  { key: "first_90_day_plan", label: "First 90-day plan", category: "build" },
  { key: "kill_continue_criteria", label: "Kill / continue criteria", category: "governance" },
  { key: "command_centre_panel", label: "Command Centre operating panel", category: "handoff" },
  { key: "launch_factory_handoff", label: "Launch Factory handoff", category: "handoff" },
  { key: "business_template_handoff", label: "Business Template handoff", category: "handoff" },
  { key: "portfolio_commander_handoff", label: "Portfolio Commander handoff", category: "handoff" },
];

export type BuildPackValidationItem = {
  key: BuildPackRequirementKey;
  label: string;
  present: boolean;
  evidence: string | null;
  needsAdviser: boolean;
  needsFounder: boolean;
};

export type BuildPackValidationReport = {
  status: BuildPackValidationStatus;
  presentCount: number;
  totalCount: number;
  items: BuildPackValidationItem[];
  missingKeys: BuildPackRequirementKey[];
  needsFounderKeys: BuildPackRequirementKey[];
  needsAdviserKeys: BuildPackRequirementKey[];
  blockers: string[];
};

function nonEmptyStr(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s.length > 0 ? s : null;
}
function nonEmptyList(v: unknown): string | null {
  if (!Array.isArray(v)) return null;
  const items = v.map((x) => (typeof x === "string" ? x.trim() : "")).filter(Boolean);
  return items.length > 0 ? items.join(" · ") : null;
}

export function validateBuildPack(pack: ProductionBuildPack | null | undefined): BuildPackValidationReport {
  const items: BuildPackValidationItem[] = BUILD_PACK_REQUIRED_ITEMS.map((req) => {
    let evidence: string | null = null;
    if (pack) {
      switch (req.key) {
        case "problem_thesis": evidence = nonEmptyStr(pack.customer_problem_thesis) ?? nonEmptyStr(pack.thesis?.problem_thesis); break;
        case "paying_customer_profile": evidence = nonEmptyStr(pack.thesis?.paying_customer_profile); break;
        case "legally_distinct_concept": evidence = nonEmptyStr(pack.thesis?.legally_distinct_product_concept); break;
        case "first_offer": evidence = nonEmptyStr(pack.thesis?.first_offer) ?? nonEmptyList(pack.build_plan?.landing_page_structure as any); break;
        case "mvp_scope": evidence = nonEmptyList(pack.build_plan?.mvp_feature_list); break;
        case "database_schema_needs": evidence = nonEmptyList(pack.database_schema_needs); break;
        case "landing_page_structure": evidence = nonEmptyList(pack.build_plan?.landing_page_structure); break;
        case "crm_pipeline": evidence = nonEmptyList(pack.build_plan?.crm_pipeline_stages); break;
        case "onboarding_flow": evidence = nonEmptyList((pack as any).build_plan?.onboarding_steps) ?? nonEmptyList(pack.schedule?.first_30_day_execution_plan); break;
        case "support_flow": evidence = nonEmptyList((pack as any).build_plan?.support_flow) ?? nonEmptyStr((pack as any).support_flow_summary); break;
        case "pricing_hypothesis": evidence = nonEmptyStr((pack as any).pricing_hypothesis) ?? nonEmptyStr(pack.willingness_to_pay_evidence); break;
        case "compliance_legal_checklist": evidence = nonEmptyList((pack as any).compliance_legal_checklist) ?? nonEmptyList((pack as any).governance?.compliance_pages); break;
        case "analytics_kpi_plan": evidence = nonEmptyList(pack.governance?.kpis); break;
        case "approval_gates": evidence = nonEmptyList(pack.governance?.approval_gates); break;
        case "human_oversight": evidence = nonEmptyList(pack.human_oversight_requirements); break;
        case "ai_operator_requirement": evidence = nonEmptyList(pack.ai_operator_requirements); break;
        case "first_30_day_plan": evidence = nonEmptyList(pack.schedule?.first_30_day_execution_plan); break;
        case "first_90_day_plan": evidence = nonEmptyList(pack.schedule?.first_90_day_operating_plan); break;
        case "kill_continue_criteria": evidence = nonEmptyList(pack.governance?.kill_continue_criteria); break;
        case "command_centre_panel": evidence = nonEmptyList(pack.command_centre_panel_requirements); break;
        case "launch_factory_handoff": evidence = nonEmptyStr(pack.connections?.launch_factory); break;
        case "business_template_handoff": evidence = nonEmptyStr(pack.connections?.business_templates); break;
        case "portfolio_commander_handoff": evidence = nonEmptyStr(pack.connections?.portfolio_commander); break;
      }
    }
    return {
      key: req.key,
      label: req.label,
      present: !!evidence,
      evidence,
      needsAdviser: !!req.needsAdviser,
      needsFounder: !!req.needsFounder,
    };
  });

  const missingKeys = items.filter((i) => !i.present).map((i) => i.key);
  const needsFounderKeys = items.filter((i) => !i.present && i.needsFounder).map((i) => i.key);
  const needsAdviserKeys = items.filter((i) => !i.present && i.needsAdviser).map((i) => i.key);

  let status: BuildPackValidationStatus = "READY_FOR_PROMPT_QUEUE";
  if (!pack || missingKeys.length > 0) {
    if (needsAdviserKeys.length > 0) status = "NEEDS_ADVISER_REVIEW";
    else if (needsFounderKeys.length > 0) status = "NEEDS_FOUNDER_INPUT";
    else status = "INCOMPLETE";
  }

  const blockers: string[] = [];
  if (!pack) blockers.push("No production build pack available — generate Primary build first.");
  for (const k of missingKeys) {
    const lbl = BUILD_PACK_REQUIRED_ITEMS.find((r) => r.key === k)?.label ?? k;
    blockers.push(`Missing: ${lbl}`);
  }

  return {
    status,
    presentCount: items.filter((i) => i.present).length,
    totalCount: items.length,
    items,
    missingKeys,
    needsFounderKeys,
    needsAdviserKeys,
    blockers,
  };
}

// --- Lovable Prompt Queue ---

export type PromptQueueStageKey =
  | "product_foundation"
  | "database_schema"
  | "core_mvp_screens"
  | "founder_admin_dashboard"
  | "customer_onboarding"
  | "crm_pipeline"
  | "support_workflow"
  | "compliance_legal"
  | "analytics_kpi"
  | "command_centre_integration"
  | "launch_factory_handoff"
  | "business_template_handoff"
  | "qa_smoke_test"
  | "founder_approval_live_mode";

export type PromptQueueItem = {
  key: PromptQueueStageKey;
  order: number;
  title: string;
  body: string;
  dependencies: PromptQueueStageKey[];
  acceptance_criteria: {
    what_must_be_built: string;
    where_it_appears: string;
    table_or_data: string;
    links_to_modules: string;
    what_founder_sees: string;
    empty_state: string;
    test_proves_it_works: string;
    must_remain_blocked: string;
  };
  test_instruction: string;
  founder_approval_required: boolean;
  is_qa_gate: boolean;
  is_live_mode_gate: boolean;
  created_at: string;
  completed_at: string | null;
  notes: string;
};

export const PROMPT_QUEUE_FORBIDDEN = [
  "Outbound sending enabled by default",
  "Paid APIs activated by default",
  "Public claims without founder approval",
  "Competitor copying",
  "Copied branding, code, UI or website copy",
  "Customer lists or protected assets",
  "Private or restricted data",
] as const;

type StageBlueprint = Omit<PromptQueueItem, "created_at" | "completed_at" | "notes" | "order" | "title" | "body"> & {
  buildTitle: (packName: string) => string;
  buildBody: (pack: ProductionBuildPack) => string;
};

const STAGE_BLUEPRINTS: StageBlueprint[] = [
  {
    key: "product_foundation",
    dependencies: [],
    is_qa_gate: false,
    is_live_mode_gate: false,
    founder_approval_required: false,
    test_instruction: "Open the new sub-app route — shell renders with auth gate and tech-card design system.",
    acceptance_criteria: {
      what_must_be_built: "App shell, auth gate, base layout, tech-card theme, founder/admin route guard.",
      where_it_appears: "/founder/<build-slug> with founder-only access.",
      table_or_data: "auth.users, profiles, user_roles (existing).",
      links_to_modules: "Founder layout, has_role security definer.",
      what_founder_sees: "Empty product shell with placeholders for upcoming stages.",
      empty_state: "‘Build foundation ready — continue to database schema.’",
      test_proves_it_works: "Non-admin users redirected; founder lands on shell.",
      must_remain_blocked: "No outbound, no public route, no payments, no live mode.",
    },
    buildTitle: (n) => `Stage 1 · Product foundation · ${n}`,
    buildBody: (p) => `Scaffold ${p.candidate.name} as a Liftor sub-app: auth, founder-only route guard, tech-card design system, base layout. Do not enable outbound, paid APIs or public routes. Reuse existing components — no copied branding, copy or competitor assets.`,
  },
  {
    key: "database_schema",
    dependencies: ["product_foundation"],
    is_qa_gate: false,
    is_live_mode_gate: false,
    founder_approval_required: false,
    test_instruction: "Run migration; confirm RLS + GRANTs present and Data API can read tables.",
    acceptance_criteria: {
      what_must_be_built: "Tables + RLS + GRANTs for the build pack’s schema needs.",
      where_it_appears: "Supabase migrations + types regenerated.",
      table_or_data: "build-specific tables + audit/approval tables.",
      links_to_modules: "has_role, founder approval queue, agent audit.",
      what_founder_sees: "Empty tables visible via founder admin pages.",
      empty_state: "‘No records yet — schema ready.’",
      test_proves_it_works: "Insert + select round-trip from founder seat with RLS pass.",
      must_remain_blocked: "No public anon writes, no service_role exposure to client.",
    },
    buildTitle: (n) => `Stage 2 · Database / schema · ${n}`,
    buildBody: (p) => `Create migrations for: ${p.database_schema_needs.join("; ") || "core schema"}. Include GRANTs and RLS scoped to founder/admin and tenant. No anon writes. No paid APIs.`,
  },
  {
    key: "core_mvp_screens",
    dependencies: ["database_schema"],
    is_qa_gate: false,
    is_live_mode_gate: false,
    founder_approval_required: false,
    test_instruction: "Walk through MVP feature list end-to-end with seeded data; each acceptance row passes.",
    acceptance_criteria: {
      what_must_be_built: "MVP feature list pages with empty states and validation.",
      where_it_appears: "Sub-app routes mounted under the founder shell.",
      table_or_data: "Stage 2 tables.",
      links_to_modules: "Approval queue, agent registry stub, audit ledger.",
      what_founder_sees: "Working CRUD for the MVP scope.",
      empty_state: "Each screen shows guidance + ‘Add first record’.",
      test_proves_it_works: "Smoke test on each MVP page returns no console errors.",
      must_remain_blocked: "No outbound triggers from MVP screens — all queued.",
    },
    buildTitle: (n) => `Stage 3 · Core MVP screens · ${n}`,
    buildBody: (p) => `Build MVP screens: ${p.build_plan.mvp_feature_list.join("; ") || "(define from thesis)"}. All actions route through founder approval queue. No outbound, no paid API calls.`,
  },
  {
    key: "founder_admin_dashboard",
    dependencies: ["core_mvp_screens"],
    is_qa_gate: false,
    is_live_mode_gate: false,
    founder_approval_required: false,
    test_instruction: "Open founder dashboard — KPIs render with zero-state values, no errors.",
    acceptance_criteria: {
      what_must_be_built: "Founder/admin dashboard with KPI tiles, approval queue, agent runs.",
      where_it_appears: "/founder/<build-slug>/dashboard.",
      table_or_data: "build_kpis, approvals, agent_runs.",
      links_to_modules: "Command Centre, Approval Ops, Agent Capability.",
      what_founder_sees: "All build KPIs in one place.",
      empty_state: "‘No data yet — start collecting once live mode unlocked.’",
      test_proves_it_works: "All KPI tiles + approval queue render with zero data.",
      must_remain_blocked: "No public access; no exports without approval.",
    },
    buildTitle: (n) => `Stage 4 · Founder/admin dashboard · ${n}`,
    buildBody: (p) => `Build founder dashboard with KPI tiles: ${p.governance.kpis.join("; ") || "MRR, paying customers, retention"} and an approval queue. No public access, no exports without approval.`,
  },
  {
    key: "customer_onboarding",
    dependencies: ["core_mvp_screens", "database_schema"],
    is_qa_gate: false,
    is_live_mode_gate: false,
    founder_approval_required: false,
    test_instruction: "Run onboarding with a dummy account in sandbox mode; complete without errors.",
    acceptance_criteria: {
      what_must_be_built: "Onboarding flow + welcome states + first-value moment.",
      where_it_appears: "/onboarding inside sub-app, sandbox-only until live.",
      table_or_data: "customers, subscriptions (stub).",
      links_to_modules: "Customer Onboarding engine, Approval Ops.",
      what_founder_sees: "Onboarding completion rate KPI.",
      empty_state: "‘No customers onboarded yet.’",
      test_proves_it_works: "Sandbox account reaches first-value step.",
      must_remain_blocked: "No real payments, no public sign-up until live mode.",
    },
    buildTitle: (n) => `Stage 5 · Customer onboarding · ${n}`,
    buildBody: () => "Build onboarding flow with welcome, first-value step, account confirmation. Sandbox-only. No real payments, no public sign-up.",
  },
  {
    key: "crm_pipeline",
    dependencies: ["database_schema"],
    is_qa_gate: false,
    is_live_mode_gate: false,
    founder_approval_required: false,
    test_instruction: "Move a test deal across all pipeline stages; events logged.",
    acceptance_criteria: {
      what_must_be_built: "CRM pipeline with the build pack’s stages and audit log.",
      where_it_appears: "/founder/<build-slug>/crm.",
      table_or_data: "crm_contacts, crm_deals, crm_events.",
      links_to_modules: "CRM Dashboard, audit ledger.",
      what_founder_sees: "Pipeline board with totals and stage timing.",
      empty_state: "‘No deals yet — pipeline ready.’",
      test_proves_it_works: "Test deal traverses every stage with events.",
      must_remain_blocked: "No outbound email/SMS until Stage 14 unlocks live mode.",
    },
    buildTitle: (n) => `Stage 6 · CRM pipeline · ${n}`,
    buildBody: (p) => `Wire CRM pipeline stages: ${p.build_plan.crm_pipeline_stages.join(" → ") || "Lead → Qualified → Won"}. Log every transition. Outbound disabled until live mode.`,
  },
  {
    key: "support_workflow",
    dependencies: ["core_mvp_screens"],
    is_qa_gate: false,
    is_live_mode_gate: false,
    founder_approval_required: false,
    test_instruction: "File a sandbox ticket, route to agent, escalate to founder; trace logged.",
    acceptance_criteria: {
      what_must_be_built: "Support inbox, ticket states, AI-assist + founder escalation.",
      where_it_appears: "/founder/<build-slug>/support.",
      table_or_data: "support_tickets, agent_runs, approvals.",
      links_to_modules: "Support Hub, Approval Ops.",
      what_founder_sees: "Open tickets, SLA, escalations.",
      empty_state: "‘No tickets — support ready.’",
      test_proves_it_works: "Sandbox ticket round-trip + audit entries.",
      must_remain_blocked: "AI replies require founder approval before send.",
    },
    buildTitle: (n) => `Stage 7 · Support workflow · ${n}`,
    buildBody: () => "Build support inbox with ticket states, AI-assist drafts, mandatory founder approval before any reply leaves the system.",
  },
  {
    key: "compliance_legal",
    dependencies: ["product_foundation"],
    is_qa_gate: false,
    is_live_mode_gate: false,
    founder_approval_required: true,
    test_instruction: "Visit each legal route; confirm rendered, versioned, and acceptance ledger writes work.",
    acceptance_criteria: {
      what_must_be_built: "Terms, Privacy, DPA, AUP, Security disclosure pages + acceptance ledger.",
      where_it_appears: "/legal/* under sub-app domain.",
      table_or_data: "legal_documents, legal_acceptances.",
      links_to_modules: "Founder Legal Console.",
      what_founder_sees: "Versioned policy table with acceptance counts.",
      empty_state: "‘No acceptances yet.’",
      test_proves_it_works: "Render + accept + ledger entry verified.",
      must_remain_blocked: "No publishing without founder approval and adviser sign-off.",
    },
    buildTitle: (n) => `Stage 8 · Compliance / legal pages · ${n}`,
    buildBody: () => "Add Terms, Privacy, DPA, AUP, Security disclosure with versioning + acceptance ledger. Founder approval required before publish.",
  },
  {
    key: "analytics_kpi",
    dependencies: ["founder_admin_dashboard"],
    is_qa_gate: false,
    is_live_mode_gate: false,
    founder_approval_required: false,
    test_instruction: "Trigger sample events; KPI tiles update; kill/continue tile reflects criteria.",
    acceptance_criteria: {
      what_must_be_built: "Event capture + KPI rollups + kill/continue tile.",
      where_it_appears: "Founder dashboard.",
      table_or_data: "build_kpis, events, kill_continue_log.",
      links_to_modules: "Analytics-Attribution, Decision Register.",
      what_founder_sees: "Live KPI deltas + kill/continue countdown.",
      empty_state: "‘No events yet — analytics armed.’",
      test_proves_it_works: "Sample events flow into rollups.",
      must_remain_blocked: "No third-party analytics without approval.",
    },
    buildTitle: (n) => `Stage 9 · Analytics / KPI tracking · ${n}`,
    buildBody: (p) => `Wire KPIs: ${p.governance.kpis.join("; ") || "MRR, paying customers, retention"} and kill/continue criteria: ${p.governance.kill_continue_criteria.join("; ") || "(define)"}. No third-party analytics without approval.`,
  },
  {
    key: "command_centre_integration",
    dependencies: ["analytics_kpi", "founder_admin_dashboard"],
    is_qa_gate: false,
    is_live_mode_gate: false,
    founder_approval_required: false,
    test_instruction: "Open Command Centre — new build appears with status, KPIs, approvals.",
    acceptance_criteria: {
      what_must_be_built: "Command Centre operating panel for the build.",
      where_it_appears: "/founder/command-centre.",
      table_or_data: "Existing build_kpis + approvals.",
      links_to_modules: "FundingRadarCommandPanel + global Command Centre.",
      what_founder_sees: "Single-glance build health card.",
      empty_state: "Card shows ‘Awaiting first KPI’.",
      test_proves_it_works: "Card renders with placeholder data without errors.",
      must_remain_blocked: "No outbound action buttons on the card.",
    },
    buildTitle: (n) => `Stage 10 · Command Centre integration · ${n}`,
    buildBody: (p) => `Add Command Centre operating panel showing: ${p.command_centre_panel_requirements.join("; ")}. Read-only — no outbound action buttons.`,
  },
  {
    key: "launch_factory_handoff",
    dependencies: ["command_centre_integration", "compliance_legal"],
    is_qa_gate: false,
    is_live_mode_gate: false,
    founder_approval_required: true,
    test_instruction: "Open Launch Factory record for the build — readiness checklist complete or flagged.",
    acceptance_criteria: {
      what_must_be_built: "Launch Factory record + readiness checklist link.",
      where_it_appears: "Launch Factory + sub-app handoff page.",
      table_or_data: "launch_factory_records.",
      links_to_modules: "Launch Factory.",
      what_founder_sees: "Readiness checklist with go/no-go.",
      empty_state: "‘No checks yet — handoff drafted.’",
      test_proves_it_works: "Record exists; checklist persists.",
      must_remain_blocked: "No domains, no outbound, no public launch without approval.",
    },
    buildTitle: (n) => `Stage 11 · Launch Factory handoff · ${n}`,
    buildBody: () => "Create Launch Factory record + readiness checklist. No domains purchased, no outbound enabled, no public launch without founder approval.",
  },
  {
    key: "business_template_handoff",
    dependencies: ["launch_factory_handoff"],
    is_qa_gate: false,
    is_live_mode_gate: false,
    founder_approval_required: true,
    test_instruction: "Open Business Template — captured for reuse with redactions.",
    acceptance_criteria: {
      what_must_be_built: "Business Template entry capturing reusable patterns only.",
      where_it_appears: "Business Templates.",
      table_or_data: "business_templates.",
      links_to_modules: "Business Template Factory.",
      what_founder_sees: "Template entry with non-PII fields only.",
      empty_state: "‘No templates yet.’",
      test_proves_it_works: "Template renders with redactions.",
      must_remain_blocked: "No customer data, no copied competitor assets.",
    },
    buildTitle: (n) => `Stage 12 · Business Template handoff · ${n}`,
    buildBody: () => "Capture this build as a Business Template — patterns only, no customer data, no copied competitor assets.",
  },
  {
    key: "qa_smoke_test",
    dependencies: [
      "core_mvp_screens",
      "founder_admin_dashboard",
      "customer_onboarding",
      "crm_pipeline",
      "support_workflow",
      "compliance_legal",
      "analytics_kpi",
      "command_centre_integration",
      "launch_factory_handoff",
      "business_template_handoff",
    ],
    is_qa_gate: true,
    is_live_mode_gate: false,
    founder_approval_required: true,
    test_instruction: "Run npm test + npm run build + manual smoke checklist; all green.",
    acceptance_criteria: {
      what_must_be_built: "End-to-end QA pass with documented checklist.",
      where_it_appears: "QA report attached to the build.",
      table_or_data: "qa_runs, agent_audit.",
      links_to_modules: "Platform Testing, Self-Diagnostics.",
      what_founder_sees: "Pass/fail per area + outstanding issues.",
      empty_state: "‘No QA run yet.’",
      test_proves_it_works: "All MVP flows pass; build green.",
      must_remain_blocked: "Live mode stays locked until founder approves.",
    },
    buildTitle: (n) => `Stage 13 · QA + smoke test · ${n}`,
    buildBody: () => "Run full QA: every MVP flow, dashboards, CRM, support, compliance, analytics, Command Centre. Live mode stays locked.",
  },
  {
    key: "founder_approval_live_mode",
    dependencies: ["qa_smoke_test"],
    is_qa_gate: false,
    is_live_mode_gate: true,
    founder_approval_required: true,
    test_instruction: "Founder explicitly toggles live mode after reviewing QA + compliance + handoff records.",
    acceptance_criteria: {
      what_must_be_built: "Live-mode toggle gated by founder identity + QA pass.",
      where_it_appears: "Build settings → Live mode.",
      table_or_data: "approvals, audit_ledger.",
      links_to_modules: "Approval Ops, Audit Ledger.",
      what_founder_sees: "Locked toggle with prerequisites; unlocks only when met.",
      empty_state: "‘Locked — QA + handoff incomplete.’",
      test_proves_it_works: "Toggle refuses without QA pass; succeeds with founder identity + reason.",
      must_remain_blocked: "Outbound, paid APIs, public launch remain off until live mode armed by founder.",
    },
    buildTitle: (n) => `Stage 14 · Founder approval for live mode · ${n}`,
    buildBody: () => "Implement live-mode toggle. Locked until QA passes + founder records approval with reason. Outbound, paid APIs, public launch remain off until founder arms live mode.",
  },
];

export function buildProductionPromptQueue(pack: ProductionBuildPack | null | undefined, now: Date = new Date()): PromptQueueItem[] {
  const ts = now.toISOString();
  const name = pack?.candidate?.name ?? "(build)";
  return STAGE_BLUEPRINTS.map((b, idx) => ({
    key: b.key,
    order: idx + 1,
    title: b.buildTitle(name),
    body: pack ? b.buildBody(pack) : "Generate Primary build pack first to fill prompt body.",
    dependencies: b.dependencies,
    acceptance_criteria: b.acceptance_criteria,
    test_instruction: b.test_instruction,
    founder_approval_required: b.founder_approval_required,
    is_qa_gate: b.is_qa_gate,
    is_live_mode_gate: b.is_live_mode_gate,
    created_at: ts,
    completed_at: null,
    notes: "",
  }));
}

export type PromptQueueState = Record<PromptQueueStageKey, { completed_at: string | null; notes: string; founder_approved: boolean }>;

export function applyPromptQueueState(queue: PromptQueueItem[], state: Partial<PromptQueueState>): PromptQueueItem[] {
  return queue.map((q) => {
    const s = state[q.key];
    return s ? { ...q, completed_at: s.completed_at, notes: s.notes ?? q.notes } : q;
  });
}

export type PromptStageReadiness = "READY" | "BLOCKED_BY_DEPS" | "DONE" | "AWAITING_FOUNDER_APPROVAL";

export function computePromptQueueReadiness(
  queue: PromptQueueItem[],
  validation: BuildPackValidationReport,
  state: Partial<PromptQueueState> = {},
): Array<{ item: PromptQueueItem; readiness: PromptStageReadiness; missingDeps: PromptQueueStageKey[] }> {
  const completedByKey = new Set(
    queue.filter((q) => q.completed_at || state[q.key]?.completed_at).map((q) => q.key),
  );
  return queue.map((item) => {
    const missingDeps = item.dependencies.filter((d) => !completedByKey.has(d));
    if (item.completed_at || state[item.key]?.completed_at) return { item, readiness: "DONE" as const, missingDeps: [] };
    if (validation.status !== "READY_FOR_PROMPT_QUEUE") return { item, readiness: "BLOCKED_BY_DEPS" as const, missingDeps };
    if (missingDeps.length > 0) return { item, readiness: "BLOCKED_BY_DEPS" as const, missingDeps };
    if (item.founder_approval_required && !(state[item.key]?.founder_approved)) return { item, readiness: "AWAITING_FOUNDER_APPROVAL" as const, missingDeps: [] };
    return { item, readiness: "READY" as const, missingDeps: [] };
  });
}

export function isLiveModeUnlocked(queue: PromptQueueItem[], state: Partial<PromptQueueState> = {}): boolean {
  const qa = queue.find((q) => q.is_qa_gate);
  const live = queue.find((q) => q.is_live_mode_gate);
  const qaDone = !!(qa && (qa.completed_at || state[qa.key]?.completed_at));
  const liveApproved = !!(live && state[live.key]?.founder_approved && (live.completed_at || state[live.key]?.completed_at));
  return qaDone && liveApproved;
}

export function summarisePromptQueue(
  queue: PromptQueueItem[],
  validation: BuildPackValidationReport,
  state: Partial<PromptQueueState> = {},
) {
  const readiness = computePromptQueueReadiness(queue, validation, state);
  const done = readiness.filter((r) => r.readiness === "DONE");
  const blocked = readiness.filter((r) => r.readiness === "BLOCKED_BY_DEPS");
  const awaiting = readiness.filter((r) => r.readiness === "AWAITING_FOUNDER_APPROVAL");
  const ready = readiness.filter((r) => r.readiness === "READY");
  const current = readiness.find((r) => r.readiness !== "DONE");
  const next = ready[0] ?? awaiting[0] ?? null;
  return {
    total: queue.length,
    done: done.length,
    blocked: blocked.length,
    awaiting: awaiting.length,
    ready: ready.length,
    currentStage: current?.item.key ?? null,
    nextReadyStage: next?.item.key ?? null,
    liveModeUnlocked: isLiveModeUnlocked(queue, state),
  };
}

// ---- Full Business Production Pack ---------------------------------------

export type FullProductionPack = {
  generated_at: string;
  business_summary: {
    business_name_placeholder: string;
    legally_distinct_concept: string;
    problem_thesis: string;
    paying_customer_profile: string;
    first_niche_wedge: string;
    sector: string;
    geography: string;
    why_selected: string[];
    funded_proof: string;
    what_not_to_copy: string[];
    founder_approval_status: string;
  };
  brand_pack: {
    brand_name_options: string[];
    positioning_statement: string;
    tagline_options: string[];
    tone_of_voice: string[];
    visual_direction: string;
    colour_direction: string;
    typography_direction: string;
    logo_direction: string;
    imagery_style: string;
    trust_signals: string[];
    differentiation_statement: string;
    prohibited_copy_notes: string[];
    pre_launch_checks: string[];
  };
  product_pack: {
    description: string;
    user_types: string[];
    user_journeys: string[];
    core_mvp_features: string[];
    future_features: string[];
    admin_founder_features: string[];
    customer_facing_features: string[];
    support_features: string[];
    ai_agent_features: string[];
    human_oversight_requirements: string[];
    approval_gates: string[];
  };
  technical_pack: {
    app_structure: string[];
    route_map: string[];
    database_schema: string[];
    supabase_table_plan: string[];
    authentication: string[];
    role_permission_model: string[];
    storage: string[];
    edge_functions: string[];
    scheduled_jobs: string[];
    webhooks: string[];
    audit_logging: string[];
    data_retention: string[];
    integration_placeholders: string[];
    no_paid_api_default: boolean;
    no_outbound_default: boolean;
  };
  ui_ux_pack: {
    public_landing: string[];
    customer_portal: string[];
    founder_admin_dashboard: string[];
    onboarding_flow: string[];
    settings_page: string[];
    empty_states: string[];
    success_states: string[];
    error_states: string[];
    mobile_layout_notes: string[];
    accessibility_notes: string[];
    trust_compliance_display: string[];
  };
  copy_pack: {
    homepage: string[];
    hero: string[];
    problem: string[];
    solution: string[];
    how_it_works: string[];
    pricing_placeholder: string[];
    faq: string[];
    trust: string[];
    cta: string[];
    onboarding_email_drafts: string[];
    support_snippet_drafts: string[];
    rules: string[];
  };
  legal_pack: {
    pages: Array<{ slug: string; title: string; required: boolean; risk: "low"|"medium"|"high"; needs_adviser_review: boolean; draft_outline: string[] }>;
    rules: string[];
    pre_publish_gates: string[];
  };
  crm_pack: {
    lead_stages: string[];
    customer_stages: string[];
    pipeline_structure: string[];
    first_100_customer_route: string[];
    offer_structure: string[];
    pricing_hypothesis: string;
    sales_approval_gates: string[];
    follow_up_stages: string[];
    objection_categories: string[];
    conversion_kpis: string[];
    revenue_kpis: string[];
    outreach_rule: string;
  };
  onboarding_pack: {
    customer_onboarding_flow: string[];
    intake_questions: string[];
    welcome_pack: string[];
    checklist: string[];
    delivery_workflow: string[];
    internal_sla: string[];
    support_handoff: string[];
    escalation_rules: string[];
    human_oversight_points: string[];
    ai_agent_responsibilities: string[];
    founder_approval_gates: string[];
  };
  support_pack: {
    categories: string[];
    ticket_stages: string[];
    knowledge_base_outline: string[];
    escalation_rules: string[];
    refund_cancellation: string[];
    complaints_evidence_capture: string[];
    risk_flags: string[];
    founder_escalation_triggers: string[];
  };
  analytics_pack: {
    launch_kpis: string[];
    usage_kpis: string[];
    conversion_kpis: string[];
    support_kpis: string[];
    revenue_kpis: string[];
    founder_workload_kpi: string;
    human_oversight_burden_kpi: string;
    ai_automation_performance_kpi: string;
    proof_targets_30_60_90: string[];
    kill_continue_park_criteria: string[];
  };
  launch_qa_pack: string[];
  lovable_prompt_pack: PromptQueueItem[];
  github_audit_pack: {
    audit_steps: string[];
    must_pass: string[];
    must_block: string[];
    expected_outputs: string[];
    prompt_body: string;
  };
  automation_boundaries: {
    may_auto: string[];
    must_not_auto: string[];
    founder_approval_required_before: string[];
  };
  prohibited_copy: string[];
};

export const PRODUCTION_PACK_PROHIBITED_COPY = [
  "Competitor company name",
  "Brand identity / logo / colour scheme",
  "Website copy / wording",
  "UI design",
  "Source code",
  "Customer lists",
  "Databases / proprietary data",
  "Confidential documents",
  "Proprietary workflows",
  "Private pricing documents",
  "Protected assets",
  "Restricted scraped data",
] as const;

export const PRODUCTION_PACK_MAY_AUTO = [
  "Generate the production pack",
  "Generate Lovable prompts",
  "Create internal build queue items",
  "Create draft Launch Factory records",
  "Create draft Business Template records",
  "Create draft Command Centre panels",
  "Create internal tasks",
  "Create legal-page draft structures",
  "Create GitHub audit prompts",
  "Update manuals",
] as const;

export const PRODUCTION_PACK_MUST_NOT_AUTO = [
  "Publish a public website",
  "Buy domains",
  "Send emails",
  "Launch outreach",
  "Contact external parties",
  "Activate paid APIs",
  "Spend money",
  "Open a data room",
  "Contact investors / acquirers",
  "Make public claims",
  "Enable live mode",
] as const;

export const PRODUCTION_PACK_FOUNDER_APPROVAL_BEFORE = [
  "Production build starts",
  "Public brand / site goes live",
  "Domain is purchased",
  "Email sending is enabled",
  "Outreach begins",
  "Paid APIs are activated",
  "External parties are contacted",
  "Legal pages are published",
  "Live mode is unlocked",
] as const;

export type LovablePromptPackStageKey =
  | "brand_product_foundation"
  | "app_structure_route_map"
  | "database_schema"
  | "landing_page"
  | "customer_onboarding"
  | "customer_portal"
  | "founder_admin_dashboard"
  | "crm_pipeline"
  | "support_workflow"
  | "legal_compliance_pages"
  | "analytics_kpi_tracking"
  | "command_centre_integration"
  | "launch_factory_handoff"
  | "business_template_handoff"
  | "qa_smoke_test"
  | "github_audit_launch_readiness";

function makePromptItem(
  order: number,
  key: LovablePromptPackStageKey,
  title: string,
  body: string,
  dependencies: LovablePromptPackStageKey[],
  ac: PromptQueueItem["acceptance_criteria"],
  test_instruction: string,
  founder_approval_required: boolean,
  flags: { is_qa_gate?: boolean; is_live_mode_gate?: boolean } = {},
  ts: string,
): PromptQueueItem {
  return {
    key: key as unknown as PromptQueueStageKey,
    order,
    title,
    body,
    dependencies: dependencies as unknown as PromptQueueStageKey[],
    acceptance_criteria: ac,
    test_instruction,
    founder_approval_required,
    is_qa_gate: !!flags.is_qa_gate,
    is_live_mode_gate: !!flags.is_live_mode_gate,
    created_at: ts,
    completed_at: null,
    notes: "",
  };
}

function buildLovablePromptPack(p: FullProductionPack, name: string, ts: string): PromptQueueItem[] {
  const ac = (
    what: string, where: string, table: string, links: string,
    founder: string, empty: string, test: string, blocked: string,
  ) => ({ what_must_be_built: what, where_it_appears: where, table_or_data: table, links_to_modules: links, what_founder_sees: founder, empty_state: empty, test_proves_it_works: test, must_remain_blocked: blocked });

  return [
    makePromptItem(1, "brand_product_foundation", `Stage 1 · Brand + product foundation · ${name}`,
      `Scaffold ${name} as a Liftor sub-app. Apply legally distinct branding from Brand Pack: ${p.brand_pack.positioning_statement} Tone: ${p.brand_pack.tone_of_voice.join(", ")}. Do not copy any competitor name, logo, colour, copy or UI. Reuse existing tech-card design system.`,
      [], ac("App shell, auth gate, base layout, brand tokens.", "/founder/<slug>", "auth.users, profiles, user_roles", "Founder layout, has_role.", "Empty product shell with placeholders.", "‘Foundation ready — continue to schema.’", "Non-admin redirected; founder lands on shell.", "No outbound, no public route, no payments, no live mode."),
      "Open the new sub-app route — shell renders with auth gate.", false, {}, ts),
    makePromptItem(2, "app_structure_route_map", `Stage 2 · App structure + route map · ${name}`,
      `Implement route map: ${p.technical_pack.route_map.join(" / ")}. Mount under founder layout. No public routes yet.`,
      ["brand_product_foundation"], ac("All routes from technical pack.", "Sub-app routes.", "Route registry only.", "FounderLayout, FounderRoute.", "Empty pages with breadcrumbs.", "‘Page ready.’", "Each route loads without errors.", "No public access until live mode."),
      "Visit each route — renders with founder guard.", false, {}, ts),
    makePromptItem(3, "database_schema", `Stage 3 · Database / schema · ${name}`,
      `Create migrations for: ${p.technical_pack.database_schema.join("; ")}. Include GRANTs and RLS scoped to founder/admin and tenant. No anon writes. No paid APIs.`,
      ["app_structure_route_map"], ac("Tables + RLS + GRANTs.", "Supabase migrations.", "Stage tables.", "has_role, audit ledger.", "Empty tables visible.", "‘No records yet — schema ready.’", "Insert + select round-trip with RLS pass.", "No public anon writes."),
      "Run migration and confirm RLS + GRANTs.", false, {}, ts),
    makePromptItem(4, "landing_page", `Stage 4 · Landing page · ${name}`,
      `Generate landing page sections: ${p.ui_ux_pack.public_landing.join(" / ")}. Use original copy only. No competitor wording. No regulated claims.`,
      ["brand_product_foundation"], ac("Landing page with hero, problem, solution, how-it-works, pricing, FAQ, trust, CTA.", "/<slug>/preview (internal until launch).", "Static content + CMS-style records.", "Brand pack, copy pack.", "Preview-only mode.", "‘Preview — not yet public.’", "Lighthouse + accessibility checks pass.", "No public publish without founder approval."),
      "Open preview URL — sections render with original copy.", false, {}, ts),
    makePromptItem(5, "customer_onboarding", `Stage 5 · Customer onboarding · ${name}`,
      `Implement onboarding flow: ${p.onboarding_pack.customer_onboarding_flow.join(" → ")}. Sandbox-only until live mode. No real payments.`,
      ["database_schema"], ac("Onboarding screens + intake.", "/onboarding inside sub-app.", "customers, onboarding_progress.", "Customer Onboarding engine, Approval Ops.", "Onboarding completion KPI.", "‘No customers onboarded yet.’", "Sandbox account reaches first-value step.", "No public sign-up until live mode."),
      "Run onboarding with sandbox account.", false, {}, ts),
    makePromptItem(6, "customer_portal", `Stage 6 · Customer portal · ${name}`,
      "Build customer portal with account, settings, billing placeholder, support entry, AI-action approvals.",
      ["customer_onboarding"], ac("Customer-facing portal.", "/portal under sub-app.", "customers, subscriptions stub, approvals.", "CRM, Approval Ops.", "Customer health KPIs.", "‘No customers yet.’", "Sandbox customer can navigate portal.", "No outbound from portal."),
      "Sandbox customer logs into portal — pages render.", false, {}, ts),
    makePromptItem(7, "founder_admin_dashboard", `Stage 7 · Founder / admin dashboard · ${name}`,
      `Build founder dashboard with KPI tiles: ${p.analytics_pack.launch_kpis.join("; ")} and an approval queue. No public access.`,
      ["customer_portal", "database_schema"], ac("Founder dashboard with KPI tiles + approval queue.", "/founder/<slug>/dashboard.", "build_kpis, approvals, agent_runs.", "Command Centre, Approval Ops.", "All KPIs in one place.", "‘No data yet.’", "All tiles render without errors.", "No public access; no exports without approval."),
      "Open dashboard — KPI tiles render with zero-state.", false, {}, ts),
    makePromptItem(8, "crm_pipeline", `Stage 8 · CRM / pipeline · ${name}`,
      `Wire CRM stages: ${p.crm_pack.lead_stages.join(" → ")} ↦ ${p.crm_pack.customer_stages.join(" → ")}. Log every transition. Outbound disabled until live mode.`,
      ["database_schema"], ac("CRM with stages and audit log.", "/founder/<slug>/crm.", "crm_contacts, crm_deals, crm_events.", "CRM Dashboard, audit ledger.", "Pipeline board with stage timing.", "‘No deals yet.’", "Test deal traverses every stage.", "No outbound email/SMS until live mode."),
      "Move test deal across all stages.", false, {}, ts),
    makePromptItem(9, "support_workflow", `Stage 9 · Support workflow · ${name}`,
      "Build support inbox with ticket states and AI-assist drafts. Mandatory founder approval before any reply leaves the system.",
      ["customer_portal"], ac("Support inbox + states + AI-assist + escalation.", "/founder/<slug>/support.", "support_tickets, agent_runs, approvals.", "Support Hub, Approval Ops.", "Open tickets, SLA, escalations.", "‘No tickets — support ready.’", "Sandbox ticket round-trip.", "AI replies require founder approval."),
      "File a sandbox ticket; route + approve reply.", false, {}, ts),
    makePromptItem(10, "legal_compliance_pages", `Stage 10 · Legal / compliance pages · ${name}`,
      `Add legal pages with versioning + acceptance ledger: ${p.legal_pack.pages.map((x) => x.title).join(", ")}. Mark all as draft/template. Founder/adviser review required before publish.`,
      ["brand_product_foundation"], ac("Versioned legal pages + acceptance ledger.", "/legal/* under sub-app.", "legal_documents, legal_acceptances.", "Founder Legal Console.", "Versioned policy table with acceptance counts.", "‘No acceptances yet.’", "Render + accept + ledger entry verified.", "No publishing without founder + adviser approval."),
      "Visit each /legal/* route; verify acceptance ledger writes.", true, {}, ts),
    makePromptItem(11, "analytics_kpi_tracking", `Stage 11 · Analytics / KPI tracking · ${name}`,
      `Wire KPIs and kill/continue criteria: ${p.analytics_pack.kill_continue_park_criteria.join("; ")}. No third-party analytics without approval.`,
      ["founder_admin_dashboard"], ac("Event capture + KPI rollups + kill/continue tile.", "Founder dashboard.", "build_kpis, events, kill_continue_log.", "Analytics-Attribution, Decision Register.", "Live KPI deltas + kill/continue countdown.", "‘No events yet — analytics armed.’", "Sample events flow into rollups.", "No third-party analytics without approval."),
      "Trigger sample events; rollups update.", false, {}, ts),
    makePromptItem(12, "command_centre_integration", `Stage 12 · Command Centre integration · ${name}`,
      "Add Command Centre operating panel for the build (read-only — no outbound action buttons).",
      ["analytics_kpi_tracking", "founder_admin_dashboard"], ac("Command Centre operating panel for the build.", "/founder/command-centre.", "build_kpis + approvals.", "FundingRadarCommandPanel + global Command Centre.", "Single-glance build health card.", "Card shows ‘Awaiting first KPI’.", "Card renders with placeholder data.", "No outbound action buttons on the card."),
      "Open Command Centre — new build appears.", false, {}, ts),
    makePromptItem(13, "launch_factory_handoff", `Stage 13 · Launch Factory handoff · ${name}`,
      "Create Launch Factory record + readiness checklist. No domains, no outbound, no public launch without founder approval.",
      ["command_centre_integration", "legal_compliance_pages"], ac("Launch Factory record + readiness checklist link.", "Launch Factory + sub-app handoff page.", "launch_factory_records.", "Launch Factory.", "Readiness checklist with go/no-go.", "‘No checks yet — handoff drafted.’", "Record exists; checklist persists.", "No domains/outbound/launch without approval."),
      "Open Launch Factory record for the build.", true, {}, ts),
    makePromptItem(14, "business_template_handoff", `Stage 14 · Business Template handoff · ${name}`,
      "Capture this build as a Business Template — patterns only, no customer data, no copied competitor assets.",
      ["launch_factory_handoff"], ac("Business Template entry capturing reusable patterns only.", "Business Templates.", "business_templates.", "Business Template Factory.", "Template entry with non-PII fields only.", "‘No templates yet.’", "Template renders with redactions.", "No customer data, no copied assets."),
      "Open Business Template entry — verify redactions.", true, {}, ts),
    makePromptItem(15, "qa_smoke_test", `Stage 15 · QA + smoke test · ${name}`,
      "Run full QA: every MVP flow, dashboards, CRM, support, compliance, analytics, Command Centre. Live mode stays locked.",
      ["customer_portal", "founder_admin_dashboard", "crm_pipeline", "support_workflow", "legal_compliance_pages", "analytics_kpi_tracking", "command_centre_integration", "launch_factory_handoff", "business_template_handoff"],
      ac("End-to-end QA pass with documented checklist.", "QA report attached to the build.", "qa_runs, agent_audit.", "Platform Testing, Self-Diagnostics.", "Pass/fail per area + outstanding issues.", "‘No QA run yet.’", "All flows pass; build green.", "Live mode stays locked until founder approves."),
      "Run npm test + npm run build + manual smoke checklist.", true, { is_qa_gate: true }, ts),
    makePromptItem(16, "github_audit_launch_readiness", `Stage 16 · GitHub audit + launch-readiness report · ${name}`,
      `Run the GitHub audit prompt and produce a launch-readiness report. ${p.github_audit_pack.prompt_body}`,
      ["qa_smoke_test"], ac("GitHub audit + launch-readiness report.", "Audit report + Launch Factory checklist.", "audit_runs, approvals.", "Launch Factory, Approval Ops.", "Pass/fail summary with remaining issues.", "‘No audit run yet.’", "All audit checks pass before live mode.", "Outbound, paid APIs, public launch remain off until founder arms live mode."),
      "Run audit prompt; review pass/fail; founder records approval before live mode.", true, { is_live_mode_gate: true }, ts),
  ];
}

function legalPagesPlan(): FullProductionPack["legal_pack"]["pages"] {
  return [
    { slug: "/legal/terms", title: "Terms of Service", required: true, risk: "high", needs_adviser_review: true, draft_outline: ["Acceptance", "Eligibility", "Account & access", "Acceptable use", "Fees & billing (placeholder)", "Termination", "Disclaimers", "Limitation of liability", "Governing law"] },
    { slug: "/legal/privacy", title: "Privacy Policy", required: true, risk: "high", needs_adviser_review: true, draft_outline: ["Data we collect", "Lawful basis", "How we use data", "Sharing", "Retention", "Your rights", "Cookies link", "Contact"] },
    { slug: "/legal/cookies", title: "Cookie Policy", required: true, risk: "medium", needs_adviser_review: true, draft_outline: ["What cookies", "Categories", "Manage preferences", "Third parties", "Updates"] },
    { slug: "/legal/aup", title: "Acceptable Use Policy", required: true, risk: "medium", needs_adviser_review: true, draft_outline: ["Prohibited uses", "Abuse handling", "Reporting", "Termination"] },
    { slug: "/legal/ai-usage", title: "AI Usage Policy", required: true, risk: "high", needs_adviser_review: true, draft_outline: ["Models used", "Human-in-the-loop", "Hallucination disclaimer", "User responsibilities", "Data handling"] },
    { slug: "/legal/automation-safety", title: "Automation Safety Policy", required: true, risk: "high", needs_adviser_review: true, draft_outline: ["Approval gates", "Outbound rules", "Paid-API rules", "Audit logging", "Incident response"] },
    { slug: "/legal/security", title: "Security Policy", required: true, risk: "high", needs_adviser_review: true, draft_outline: ["Controls", "Encryption", "Access control", "Vulnerability disclosure", "Sub-processors"] },
    { slug: "/legal/dpa", title: "Data Processing Agreement", required: false, risk: "high", needs_adviser_review: true, draft_outline: ["Roles", "Processing scope", "Sub-processors", "International transfers", "Audits"] },
    { slug: "/legal/refunds", title: "Refund / Cancellation Policy", required: false, risk: "medium", needs_adviser_review: true, draft_outline: ["Eligibility", "Window", "Process", "Exceptions"] },
    { slug: "/legal/marketplace", title: "Marketplace Terms", required: false, risk: "medium", needs_adviser_review: true, draft_outline: ["Roles", "Listing rules", "Disputes", "Fees"] },
    { slug: "/legal/seller-terms", title: "Provider / Seller Terms", required: false, risk: "medium", needs_adviser_review: true, draft_outline: ["Onboarding", "Quality", "Payouts", "Suspension"] },
    { slug: "/legal/disclaimer", title: "Disclaimer", required: false, risk: "high", needs_adviser_review: true, draft_outline: ["No professional advice", "Regulated-claim limits", "Jurisdictional notes"] },
    { slug: "/legal/contact", title: "Contact / Complaints Route", required: true, risk: "low", needs_adviser_review: false, draft_outline: ["Email", "Response SLA", "Escalation path"] },
  ];
}

export function buildFullProductionPack(args: {
  pack: ProductionBuildPack;
  founderApproved?: boolean;
  now?: Date;
}): FullProductionPack {
  const { pack, founderApproved = false } = args;
  const now = args.now ?? new Date();
  const ts = now.toISOString();
  const name = pack.candidate?.name ?? "(build)";
  const sector = (pack.thesis as any)?.sector ?? (pack as any).candidate?.sector ?? "B2B SaaS";
  const geo = (pack.thesis as any)?.geography ?? "EU / UK first";

  const business_summary: FullProductionPack["business_summary"] = {
    business_name_placeholder: `Working title: ${name} (rename before launch)`,
    legally_distinct_concept: pack.thesis?.legally_distinct_product_concept ?? "Vertical AI operator with founder-approved actions; legally distinct from incumbents.",
    problem_thesis: pack.customer_problem_thesis ?? pack.thesis?.problem_thesis ?? "Manual workflows in funded category that AI + human-in-the-loop compresses.",
    paying_customer_profile: pack.thesis?.paying_customer_profile ?? "Established buyers with current SaaS spend evidencing willingness to pay.",
    first_niche_wedge: pack.crowding_white_space ?? "Underserved niche segment within the broader funded category.",
    sector,
    geography: geo,
    why_selected: pack.why_selected ?? [],
    funded_proof: pack.funding_proof ?? "Funded competitors validate problem and willingness to pay.",
    what_not_to_copy: [...PRODUCTION_PACK_PROHIBITED_COPY],
    founder_approval_status: founderApproved ? "Approved by founder" : "Awaiting founder approval",
  };

  const brand_pack: FullProductionPack["brand_pack"] = {
    brand_name_options: [`${name.split(/\s+/)[0]}Ops`, `${name.split(/\s+/)[0]}Edge`, `${name.split(/\s+/)[0]}Loop`, "(founder to confirm)"],
    positioning_statement: `For ${business_summary.paying_customer_profile.toLowerCase()}, ${name} is the AI-operated alternative that compresses manual work with founder-approved guardrails.`,
    tagline_options: [
      "AI operators, human-approved.",
      "Run the boring work. Approve the important moments.",
      "Operations on autopilot — with you in the loop.",
    ],
    tone_of_voice: ["Calm", "technical", "engineering-grade", "no hype", "no agency-speak"],
    visual_direction: "Dark navy background, electric blue accents, tech-card components, layered AI-OS feel.",
    colour_direction: "Primary #2EA3FF over near-black; no light grey backgrounds.",
    typography_direction: "Geometric sans for headings, neutral sans for body; no serif.",
    logo_direction: "Geometric mark + wordmark; no copying of competitor marks; reserve trademark check.",
    imagery_style: "Abstract layered diagrams, console screenshots; no stock people imagery.",
    trust_signals: ["Human-in-the-loop badge", "Audit log link", "Security policy link", "Founder-approval indicator"],
    differentiation_statement: "Liftor-built systems are auditable, founder-approved, and legally distinct from incumbents.",
    prohibited_copy_notes: [...PRODUCTION_PACK_PROHIBITED_COPY],
    pre_launch_checks: ["Trademark search", "Domain availability check (do not buy yet)", "Adviser review of name + tagline", "Founder approval before public launch"],
  };

  const product_pack: FullProductionPack["product_pack"] = {
    description: `${name} is an AI-operated solution for ${business_summary.paying_customer_profile.toLowerCase()} that automates ${pack.thesis?.problem_thesis ?? "operational workflows"} with founder-approved actions.`,
    user_types: ["Customer admin", "Customer end user", "Founder/operator", "Adviser (read-only)"],
    user_journeys: [
      "Sign up → onboarding → first value → recurring use",
      "Lead → qualified → pilot → paying customer",
      "Ticket → AI draft → founder approval → reply",
    ],
    core_mvp_features: pack.build_plan?.mvp_feature_list?.length ? pack.build_plan.mvp_feature_list : ["Intake", "AI triage", "Approval queue", "Audit log"],
    future_features: ["Marketplace", "Public API", "Mobile app", "Advanced reporting"],
    admin_founder_features: ["Approval queue", "KPI dashboard", "Audit log", "Kill/continue switch", "Live-mode toggle"],
    customer_facing_features: ["Account", "Settings", "Billing placeholder", "Support entry"],
    support_features: ["Ticket inbox", "AI-assist drafts", "Escalation rules"],
    ai_agent_features: ["Triage agent", "Drafting agent", "Compliance check agent"],
    human_oversight_requirements: pack.human_oversight_requirements ?? ["Founder reviews every external action"],
    approval_gates: pack.governance?.approval_gates ?? [...PRODUCTION_PACK_FOUNDER_APPROVAL_BEFORE],
  };

  const technical_pack: FullProductionPack["technical_pack"] = {
    app_structure: ["/founder/<slug>", "/founder/<slug>/dashboard", "/portal", "/legal/*", "/onboarding"],
    route_map: ["/", "/preview", "/portal", "/onboarding", "/founder/<slug>", "/founder/<slug>/dashboard", "/founder/<slug>/crm", "/founder/<slug>/support", "/legal/terms", "/legal/privacy"],
    database_schema: pack.database_schema_needs?.length ? pack.database_schema_needs : ["customers", "subscriptions", "approvals", "agent_runs", "build_kpis"],
    supabase_table_plan: ["customers (auth/billing)", "subscriptions (recurring)", "approvals (founder gates)", "agent_runs + agent_audit", "build_kpis", "audit_ledger"],
    authentication: ["Supabase Auth (email)", "Optional Google OAuth (founder approval to enable)", "RLS scoped to tenant + founder"],
    role_permission_model: ["app_role enum: admin, operator, customer, viewer", "has_role security-definer", "RLS policies referencing has_role"],
    storage: ["Bucket: <slug>-private (RLS, founder + tenant only)", "No public bucket without founder approval"],
    edge_functions: ["agent-run (no outbound by default)", "approval-execute (only after founder approval)"],
    scheduled_jobs: ["nightly-kpi-rollup", "weekly-kill-continue-review"],
    webhooks: ["inbound-webhook (signed, rate-limited)", "no outbound webhooks until live mode"],
    audit_logging: ["audit_ledger append-only", "agent_audit per run", "approvals trail"],
    data_retention: ["Customer data: tenant-scoped, retain per DPA", "Audit logs: 24 months minimum"],
    integration_placeholders: ["Email (disabled)", "SMS (disabled)", "Payments (placeholder)", "Analytics (internal only)"],
    no_paid_api_default: true,
    no_outbound_default: true,
  };

  const ui_ux_pack: FullProductionPack["ui_ux_pack"] = {
    public_landing: pack.build_plan?.landing_page_structure?.length ? pack.build_plan.landing_page_structure : ["Hero", "Problem", "Solution", "How it works", "Pricing", "FAQ", "Trust", "CTA"],
    customer_portal: ["Account", "Settings", "Billing placeholder", "Support entry", "Approvals"],
    founder_admin_dashboard: ["KPI tiles", "Approval queue", "Agent runs", "Kill/continue tile", "Live-mode toggle"],
    onboarding_flow: ["Welcome", "Connect", "First value", "Confirmation"],
    settings_page: ["Profile", "Notifications", "Security", "Compliance"],
    empty_states: ["‘No data yet — system armed’", "‘No tickets — support ready’", "‘No deals yet — pipeline ready’"],
    success_states: ["‘Action completed’", "‘Approval recorded’", "‘QA passed’"],
    error_states: ["‘Something went wrong — retry’", "‘Approval required’", "‘Blocked: dependency missing’"],
    mobile_layout_notes: ["Single-column under 768px", "Touch-friendly tap targets", "Sticky approve buttons"],
    accessibility_notes: ["WCAG AA contrast", "Keyboard navigable", "Screen-reader labels", "Focus rings always visible"],
    trust_compliance_display: ["Human-in-the-loop badge", "Audit log link", "Security policy link", "Founder approval indicator"],
  };

  const copy_pack: FullProductionPack["copy_pack"] = {
    homepage: ["Original copy only — no competitor wording"],
    hero: ["Outcome-focused headline", "1-line proof", "Primary CTA: ‘Request access’ (no public sign-up by default)"],
    problem: ["Describe the manual pain in customer language", "Cite category — never name competitors"],
    solution: ["Describe Liftor’s legally distinct execution route", "Highlight human-in-the-loop"],
    how_it_works: ["Step 1 onboarding", "Step 2 AI drafts", "Step 3 founder approval", "Step 4 outcome"],
    pricing_placeholder: ["‘Pricing coming soon’ until founder confirms hypothesis"],
    faq: ["Data handling", "AI oversight", "Approval gates", "Cancellation"],
    trust: ["Security policy", "Audit logging", "Founder oversight"],
    cta: ["‘Request access’", "‘Talk to the founder’ (founder-approved replies only)"],
    onboarding_email_drafts: ["Welcome email — DRAFT (founder approval before sending)", "First-value email — DRAFT", "Approval reminder — DRAFT"],
    support_snippet_drafts: ["Acknowledgement — DRAFT", "Escalation — DRAFT", "Refund handling — DRAFT (legal review)"],
    rules: ["Original copy only", "No competitor wording", "No unsupported claims", "No regulated claims without adviser approval"],
  };

  const legal_pack: FullProductionPack["legal_pack"] = {
    pages: legalPagesPlan(),
    rules: [
      "All legal text marked as draft / template only",
      "Founder + adviser review required before publish for medium/high risk",
      "No medical, legal, financial, insurance or regulated claims without review",
      "Public launch blocked until required pages exist",
    ],
    pre_publish_gates: ["Adviser review", "Founder approval", "Versioning + acceptance ledger live"],
  };

  const crm_pack: FullProductionPack["crm_pack"] = {
    lead_stages: ["Captured", "Qualified", "Pilot", "Closed-won/lost"],
    customer_stages: ["Onboarding", "Active", "At-risk", "Churned"],
    pipeline_structure: pack.build_plan?.crm_pipeline_stages ?? ["Lead", "Qualified", "Pilot", "Won"],
    first_100_customer_route: ["Founder-approved warm intros", "Hand-picked design partners", "Public waitlist (after legal pages live)"],
    offer_structure: ["Pilot offer", "Annual prepay incentive", "Reference customer credit"],
    pricing_hypothesis: pack.willingness_to_pay_evidence ?? "Confirm pricing through 5 pilot conversations before publishing.",
    sales_approval_gates: ["Founder approval before any outreach", "Founder approval before published comparisons"],
    follow_up_stages: ["+24h", "+72h", "+7d", "+14d (then archive)"],
    objection_categories: ["Trust", "Switching cost", "Compliance", "Price"],
    conversion_kpis: ["Lead → qualified rate", "Pilot → paid rate", "Time-to-first-value"],
    revenue_kpis: ["MRR", "ARR", "ARPA", "Churn"],
    outreach_rule: "No outbound sending until founder enables live mode.",
  };

  const onboarding_pack: FullProductionPack["onboarding_pack"] = {
    customer_onboarding_flow: ["Welcome", "Account setup", "Connect data (manual upload OK)", "AI draft preview", "Founder/customer approval", "First value"],
    intake_questions: ["Company / role", "Use case", "Existing tools", "Compliance constraints", "Approval contacts"],
    welcome_pack: ["Welcome video (founder-approved)", "Quick-start guide", "Approval-gate explainer"],
    checklist: ["Account verified", "Tenant created", "Approval contacts captured", "First-value step done"],
    delivery_workflow: ["Intake", "AI draft", "Founder/operator review", "Customer approval", "Outcome"],
    internal_sla: ["First response < 1 business day", "First-value < 7 days", "Resolution < 14 days"],
    support_handoff: ["Ticket created on intake failure", "Routed to founder if approval blocked"],
    escalation_rules: ["AI confidence below threshold → founder review", "Compliance flag → adviser review"],
    human_oversight_points: ["Every external action", "Pricing change", "Legal commitment"],
    ai_agent_responsibilities: ["Triage", "Drafting", "Compliance pre-check"],
    founder_approval_gates: [...PRODUCTION_PACK_FOUNDER_APPROVAL_BEFORE],
  };

  const support_pack: FullProductionPack["support_pack"] = {
    categories: ["Account", "Onboarding", "Billing", "Compliance", "Bug", "Feature request"],
    ticket_stages: ["New", "Triaged", "In progress", "Awaiting customer", "Awaiting founder", "Resolved", "Escalated"],
    knowledge_base_outline: ["Getting started", "Approvals", "Compliance", "Privacy", "Troubleshooting"],
    escalation_rules: ["Compliance flag → adviser", "Founder mention → founder", "Legal threat → legal advisor"],
    refund_cancellation: ["Per Refund / Cancellation Policy (founder-approved)"],
    complaints_evidence_capture: ["Ticket history", "Audit log entries", "AI-run trace", "Founder approvals"],
    risk_flags: ["PII leak", "Regulated claim", "Outbound without approval", "Spending without approval"],
    founder_escalation_triggers: ["Any compliance/legal risk", "Refund > threshold", "Press / public mention", "Investor inquiry"],
  };

  const analytics_pack: FullProductionPack["analytics_pack"] = {
    launch_kpis: ["Signups (preview)", "Approval queue depth", "Time-to-first-value"],
    usage_kpis: ["WAU", "Actions per user", "Approval cycle time"],
    conversion_kpis: ["Preview → request access", "Request → pilot", "Pilot → paid"],
    support_kpis: ["First response time", "Resolution time", "CSAT"],
    revenue_kpis: ["MRR", "ARR", "ARPA", "Churn"],
    founder_workload_kpi: "Founder hours per week on this build",
    human_oversight_burden_kpi: "Approvals per active customer per week",
    ai_automation_performance_kpi: "AI-success rate (approved without edit) %",
    proof_targets_30_60_90: ["30d: 5 design partners", "60d: 10 paying customers", "90d: kill/continue review"],
    kill_continue_park_criteria: pack.governance?.kill_continue_criteria ?? [
      "<5 paying customers by 90d → kill",
      "5-9 paying with strong WTP → park 30d",
      "≥10 paying + retention > 90% → continue",
    ],
  };

  const launch_qa_pack: FullProductionPack["launch_qa_pack"] = [
    "Routing works on every page",
    "Mobile layout renders without overlap",
    "Auth works (where required) with proper redirects",
    "Forms persist and validate correctly",
    "CRM pipeline stage transitions logged",
    "Onboarding completes for sandbox account",
    "All required legal pages present and versioned",
    "Analytics events flow into KPI rollups",
    "Demo / seed data hidden in non-founder views",
    "No outbound sending enabled by default",
    "No paid APIs activated by default",
    "No public unsupported claims in copy",
    "Founder approval recorded before live mode",
  ];

  const github_audit_pack: FullProductionPack["github_audit_pack"] = {
    audit_steps: [
      "Inspect changed files for accidental copying",
      "Check route registration for every page",
      "Check Supabase tables, RLS, and GRANTs",
      "Check legal pages exist and are versioned",
      "Check Command Centre integration card present",
      "Check Launch Factory handoff record exists",
      "Check CRM, onboarding and support flows wired",
      "Check no external actions enabled by default",
      "Check no paid APIs activated",
      "Check no copied competitor assets (names, code, copy, branding)",
      "Run npm test",
      "Run npm run build",
    ],
    must_pass: ["All routes load", "RLS + GRANTs in place", "Tests + build green", "Legal pages present"],
    must_block: ["Outbound enabled", "Paid APIs activated", "Copied competitor content", "Public claims without approval"],
    expected_outputs: ["pass/fail by check", "remaining issues", "Launch-readiness verdict"],
    prompt_body: "Audit the new build's GitHub diff. For each step, return PASS/FAIL with file:line evidence. Confirm legal pages, RLS + GRANTs, Command Centre integration, Launch Factory handoff, no outbound, no paid APIs, no copied competitor assets. Run npm test + npm run build and report results. Do not modify code in this audit; report only.",
  };

  const lovable_prompt_pack = buildLovablePromptPack({
    business_summary, brand_pack, product_pack, technical_pack, ui_ux_pack, copy_pack,
    legal_pack, crm_pack, onboarding_pack, support_pack, analytics_pack, launch_qa_pack,
    github_audit_pack,
  } as unknown as FullProductionPack, name, ts);

  return {
    generated_at: ts,
    business_summary, brand_pack, product_pack, technical_pack, ui_ux_pack, copy_pack,
    legal_pack, crm_pack, onboarding_pack, support_pack, analytics_pack,
    launch_qa_pack,
    lovable_prompt_pack,
    github_audit_pack,
    automation_boundaries: {
      may_auto: [...PRODUCTION_PACK_MAY_AUTO],
      must_not_auto: [...PRODUCTION_PACK_MUST_NOT_AUTO],
      founder_approval_required_before: [...PRODUCTION_PACK_FOUNDER_APPROVAL_BEFORE],
    },
    prohibited_copy: [...PRODUCTION_PACK_PROHIBITED_COPY],
  };
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

// ---- Business Autopsy + Better Build Generator ----------------------------

export type AutopsyInput = {
  company_name: string;
  website?: string | null;
  funding_source?: string | null;
  sector?: string | null;
  country?: string | null;
  competitor_notes?: string | null;
  uploaded_research?: string | null;
  reason_for_analysis?: string | null;
  related_cluster?: { id?: string | null; cluster_name?: string | null; problem_thesis?: string | null; customer_pain?: string | null } | null;
  related_market?: { recommended_entry_strategy?: string | null; crowding_level?: string | null; saturation_risk?: string | null; white_space_score?: number | null; avoid_reason?: string | null } | null;
  related_signals?: SignalLite[];
};

export type AutopsyReport = {
  business_model: { what_sold: string; customer: string; payer: string; why_pay: string; recurring_revenue: string; pricing_model: string; sales_motion: string; onboarding_model: string; support_model: string; marketplace_model: string; compliance_burden: string };
  customer_pain: { problem: string; severity: string; repeatability: string; urgency: string; willingness_to_pay_evidence: string; complaints: string; praise: string; unmet_needs: string; workarounds: string };
  operational_heaviness: { team_heavy: string; sales_heavy: string; onboarding_heavy: string; support_heavy: string; manual_delivery: string; compliance_admin: string; implementation_burden: string; human_bottlenecks: string; why_funding_needed: string };
  weakness_signals: { negative: string[]; positive: string[]; summary: string };
  market_position: { crowdedness: string; saturation_risk: string; white_space: string; niche_wedge: string; geographic_wedge: string; vertical_wedge: string; buyer_education: string; pricing_pressure: string; distribution_difficulty: string; switching_difficulty: string; winner_takes_most_risk: string };
  liftor_advantage: { ai_automation: string[]; human_work_reduction: string[]; cheaper_faster: string[]; simpler: string[]; managed_service_first: string; verticalisation: string; low_capex_reasons: string[]; founder_approvals_required: string[] };
  legal_warnings: string[];
  recommendation: "build" | "watch" | "park" | "kill" | "review";
  recommendation_reason: string;
};

export const AUTOPSY_FORBIDDEN_COPYING = [
  "company name",
  "brand identity",
  "website copy",
  "UI design",
  "code",
  "databases",
  "customer lists",
  "confidential documents",
  "proprietary workflows",
  "private pricing documents",
  "protected assets",
  "restricted scraped data",
] as const;

export const AUTOPSY_ALLOWED_EXTRACTION = [
  "problem thesis",
  "customer pain",
  "market validation signal",
  "buyer type",
  "pricing logic",
  "revenue model pattern",
  "public weakness",
  "legally distinct execution route",
] as const;

const TBD = "Founder to confirm — public sources only";

export function generateAutopsyReport(input: AutopsyInput): AutopsyReport {
  const cluster = input.related_cluster ?? {};
  const market = input.related_market ?? {};
  const signals = input.related_signals ?? [];
  const negSignals = signals.filter((s) => s.signal_polarity === "negative");
  const posSignals = signals.filter((s) => s.signal_polarity === "positive");
  const wsScore = market.white_space_score ?? null;

  const negTitles = negSignals.slice(0, 6).map((s) => s.signal_type ?? "weakness signal");
  const posTitles = posSignals.slice(0, 6).map((s) => s.signal_type ?? "positive signal");

  const recommendation: AutopsyReport["recommendation"] =
    market.recommended_entry_strategy === "AVOID_TOO_SATURATED" ? "park" :
    (wsScore ?? 0) >= 60 && negSignals.length >= 2 ? "build" :
    (wsScore ?? 0) >= 40 ? "watch" :
    "review";

  return {
    business_model: {
      what_sold: cluster.problem_thesis ?? TBD,
      customer: cluster.customer_pain ? `Buyer affected by: ${cluster.customer_pain}` : TBD,
      payer: TBD, why_pay: TBD, recurring_revenue: TBD, pricing_model: TBD,
      sales_motion: TBD, onboarding_model: TBD, support_model: TBD,
      marketplace_model: TBD, compliance_burden: TBD,
    },
    customer_pain: {
      problem: cluster.customer_pain ?? input.reason_for_analysis ?? TBD,
      severity: TBD, repeatability: TBD, urgency: TBD,
      willingness_to_pay_evidence: input.funding_source ? `Funding round logged at: ${input.funding_source}` : TBD,
      complaints: negTitles.join(", ") || TBD,
      praise: posTitles.join(", ") || TBD,
      unmet_needs: TBD, workarounds: TBD,
    },
    operational_heaviness: {
      team_heavy: TBD, sales_heavy: TBD, onboarding_heavy: TBD, support_heavy: TBD,
      manual_delivery: TBD, compliance_admin: TBD, implementation_burden: TBD,
      human_bottlenecks: TBD,
      why_funding_needed: input.funding_source ? "Capital used for headcount + GTM expansion (public filings)." : TBD,
    },
    weakness_signals: {
      negative: negTitles,
      positive: posTitles,
      summary: `${negSignals.length} negative, ${posSignals.length} positive signals from public/manual sources.`,
    },
    market_position: {
      crowdedness: market.crowding_level ?? TBD,
      saturation_risk: market.saturation_risk ?? TBD,
      white_space: wsScore != null ? `${wsScore}/100` : TBD,
      niche_wedge: market.recommended_entry_strategy === "BUILD_NICHE_WEDGE" ? "Yes" : TBD,
      geographic_wedge: TBD, vertical_wedge: TBD, buyer_education: TBD,
      pricing_pressure: TBD, distribution_difficulty: TBD, switching_difficulty: TBD,
      winner_takes_most_risk: market.recommended_entry_strategy === "AVOID_TOO_SATURATED" ? "High" : TBD,
    },
    liftor_advantage: {
      ai_automation: ["Sales qualification","Onboarding workflow","Tier-1 support","Reporting + analytics"],
      human_work_reduction: ["Manual data entry","Scheduling","Status updates"],
      cheaper_faster: ["Self-serve onboarding","Agent-led configuration"],
      simpler: ["Single workflow per ICP","Opinionated defaults"],
      managed_service_first: "Start managed-service-first; productise once 3 paying customers retain",
      verticalisation: cluster.cluster_name ? `Vertical wedge into ${cluster.cluster_name}` : "Pick a single ICP wedge",
      low_capex_reasons: ["No field sales team","No professional services org","No data centre","No physical inventory"],
      founder_approvals_required: [...PRODUCTION_FOUNDER_APPROVAL_GATES],
    },
    legal_warnings: [
      "Never copy: " + AUTOPSY_FORBIDDEN_COPYING.join(", "),
      "Only extract: " + AUTOPSY_ALLOWED_EXTRACTION.join(", "),
      "Public, manual, uploaded, founder-approved or licensed sources only.",
    ],
    recommendation,
    recommendation_reason:
      recommendation === "build" ? "Funded category, weakness signals present, white space available — proceed to Better Build Pack." :
      recommendation === "park" ? "Saturated commodity market with no viable wedge — park." :
      recommendation === "watch" ? "Some white space but evidence is thin — keep watching." :
      "Insufficient evidence — gather more public/manual data before deciding.",
  };
}

export type BetterBuildPack = {
  legally_distinct_concept: string;
  product_name_placeholder: string;
  target_customer: string;
  first_offer: string;
  mvp_feature_list: string[];
  database_schema_needs: string[];
  landing_page_structure: string[];
  crm_pipeline_stages: string[];
  onboarding_flow: string[];
  support_flow: string[];
  pricing_hypothesis: string;
  compliance_legal_pages_needed: string[];
  approval_gates: string[];
  human_oversight_requirements: string[];
  ai_agent_requirements: string[];
  first_30_day_build_plan: string[];
  first_90_day_operating_plan: string[];
  kpis: string[];
  kill_continue_criteria: string[];
  acquirer_pain_thesis: string;
  exit_logic: string;
};

export function generateBetterBuildPack(input: AutopsyInput, report: AutopsyReport): BetterBuildPack {
  const wedge = input.related_cluster?.cluster_name ?? input.sector ?? "vertical wedge";
  return {
    legally_distinct_concept: `An AI-operated, ${wedge}-specific solution that solves the same validated customer pain through a distinct workflow, distinct UX and distinct data model. No assets, code, copy, branding, customer data or proprietary workflows are reused from any analysed company.`,
    product_name_placeholder: "Liftor-[Wedge] (working name — founder to finalise)",
    target_customer: report.customer_pain.problem,
    first_offer: "Done-for-you setup + first 30 days managed-service, then self-serve subscription.",
    mvp_feature_list: [
      "Auth + billing","Single-ICP onboarding wizard","Core workflow agent","Approval queue (founder gate)",
      "KPI dashboard","Audit log","Compliance pages",
    ],
    database_schema_needs: ["customers","subscriptions","workflows","agent_runs","approvals","kpi_snapshots","audit_events"],
    landing_page_structure: [
      "Hero (problem statement, no competitor mention)","Validated pain summary","Distinct execution angle",
      "Pricing","Founder-led CTA","FAQ","Compliance & security",
    ],
    crm_pipeline_stages: ["New lead","Qualified","Discovery","Proposal","Won","Onboarding","Live","Renewal"],
    onboarding_flow: ["Self-serve signup","ICP qualification","Founder-approved managed-service kickoff","Agent configuration","First value milestone","Hand to self-serve"],
    support_flow: ["Tier-0 agent","Tier-1 founder approval","Tier-2 escalation"],
    pricing_hypothesis: "Tiered subscription with managed-service add-on; founder to validate WTP from public funding signals.",
    compliance_legal_pages_needed: ["Terms","Privacy","DPA","AUP","Security disclosure","Cookie policy"],
    approval_gates: [...PRODUCTION_FOUNDER_APPROVAL_GATES],
    human_oversight_requirements: ["Founder reviews every external action","Daily review of agent failures","Weekly KPI + kill/continue review"],
    ai_agent_requirements: ["Agent registry","Confidence + escalation rules","Tool/cost ceilings","Audit trail","Human approval queue"],
    first_30_day_build_plan: [
      "Confirm thesis with 5 founder-network conversations","Scaffold app + landing page in Lovable",
      "Wire approval queue + agent registry","Stand up compliance pages","Founder approval to start managed-service kickoff",
    ],
    first_90_day_operating_plan: [
      "Reach 3+ paying customers via founder network only","Validate retention at 30/60 days",
      "Activate Portfolio Commander tracking","Day-90 kill/continue review",
    ],
    kpis: ["Paying customers","MRR","CAC","Activation rate","Retention 30/60/90","Founder hours/week","AI automation success rate"],
    kill_continue_criteria: [
      "Kill if no paying customer within 60 days post-launch",
      "Kill if conversion < 1% across two outreach waves",
      "Continue if 3+ paying customers within 90 days and retention >= 80%",
    ],
    acquirer_pain_thesis: "Acquirers in this space pay today through headcount + tooling. Liftor compresses that to an AI-operated stack with recurring revenue.",
    exit_logic: "Vertical AI-operator with proprietary playbook → strategic acquirer or PE roll-up post-product-market-fit.",
  };
}

export type LovablePromptPack = {
  generated_at: string;
  legal_notice: string;
  prompts: Array<{ step: number; title: string; prompt: string }>;
};

export function generateLovablePromptPack(input: AutopsyInput, pack: BetterBuildPack): LovablePromptPack {
  const safe = (s: string | null | undefined) => (s ?? "").replace(/[<>]/g, "").slice(0, 400);
  const wedge = safe(input.related_cluster?.cluster_name) || safe(input.sector) || "single ICP wedge";
  const legal = `Do not copy any company name, brand, website copy, UI design, code, databases, customer lists, proprietary workflows or pricing documents. Build a legally distinct product. All outbound actions must route through the founder approval queue.`;
  const prompts = [
    { step: 1, title: "Product foundation", prompt: `Scaffold a new Lovable app named ${pack.product_name_placeholder}. Use the existing Liftor design system (dark navy bg, electric blue #2EA3FF, .tech-card components, 120px desktop / 80px mobile spacing). Add auth, billing, and a founder-only admin shell. Wedge: ${wedge}. ${legal}` },
    { step: 2, title: "Database schema", prompt: `Create Supabase tables: ${pack.database_schema_needs.join(", ")}. Add RLS so users only see their own data; admins see all. Add updated_at triggers. ${legal}` },
    { step: 3, title: "Landing page", prompt: `Build a single landing page with sections: ${pack.landing_page_structure.join(" / ")}. Write fresh copy from scratch — do not reuse any external copy. Include compliance footer. ${legal}` },
    { step: 4, title: "Customer onboarding", prompt: `Build an onboarding wizard following: ${pack.onboarding_flow.join(" → ")}. Each step writes to the workflows table. Founder approval required before any external action is taken. ${legal}` },
    { step: 5, title: "CRM pipeline", prompt: `Build a CRM pipeline with stages: ${pack.crm_pipeline_stages.join(" → ")}. Add manual entry only — no scraping, no enrichment from paid APIs without explicit founder approval. ${legal}` },
    { step: 6, title: "Support workflow", prompt: `Build a tiered support workflow: ${pack.support_flow.join(" → ")}. Tier-0 is an AI agent with confidence threshold; below threshold escalates to a founder approval queue. ${legal}` },
    { step: 7, title: "Admin / founder dashboard", prompt: `Build an admin dashboard showing KPIs (${pack.kpis.join(", ")}), approval queue depth, agent run audit log and kill/continue countdown. ${legal}` },
    { step: 8, title: "Compliance / legal pages", prompt: `Generate static pages for: ${pack.compliance_legal_pages_needed.join(", ")}. Use template language; do not copy any third-party document. ${legal}` },
    { step: 9, title: "Analytics / KPIs", prompt: `Build a kpi_snapshots writer that captures daily ${pack.kpis.join(", ")}, plus a 30/60/90 retention chart. ${legal}` },
    { step: 10, title: "Launch QA", prompt: `Run a launch QA checklist: auth, billing, RLS, approval queue, audit log, compliance pages, KPI dashboard, kill/continue criteria visible. Block launch until founder approval is recorded. ${legal}` },
  ];
  return { generated_at: new Date().toISOString(), legal_notice: legal, prompts };
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

// ---- Vertical Launch Cannon + 30-Day Revenue Strike Plan ----------------

export const LAUNCH_MODES = [
  "PREPARING",
  "READY_FOR_HARD_LAUNCH",
  "HARD_LAUNCH_LIVE",
  "ADJUSTING",
  "PAUSED",
  "PARKED",
  "KILLED",
  "SCALING",
] as const;
export type LaunchMode = typeof LAUNCH_MODES[number];
export const LAUNCH_MODE_LABEL: Record<LaunchMode, string> = {
  PREPARING: "Preparing",
  READY_FOR_HARD_LAUNCH: "Ready for hard launch",
  HARD_LAUNCH_LIVE: "Hard launch live",
  ADJUSTING: "Adjusting",
  PAUSED: "Paused",
  PARKED: "Parked",
  KILLED: "Killed",
  SCALING: "Scaling",
};

export const VERTICAL_LAUNCH_FOUNDER_APPROVAL_GATES = [
  "Public launch / move from preparing to hard launch live",
  "Sending any outbound message",
  "Activating sending domain or email",
  "Activating any paid API",
  "Spending money on paid ads",
  "Contacting any external party",
  "Publishing any claim or proof statement",
  "Collecting payments",
] as const;

export const VERTICAL_LAUNCH_NEVER_AUTOMATIC = [
  "Outbound sending",
  "Domain or email activation",
  "Paid API activation",
  "Paid advertising spend",
  "Contacting customers, investors, acquirers, employees or competitors",
  "Publishing unsupported or regulated claims",
  "Copying competitor wording, brand or assets",
] as const;

export const VERTICAL_LAUNCH_HARD_GATES = [
  "Production QA passed",
  "Legal pages present (Terms, Privacy, Cookies where relevant)",
  "No copied competitor assets",
  "Analytics live",
  "CRM pipeline live",
  "Support route live",
  "Onboarding route live",
  "Founder approval granted",
  "Sending domain/email approved (only if outreach is used)",
  "Suppression / do-not-contact rules active",
  "No paid APIs active unless founder approved",
  "No public regulated claims",
] as const;

export const VERTICAL_CRM_PIPELINE_STAGES = [
  "Identified",
  "Qualified",
  "Ready for founder approval",
  "Outreach drafted",
  "Outreach approved",
  "Sent",
  "Opened/replied",
  "Interested",
  "Demo/call",
  "Proposal/offer",
  "Won",
  "Not now",
  "Closed lost",
  "Suppressed",
] as const;

export type VerticalLaunchTarget = {
  business_name: string;
  vertical: string;
  geography: string;
  customer_type: string;
  buyer_role: string;
  prospect_profile_first_100_500: string;
  why_vertical_selected: string;
  why_vertical_has_budget: string;
  why_problem_urgent: string;
  why_liftor_advantage: string;
};

export type VerticalLaunchOffer = {
  first_offer: string;
  pricing_hypothesis: string;
  pilot_option: string;
  paid_starter_package: string;
  guarantee_disclaimer_limits: string;
  urgency_angle: string;
  trust_angle: string;
  proof_required: string;
  founder_approval_required_before_public_use: true;
};

export type VerticalLaunchAssets = {
  landing_cta_options: string[];
  vertical_headlines: string[];
  problem_copy: string[];
  solution_copy: string[];
  faq: Array<{ q: string; a: string }>;
  pricing_placeholder: string;
  trust_section: string[];
  onboarding_form_copy: string;
  outbound_email_sequence: Array<{ step: number; subject: string; body: string }>;
  linkedin_message_drafts: string[];
  follow_up_drafts: string[];
  objection_handling: Array<{ objection: string; response: string }>;
  support_replies: Array<{ scenario: string; reply: string }>;
  demo_script: string[];
  copy_rules: string[];
};

export type VerticalProspectingPlan = {
  ideal_prospect_criteria: string[];
  first_100_route: string[];
  first_500_route: string[];
  allowed_public_sources: string[];
  disallowed_sources: string[];
  enrichment_fields: string[];
  crm_import_template_columns: string[];
  suppression_rules: string[];
  approval_gate_before_outreach: string;
};

export type VerticalCRMPipeline = {
  stages: readonly string[];
  ownership: string;
  approval_gates: string[];
};

export type RevenueStrikeDay = {
  day: number;
  phase: string;
  focus: string;
  outputs: string[];
  founder_approval_required: boolean;
};

export type LaunchVelocityMetrics = {
  prospects_added: number;
  approved_outreach: number;
  sent_outreach: number;
  reply_rate: number;
  positive_reply_rate: number;
  conversion_rate: number;
  cost_per_lead: number | null;
  founder_time_minutes: number;
  human_oversight_burden: "low" | "moderate" | "high";
  ai_automation_quality: "low" | "moderate" | "high";
  support_burden: "low" | "moderate" | "high";
  first_revenue_date: string | null;
  thirty_day_revenue: number;
  decision: "continue" | "adjust" | "park" | "kill" | null;
};

export type VerticalLaunchPack = {
  launch_mode: LaunchMode;
  launch_target: VerticalLaunchTarget;
  launch_offer: VerticalLaunchOffer;
  launch_assets: VerticalLaunchAssets;
  prospecting_plan: VerticalProspectingPlan;
  crm_pipeline: VerticalCRMPipeline;
  revenue_strike_plan: RevenueStrikeDay[];
  daily_command_centre_fields: string[];
  velocity_metrics_template: LaunchVelocityMetrics;
  hard_launch_gates: readonly string[];
  founder_approval_gates: readonly string[];
  never_automatic: readonly string[];
  feedback_loop_targets: string[];
  doctrine: string[];
};

export function emptyLaunchVelocityMetrics(): LaunchVelocityMetrics {
  return {
    prospects_added: 0,
    approved_outreach: 0,
    sent_outreach: 0,
    reply_rate: 0,
    positive_reply_rate: 0,
    conversion_rate: 0,
    cost_per_lead: null,
    founder_time_minutes: 0,
    human_oversight_burden: "moderate",
    ai_automation_quality: "moderate",
    support_burden: "low",
    first_revenue_date: null,
    thirty_day_revenue: 0,
    decision: null,
  };
}

export function buildRevenueStrikePlan(): RevenueStrikeDay[] {
  const days: RevenueStrikeDay[] = [];
  const phase = (d: number) => {
    if (d <= 3) return { phase: "Day 1–3 · QA + setup", focus: "Final QA, legal, tracking, CRM setup", outputs: ["Production QA sign-off", "Legal pages confirmed", "Analytics live", "CRM pipeline live", "Support + onboarding routes live"] };
    if (d <= 7) return { phase: "Day 4–7 · List + messaging", focus: "Vertical list build, messaging approval, landing finalisation", outputs: ["First 100 prospect list (public sources)", "Outreach drafts pending founder approval", "Landing page final copy"] };
    if (d <= 14) return { phase: "Day 8–14 · First push", focus: "First outreach batch, content push, response tracking", outputs: ["Founder-approved outreach sent", "Replies logged", "Objections captured"] };
    if (d <= 21) return { phase: "Day 15–21 · Refine + follow up", focus: "Follow-ups, objections, landing fixes, offer refinement", outputs: ["Follow-up drafts approved + sent", "Landing iteration shipped", "Offer adjustments captured"] };
    return { phase: "Day 22–30 · Second push + decision", focus: "Second push, close early buyers, decide continue/adjust/park", outputs: ["Second outreach batch sent", "Early buyers closed", "30-day continue/adjust/park/kill decision"] };
  };
  for (let d = 1; d <= 30; d++) {
    const p = phase(d);
    days.push({
      day: d,
      phase: p.phase,
      focus: p.focus,
      outputs: p.outputs,
      founder_approval_required: d === 1 || d === 7 || d === 8 || d === 15 || d === 22 || d === 30,
    });
  }
  return days;
}

export function buildVerticalLaunchPack(args: {
  pack: ProductionBuildPack;
  vertical?: string | null;
  geography?: string | null;
  customer_type?: string | null;
  buyer_role?: string | null;
}): VerticalLaunchPack {
  const p = args.pack;
  const c = p.candidate;
  const profile = p.thesis?.paying_customer_profile ?? null;
  const vertical = args.vertical ?? profile ?? "selected vertical (set by founder)";
  const geography = args.geography ?? "founder-selected geography";
  const customer_type = args.customer_type ?? profile ?? "operator-led teams";
  const buyer_role = args.buyer_role ?? "operations / commercial lead";
  const target: VerticalLaunchTarget = {
    business_name: c.name,
    vertical,
    geography,
    customer_type,
    buyer_role,
    prospect_profile_first_100_500: `${customer_type} in ${vertical} (${geography}) where ${buyer_role} owns the budget and the operational pain is recurring weekly.`,
    why_vertical_selected: p.why_selected?.[0] ?? "Validated funded category with capital-efficient Liftor execution route.",
    why_vertical_has_budget: p.willingness_to_pay_evidence ?? "Buyer already pays for people, tooling or services to absorb this work — Liftor compresses the cost.",
    why_problem_urgent: p.customer_problem_thesis ?? "Pain is operational, recurring and currently solved with manual labour.",
    why_liftor_advantage: p.capital_efficiency_advantage ?? "AI-operated stack with founder oversight, faster cycle time, lower run cost.",
  };
  const offer: VerticalLaunchOffer = {
    first_offer: `${c.name} pilot for ${vertical}: clear scope, fixed timeframe, measurable outcome.`,
    pricing_hypothesis: "Paid pilot or starter tier — never free indefinitely. Pricing must be tested, never asserted.",
    pilot_option: "Founder-approved time-boxed pilot for first 3–10 customers with explicit success criteria.",
    paid_starter_package: "Optional paid starter package once pilot outcomes are evidenced.",
    guarantee_disclaimer_limits: "No regulated claims. Any guarantee must be reviewed by founder/adviser before public use.",
    urgency_angle: "Operational cost compounds weekly — every week without this is paid out in headcount or rework.",
    trust_angle: "Human-in-the-loop, founder-overseen, auditable AI operations. No silent automation.",
    proof_required: "Internal evidence, pilot outcomes, or founder-approved case notes only — never fabricated proof.",
    founder_approval_required_before_public_use: true,
  };
  const assets: VerticalLaunchAssets = {
    landing_cta_options: [
      `Book a ${vertical} pilot call`,
      `Request the ${vertical} operating brief`,
      `See how ${c.name} runs your ${vertical} workflow`,
    ],
    vertical_headlines: [
      `${vertical}: the operating layer your team is doing by hand.`,
      `Run ${vertical} on AI operators. Keep founder oversight.`,
      `Compress your ${vertical} workload without losing control.`,
    ],
    problem_copy: [
      `${vertical} teams are absorbing repeatable work that should not need a human every time.`,
      `Tooling exists, but nothing operates the workflow end-to-end with audit trails.`,
    ],
    solution_copy: [
      `${c.name} operates the ${vertical} workflow with human-in-the-loop approvals.`,
      `Every action is logged, every external send is gated, every cost is capped.`,
    ],
    faq: [
      { q: "Is this fully automated?", a: "No. Every external action is gated by founder approval. AI runs the workflow; humans run the gates." },
      { q: "What data do you need?", a: "Only what the workflow requires. No scraping, no restricted sources." },
      { q: "What does it cost?", a: "Pricing is tested per pilot. Expect a paid pilot before any rollout." },
      { q: "What if it does not work?", a: "We define success criteria up-front. If criteria are not met, the pilot ends — no lock-in." },
    ],
    pricing_placeholder: "Pilot pricing — confirmed per engagement. Not displayed publicly until founder approval.",
    trust_section: [
      "Founder-overseen operations",
      "Auditable agent runs",
      "Approval queue for every external action",
      "No paid APIs without founder approval",
      "No regulated claims without adviser sign-off",
    ],
    onboarding_form_copy: `Tell us about your ${vertical} workflow: volume, current owners, current cost, what would 'done' look like in 30 days.`,
    outbound_email_sequence: [
      { step: 1, subject: `Quick ${vertical} question`, body: `Hi {first_name},\n\nWe are running a small founder-overseen pilot of ${c.name} for ${customer_type} in ${vertical}.\n\nIf the {workflow} is currently absorbed by your team, would it be useful to compare notes?\n\n— Founder, ${c.name}` },
      { step: 2, subject: `Following up on ${vertical}`, body: `Hi {first_name},\n\nNo pressure — wanted to check whether the ${vertical} workflow we discussed is still painful or already solved.\n\nHappy to share the operating brief either way.\n\n— Founder, ${c.name}` },
      { step: 3, subject: `Closing the loop`, body: `Hi {first_name},\n\nLast note from me on this — closing the loop. If the ${vertical} workflow becomes a priority again, the brief is here when you want it.\n\n— Founder, ${c.name}` },
    ],
    linkedin_message_drafts: [
      `Hi {first_name} — running a small ${vertical} pilot with founder-overseen AI operators. Worth a 10-minute compare-notes?`,
    ],
    follow_up_drafts: [
      `Hi {first_name}, checking in once on the ${vertical} brief — useful to share?`,
    ],
    objection_handling: [
      { objection: "Too expensive", response: "Pilot pricing is fixed and outcome-bound. Compare against current weekly headcount cost." },
      { objection: "We already have tooling", response: "Tooling does not operate the workflow — we run the workflow with audit trails and approval gates." },
      { objection: "AI is risky", response: "Human-in-the-loop. Every external action is gated. Audit trail per run." },
      { objection: "Not the right time", response: "Understood — we will leave you the brief and return on your timeline." },
    ],
    support_replies: [
      { scenario: "Pilot question", reply: "Thanks — capturing this in the pilot log. Founder review within one business day." },
      { scenario: "Pricing question", reply: "Pricing is pilot-bound; founder will confirm in writing before any commercial step." },
      { scenario: "Data question", reply: "We only use approved sources. Restricted/private data is never scraped or stored." },
    ],
    demo_script: [
      `Frame the ${vertical} workflow and current owners.`,
      `Show the agent operating the workflow with the approval queue visible.`,
      `Show the audit trail and kill/continue criteria.`,
      `Confirm pilot scope, success criteria and founder approval gates.`,
    ],
    copy_rules: [
      "All copy must be original.",
      "No copied competitor wording.",
      "No unsupported claims.",
      "No regulated claims without adviser/founder approval.",
      "No sending without founder approval.",
    ],
  };
  const prospecting: VerticalProspectingPlan = {
    ideal_prospect_criteria: [
      `${customer_type} operating in ${vertical}`,
      `Geography: ${geography}`,
      `Buyer role present: ${buyer_role}`,
      "Workflow currently absorbed by humans or rough tooling",
      "Budget exists today (people, tools, services)",
    ],
    first_100_route: [
      "Manual list build from public, founder-approved sources",
      "Founder-curated network introductions (no automated contact)",
      "Public directories and registered companies only",
    ],
    first_500_route: [
      "Expand from first 100 patterns",
      "Public sources only — no scraped private data",
      "Founder approval per batch before any outreach",
    ],
    allowed_public_sources: [
      "Public company registries",
      "Public LinkedIn profiles (manual review)",
      "Public directories and association lists",
      "Founder-approved licensed datasets",
    ],
    disallowed_sources: [
      "Scraped private/restricted data",
      "Purchased lists of unverified provenance",
      "Any paid API not founder-approved",
      "Competitor customer lists",
    ],
    enrichment_fields: [
      "company_name", "website", "country", "industry_vertical", "size_band", "buyer_role", "buyer_email", "evidence_link", "notes",
    ],
    crm_import_template_columns: [
      "stage", "company_name", "website", "country", "industry_vertical", "size_band",
      "buyer_first_name", "buyer_last_name", "buyer_role", "buyer_email", "evidence_link",
      "source", "added_at", "owner", "notes", "approval_status",
    ],
    suppression_rules: [
      "Do-not-contact list applied before any outreach",
      "Opt-outs honoured immediately and permanently",
      "Geographic legal compliance (e.g. consent requirements) enforced",
      "No outreach until founder approval recorded",
    ],
    approval_gate_before_outreach: "Every outbound batch requires explicit founder approval recorded with timestamp.",
  };
  const crm: VerticalCRMPipeline = {
    stages: VERTICAL_CRM_PIPELINE_STAGES,
    ownership: "Founder-owned pipeline; AI assists drafting, never sends.",
    approval_gates: [
      "Move to Outreach approved requires founder sign-off",
      "Move to Sent requires approved domain/email",
      "Move to Won requires payment confirmation and signed pilot scope",
    ],
  };
  return {
    launch_mode: "PREPARING",
    launch_target: target,
    launch_offer: offer,
    launch_assets: assets,
    prospecting_plan: prospecting,
    crm_pipeline: crm,
    revenue_strike_plan: buildRevenueStrikePlan(),
    daily_command_centre_fields: [
      "selected vertical", "launch status", "launch day number",
      "prospects identified", "outreach drafts awaiting approval", "outreach sent",
      "replies", "interested leads", "demos/calls", "conversions", "revenue",
      "objections", "support issues", "legal/compliance warnings", "next action",
    ],
    velocity_metrics_template: emptyLaunchVelocityMetrics(),
    hard_launch_gates: VERTICAL_LAUNCH_HARD_GATES,
    founder_approval_gates: VERTICAL_LAUNCH_FOUNDER_APPROVAL_GATES,
    never_automatic: VERTICAL_LAUNCH_NEVER_AUTOMATIC,
    feedback_loop_targets: [
      "Funding Radar", "Business Autopsy", "Quarterly Build Selector",
      "Production Pack", "Launch Factory", "Portfolio Commander", "Command Centre",
    ],
    doctrine: [
      "Build fast", "QA hard", "Launch clean", "Hit one vertical",
      "Measure daily", "Fix fast", "Push again",
      "No vague soft launch", "No drifting", "No endless preparation",
    ],
  };
}

export type HardLaunchGateInput = {
  production_qa_passed: boolean;
  legal_pages_present: boolean;
  no_copied_assets: boolean;
  analytics_live: boolean;
  crm_pipeline_live: boolean;
  support_route_live: boolean;
  onboarding_route_live: boolean;
  founder_approval_granted: boolean;
  sending_domain_approved_if_outreach: boolean;
  outreach_used: boolean;
  suppression_rules_active: boolean;
  paid_apis_off_or_approved: boolean;
  no_public_regulated_claims: boolean;
};

export function evaluateHardLaunchGates(input: HardLaunchGateInput): { ok: boolean; missing: string[] } {
  const missing: string[] = [];
  if (!input.production_qa_passed) missing.push("Production QA passed");
  if (!input.legal_pages_present) missing.push("Legal pages present");
  if (!input.no_copied_assets) missing.push("No copied competitor assets");
  if (!input.analytics_live) missing.push("Analytics live");
  if (!input.crm_pipeline_live) missing.push("CRM pipeline live");
  if (!input.support_route_live) missing.push("Support route live");
  if (!input.onboarding_route_live) missing.push("Onboarding route live");
  if (!input.founder_approval_granted) missing.push("Founder approval granted");
  if (input.outreach_used && !input.sending_domain_approved_if_outreach) missing.push("Sending domain/email approved");
  if (!input.suppression_rules_active) missing.push("Suppression rules active");
  if (!input.paid_apis_off_or_approved) missing.push("No paid APIs active unless founder approved");
  if (!input.no_public_regulated_claims) missing.push("No public regulated claims");
  return { ok: missing.length === 0, missing };
}

export function nextLaunchMode(current: LaunchMode, gates: HardLaunchGateInput): LaunchMode {
  const ev = evaluateHardLaunchGates(gates);
  if (current === "PREPARING") return ev.ok ? "READY_FOR_HARD_LAUNCH" : "PREPARING";
  if (current === "READY_FOR_HARD_LAUNCH") return ev.ok && gates.founder_approval_granted ? "HARD_LAUNCH_LIVE" : current;
  return current;
}