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
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TunnelState;
    return { ...parsed, moduleConnections: normaliseModuleConnections(parsed.moduleConnections) };
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
      try {
        const v = JSON.parse(localStorage.getItem(k)!) as TunnelState;
        out.push({ ...v, moduleConnections: normaliseModuleConnections(v.moduleConnections) });
      } catch { /* ignore */ }
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
  { key: "daily_running", label: "Daily running", route: "/founder/daily-operator" },
  { key: "radars", label: "Radars & prospecting", route: "/founder/crm" },
  { key: "sales", label: "Sales", route: "/founder/sales-targets" },
  { key: "email_outreach", label: "Email outreach", route: "/founder/outreach-command-centre" },
  { key: "social_media", label: "Social media (optional)", route: "/founder/social-autopilot" },
  { key: "marketing", label: "Marketing", route: "/founder/marketing" },
  { key: "customers", label: "Customers", route: "/founder/customer-success" },
  { key: "money", label: "Money", route: "/founder/finance" },
  { key: "legal_tax", label: "Legal & tax", route: "/founder/compliance" },
  { key: "portfolio_exit", label: "Portfolio & exit", route: "/founder/portfolio-exit" },
  { key: "setup_knowledge", label: "Setup & knowledge", route: "/founder/business-manuals" },
  { key: "people_suppliers", label: "People & suppliers", route: "/founder/human-workforce-control" },
  { key: "ai", label: "AI (execution off)", route: "/founder/agents" },
  { key: "platform_security", label: "Platform & security", route: "/founder/business-activation" },
] as const;

export type ModuleAreaKey = (typeof MODULE_AREAS)[number]["key"];

export type ModuleRecordConnection = {
  table: string;
  record_id: string | null;
  action: "created" | "updated" | "reused" | "not_required" | "failed";
  note: string;
};

export type ModuleConnection = {
  status: "connected" | "manual_action_needed" | "failed" | "not_attempted";
  target_table: string | null;
  draft_record_id: string | null;
  note: string;
  attempted_at: string;
  records?: ModuleRecordConnection[];
};

export type ModuleConnections = Partial<Record<ModuleAreaKey, ModuleConnection>>;

const CURRENT_AREA_KEYS = new Set<string>(MODULE_AREAS.map((area) => area.key));
const LEGACY_AREA_MAP: Record<string, ModuleAreaKey> = {
  activation: "platform_security",
  onboarding_factory: "platform_security",
  runtime: "platform_security",
  crm: "radars",
  support: "customers",
  operations: "daily_running",
  finance: "money",
  evidence: "portfolio_exit",
  exit: "portfolio_exit",
};

/** Translate pre-unification connection labels without mislabelling old outreach as Sales. */
export function normaliseModuleConnections(input?: ModuleConnections | Record<string, ModuleConnection>): ModuleConnections {
  const raw = (input ?? {}) as Record<string, ModuleConnection>;
  const out: ModuleConnections = {};
  for (const [key, value] of Object.entries(raw)) {
    const legacySales = key === "sales" && value.target_table === "outreach_campaign_drafts";
    if (CURRENT_AREA_KEYS.has(key) && !legacySales) out[key as ModuleAreaKey] = value;
  }
  for (const [key, value] of Object.entries(raw)) {
    const legacySales = key === "sales" && value.target_table === "outreach_campaign_drafts";
    if (CURRENT_AREA_KEYS.has(key) && !legacySales) continue;
    const mapped = legacySales ? "email_outreach" : LEGACY_AREA_MAP[key];
    if (mapped && !out[mapped]) out[mapped] = value;
  }
  return out;
}

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
  const moduleConnections = normaliseModuleConnections(
    (r.module_connections_json && typeof r.module_connections_json === "object") ? r.module_connections_json : {},
  );
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
    // When a draft becomes a canonical business, adopt its existing draft run
    // instead of leaving one orphaned draft row and inserting a second run.
    const { data: unlinkedDraft } = isUuid(state.businessId) && !(existing as { id: string }[] | null)?.length
      ? await (supabase.from as any)("business_setup_tunnel_runs").select("id").eq("draft_business_name", state.businessName).is("business_id", null).limit(1)
      : { data: null };
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
    const existingId = (existing as { id: string }[] | null)?.[0]?.id
      ?? (unlinkedDraft as { id: string }[] | null)?.[0]?.id;
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
  /** Safe fields to refresh on rerun; live/approval switches are omitted. */
  updatePayload?: Record<string, unknown>;
  /** Never edit a record that has crossed into an external/live state. */
  preserveWhen?: { column: string; values: unknown[] };
  note: string;
};

