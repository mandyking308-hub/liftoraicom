// Liftor Business Setup Tunnel state — persisted to localStorage only.
// No backend writes; safe for founder draft work. No external side effects.
import { supabase } from "@/integrations/supabase/client";

export const TUNNEL_STEPS = [
  { key: "identity", label: "Business identity" },
  { key: "web", label: "Website / domain / email" },
  { key: "knowledge", label: "Knowledge / manuals / evidence" },
  { key: "offer", label: "Offer / product setup" },
  { key: "market", label: "Customer & market" },
  { key: "marketing", label: "Marketing & PR" },
  { key: "sales", label: "Sales & outreach" },
  { key: "commercial", label: "Sales target & revenue pace" },
  { key: "support", label: "Onboarding & support" },
  { key: "operations", label: "Operations & delivery" },
  { key: "finance", label: "Finance / accounting / compliance" },
  { key: "evidence", label: "Evidence, data room & exit" },
] as const;

export type StepKey = (typeof TUNNEL_STEPS)[number]["key"];

export type StepState = {
  status: "not_started" | "in_progress" | "saved" | "skipped";
  fields: Record<string, string>;
  updatedAt?: string;
};

export type TunnelState = {
  businessId: string; // either UUID from businesses or "draft:<slug>"
  businessName: string;
  isDraft: boolean;
  steps: Record<StepKey, StepState>;
  moduleConnections?: ModuleConnections;
  createdAt: string;
  updatedAt: string;
};

const PREFIX = "liftor:setup-tunnel:";

export const emptyStep = (): StepState => ({ status: "not_started", fields: {} });

export function newState(businessId: string, businessName: string, isDraft: boolean): TunnelState {
  const steps = {} as Record<StepKey, StepState>;
  for (const s of TUNNEL_STEPS) steps[s.key] = emptyStep();
  const now = new Date().toISOString();
  return { businessId, businessName, isDraft, steps, createdAt: now, updatedAt: now };
}

export function load(businessId: string): TunnelState | null {
  try {
    const raw = localStorage.getItem(PREFIX + businessId);
    return raw ? (JSON.parse(raw) as TunnelState) : null;
  } catch { return null; }
}

export function save(state: TunnelState) {
  state.updatedAt = new Date().toISOString();
  try { localStorage.setItem(PREFIX + state.businessId, JSON.stringify(state)); } catch { /* ignore */ }
}

export function listAll(): TunnelState[] {
  const out: TunnelState[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(PREFIX)) {
      try { const v = JSON.parse(localStorage.getItem(k)!) as TunnelState; out.push(v); } catch { /* ignore */ }
    }
  }
  return out.sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
}

export function stepCompleteness(s: StepState, requiredFieldCount: number): number {
  if (s.status === "saved") return 100;
  if (s.status === "skipped") return 0;
  const filled = Object.values(s.fields).filter((v) => v && v.trim().length > 1).length;
  return Math.round(Math.min(100, (filled / Math.max(1, requiredFieldCount)) * 100));
}

