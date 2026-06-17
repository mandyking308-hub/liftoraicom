// Liftor Business Setup Tunnel state — persisted to localStorage only.
// No backend writes; safe for founder draft work. No external side effects.

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