type EnsureResult = {
  id: string;
  action: "created" | "updated" | "reused";
};

const fld = (state: TunnelState, step: StepKey, key: string): string =>
  (state.steps?.[step]?.fields?.[key] ?? "").trim();

export function tunnelMissingSections(state: TunnelState): string[] {
  return TUNNEL_STEPS.filter((s) => state.steps?.[s.key]?.status !== "saved").map((s) => s.label);
}

const numberField = (state: TunnelState, step: StepKey, key: string): number => {
  const value = Number(fld(state, step, key));
  return Number.isFinite(value) && value >= 0 ? value : 0;
};

const integerField = (state: TunnelState, step: StepKey, key: string): number =>
  Math.round(numberField(state, step, key));

const dateField = (state: TunnelState, step: StepKey, key: string): string | null => {
  const value = fld(state, step, key);
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
};

const yesField = (state: TunnelState, step: StepKey, key: string): boolean | null => {
  const value = fld(state, step, key).toLowerCase();
  if (/^(yes|true)\b/.test(value)) return true;
  if (/^(no|false)\b/.test(value)) return false;
  return null;
};

const textLines = (value: string): string[] => value.split(/\r?\n/).map((v) => v.trim()).filter(Boolean);

/**
 * Parse pasted email copy into whole emails. When the text contains explicit
 * "EMAIL 1" / "Email 2:" markers, each marked block is ONE email (subject read
 * from a "Subject:" line). Only unmarked text falls back to blank-line splits.
 * Splitting marked emails by paragraph is what produced fragment "emails".
 */