export function overallCompleteness(state: TunnelState, perStepFieldCount: Record<StepKey, number>): number {
  const scores = TUNNEL_STEPS.map((s) => stepCompleteness(state.steps[s.key], perStepFieldCount[s.key] || 1));
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

// Per-step field templates. Used for UI + completeness scoring.
export const STEP_FIELDS: Record<StepKey, { key: string; label: string; long?: boolean }[]> = {
  identity: [
    { key: "business_name", label: "Business name" },
    { key: "trading_name", label: "Trading name" },
    { key: "short_description", label: "Short description", long: true },
    { key: "business_model", label: "Business model" },
    { key: "sector", label: "Sector" },
    { key: "legal_entity", label: "Legal/entity link" },
    { key: "internal_status", label: "Internal status (draft/setup/live/parked)" },
    { key: "regulated", label: "Regulated? (yes/no + which regs)" },
    { key: "marketplace", label: "Marketplace? (yes/no)" },
    { key: "archetype", label: "Archetype (SaaS/service/ecommerce/content/consultancy/healthcare/other)" },
  ],
  web: [
    { key: "website_url", label: "Website URL" },
    { key: "domains", label: "Domains" },
    { key: "sender_emails", label: "Sender email accounts" },
    { key: "support_email", label: "Support email" },
    { key: "social_handles", label: "Social handles" },
    { key: "access_notes", label: "Login/access notes (do NOT store passwords)", long: true },
    { key: "public_front_readiness", label: "Public front readiness" },
  ],
  knowledge: [
    { key: "business_manual", label: "Business manual", long: true },
    { key: "technical_manual", label: "Technical manual", long: true },
    { key: "user_manual", label: "User manual", long: true },
    { key: "sops", label: "SOPs", long: true },
    { key: "faqs", label: "FAQs", long: true },
    { key: "website_copy", label: "Website copy notes", long: true },
    { key: "policies", label: "Policies", long: true },
    { key: "pricing_notes", label: "Pricing notes", long: true },
    { key: "brand_notes", label: "Brand notes", long: true },
    { key: "customer_notes", label: "Customer notes", long: true },
    { key: "compliance_notes", label: "Compliance notes", long: true },
  ],
  offer: [
    { key: "products", label: "Products / services", long: true },
    { key: "pricing", label: "Pricing" },
    { key: "packages", label: "Packages", long: true },
    { key: "fulfilment", label: "Fulfilment / delivery model", long: true },
    { key: "refund_terms", label: "Refund / cancellation terms", long: true },
    { key: "onboarding_requirements", label: "Onboarding requirements", long: true },
    { key: "customer_promise", label: "Customer promise", long: true },
    { key: "upsell_paths", label: "Upsell paths", long: true },
  ],
  market: [
    { key: "icp", label: "Ideal customer profile", long: true },
    { key: "segments", label: "Customer segments", long: true },
    { key: "geography", label: "Geography" },
    { key: "problem", label: "Problem solved", long: true },
    { key: "competitors", label: "Competitor references", long: true },
    { key: "positioning", label: "Market positioning", long: true },
    { key: "lawful_sources", label: "Lawful data / source notes", long: true },
  ],
  marketing: [
    { key: "brand_voice", label: "Brand voice", long: true },
    { key: "campaign_themes", label: "Campaign themes", long: true },
    { key: "content_calendar", label: "Content calendar notes", long: true },
    { key: "pr_angles", label: "PR angles", long: true },
    { key: "assets_needed", label: "Assets needed", long: true },
    { key: "channels", label: "Social channels" },
    { key: "manual_export_status", label: "Manual-export status (no auto-publishing)" },
  ],
  sales: [
    { key: "lead_sources", label: "Lead sources", long: true },
    { key: "target_segments", label: "Target segments", long: true },
    { key: "sales_messages", label: "Sales messages", long: true },
    { key: "email_drafts", label: "Email drafts (drafts only — no sending)", long: true },
    { key: "outreach_compliance", label: "Outreach compliance status" },
    { key: "founder_approval_required", label: "Founder approval required (yes)" },
    { key: "provider_status", label: "Smartlead/Apollo/provider status (off unless approved)" },
  ],
  commercial: [
    { key: "target_monthly_revenue", label: "Target monthly revenue (number)" },
    { key: "target_annual_revenue", label: "Target annual revenue (number)" },
    { key: "target_mrr", label: "Target MRR (subscription only)" },
    { key: "target_arr", label: "Target ARR (subscription only)" },
    { key: "currency", label: "Currency (GBP/USD/EUR)" },
    { key: "average_order_value", label: "Average order value / package price" },
    { key: "subscription_price", label: "Subscription price (per month, if any)" },
    { key: "conversion_rate", label: "Overall conversion rate (0–1, e.g. 0.1)" },
    { key: "lead_to_call_rate", label: "Lead → call rate (0–1)" },
    { key: "call_to_sale_rate", label: "Call → sale rate (0–1)" },
    { key: "churn_rate", label: "Monthly churn rate (0–1)" },
    { key: "gross_margin", label: "Gross margin (0–1)" },
    { key: "sales_cycle_days", label: "Sales cycle length (days)" },
    { key: "target_first_sale_date", label: "Target first sale date (YYYY-MM-DD)" },
    { key: "target_first_1k_date", label: "Target first £1k revenue date (YYYY-MM-DD)" },
    { key: "target_first_10k_month_date", label: "Target first £10k/month date (YYYY-MM-DD)" },
    { key: "commercial_stage", label: "Commercial stage (setup/test/launch/growth/scale)" },
    { key: "max_safe_outreach_per_day", label: "Maximum safe outreach pace per day" },
    { key: "founder_approval_required", label: "Founder approval required before external sending (yes/no)" },
  ],
  support: [
    { key: "welcome_pack", label: "Welcome pack", long: true },
    { key: "onboarding_checklist", label: "Onboarding checklist", long: true },
    { key: "support_faq", label: "Support FAQ", long: true },
    { key: "ticket_categories", label: "Support ticket categories", long: true },
    { key: "complaint_path", label: "Complaint path", long: true },
    { key: "success_checkins", label: "Success check-ins", long: true },
    { key: "retention_prompts", label: "Retention / upgrade prompts", long: true },
  ],
  operations: [
    { key: "delivery_workflow", label: "Delivery workflow", long: true },
    { key: "sops", label: "SOPs", long: true },
    { key: "operator_tasks", label: "Operator tasks", long: true },
    { key: "workforce", label: "Workforce / manual requirements", long: true },
    { key: "training_assignments", label: "Training assignments", long: true },
    { key: "quality_checks", label: "Quality checks", long: true },
    { key: "daily_loop", label: "Daily operating loop notes", long: true },
  ],
  finance: [
    { key: "revenue_targets", label: "Pricing / revenue targets", long: true },
    { key: "invoicing", label: "Invoicing / payment notes", long: true },
    { key: "collections", label: "Collections / reconciliation path", long: true },
    { key: "accounting_tasks", label: "Accounting tasks", long: true },
    { key: "statutory_filings", label: "Statutory filing / corporate-secretarial obligations", long: true },
    { key: "insurance", label: "Insurance requirements", long: true },
    { key: "tax_legal", label: "Tax / legal adviser notes", long: true },
  ],
  evidence: [
    { key: "document_vault", label: "Document vault notes", long: true },
    { key: "evidence_checklist", label: "Evidence checklist", long: true },
    { key: "data_room_readiness", label: "Data room readiness (closed by default)" },
    { key: "buyer_warm_up", label: "Buyer warm-up profile (founder-approved only)", long: true },
    { key: "twelve_month_review", label: "12-month sale review date" },
    { key: "valuation_notes", label: "Valuation notes", long: true },
    { key: "exit_blockers", label: "Exit readiness blockers", long: true },
  ],
};

export function fieldCounts(): Record<StepKey, number> {
  const out = {} as Record<StepKey, number>;
  (Object.keys(STEP_FIELDS) as StepKey[]).forEach((k) => { out[k] = STEP_FIELDS[k].length; });
  return out;
}

// ---------------------------------------------------------------------------
// Module connections — which Liftor area each setup tunnel is wired into.
// Each connection is draft-only: no sends, no providers, no publishing.
// ---------------------------------------------------------------------------

export const MODULE_AREAS = [
  { key: "activation", label: "Activation profile (readiness)", route: "/founder/business-activation" },
  { key: "onboarding_factory", label: "Onboarding factory run", route: "/founder/business-onboarding-factory" },
  { key: "runtime", label: "Runtime (isolated, outbound off)", route: "/founder/business-activation" },
  { key: "marketing", label: "Marketing", route: "/founder/marketing" },
  { key: "sales", label: "Sales / outreach", route: "/founder/crm" },
  { key: "crm", label: "CRM / contacts", route: "/founder/crm" },
  { key: "support", label: "Customer onboarding & support", route: "/founder/customer-onboarding" },
  { key: "operations", label: "Operations / daily loop / SOPs", route: "/founder/daily-operator" },
  { key: "finance", label: "Finance / accounting / compliance", route: "/founder/finance" },
  { key: "evidence", label: "Evidence / data room readiness", route: "/founder/data-room" },
  { key: "exit", label: "Exit / buyer warm-up readiness", route: "/founder/portfolio-exit/buyer-warmup" },
] as const;

export type ModuleAreaKey = (typeof MODULE_AREAS)[number]["key"];

export type ModuleConnection = {
  status: "connected" | "manual_action_needed" | "failed" | "not_attempted";
  target_table: string | null;
  draft_record_id: string | null;
  note: string;
  attempted_at: string;
};

export type ModuleConnections = Partial<Record<ModuleAreaKey, ModuleConnection>>;

// ---------------------------------------------------------------------------
// Supabase persistence (founder-only). localStorage is fallback only.
// Table: business_setup_tunnel_runs (RLS: admin/founder only).
// ---------------------------------------------------------------------------

type RemoteRow = {
  id: string;
  business_id: string | null;
  draft_business_name: string;
  is_draft: boolean;
  setup_status: string;
  current_step: string | null;
  overall_completeness: number;
  steps_json: any;
  missing_context_json: any;
  safety_warnings_json: any;
  module_connections_json?: any;
  created_at: string;
  updated_at: string;
};

function rowToState(r: RemoteRow): TunnelState {
  const steps = (r.steps_json && typeof r.steps_json === "object") ? r.steps_json as Record<StepKey, StepState> : ({} as Record<StepKey, StepState>);
  for (const s of TUNNEL_STEPS) if (!steps[s.key]) steps[s.key] = emptyStep();
  const moduleConnections = (r.module_connections_json && typeof r.module_connections_json === "object")
    ? r.module_connections_json as ModuleConnections : {};
  return {
    businessId: r.business_id ?? `draft:${r.id}`,
    businessName: r.draft_business_name,
    isDraft: r.is_draft,
    steps,
    moduleConnections,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function isUuid(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

export async function loadRemote(businessId: string): Promise<TunnelState | null> {
  try {
    const q = (supabase.from as any)("business_setup_tunnel_runs").select("*").order("updated_at", { ascending: false }).limit(1);
    const { data } = isUuid(businessId)
      ? await q.eq("business_id", businessId)
      : await q.eq("draft_business_name", businessId.replace(/^draft:/, ""));
    const row = (data as RemoteRow[] | null)?.[0];
    return row ? rowToState(row) : null;
  } catch { return null; }
}

export async function saveRemote(state: TunnelState, counts: Record<StepKey, number>): Promise<string | null> {
  try {
    const overall = overallCompleteness(state, counts);
    const currentStep = TUNNEL_STEPS.find((s) => state.steps[s.key].status !== "saved")?.key ?? null;
    const missing: string[] = [];
    TUNNEL_STEPS.forEach((s) => { if (state.steps[s.key].status !== "saved") missing.push(s.key); });
    const safety = ["no_external_send", "no_provider_activation", "no_buyer_contact", "data_room_closed", "healthcare_blocked"];
    const { data: existing } = isUuid(state.businessId)
      ? await (supabase.from as any)("business_setup_tunnel_runs").select("id").eq("business_id", state.businessId).limit(1)
      : await (supabase.from as any)("business_setup_tunnel_runs").select("id").eq("draft_business_name", state.businessName).is("business_id", null).limit(1);
    const row = {
      business_id: isUuid(state.businessId) ? state.businessId : null,
      draft_business_name: state.businessName,
      is_draft: state.isDraft,
      setup_status: overall >= 100 ? "complete" : "in_progress",
      current_step: currentStep,
      overall_completeness: overall,
      steps_json: state.steps,
      missing_context_json: missing,
      safety_warnings_json: safety,
      module_connections_json: state.moduleConnections ?? {},
    };
    const existingId = (existing as { id: string }[] | null)?.[0]?.id;
    if (existingId) {
      await (supabase.from as any)("business_setup_tunnel_runs").update(row).eq("id", existingId);
      return existingId;
    }
    const { data: { user } } = await supabase.auth.getUser();
    const { data: inserted } = await (supabase.from as any)("business_setup_tunnel_runs").insert({ ...row, created_by: user?.id ?? null }).select("id").single();
    return (inserted as { id: string } | null)?.id ?? null;
  } catch { return null; }
}

export async function listAllRemote(): Promise<TunnelState[]> {
  try {
    const { data } = await (supabase.from as any)("business_setup_tunnel_runs").select("*").order("updated_at", { ascending: false }).limit(100);
    return ((data as RemoteRow[] | null) ?? []).map(rowToState);
  } catch { return []; }
}

// Create a real active canonical business row when founder confirms a new draft.
// Names are unique only among active businesses; archived legacy rows may share a name.
// Throws an Error with a meaningful message instead of silently returning null.
export async function promoteDraftToBusiness(state: TunnelState): Promise<string> {
  if (isUuid(state.businessId)) return state.businessId;
  const name = (state.businessName ?? "").trim();
  if (!name) throw new Error("Business name is required before creating the business.");
  const { data, error } = await supabase
    .from("businesses")
    .insert({ name, portfolio_status: "active" } as any)
    .select("id")
    .single();
  if (error) {
    if ((error as { code?: string }).code === "23505") {
      throw new Error(`An active business named "${name}" already exists. Archived businesses with the same name are allowed.`);
    }
    throw new Error(`Could not create business: ${error.message}`);
  }
  const id = (data as { id: string } | null)?.id;
  if (!id) throw new Error("Could not create business: no id returned.");
  return id;
}

// ---------------------------------------------------------------------------
// Promote setup into Liftor modules (draft / offline writes only).
// Payloads match the real table schemas. Each area is idempotent: an existing
// record for this business (matched on stable keys) is reused, never duplicated.
// Errors are surfaced per area as "failed" with the database message.
// Nothing here sends, publishes, activates providers or sets go-live.
// ---------------------------------------------------------------------------

type PromoteAttempt = {
  area: ModuleAreaKey;
  table: string;
  /** Equality filters identifying this business's existing record (idempotency). */
  match: Record<string, string>;
  payload: Record<string, unknown>;
  note: string;
};

const fld = (state: TunnelState, step: StepKey, key: string): string =>
  (state.steps?.[step]?.fields?.[key] ?? "").trim();

export function tunnelMissingSections(state: TunnelState): string[] {
  return TUNNEL_STEPS.filter((s) => state.steps?.[s.key]?.status !== "saved").map((s) => s.label);
}

export function buildPromoteAttempts(state: TunnelState): PromoteAttempt[] {
  const bizId = state.businessId;
  const bizName = state.businessName;
  const missing = tunnelMissingSections(state);
  const savedCount = TUNNEL_STEPS.length - missing.length;
  const readiness = Math.round((savedCount / TUNNEL_STEPS.length) * 100);
  const today = new Date();
  const periodStart = today.toISOString().slice(0, 10);
  const periodEnd = new Date(today.getTime() + 30 * 86400 * 1000).toISOString().slice(0, 10);
  const pricing = fld(state, "offer", "pricing");
  const packages = fld(state, "offer", "packages");
  const products = fld(state, "offer", "products");
  const icp = fld(state, "market", "icp");
  const segments = fld(state, "market", "segments");
  const legal = fld(state, "identity", "legal_entity");
  const website = fld(state, "web", "website_url");
  const src = { source: "business_setup_tunnel", setup_missing_sections: missing };
  const ns = (v: string) => (v ? "draft" : "missing_founder_input");

  return [
    {
      area: "activation",
      table: "business_activation_profiles",
      match: { business_id: bizId },
      payload: {
        business_id: bizId,
        activation_status: "draft",
        operating_mode: "sandbox",
        legal_entity_status: legal ? "recorded_unverified" : "missing_founder_input",
        brand_profile_status: ns(fld(state, "identity", "short_description")),
        offer_catalog_status: ns(products),
        pricing_status: pricing ? "recorded_from_public_site" : "missing_founder_input",
        outreach_status: "off",
        smartlead_status: "off",
        apollo_status: "off",
        native_email_status: "off",
        social_status: "off",
        marketing_status: "missing_founder_input",
        invoice_payment_status: "missing_founder_input",
        onboarding_status: "missing_founder_input",
        support_status: "missing_founder_input",
        compliance_status: "missing_founder_input",
        readiness_score: readiness,
        go_live_allowed: false,
        founder_approval_required: true,
        metadata: { ...src, website, legal_entity: legal, pricing, readiness_basis: "share of tunnel steps saved" },
      },
      note: `Activation profile in sandbox. Readiness ${readiness}%. Go-live NOT allowed.`,
    },
    {
      area: "onboarding_factory",
      table: "business_onboarding_factory_runs",
      match: { business_id: bizId },
      payload: {
        business_id: bizId,
        run_status: missing.length ? "partial" : "draft",
        provider_status: "off",
        business_created: true,
        knowledge_registered: state.steps?.knowledge?.status === "saved",
        profile_created: true,
        internal_ready: false,
        external_ready: false,
        readiness_score: readiness,
        missing_context_count: missing.length,
        no_forbidden_action_audit: { emails_sent: 0, provider_calls: 0, apollo_credits: 0, publishing: 0 },
        is_test_data: false,
        metadata: src,
      },
      note: `Onboarding factory run recorded (${missing.length} sections still missing). External ready = false.`,
    },
    {
      area: "runtime",
      table: "business_runtime_activation",
      match: { business_id: bizId },
      payload: {
        business_id: bizId,
        activated: false,
        runtime_state: "isolated",
        outbound_allowed: false,
        queue_allowed: false,
        ai_orchestration_allowed: false,
        notes: "Created by setup tunnel. Isolated; outbound, queue and AI orchestration off.",
      },
      note: "Runtime isolated. Outbound, queue and AI orchestration all OFF.",
    },
    {
      area: "marketing",
      table: "marketing_campaign_briefs",
      match: { business_id: bizId, campaign_type: "draft_from_setup_tunnel" },
      payload: {
        business_id: bizId,
        campaign_name: `${bizName} — setup-tunnel draft brief`,
        campaign_type: "draft_from_setup_tunnel",
        target_audience: [icp, segments].filter(Boolean).join(" ") || null,
        offer: pricing || null,
        approval_status: "draft",
        launch_allowed: false,
        metadata: { ...src, brand_voice: "missing_founder_input", channels: "missing_founder_input" },
      },
      note: "Draft marketing brief. Launch not allowed. Brand voice and channels need founder input.",
    },
    {
      area: "sales",
      table: "outreach_campaign_drafts",
      match: { campaign_key: `setup_tunnel_${bizId}` },
      payload: {
        business_id: bizId,
        campaign_key: `setup_tunnel_${bizId}`,
        campaign_name: `${bizName} — setup-tunnel outreach draft`,
        status: "draft",
        lead_criteria: { icp, segments, exclusions: "nursery-only operators" },
        exclusions: ["nursery_only"],
        email_sequence: [],
        smartlead_campaign_id: null,
        external_send_blocked: true,
        is_live: false,
        compliance_checked: false,
        unsubscribe_required: true,
        founder_approval_state: "not_requested",
      },
      note: "Outreach draft only. Sending blocked, no sequence, no Smartlead link, founder approval not requested.",
    },
    {
      area: "crm",
      table: "__skip__",
      match: {},
      payload: {},
      note: "CRM wiring is manual in /founder/crm. No contacts created or changed.",
    },
    {
      area: "support",
      table: "customer_onboarding_plans",
      match: { business_id: bizId, plan_name: `${bizName} — setup-tunnel onboarding plan (draft)` },
      payload: {
        business_id: bizId,
        plan_name: `${bizName} — setup-tunnel onboarding plan (draft)`,
        onboarding_status: "draft",
        onboarding_type: "school_licence_template",
        approval_status: "draft",
        customer_share_allowed: false,
        external_share_allowed: false,
        founder_review_required: true,
        is_test_data: false,
        missing_information: ["onboarding steps", "support email", "refund / cancellation terms"],
        metadata: src,
      },
      note: "Template onboarding plan (no customer). Not shareable. Steps, support email and terms need founder input.",
    },
    {
      area: "operations",
      table: "business_operating_runbooks",
      match: { business_id: bizId, runbook_key: `setup_tunnel_${bizId.slice(0, 8)}` },
      payload: {
        business_id: bizId,
        runbook_key: `setup_tunnel_${bizId.slice(0, 8)}`,
        runbook_name: `${bizName} — daily loop (setup tunnel draft)`,
        runbook_type: "daily_operating_loop",
        status: "draft",
        safety_notes: ["No cron", "No auto-execution", "No external sending"],
        metadata: src,
      },
      note: "Draft daily runbook. No cron, no auto-execution.",
    },
    {
      area: "finance",
      table: "cashflow_forecasts",
      match: { business_id: bizId, forecast_name: `${bizName} — setup-tunnel 30-day draft forecast` },
      payload: {
        business_id: bizId,
        forecast_name: `${bizName} — setup-tunnel 30-day draft forecast`,
        period_start: periodStart,
        period_end: periodEnd,
        opening_cash: null,
        expected_inflows: 0,
        expected_outflows: 0,
        forecast_status: "draft",
        founder_review_required: true,
        assumptions: ["Opening cash, costs and revenue targets are missing founder input — no figures assumed."],
      },
      note: "Empty 30-day forecast skeleton. No figures assumed; founder must supply them. No invoicing.",
    },
    {
      area: "evidence",
      table: "data_room_profiles",
      match: { business_id: bizId, data_room_type: "internal" },
      payload: {
        business_id: bizId,
        data_room_name: `${bizName} — data room (closed)`,
        data_room_type: "internal",
        data_room_status: "closed",
        audit_metadata: src,
      },
      note: "Data room registered CLOSED. No access tokens issued.",
    },
    {
      area: "exit",
      table: "__skip__",
      match: {},
      payload: {},
      note: "Buyer warm-up stays quiet. Nothing created.",
    },
  ];
}

/** Reuse this business's existing record if present, otherwise insert once. */
async function ensureRecord(a: PromoteAttempt): Promise<{ id: string; created: boolean }> {
  let q = (supabase.from(a.table as any) as any).select("id");
  for (const [k, v] of Object.entries(a.match)) q = q.eq(k, v);
  const found = await q.limit(1);
  if (found.error) throw new Error(found.error.message);
  const existing = (found.data as { id: string }[] | null)?.[0];
  if (existing) return { id: existing.id, created: false };
  const { data, error } = await (supabase.from(a.table as any) as any).insert(a.payload).select("id").single();
  if (error) throw new Error(error.message);
  const id = (data as { id?: string } | null)?.id;
  if (!id) throw new Error("insert returned no id");
  return { id, created: true };
}

export async function promoteIntoLiftorModules(state: TunnelState): Promise<ModuleConnections> {
  if (!isUuid(state.businessId)) {
    throw new Error("Confirm the draft business first (must be a real businesses row).");
  }
  const out: ModuleConnections = { ...(state.moduleConnections ?? {}) };
  const nowIso = new Date().toISOString();
  for (const a of buildPromoteAttempts(state)) {
    if (a.table === "__skip__") {
      out[a.area] = { status: "manual_action_needed", target_table: null, draft_record_id: null, note: a.note, attempted_at: nowIso };
      continue;
    }
    try {
      const r = await ensureRecord(a);
      out[a.area] = {
        status: "connected",
        target_table: a.table,
        draft_record_id: r.id,
        note: `${a.note}${r.created ? "" : " (existing record reused)"}`,
        attempted_at: nowIso,
      };
    } catch (e) {
      out[a.area] = {
        status: "failed",
        target_table: a.table,
        draft_record_id: null,
        note: `Failed in ${a.table}: ${e instanceof Error ? e.message : String(e)}`,
        attempted_at: nowIso,
      };
    }
  }
  return out;
}
