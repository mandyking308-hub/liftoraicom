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
  status: "connected" | "manual_action_needed" | "not_attempted";
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
  return {
    businessId: r.business_id ?? `draft:${r.id}`,
    businessName: r.draft_business_name,
    isDraft: r.is_draft,
    steps,
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

// Create a real draft business row when founder confirms a new draft.
// No status flags exist on `businesses`; we only insert name. Returns new uuid.
export async function promoteDraftToBusiness(state: TunnelState): Promise<string | null> {
  if (isUuid(state.businessId)) return state.businessId;
  try {
    const { data, error } = await supabase.from("businesses").insert({ name: state.businessName }).select("id").single();
    if (error) return null;
    return (data as { id: string } | null)?.id ?? null;
  } catch { return null; }
}