export function parseEmailDrafts(raw: string): Record<string, unknown>[] {
  const text = (raw || "").replace(/\r\n/g, "\n");
  const marker = /^\s*(?:#+\s*)?(?:\*\*)?\s*(?:EMAIL|Email|email|TOUCH|Touch|STEP|Step)\s*(\d+)\b/gm;
  const hits = [...text.matchAll(marker)];
  let blocks: string[];
  if (hits.length > 0) {
    blocks = hits.map((m, i) => text.slice((m.index ?? 0) + m[0].length, i + 1 < hits.length ? hits[i + 1].index : text.length).trim());
  } else {
    blocks = text.split(/\n\s*\n/).map((b) => b.trim());
  }
  return blocks
    .filter(Boolean)
    .slice(0, 5)
    .map((block, index) => {
      const sub = block.match(/Subject(?:\*\*)?\s*:\s*(.+)$/im);
      const lines = block.split("\n");
      const body = sub ? lines.filter((l) => !l.includes(sub[0])).join("\n").trim() : block;
      return { step: index + 1, subject: sub ? sub[1].trim() : `Email ${index + 1}`, body, status: "draft" };
    });
}

const emailDrafts = (state: TunnelState): Record<string, unknown>[] => parseEmailDrafts(fld(state, "sales", "email_drafts"));

export function buildPromoteAttempts(state: TunnelState): PromoteAttempt[] {
  const bizId = state.businessId;
  const bizName = state.businessName;
  const missing = tunnelMissingSections(state);
  const savedCount = TUNNEL_STEPS.length - missing.length;
  const readiness = Math.round((savedCount / TUNNEL_STEPS.length) * 100);
  const createdAt = Number.isNaN(Date.parse(state.createdAt)) ? new Date() : new Date(state.createdAt);
  const periodStart = createdAt.toISOString().slice(0, 10);
  const periodEnd = new Date(createdAt.getTime() + 30 * 86400 * 1000).toISOString().slice(0, 10);
  const pricing = fld(state, "offer", "pricing");
  const products = fld(state, "offer", "products");
  const icp = fld(state, "market", "icp");
  const segments = fld(state, "market", "segments");
  const legal = fld(state, "identity", "legal_entity");
  const website = fld(state, "web", "website_url");
  const supportEmail = fld(state, "web", "support_email");
  const brandVoice = fld(state, "marketing", "brand_voice");
  const channels = fld(state, "marketing", "channels");
  const socialContent = fld(state, "marketing", "content_calendar") || fld(state, "marketing", "campaign_themes");
  const src = { source: "business_setup_tunnel", sync_version: 2, setup_missing_sections: missing };
  const ns = (v: string) => (v ? "draft" : "missing_founder_input");
  const salesTarget = {
    business_id: bizId,
    draft_business_name: null,
    target_monthly_revenue: numberField(state, "commercial", "target_monthly_revenue"),
    target_annual_revenue: numberField(state, "commercial", "target_annual_revenue"),
    target_mrr: numberField(state, "commercial", "target_mrr"),
    target_arr: numberField(state, "commercial", "target_arr"),
    currency: ["GBP", "USD", "EUR"].includes(fld(state, "commercial", "currency").toUpperCase())
      ? fld(state, "commercial", "currency").toUpperCase() : "GBP",
    average_order_value: numberField(state, "commercial", "average_order_value"),
    subscription_price: numberField(state, "commercial", "subscription_price"),
    conversion_rate: numberField(state, "commercial", "conversion_rate"),
    lead_to_call_rate: numberField(state, "commercial", "lead_to_call_rate"),
    call_to_sale_rate: numberField(state, "commercial", "call_to_sale_rate"),
    churn_rate: numberField(state, "commercial", "churn_rate"),
    gross_margin: numberField(state, "commercial", "gross_margin"),
    sales_cycle_days: integerField(state, "commercial", "sales_cycle_days"),
    target_first_sale_date: dateField(state, "commercial", "target_first_sale_date"),
    target_first_1k_date: dateField(state, "commercial", "target_first_1k_date"),
    target_first_10k_month_date: dateField(state, "commercial", "target_first_10k_month_date"),
    commercial_stage: fld(state, "commercial", "commercial_stage") || "setup",
    max_safe_outreach_per_day: integerField(state, "commercial", "max_safe_outreach_per_day"),
    founder_approval_required: true,
    notes: "Setup-tunnel planning values only. Zero means not supplied; no revenue or outreach pace is assumed.",
  };
  const runbookKey = `setup_tunnel_${bizId}`;
  const campaignKey = `setup_tunnel_${bizId}`;
  const planName = `${bizName} — customer onboarding template (setup draft)`;
  const forecastName = `${bizName} — setup-tunnel 30-day draft forecast`;
  const knowledgeProfile = {
    business_id: bizId,
    business_summary: fld(state, "identity", "short_description") || null,
    offer_summary: [products, pricing].filter(Boolean).join("\n") || null,
    target_customer: segments || null,
    ideal_customer_profile: icp || null,
    pain_points: textLines(fld(state, "market", "problem")),
    value_propositions: textLines(products),
    approved_tone: brandVoice || null,
    compliance_notes: fld(state, "knowledge", "compliance_notes") || null,
    outreach_rules: { founder_approval_required: true, external_send_allowed: false },
    metadata: src,
  };

  const attempts: PromoteAttempt[] = [
    {
      area: "setup_knowledge",
      table: "business_knowledge_profiles",
      match: { business_id: bizId },
      payload: { ...knowledgeProfile, profile_status: "draft" },
      updatePayload: knowledgeProfile,
      note: "Shared company knowledge profile refreshed for CRM, marketing, sales and internal AI context.",
    },
    ...STEP_FIELDS.knowledge.filter((field) => fld(state, "knowledge", field.key)).map((field): PromoteAttempt => ({
      area: "setup_knowledge",
      table: "business_knowledge_assets",
      match: { business_id: bizId, asset_type: `setup_${field.key}`, asset_title: `${bizName} — ${field.label}` },
      payload: {
        business_id: bizId,
        asset_type: `setup_${field.key}`,
        asset_title: `${bizName} — ${field.label}`,
        asset_content: fld(state, "knowledge", field.key),
        status: "active",
        agent_visible: true,
        metadata: { ...src, founder_review_required: true },
      },
      note: `${field.label} saved as a real shared knowledge asset; no external publishing.`,
    })),
    {
      area: "radars",
      table: "business_context_profiles",
      match: { business_id: bizId },
      payload: {
        business_id: bizId,
        brand_voice_summary: brandVoice || null,
        primary_domain: website || null,
        support_email: supportEmail || null,
        sales_email: null,
        default_currency: salesTarget.currency,
        default_market: fld(state, "market", "geography") || null,
      },
      note: "Canonical business context shared with CRM and prospecting. No contacts or campaign eligibility invented.",
    },
    {
      area: "people_suppliers",
      table: "business_operating_profiles",
      match: { business_id: bizId },
      payload: {
        business_id: bizId,
        business_name: bizName,
        operating_status: "setup",
        business_type: fld(state, "identity", "archetype") || null,
        primary_goal: fld(state, "identity", "short_description") || null,
        revenue_model: fld(state, "identity", "business_model") || null,
        target_market: [icp, segments].filter(Boolean).join(" | ") || null,
        primary_offer: products || null,
        primary_channel: channels || null,
        default_outbound_lane: "none",
        default_provider_type: "none",
        crm_enabled: true,
        agents_enabled: false,
        proposals_enabled: false,
        finance_enabled: true,
        suppliers_enabled: false,
        smartlead_enabled: false,
        native_email_enabled: false,
        apollo_enabled: false,
        founder_approval_required: true,
        auto_send_allowed: false,
        external_provider_mutation_allowed: false,
        metadata: { ...src, workforce: fld(state, "operations", "workforce"), training: fld(state, "operations", "training_assignments") },
      },
      updatePayload: {
        business_name: bizName,
        business_type: fld(state, "identity", "archetype") || null,
        primary_goal: fld(state, "identity", "short_description") || null,
        revenue_model: fld(state, "identity", "business_model") || null,
        target_market: [icp, segments].filter(Boolean).join(" | ") || null,
        primary_offer: products || null,
        primary_channel: channels || null,
        metadata: { ...src, workforce: fld(state, "operations", "workforce"), training: fld(state, "operations", "training_assignments") },
      },
      note: "Operating profile connected. Workforce notes shared; no people, suppliers or assignments invented.",
    },
    {
      area: "daily_running",
      table: "business_operating_runbooks",
      match: { business_id: bizId, runbook_key: runbookKey },
      payload: {
        business_id: bizId,
        runbook_key: runbookKey,
        runbook_name: `${bizName} — daily loop (setup draft)`,
        runbook_type: "daily_operating_loop",
        status: "draft",
        steps: textLines(fld(state, "operations", "daily_loop")),
        safety_notes: ["No cron", "No auto-execution", "No external sending"],
        required_approvals: ["founder"],
        expected_outputs: textLines(fld(state, "operations", "quality_checks")),
        metadata: { ...src, operator_tasks: fld(state, "operations", "operator_tasks"), sops: fld(state, "operations", "sops") },
      },
      updatePayload: {
        runbook_name: `${bizName} — daily loop (setup draft)`,
        steps: textLines(fld(state, "operations", "daily_loop")),
        safety_notes: ["No cron", "No auto-execution", "No external sending"],
        required_approvals: ["founder"],
        expected_outputs: textLines(fld(state, "operations", "quality_checks")),
        metadata: { ...src, operator_tasks: fld(state, "operations", "operator_tasks"), sops: fld(state, "operations", "sops") },
      },
      note: "Daily operating runbook refreshed. No cron or automatic execution.",
    },
    {
      area: "sales",
      table: "business_sales_targets",
      match: { business_id: bizId },
      payload: salesTarget,
      note: "Sales target and pace inputs shared. Blank numbers remain zero; founder approval stays required.",
    },
    {
      area: "email_outreach",
      table: "outreach_campaign_drafts",
      match: { campaign_key: campaignKey },
      payload: {
        business_id: bizId,
        campaign_key: campaignKey,
        campaign_name: `${bizName} — setup outreach draft`,
        status: "draft",
        lead_criteria: { icp, segments, lawful_sources: fld(state, "market", "lawful_sources") },
        target_role_families: textLines(segments),
        exclusions: [],
        email_sequence: emailDrafts(state),
        smartlead_campaign_id: null,
        external_send_blocked: true,
        is_live: false,
        compliance_checked: false,
        unsubscribe_required: true,
        relationship_eligibility_required: true,
        collision_protection_enabled: true,
        founder_approval_state: "not_requested",
        test_state: "not_tested",
      },
      updatePayload: {
        campaign_name: `${bizName} — setup outreach draft`,
        lead_criteria: { icp, segments, lawful_sources: fld(state, "market", "lawful_sources") },
        target_role_families: textLines(segments),
        email_sequence: emailDrafts(state),
        external_send_blocked: true,
        unsubscribe_required: true,
        relationship_eligibility_required: true,
        collision_protection_enabled: true,
      },
      preserveWhen: { column: "is_live", values: [true] },
      note: `Email draft refreshed with ${emailDrafts(state).length}/5 maximum touches. No provider campaign, leads, booking or sending.`,
    },
    {
      area: "marketing",
      table: "marketing_campaign_briefs",
      match: { business_id: bizId, campaign_type: "draft_from_setup_tunnel" },
      payload: {
        business_id: bizId,
        campaign_name: `${bizName} — setup draft brief`,
        campaign_type: "draft_from_setup_tunnel",
        campaign_goal: fld(state, "identity", "short_description") || null,
        target_audience: [icp, segments].filter(Boolean).join(" | ") || null,
        offer: [products, pricing].filter(Boolean).join("\n") || null,
        channels: textLines(channels),
        creative_angles: textLines(fld(state, "marketing", "campaign_themes")),
        required_assets: textLines(fld(state, "marketing", "assets_needed")),
        approval_status: "draft",
        launch_allowed: false,
        metadata: { ...src, brand_voice: brandVoice, pr_angles: fld(state, "marketing", "pr_angles") },
      },
      updatePayload: {
        campaign_name: `${bizName} — setup draft brief`,
        campaign_goal: fld(state, "identity", "short_description") || null,
        target_audience: [icp, segments].filter(Boolean).join(" | ") || null,
        offer: [products, pricing].filter(Boolean).join("\n") || null,
        channels: textLines(channels),
        creative_angles: textLines(fld(state, "marketing", "campaign_themes")),
        required_assets: textLines(fld(state, "marketing", "assets_needed")),
        launch_allowed: false,
        metadata: { ...src, brand_voice: brandVoice, pr_angles: fld(state, "marketing", "pr_angles") },
      },
      preserveWhen: { column: "launch_allowed", values: [true] },
      note: "Marketing brief refreshed from shared company knowledge. Launch remains blocked.",
    },
    ...(socialContent ? [{
      area: "social_media" as const,
      table: "social_post_drafts",
      match: { business_id: bizId, platform_key: "setup_plan", post_type: "text" },
      payload: {
        business_id: bizId,
        platform_key: "setup_plan",
        post_type: "text",
        content_pillar: "company_setup",
        hook: fld(state, "marketing", "campaign_themes") || null,
        caption: socialContent,
        approval_status: "draft",
        founder_review_required: true,
        publish_allowed: false,
        scheduled_externally: false,
        external_scheduler: null,
        metadata: src,
      },
      updatePayload: {
        hook: fld(state, "marketing", "campaign_themes") || null,
        caption: socialContent,
        founder_review_required: true,
        publish_allowed: false,
        metadata: src,
      },
      preserveWhen: { column: "scheduled_externally", values: [true] },
      note: "Optional social planning draft refreshed. Publishing and external scheduling remain off.",
    }] : [{
      area: "social_media" as const,
      table: "__skip__",
      match: {},
      payload: {},
      note: "Social is optional and no social content was supplied, so no blank post was created.",
    }]),
    {
      area: "customers",
      table: "customer_onboarding_plans",
      match: { business_id: bizId, plan_name: planName },
      payload: {
        business_id: bizId,
        plan_name: planName,
        onboarding_status: "draft",
        onboarding_type: "business_template",
        customer_goal: fld(state, "offer", "customer_promise") || null,
        welcome_message_draft: fld(state, "support", "welcome_pack") || null,
        onboarding_steps: textLines(fld(state, "support", "onboarding_checklist")),
        support_route: supportEmail || null,
        approval_status: "draft",
        customer_share_allowed: false,
        external_share_allowed: false,
        founder_review_required: true,
        is_test_data: false,
        missing_information: ["onboarding_checklist", "support_email", "refund_terms"].filter((key) => {
          if (key === "support_email") return !supportEmail;
          if (key === "refund_terms") return !fld(state, "offer", "refund_terms");
          return !fld(state, "support", "onboarding_checklist");
        }),
        metadata: { ...src, support_faq: fld(state, "support", "support_faq"), complaint_path: fld(state, "support", "complaint_path") },
      },
      updatePayload: {
        customer_goal: fld(state, "offer", "customer_promise") || null,
        welcome_message_draft: fld(state, "support", "welcome_pack") || null,
        onboarding_steps: textLines(fld(state, "support", "onboarding_checklist")),
        support_route: supportEmail || null,
        customer_share_allowed: false,
        external_share_allowed: false,
        founder_review_required: true,
        missing_information: ["onboarding_checklist", "support_email", "refund_terms"].filter((key) => {
          if (key === "support_email") return !supportEmail;
          if (key === "refund_terms") return !fld(state, "offer", "refund_terms");
          return !fld(state, "support", "onboarding_checklist");
        }),
        metadata: { ...src, support_faq: fld(state, "support", "support_faq"), complaint_path: fld(state, "support", "complaint_path") },
      },
      preserveWhen: { column: "external_share_allowed", values: [true] },
      note: "Generic customer onboarding template refreshed. No customer, portal invite or external sharing created.",
    },
    {
      area: "money",
      table: "cashflow_forecasts",
      match: { business_id: bizId, forecast_name: forecastName },
      payload: {
        business_id: bizId,
        forecast_name: forecastName,
        period_start: periodStart,
        period_end: periodEnd,
        opening_cash: null,
        expected_inflows: 0,
        expected_outflows: 0,
        forecast_status: "draft",
        founder_review_required: true,
        assumptions: ["Opening cash and costs were not assumed. Sales targets are stored separately as planning values, not actual revenue."],
      },
      note: "Finance forecast refreshed without inventing cash, revenue, invoices or payments.",
    },
    {
      area: "legal_tax",
      table: "business_compliance_profiles",
      match: { business_id: bizId },
      payload: {
        business_id: bizId,
        compliance_risk_level: "medium",
        regulated_activity_possible: yesField(state, "identity", "regulated"),
        // Sensitive-data flags are non-null in the native schema. Leave them
        // to their false database defaults until the founder reviews them;
        // never send null or infer sensitive-data handling during setup sync.
        marketplace_liability: yesField(state, "identity", "marketplace"),
        requires_disclaimers: true,
        founder_confirmed: false,
        notes: [fld(state, "identity", "regulated"), fld(state, "knowledge", "compliance_notes"), fld(state, "finance", "tax_legal")].filter(Boolean).join("\n\n") || null,
      },
      updatePayload: {
        regulated_activity_possible: yesField(state, "identity", "regulated"),
        marketplace_liability: yesField(state, "identity", "marketplace"),
        requires_disclaimers: true,
        notes: [fld(state, "identity", "regulated"), fld(state, "knowledge", "compliance_notes"), fld(state, "finance", "tax_legal")].filter(Boolean).join("\n\n") || null,
      },
      note: "Compliance profile connected for founder review. No legal entity, filing date or compliance approval invented.",
    },
    {
      area: "portfolio_exit",
      table: "data_room_profiles",
      match: { business_id: bizId, data_room_type: "internal" },
      payload: {
        business_id: bizId,
        data_room_name: `${bizName} — data room (closed)`,
        data_room_type: "internal",
        data_room_status: "closed",
        audit_metadata: src,
      },
      updatePayload: { data_room_name: `${bizName} — data room (closed)`, audit_metadata: src },
      note: "Internal data room registered closed. Existing status is preserved and no access tokens are issued.",
    },
    {
      area: "portfolio_exit",
      table: "business_exit_intelligence_profiles",
      match: { business_id: bizId },
      payload: {
        business_id: bizId,
        business_name: bizName,
        business_model: fld(state, "identity", "business_model") || null,
        sector: fld(state, "identity", "sector") || null,
        target_customer_type: icp || null,
        target_buyer_categories: [],
        likely_strategic_acquirers: [],
        likely_competitor_acquirers: [],
        likely_financial_buyers: [],
        likely_cash_rich_buyers: [],
        likely_international_buyers: [],
        twelve_month_review_date: dateField(state, "evidence", "twelve_month_review"),
        sale_review_status: "not_ready",
        founder_decision: "undecided",
        for_sale: false,
        outreach_approved: false,
        data_room_open: false,
        notes: [fld(state, "evidence", "valuation_notes"), fld(state, "evidence", "exit_blockers")].filter(Boolean).join("\n\n") || null,
      },
      updatePayload: {
        business_name: bizName,
        business_model: fld(state, "identity", "business_model") || null,
        sector: fld(state, "identity", "sector") || null,
        target_customer_type: icp || null,
        twelve_month_review_date: dateField(state, "evidence", "twelve_month_review"),
        notes: [fld(state, "evidence", "valuation_notes"), fld(state, "evidence", "exit_blockers")].filter(Boolean).join("\n\n") || null,
      },
      note: "Exit readiness record refreshed. Buyer outreach and data-room opening stay off.",
    },
    {
      area: "ai",
      table: "agent_business_live_settings",
      match: { business_id: bizId, setting_key: "setup_ai_execution" },
      payload: {
        business_id: bizId,
        setting_key: "setup_ai_execution",
        setting_value: false,
        description: "Company setup complete only: AI execution, orchestration and external actions remain off pending separate founder approval.",
        risk_level: "high",
        founder_approval_required: true,
        metadata: src,
      },
      note: "AI can use the shared knowledge context, but execution and external actions remain off.",
    },
    {
      area: "platform_security",
      table: "business_activation_profiles",
      match: { business_id: bizId },
      payload: {
        business_id: bizId,
        activation_status: "draft",
        operating_mode: "sandbox",
        legal_entity_status: legal ? "recorded_unverified" : "missing_founder_input",
        brand_profile_status: ns(fld(state, "identity", "short_description")),
        offer_catalog_status: ns(products),
        pricing_status: pricing ? "recorded_from_founder_input" : "missing_founder_input",
        crm_status: "ready_for_founder_input",
        customer_memory_status: "ready_for_founder_input",
        outreach_status: "off",
        smartlead_status: "off",
        apollo_status: "off",
        native_email_status: "off",
        social_status: "off",
        content_status: ns(socialContent),
        marketing_status: ns(brandVoice),
        proposal_status: "not_configured",
        demo_status: "not_configured",
        invoice_payment_status: "not_configured",
        onboarding_status: ns(fld(state, "support", "onboarding_checklist")),
        support_status: ns(supportEmail),
        supplier_status: "not_configured",
        compliance_status: "founder_review_required",
        privacy_status: "not_checked",
        security_status: "not_checked",
        readiness_score: readiness,
        go_live_allowed: false,
        founder_approval_required: true,
        metadata: { ...src, website, legal_entity: legal, readiness_basis: "share of setup steps saved, not go-live readiness" },
      },
      updatePayload: { metadata: { ...src, website, legal_entity: legal, readiness_basis: "share of setup steps saved, not go-live readiness" } },
      note: "Activation profile connected. Existing activation/provider states are preserved; new profiles are sandbox-only.",
    },
    {
      area: "platform_security",
      table: "business_onboarding_factory_runs",
      match: { business_id: bizId, run_type: "setup_tunnel_sync" },
      payload: {
        business_id: bizId,
        run_type: "setup_tunnel_sync",
        run_status: "partial",
        provider_status: "off",
        business_created: true,
        knowledge_registered: STEP_FIELDS.knowledge.some((field) => fld(state, "knowledge", field.key)),
        profile_created: true,
        starter_pack_created: false,
        materialisation_completed: false,
        command_centre_visible: true,
        founder_review_created: false,
        internal_ready: false,
        external_ready: false,
        readiness_score: readiness,
        missing_context_count: missing.length,
        risk_warning_count: 0,
        materialised_items_count: 0,
        fallback_items_count: 0,
        blocked_items_count: 0,
        skipped_duplicate_count: 0,
        no_forbidden_action_audit: { emails_sent: 0, provider_calls: 0, apollo_credits: 0, publishing: 0, payments: 0 },
        is_test_data: false,
        metadata: src,
      },
      updatePayload: {
        provider_status: "off",
        knowledge_registered: STEP_FIELDS.knowledge.some((field) => fld(state, "knowledge", field.key)),
        command_centre_visible: true,
        external_ready: false,
        readiness_score: readiness,
        missing_context_count: missing.length,
        no_forbidden_action_audit: { emails_sent: 0, provider_calls: 0, apollo_credits: 0, publishing: 0, payments: 0 },
        metadata: src,
      },
      note: "One factory sync run tracks real native records; no fallback materialisation is claimed.",
    },
    {
      area: "platform_security",
      table: "business_runtime_activation",
      match: { business_id: bizId },
      payload: {
        business_id: bizId,
        activated: false,
        runtime_state: "isolated",
        outbound_allowed: false,
        queue_allowed: false,
        ai_orchestration_allowed: false,
        notes: "Created by company setup. Isolated; outbound, queue and AI orchestration off.",
      },
      updatePayload: { notes: "Company setup synchronised. Existing runtime switches were left unchanged." },
      note: "Runtime connected. Existing switches are preserved; new runtimes are isolated with outbound, queue and AI off.",
    },
  ];

  return attempts;
}

/**
 * A business that already has its own (non-setup) current campaign draft keeps
 * it as the single campaign: setup never creates or rewrites a parallel one.
 */
export async function findCanonicalCampaign(businessId: string): Promise<string | null> {
  const { data, error } = await (supabase.from("outreach_campaign_drafts" as any) as any)
    .select("id,campaign_key,status")
    .eq("business_id", businessId)
    .not("status", "in", "(archived,inactive,superseded)")
    .order("updated_at", { ascending: false })
    .limit(20);
  if (error) throw new Error(error.message);
  const row = ((data as any[]) ?? []).find((r) => r.campaign_key && !String(r.campaign_key).startsWith("setup_tunnel_"));
  return row?.id ?? null;
}

/** Insert once, then refresh only safe internal fields on subsequent runs. */
async function ensureRecord(a: PromoteAttempt): Promise<EnsureResult> {
  let q = (supabase.from(a.table as any) as any).select("*");
  for (const [k, v] of Object.entries(a.match)) q = q.eq(k, v);
  const found = await q.limit(1);
  if (found.error) throw new Error(found.error.message);
  const existing = (found.data as Record<string, any>[] | null)?.[0];
  if (existing) {
    if (a.preserveWhen && a.preserveWhen.values.includes(existing[a.preserveWhen.column])) {
      return { id: existing.id, action: "reused" };
    }
    const updatePayload = { ...(a.updatePayload ?? a.payload) };
    for (const key of ["metadata", "audit_metadata"]) {
      const previous = existing[key];
      const next = updatePayload[key];
      if (previous && next && typeof previous === "object" && typeof next === "object" && !Array.isArray(previous) && !Array.isArray(next)) {
        updatePayload[key] = { ...previous, ...next };
      }
    }
    if (Object.keys(updatePayload).length === 0) return { id: existing.id, action: "reused" };
    const { error } = await (supabase.from(a.table as any) as any).update(updatePayload).eq("id", existing.id);
    if (error) throw new Error(error.message);
    return { id: existing.id, action: "updated" };
  }
  const { data, error } = await (supabase.from(a.table as any) as any).insert(a.payload).select("id").single();
  if (error) throw new Error(error.message);
  const id = (data as { id?: string } | null)?.id;
  if (!id) throw new Error("insert returned no id");
  return { id, action: "created" };
}

/**
 * One founder-only internal setup synchronisation across all 14 Liftor areas.
 * Every attempt uses existing native tables and stable business-scoped keys.
 * Failures are explicit per area and safe to retry. No provider/API/send/publish
 * functions are called, and no external-action or go-live gate is enabled.
 */
export async function promoteIntoLiftorModules(state: TunnelState): Promise<ModuleConnections> {
  if (!isUuid(state.businessId)) {
    throw new Error("Confirm the draft business first (must be a real businesses row).");
  }
  const attempts = buildPromoteAttempts(state);
  const records = new Map<ModuleAreaKey, ModuleRecordConnection[]>();

  for (const a of attempts) {
    const areaRecords = records.get(a.area) ?? [];
    records.set(a.area, areaRecords);
    if (a.table === "__skip__") {
      areaRecords.push({ table: a.table, record_id: null, action: "not_required", note: a.note });
      continue;
    }
    try {
      if (a.table === "outreach_campaign_drafts") {
        const canonical = await findCanonicalCampaign(state.businessId);
        if (canonical) {
          areaRecords.push({ table: a.table, record_id: canonical, action: "reused", note: "Linked to this business's existing approved campaign draft. No setup copy was imported and no duplicate campaign was created." });
          continue;
        }
      }
      const result = await ensureRecord(a);
      areaRecords.push({ table: a.table, record_id: result.id, action: result.action, note: a.note });
    } catch (e) {
      areaRecords.push({
        table: a.table,
        record_id: null,
        action: "failed",
        note: `Failed in ${a.table}: ${e instanceof Error ? e.message : String(e)}`,
      });
    }
  }

  // Finish the single factory run from actual native-record results, not from
  // input counts or fallback placeholders. It remains a draft, never a launch.
  const allRecords = [...records.values()].flat();
  const failedCount = allRecords.filter((r) => r.action === "failed").length;
  const nativeCount = allRecords.filter((r) => r.record_id && r.action !== "failed").length;
  const reusedCount = allRecords.filter((r) => r.action === "reused").length;
  const missingCount = tunnelMissingSections(state).length;
  const factory = records.get("platform_security")?.find((r) => r.table === "business_onboarding_factory_runs" && r.record_id);
  if (factory?.record_id) {
    const { error } = await (supabase.from("business_onboarding_factory_runs" as any) as any).update({
      run_status: failedCount === 0 && missingCount === 0 ? "draft" : "partial",
      internal_ready: failedCount === 0 && missingCount === 0,
      external_ready: false,
      materialisation_completed: failedCount === 0,
      materialised_items_count: nativeCount,
      fallback_items_count: 0,
      blocked_items_count: failedCount,
      skipped_duplicate_count: reusedCount,
      no_forbidden_action_audit: { emails_sent: 0, provider_calls: 0, apollo_credits: 0, publishing: 0, payments: 0 },
    }).eq("id", factory.record_id);
    if (error) {
      records.get("platform_security")?.push({
        table: "business_onboarding_factory_runs",
        record_id: factory.record_id,
        action: "failed",
        note: `Native records were saved, but the factory summary could not be finalised: ${error.message}`,
      });
    }
  }

  const out: ModuleConnections = {};
  const nowIso = new Date().toISOString();
  for (const area of MODULE_AREAS) {
    const areaRecords = records.get(area.key) ?? [];
    const hasFailed = areaRecords.some((r) => r.action === "failed");
    const hasNative = areaRecords.some((r) => r.record_id && r.action !== "failed");
    const tables = [...new Set(areaRecords.filter((r) => r.table !== "__skip__").map((r) => r.table))];
    out[area.key] = {
      status: hasFailed ? "failed" : hasNative ? "connected" : "manual_action_needed",
      target_table: tables.length ? tables.join(", ") : null,
      draft_record_id: areaRecords.find((r) => r.record_id)?.record_id ?? null,
      note: areaRecords.map((r) => r.note).join(" ") || "Not attempted yet.",
      attempted_at: nowIso,
      records: areaRecords,
    };
  }
  return out;
}
