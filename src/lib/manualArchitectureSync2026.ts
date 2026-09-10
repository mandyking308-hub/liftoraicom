// Liftor — Architecture Documentation Sync (v6.1 — 10 September 2026)
// Canonical reconciliation of the CURRENT implemented Liftor architecture on main.
// This file EXTENDS the Full Technical / Founder Manual. It does not replace it and
// it does not replace the Command Centre Truth Sync (live-state authority).
//
// Section 100 = 25 August 2026 whole-platform reconciliation (retained as history).
// Section 101 = 10 September 2026 reconciliation delta. Where the two conflict on
// current state, Section 101 controls.
// Source of the September delta: docs/manual-architecture-reconciliation-2026-09-10.md
//
// Manual hierarchy (unchanged):
//   1. Command Centre Truth Sync   — live-state authority
//   2. Full Technical Manual       — canonical architecture (this file feeds it)
//   3. User Manual                 — plain-English operator instructions
//   4. Build Log                   — history / decisions / deferred work
//   5. Business Manuals            — business-specific tone/offers/rules/assets
//   6. Slim Mandy Manual           — portable handover only, NOT technical truth

export const ARCHITECTURE_SYNC_VERSION = "6.1 — September 2026 Architecture Reconciliation (10 September 2026)";
export const ARCHITECTURE_SYNC_DATE = "2026-09-10";
export const ARCHITECTURE_SYNC_PREVIOUS_VERSION = "6.0 — August 2026 Architecture Reconciliation (25 August 2026)";
export const ARCHITECTURE_SYNC_SOURCE =
  "August baseline: repo-wide audit of src/App.tsx routes (799 founder routes), src/pages/founder/**, src/components/founder/**, src/lib/** engines, supabase/functions/** (604 functions), supabase/migrations/** and docs/**. September delta: docs/manual-architecture-reconciliation-2026-09-10.md — 21 materially changed files since the August manual commit plus a live database state check on 10 September 2026.";

export type ManualModuleRisk = "internal_only" | "approval_gated" | "external_capable" | "parked_legacy";

export interface ManualModuleEntry {
  /** Primary founder route */
  route: string;
  /** Module name as documented */
  module: string;
  /** Architecture domain */
  domain: string;
  /** What it does, one line, plain English */
  purpose: string;
  /** Data scope: portfolio-shared vs business-siloed */
  scope: "portfolio_shared" | "business_scoped" | "platform";
  risk: ManualModuleRisk;
  /** Retrieval helpers */
  tasks: string[];
}

/**
 * Searchable module index. Retrievable by route, module, domain, risk type and task type.
 * This is the index the manual surfaces and global search use for newly documented modules.
 */
export const LIFTOR_MODULE_INDEX: ManualModuleEntry[] = [
  // ── Control plane ────────────────────────────────────────────────────────
  { route: "/founder/command-centre", module: "Command Centre", domain: "Control plane", purpose: "Single start point: alerts, business selector, today's actions, mounted module cards, truth sync.", scope: "platform", risk: "internal_only", tasks: ["daily", "triage", "navigate"] },
  { route: "/founder/start-here", module: "Start Here", domain: "Control plane", purpose: "Guided 10-step founder path for first run and daily orientation.", scope: "platform", risk: "internal_only", tasks: ["onboarding", "daily"] },
  { route: "/founder/daily-operator", module: "Daily Operator", domain: "Control plane", purpose: "The day's operating list per business with pace and blockers.", scope: "business_scoped", risk: "internal_only", tasks: ["daily"] },
  { route: "/founder/copilot", module: "AI Co-Pilot", domain: "Control plane", purpose: "Ask plain questions about state, blockers and next actions; drafts only.", scope: "platform", risk: "internal_only", tasks: ["ask", "explain"] },
  { route: "/founder/brain", module: "Liftor Brain", domain: "Control plane", purpose: "Central AI reasoning layer over manuals, CRM, approvals, revenue, diagnostics.", scope: "platform", risk: "internal_only", tasks: ["ask", "draft"] },
  { route: "/founder/runtime-mode", module: "Runtime Mode", domain: "Control plane", purpose: "Simulation vs live posture and founder-only confirmation.", scope: "platform", risk: "approval_gated", tasks: ["safety"] },
  { route: "/founder/approvals-ops", module: "Approvals Ops", domain: "Control plane", purpose: "Every pending founder yes/no in one queue.", scope: "platform", risk: "approval_gated", tasks: ["approve"] },
  { route: "/founder/attention-guard", module: "Attention Guard", domain: "Control plane", purpose: "Protects founder attention; caps and ranks what surfaces.", scope: "platform", risk: "internal_only", tasks: ["triage"] },
  { route: "/founder/work-queue", module: "Master Work Queue / Portfolio PMO", domain: "Control plane", purpose: "Cross-business work items and ownership.", scope: "portfolio_shared", risk: "internal_only", tasks: ["plan"] },
  { route: "/founder/priority", module: "Priority Engine", domain: "Control plane", purpose: "Ranks portfolio work by risk, revenue impact and urgency.", scope: "portfolio_shared", risk: "internal_only", tasks: ["plan"] },
  { route: "/founder/notifications", module: "Unified Notifications & Escalations", domain: "Control plane", purpose: "Single notification and escalation spine.", scope: "platform", risk: "internal_only", tasks: ["triage"] },
  { route: "/founder/decisions", module: "Founder Decision Register", domain: "Control plane", purpose: "Durable record of founder decisions and their events.", scope: "platform", risk: "internal_only", tasks: ["govern"] },

  // ── Portfolio CRM & shared data estate (August 2026) ─────────────────────
  { route: "/founder/crm", module: "Portfolio CRM", domain: "Portfolio CRM", purpose: "Master person/organisation registry shared across the portfolio.", scope: "portfolio_shared", risk: "approval_gated", tasks: ["crm", "sales"] },
  { route: "/founder/crm/contacts", module: "CRM Contact Registry", domain: "Portfolio CRM", purpose: "All people stored once; paginated; supports ?dataset=education and ?search=.", scope: "portfolio_shared", risk: "internal_only", tasks: ["crm", "search"] },
  { route: "/founder/crm/contacts/:id", module: "CRM Contact 360", domain: "Portfolio CRM", purpose: "Person record: email readiness, provenance, communications, events, sanity check, business relationships.", scope: "portfolio_shared", risk: "approval_gated", tasks: ["crm"] },
  { route: "/founder/crm/inboxes", module: "Inbox Registry", domain: "Portfolio CRM", purpose: "Sending inboxes, warm-up state and daily limits. Manual assignment only.", scope: "platform", risk: "approval_gated", tasks: ["outreach", "safety"] },
  { route: "/founder/relationship-intelligence", module: "Relationship Intelligence", domain: "Portfolio data estate", purpose: "Research/evidence layer for people and organisations; not the operational CRM.", scope: "portfolio_shared", risk: "internal_only", tasks: ["research"] },
  { route: "/founder/relationship-intelligence/import", module: "RI Workbook Importer", domain: "Portfolio data estate", purpose: "UPSERT-only workbook import with dry-run preview; never creates blind duplicates.", scope: "portfolio_shared", risk: "internal_only", tasks: ["import"] },
  { route: "/founder/imports", module: "Import / Migration Centre", domain: "Portfolio data estate", purpose: "Staged imports with preview rows, mapping and retention rules. Imports never trigger outreach.", scope: "portfolio_shared", risk: "internal_only", tasks: ["import"] },
  { route: "/founder/identity-resolution", module: "Identity Resolution & Dedupe", domain: "Portfolio data estate", purpose: "Merge/keep decisions on people and organisations across sources.", scope: "portfolio_shared", risk: "internal_only", tasks: ["data quality"] },
  { route: "/founder/data-quality", module: "Data Quality Engine", domain: "Portfolio data estate", purpose: "Completeness, staleness and integrity scoring on portfolio data.", scope: "portfolio_shared", risk: "internal_only", tasks: ["data quality"] },
  { route: "/founder/search", module: "Global Search / Knowledge Index", domain: "Portfolio data estate", purpose: "Cross-module search across record types, modules and manuals.", scope: "platform", risk: "internal_only", tasks: ["search"] },
  { route: "/founder/portfolio-memory", module: "Portfolio Memory & Handover", domain: "Portfolio data estate", purpose: "Business memory summaries, handover packs, portfolio history events.", scope: "portfolio_shared", risk: "internal_only", tasks: ["handover"] },

  // ── Intelligence radars ──────────────────────────────────────────────────
  { route: "/founder/global-pr-radar", module: "Global PR Radar", domain: "PR / media", purpose: "Media atlas, journalist/outlet intelligence, press readiness, pitch drafts, owned-media and quarterly PR campaign planning.", scope: "portfolio_shared", risk: "approval_gated", tasks: ["pr", "visibility"] },
  { route: "/founder/social-autopilot", module: "Social Autopilot / Social Media Brain", domain: "Social", purpose: "Brand profile, calendar, content factory, approval queue, publishing queue and distribution fabric (Buffer lane).", scope: "business_scoped", risk: "approval_gated", tasks: ["social", "marketing"] },
  { route: "/founder/social-relationships", module: "Social Relationship Engine", domain: "Social", purpose: "Target discovery, relationship health, engagement inbox and CRM matching for social relationships.", scope: "business_scoped", risk: "approval_gated", tasks: ["social", "crm"] },
  { route: "/founder/social", module: "Social Viral Opportunity Radar", domain: "Social", purpose: "Signal ingestion, viral opportunity scoring (reach/velocity/relevance/fit) and brief conversion. Manual-import only; provider adapters stay off.", scope: "portfolio_shared", risk: "internal_only", tasks: ["social", "research"] },
  { route: "/founder/distressed-radar", module: "Distressed Radar", domain: "Acquisition intelligence", purpose: "Detects distressed/opportunistic targets and scores them for follow-up.", scope: "portfolio_shared", risk: "internal_only", tasks: ["m&a", "research"] },
  { route: "/founder/acquisition-funding", module: "Acquisition Funding", domain: "Capital", purpose: "Capital structures, funding routes and acquisition financing workflow.", scope: "portfolio_shared", risk: "approval_gated", tasks: ["funding", "m&a"] },
  { route: "/founder/funding-radar", module: "Funding Radar", domain: "Capital", purpose: "Funding opportunity discovery → shortlist → readiness → adviser pack workflow.", scope: "portfolio_shared", risk: "approval_gated", tasks: ["funding"] },
  { route: "/founder/billionaire-intelligence", module: "Billionaire & Wealth Network Intelligence", domain: "Wealth intelligence", purpose: "Coverage registry, wealth snapshots, philanthropy/Giving Pledge mapping, next-gen wealth networks and verified route strength.", scope: "portfolio_shared", risk: "internal_only", tasks: ["research", "network"] },
  { route: "/founder/founder-led-buyer-market", module: "Founder-Led Buyer & Market Domination Engine", domain: "Exit", purpose: "Buyer/competitor exit-intelligence profiles and quiet buyer warm-up. Outbound hard-blocked unless founder_approved_to_contact.", scope: "portfolio_shared", risk: "approval_gated", tasks: ["exit", "m&a"] },
  { route: "/founder/founder-led-exit", module: "Founder-Led Exit Sales Engine", domain: "Exit", purpose: "Exit targets, readiness scoring and founder-approval safety triggers.", scope: "portfolio_shared", risk: "approval_gated", tasks: ["exit"] },
  { route: "/founder/portfolio-exit-targets", module: "Portfolio Exit Targets", domain: "Exit", purpose: "Target list and exit metrics per business.", scope: "portfolio_shared", risk: "internal_only", tasks: ["exit"] },
  { route: "/founder/exit-metrics", module: "Exit Metrics", domain: "Exit", purpose: "Valuation-relevant metrics tracked over time.", scope: "business_scoped", risk: "internal_only", tasks: ["exit", "finance"] },

  // ── Business lifecycle ───────────────────────────────────────────────────
  { route: "/founder/business-setup-tunnel", module: "Business Setup Tunnel", domain: "Lifecycle", purpose: "Canonical 12-step backed journey for adding a business. Always saves as draft / not_live.", scope: "business_scoped", risk: "internal_only", tasks: ["onboarding"] },
  { route: "/founder/business-onboarding-factory", module: "Business Onboarding Factory", domain: "Lifecycle", purpose: "Repeatable onboarding runs producing starter packs and readiness scores.", scope: "business_scoped", risk: "internal_only", tasks: ["onboarding"] },
  { route: "/founder/starter-pack-materialiser", module: "Starter Pack Materialiser", domain: "Lifecycle", purpose: "Turns an approved starter pack into internal working drafts.", scope: "business_scoped", risk: "internal_only", tasks: ["onboarding"] },
  { route: "/founder/business-internal-activation", module: "Internal Activation", domain: "Lifecycle", purpose: "Activates a business internally with no external exposure.", scope: "business_scoped", risk: "approval_gated", tasks: ["activation"] },
  { route: "/founder/business-daily-operating-loop", module: "Daily Operating Loop", domain: "Lifecycle", purpose: "Per-business daily loop run and evidence.", scope: "business_scoped", risk: "internal_only", tasks: ["daily"] },
  { route: "/founder/business-weekly-review", module: "Weekly Review", domain: "Lifecycle", purpose: "Weekly per-business review with scorecard and next actions.", scope: "business_scoped", risk: "internal_only", tasks: ["weekly"] },
  { route: "/founder/external-activation-readiness", module: "External Activation Readiness", domain: "Lifecycle", purpose: "Scores whether a business may be considered for external activity. Scoring only — never flips a gate.", scope: "business_scoped", risk: "approval_gated", tasks: ["activation", "safety"] },
  { route: "/founder/micro-batch-preparation", module: "Micro-Batch Preparation", domain: "Lifecycle", purpose: "Prepares small approval packets for controlled first outbound batches. Execution requires a separate channel-specific founder phrase.", scope: "business_scoped", risk: "approval_gated", tasks: ["outreach", "safety"] },
  { route: "/founder/business-lifecycle", module: "Business Lifecycle Board", domain: "Lifecycle", purpose: "Stage of every business and what blocks the next stage.", scope: "portfolio_shared", risk: "internal_only", tasks: ["plan"] },
  { route: "/founder/business-wind-down", module: "Wind-Down Engine", domain: "Lifecycle", purpose: "Orderly closure workflow with evidence and obligations.", scope: "business_scoped", risk: "approval_gated", tasks: ["lifecycle"] },

  // ── Commercial ───────────────────────────────────────────────────────────
  { route: "/founder/outreach", module: "Outreach Control", domain: "Commercial", purpose: "Campaign, inbox, queue and send controls. Native low-volume lane vs Smartlead scale lane.", scope: "business_scoped", risk: "external_capable", tasks: ["outreach"] },
  { route: "/founder/sending", module: "Sending Gates", domain: "Commercial", purpose: "Per-channel send gates, auto_send flag and cron posture.", scope: "platform", risk: "approval_gated", tasks: ["safety"] },
  { route: "/founder/campaign-factory", module: "Campaign Factory", domain: "Commercial", purpose: "Campaign briefs, sequences and asset requirements.", scope: "business_scoped", risk: "approval_gated", tasks: ["marketing"] },
  { route: "/founder/customer-sales", module: "Customer Sales Engine", domain: "Commercial", purpose: "Conversation → close attempt → deal, with safety rules.", scope: "business_scoped", risk: "approval_gated", tasks: ["sales"] },
  { route: "/founder/quote-to-cash", module: "Quote-to-Cash", domain: "Commercial", purpose: "Quote → proposal → invoice → payment → confirmed revenue.", scope: "business_scoped", risk: "approval_gated", tasks: ["sales", "finance"] },
  { route: "/founder/sales-targets", module: "Sales Target & Revenue Pace", domain: "Commercial", purpose: "Targets, pace maths and shortfalls surfaced in Daily Operator.", scope: "business_scoped", risk: "internal_only", tasks: ["sales", "finance"] },
  { route: "/founder/revenue-autopilot", module: "Revenue Autopilot", domain: "Commercial", purpose: "Prepares revenue actions for review; never charges.", scope: "business_scoped", risk: "approval_gated", tasks: ["finance"] },
  { route: "/founder/customer-success", module: "Customer Success", domain: "Commercial", purpose: "Onboarding, check-ins, health, renewals, upsell and win-back.", scope: "business_scoped", risk: "approval_gated", tasks: ["retention"] },
  { route: "/founder/support-tickets", module: "Support & Knowledge Agent", domain: "Commercial", purpose: "Question capture, triage, drafted replies and support knowledge.", scope: "business_scoped", risk: "approval_gated", tasks: ["support"] },
  { route: "/founder/complaints", module: "Complaints & Disputes", domain: "Commercial", purpose: "Intake, recovery actions and resolution drafts.", scope: "business_scoped", risk: "approval_gated", tasks: ["support"] },
  { route: "/founder/marketplace", module: "Marketplace & Seller Ops", domain: "Commercial", purpose: "Marketplace listings, seller operations and growth levers where implemented.", scope: "business_scoped", risk: "approval_gated", tasks: ["ecommerce"] },
  { route: "/founder/ecommerce", module: "E-commerce / Inventory / Returns", domain: "Commercial", purpose: "Products, orders, inventory and return requests.", scope: "business_scoped", risk: "approval_gated", tasks: ["ecommerce"] },

  // ── Finance / legal / entity ─────────────────────────────────────────────
  { route: "/founder/finance", module: "Finance Hub", domain: "Finance", purpose: "Treasury, cashflow forecasts, finance pack and revenue truth. Review-first.", scope: "portfolio_shared", risk: "approval_gated", tasks: ["finance"] },
  { route: "/founder/reconciliation", module: "Reconciliation", domain: "Finance", purpose: "Bank/payment/payout matching and exceptions.", scope: "business_scoped", risk: "internal_only", tasks: ["finance"] },
  { route: "/founder/collections", module: "Collections", domain: "Finance", purpose: "Overdue chase preparation; sends stay gated.", scope: "business_scoped", risk: "approval_gated", tasks: ["finance"] },
  { route: "/founder/portfolio-fx", module: "Portfolio FX / Multi-currency", domain: "Finance", purpose: "Currency exposure across the portfolio.", scope: "portfolio_shared", risk: "internal_only", tasks: ["finance"] },
  { route: "/founder/jurisdiction-tax", module: "Jurisdiction & Tax Tracker", domain: "Legal", purpose: "Jurisdiction profiles, tax treatment flags and adviser review queue.", scope: "portfolio_shared", risk: "approval_gated", tasks: ["legal", "finance"] },
  { route: "/founder/entity-map", module: "Entity Map", domain: "Legal", purpose: "Legal entities, archetypes, required-policy matrix and revenue routing rules.", scope: "portfolio_shared", risk: "approval_gated", tasks: ["legal"] },
  { route: "/founder/contracts", module: "Contracts", domain: "Legal", purpose: "Contract lifecycle, obligations and renewals.", scope: "business_scoped", risk: "approval_gated", tasks: ["legal"] },
  { route: "/founder/corporate-secretarial", module: "Corporate Secretarial", domain: "Legal", purpose: "Company records and secretarial obligations.", scope: "portfolio_shared", risk: "approval_gated", tasks: ["legal"] },
  { route: "/founder/statutory-filings", module: "Statutory Filings", domain: "Legal", purpose: "Filing calendar and evidence. Liftor never files.", scope: "portfolio_shared", risk: "approval_gated", tasks: ["legal"] },
  { route: "/founder/international-expansion", module: "International Expansion", domain: "Legal", purpose: "Market-entry readiness and jurisdiction dependencies.", scope: "portfolio_shared", risk: "internal_only", tasks: ["strategy"] },
  { route: "/founder/insurance-liability", module: "Insurance & Liability", domain: "Legal", purpose: "Cover register, claims loop and liability exposure.", scope: "portfolio_shared", risk: "approval_gated", tasks: ["risk"] },
  { route: "/founder/ip-assets", module: "IP Assets", domain: "Legal", purpose: "IP register, rights status and protection actions.", scope: "portfolio_shared", risk: "internal_only", tasks: ["legal"] },
  { route: "/founder/legal", module: "Founder Legal Console", domain: "Legal", purpose: "Policy versions and user legal acceptances.", scope: "platform", risk: "approval_gated", tasks: ["legal", "compliance"] },

  // ── Delivery / supply / people ───────────────────────────────────────────
  { route: "/founder/suppliers", module: "Suppliers & Procurement", domain: "Delivery", purpose: "Supplier registry, routing, procurement risk.", scope: "portfolio_shared", risk: "approval_gated", tasks: ["supply"] },
  { route: "/founder/vendors", module: "Vendor Management", domain: "Delivery", purpose: "Vendor records, spend and dependency risk.", scope: "portfolio_shared", risk: "internal_only", tasks: ["supply"] },
  { route: "/founder/delivery", module: "Delivery & Fulfilment", domain: "Delivery", purpose: "Delivery obligations, milestones and fulfilment state.", scope: "business_scoped", risk: "internal_only", tasks: ["delivery"] },
  { route: "/founder/capacity", module: "Capacity Engine", domain: "Delivery", purpose: "Capacity vs committed work across businesses.", scope: "portfolio_shared", risk: "internal_only", tasks: ["plan"] },
  { route: "/founder/people", module: "People & Workforce", domain: "People", purpose: "Human workforce control, roles and assignments.", scope: "portfolio_shared", risk: "approval_gated", tasks: ["people"] },
  { route: "/founder/access-governance", module: "Access Governance & Delegation", domain: "People", purpose: "Access requests, role definitions and permissions.", scope: "platform", risk: "approval_gated", tasks: ["security"] },
  { route: "/founder/security-vault", module: "Secrets & Security Vault", domain: "People", purpose: "Credential register and secret handling policy. Values never displayed.", scope: "platform", risk: "approval_gated", tasks: ["security"] },
  { route: "/founder/internal-sla", module: "Internal SLA", domain: "People", purpose: "Internal response and turnaround commitments.", scope: "platform", risk: "internal_only", tasks: ["ops"] },

  // ── Evidence / governance / platform ─────────────────────────────────────
  { route: "/founder/documents", module: "Document Vault & Evidence", domain: "Evidence", purpose: "Vault items, evidence packs and retention.", scope: "portfolio_shared", risk: "approval_gated", tasks: ["evidence"] },
  { route: "/founder/data-room", module: "Data Room", domain: "Evidence", purpose: "Closed by default. No external tokens issued; internal review only.", scope: "portfolio_shared", risk: "approval_gated", tasks: ["evidence", "m&a"] },
  { route: "/founder/adviser-pack", module: "Adviser Pack", domain: "Evidence", purpose: "Assembles adviser-ready packs without sending them.", scope: "portfolio_shared", risk: "approval_gated", tasks: ["evidence"] },
  { route: "/founder/audit-ledger", module: "Audit Ledger", domain: "Governance", purpose: "Append-only record of consequential platform events.", scope: "platform", risk: "internal_only", tasks: ["audit"] },
  { route: "/founder/privacy", module: "Privacy Engine", domain: "Governance", purpose: "Data inventory scans and subject-request preparation.", scope: "platform", risk: "approval_gated", tasks: ["compliance"] },
  { route: "/founder/compliance", module: "Compliance Spine", domain: "Governance", purpose: "Compliance status, suppression and approval enforcement across outbound.", scope: "platform", risk: "approval_gated", tasks: ["compliance", "safety"] },
  { route: "/founder/trust-safety", module: "Trust & Safety", domain: "Governance", purpose: "Abuse, misuse and content-safety controls.", scope: "platform", risk: "approval_gated", tasks: ["safety"] },
  { route: "/founder/cross-contamination", module: "Cross-Contamination Guard", domain: "Governance", purpose: "Detects business-context bleed between silos.", scope: "platform", risk: "internal_only", tasks: ["safety", "audit"] },
  { route: "/founder/context-fabric", module: "Context Fabric / Context Guard", domain: "Governance", purpose: "Keeps AI context scoped to the selected business context.", scope: "platform", risk: "internal_only", tasks: ["safety"] },
  { route: "/founder/sops", module: "SOP & Playbook Version Control", domain: "Governance", purpose: "SOP documents, versions, review tasks and conflicts.", scope: "platform", risk: "internal_only", tasks: ["ops"] },
  { route: "/founder/knowledge-governance", module: "Knowledge Governance", domain: "Governance", purpose: "Truth checks over knowledge sources feeding the Brain.", scope: "platform", risk: "internal_only", tasks: ["govern"] },
  { route: "/founder/backup-recovery", module: "Backup, Export & Recovery", domain: "Platform", purpose: "Backups, export requests, recovery checklists and emergency packs.", scope: "platform", risk: "approval_gated", tasks: ["recovery"] },
  { route: "/founder/recovery", module: "Recovery Snapshots", domain: "Platform", purpose: "Point-in-time snapshots before risky operations.", scope: "platform", risk: "internal_only", tasks: ["recovery"] },
  { route: "/founder/deployment", module: "Deployment Control", domain: "Platform", purpose: "Release workflow, deployment records and rollback preview.", scope: "platform", risk: "approval_gated", tasks: ["release"] },
  { route: "/founder/platform-monitor", module: "Platform Monitor", domain: "Platform", purpose: "Runtime health, diagnostics and self-healing scans.", scope: "platform", risk: "internal_only", tasks: ["ops"] },
  { route: "/founder/system-health", module: "System Health", domain: "Platform", purpose: "End-to-end system diagnostics and acceptance runs.", scope: "platform", risk: "internal_only", tasks: ["ops", "test"] },
  { route: "/founder/scheduled-jobs", module: "Scheduled Jobs", domain: "Platform", purpose: "Cron registry and posture. Outbound cron remains OFF by design.", scope: "platform", risk: "approval_gated", tasks: ["safety", "ops"] },
  { route: "/founder/webhooks", module: "Webhook Inbox", domain: "Platform", purpose: "Inbound webhook receipt and mapping. Secrets never carried in URLs.", scope: "platform", risk: "internal_only", tasks: ["integration"] },
  { route: "/founder/connectors", module: "Connector Registry", domain: "Platform", purpose: "External provider connections and their activation state.", scope: "platform", risk: "approval_gated", tasks: ["integration"] },
  { route: "/founder/integration-map", module: "Integration Map", domain: "Platform", purpose: "Which module depends on which provider and what breaks if it fails.", scope: "platform", risk: "internal_only", tasks: ["integration"] },

  // ── AI governance ────────────────────────────────────────────────────────
  { route: "/founder/ai-cost", module: "AI Cost Governor", domain: "AI governance", purpose: "Budgets, usage ledger, provider pricing, ROI and alerts.", scope: "platform", risk: "internal_only", tasks: ["ai", "finance"] },
  { route: "/founder/ai-evals", module: "AI Evals & Regression", domain: "AI governance", purpose: "Test suites, cases, runs and results for AI behaviour.", scope: "platform", risk: "internal_only", tasks: ["ai", "test"] },
  { route: "/founder/agent-capabilities", module: "Agent Capability Registry", domain: "AI governance", purpose: "What each agent may do, and what stays founder-only.", scope: "platform", risk: "approval_gated", tasks: ["ai", "govern"] },
  { route: "/founder/ai-compliance", module: "AI Compliance", domain: "AI governance", purpose: "Model routing, gateway enforcement and bypass register.", scope: "platform", risk: "approval_gated", tasks: ["ai", "compliance"] },

  // ── Portals & external surfaces ──────────────────────────────────────────
  { route: "/founder/portals", module: "External Portals Admin", domain: "Portals", purpose: "Portal profiles, invites, users and access events. Invites are gated.", scope: "platform", risk: "approval_gated", tasks: ["portal"] },
  { route: "/founder/partners", module: "Partner Ecosystem", domain: "Portals", purpose: "Partner records, projects and documents.", scope: "platform", risk: "approval_gated", tasks: ["partners"] },

  // ── Overlays / specialist ────────────────────────────────────────────────
  { route: "/founder/healthcare-overlay", module: "Healthcare Overlay", domain: "Overlay", purpose: "Generic readiness overlay only. NOT LIVE / BLOCKED by default; no clinical decision features are implemented.", scope: "business_scoped", risk: "parked_legacy", tasks: ["readiness"] },

  // ── Manuals ──────────────────────────────────────────────────────────────
  { route: "/founder/manuals-hub", module: "Manuals Hub", domain: "Manuals", purpose: "Manual layers, versions, drafts and founder review.", scope: "platform", risk: "internal_only", tasks: ["docs"] },
  { route: "/founder/founder-manual", module: "Full Technical Manual", domain: "Manuals", purpose: "Canonical architecture source of truth.", scope: "platform", risk: "internal_only", tasks: ["docs"] },
  { route: "/founder/user-manual", module: "User Manual", domain: "Manuals", purpose: "Plain-English operator instructions.", scope: "platform", risk: "internal_only", tasks: ["docs"] },
  { route: "/founder/build-log", module: "Build Log", domain: "Manuals", purpose: "History, decisions and deferred work.", scope: "platform", risk: "internal_only", tasks: ["docs", "history"] },
];

const groupByDomain = () => {
  const map = new Map<string, ManualModuleEntry[]>();
  for (const m of LIFTOR_MODULE_INDEX) {
    const list = map.get(m.domain) ?? [];
    list.push(m);
    map.set(m.domain, list);
  }
  return map;
};

const renderInventoryTable = () => {
  const rows: string[] = [];
  for (const [domain, entries] of groupByDomain()) {
    rows.push(`\n#### ${domain}\n`);
    rows.push("| Route | Module | Scope | Risk | Purpose |");
    rows.push("| --- | --- | --- | --- | --- |");
    for (const e of entries) {
      rows.push(`| \`${e.route}\` | ${e.module} | ${e.scope.replace(/_/g, " ")} | ${e.risk.replace(/_/g, " ")} | ${e.purpose} |`);
    }
  }
  return rows.join("\n");
};

export const ARCHITECTURE_SYNC_MARKDOWN = `
---

# SECTION 100 — CURRENT LIFTOR ARCHITECTURE (AUGUST 2026 RECONCILIATION)

**Manual version:** ${ARCHITECTURE_SYNC_VERSION}
**Date:** ${ARCHITECTURE_SYNC_DATE}
**Source:** ${ARCHITECTURE_SYNC_SOURCE}
**Supersedes:** the May 2026 snapshot as the *complete* architecture description. Earlier
sections remain in this manual as historical record and are marked superseded where they
conflict with this section. Nothing has been deleted.

## 100.1 What Liftor is, architecturally

Liftor is ONE shared operating system and control plane used to run multiple businesses.
It is not one app per business, and it is not a per-business copy of the same data.

Two layers exist side by side:

1. **Business operating context (siloed).** Each business has its own operating state:
   activation stage, offers, campaigns, conversations, deals, delivery, support, finance
   activity, social profile, content, targets and evidence. Business context must not
   cross-contaminate. \`/founder/cross-contamination\` and \`/founder/context-fabric\` exist
   specifically to detect and prevent bleed between silos.
2. **Shared portfolio estate (canonical, reusable).** People, organisations, reusable data
   assets and buyer pools are portfolio-level assets stored once and reused. A person is
   never duplicated because a second Liftor business can also use the relationship.

## 100.2 Portfolio CRM architecture (August 2026 — current)

Pipeline: Data Asset → Buyer Pool → CRM Account → Person → Business Relevance →
Campaign Eligibility → Conversation → Proposal → Deal → Customer → Revenue.

- **Person truth:** \`contacts\` — the master person registry, portfolio-shared.
- **Business relationship truth:** \`business_contact_relationships\` — business-specific
  commercial relevance, context, eligibility and business-scoped suppression.
- **Research/evidence truth:** \`relationship_intelligence_contacts\` — not the operational
  CRM. Records reach the CRM only through the controlled promotion bridge
  (\`ri-promote-to-crm\`) when role/evidence-matched or founder-approved.
- **Client/tenant layer:** \`organisations\` remains the delivery/tenant layer. It is not the
  prospect-account database; an account links to it only once it becomes a client/tenant.
- **Legacy compatibility:** \`contacts.assigned_business\` is legacy single-business data, not
  the source of truth. \`contacts.company\` remains compatibility text.
- **Suppression:** global suppression always wins; business-specific DNC stays scoped to
  the business relationship.
- **Sanity gate:** \`crm-send-check\` / \`check_outreach_allowed\` blocks outreach on engaged /
  qualified / client / DNC status, active conversation, any communication in 24h,
  last_contacted_at under 48h, any bounce, or no inbox assigned.
- **Hard rule:** importing, deduping or promoting data NEVER triggers outreach.

## 100.3 Master Data Asset Register and reusable buyer pools

The Data Asset Register (\`src/lib/dataAssetRegistry.ts\`, surfaced on the Command Centre)
records each reusable portfolio data asset, its live holdings, provenance and retention
rule. Live counts are read from the production database; GitHub status files are historical
checkpoints, not current truth. Reusable pools are declared in
\`src/lib/portfolioCrmModel.ts\` (\`PortfolioDataPoolId\`) and resolved through
\`portfolioCrmPoolResolver.ts\`.

**Education portfolio data asset (August 2026 statement — SUPERSEDED by Section 101):**
2,519 contacts, 266 organisations, 109 verified work emails, 1,424 reveal-required, 986 no
email on file — tagged \`education_customer_universe\`. These figures are HISTORICAL RECOVERY
EVIDENCE only. The live check on 10 September 2026 found **zero** rows with
\`relationship_type = 'school_education_contact'\` in \`relationship_intelligence_contacts\`.
Do not quote the 2,519/2,520 figures as a verified current live holding. Retention rule is
unchanged: hold, never delete; stale snapshots must never overwrite live counts.

## 100.4 Complete current module inventory
${renderInventoryTable()}

## 100.5 Approval gates and safety architecture (current)

- \`auto_send\` is OFF. Outbound cron is OFF. \`SOCIAL_DISPATCH_CRON_REGISTERED\` governs the
  social dispatch lane and remains documented rather than enabled.
- Every external send, publish, schedule, charge, payout, invite, export, share, filing,
  provider mutation or credit spend is approval-gated in the owning module.
- Micro-batch execution requires a separate, channel-specific founder confirmation phrase.
- Buyer warm-up outbound is blocked at database level unless
  \`founder_approved_to_contact = true\`.
- The Data Room is closed by default and issues no external tokens.
- Simulation / founder-only posture is asserted at \`/founder/runtime-mode\`.

## 100.6 Outbound lanes (unchanged, restated)

- **Native lane (IONOS):** low-volume, high-trust founder-controlled mail only.
- **Smartlead lane:** cold scale outreach. Preview/mapping paths are live; POST and
  campaign start remain gated.
- Apollo is FREE People Search only for recovery work; enrichment credits are not spent.

## 100.7 Diagnostics, acceptance and self-updating docs

Acceptance functions exist per module (\`*-acceptance\`), plus platform-wide runs
(\`liftor-wide-final-acceptance\`, \`liftor-final-go-to-use-acceptance\`,
\`manual-source-hierarchy-acceptance\`, \`manual-closeout-acceptance\`,
\`command-centre-truth-sync\`). Manual changes continue to flow through
\`manual_update_drafts\` with \`requires_founder_review\`; this reconciliation does not
bypass that philosophy.

## 100.8 Parked / legacy lanes (documented, not deleted)

- Healthcare Overlay — readiness overlay only, NOT LIVE / BLOCKED; no clinical features.
- Social Viral Radar provider adapters (Tubular) — shell only, safe-off.
- IONOS-as-cold-engine wording in pre-May sections — superseded by 100.6.
- \`contacts.assigned_business\` single-business model — superseded by
  \`business_contact_relationships\`.
- NeonCandy execution lane — parked by founder decision; retained intact.

## 100.9 Known documentation / code discrepancies

- Route count (799 founder routes) exceeds the module count documented here because many
  routes are sub-tabs of a documented module; the index documents modules, not every tab.
- Some acceptance functions still reference \`OPENAI_API_KEY\` cosmetically in historical
  reports; the runtime path is gateway-controlled.
- \`crm_accounts\` is described in \`portfolioCrmModel.ts\` as planned; until it lands,
  organisation context for prospects lives on the contact record plus pool membership.

*End of Section 100 — August 2026 Architecture Reconciliation (retained as history; superseded
on current state by Section 101 below).*

---

# SECTION 101 — SEPTEMBER 2026 RECONCILIATION DELTA (10 SEPTEMBER 2026)

**Manual version:** ${ARCHITECTURE_SYNC_VERSION}
**Date:** ${ARCHITECTURE_SYNC_DATE}
**Previous:** ${ARCHITECTURE_SYNC_PREVIOUS_VERSION}
**Source document:** \`docs/manual-architecture-reconciliation-2026-09-10.md\`
**Change type:** documentation/current-state reconciliation only. No application behaviour,
schema, data, route, gate, cron, provider or deployment change.

Section 101 does not replace the August whole-platform audit. It reconciles the architecture
changed since that audit plus the live outbound/data state. Where Section 100 (or any May/August
section) conflicts with Section 101 on *current* state, Section 101 controls.

## 101.0 Three states must always be labelled separately

1. **Implemented in code** — exists on \`main\` and is testable.
2. **Live-configured** — actually present/populated in the live database or provider account.
3. **Historical** — evidence from an earlier dated artefact; not proof of current state.

A provider connection is never permission to send.

## 101.1 Live database snapshot — 10 September 2026

| Area | Live state |
| --- | --- |
| Central \`contacts\` | 81 |
| Active / non-archived contacts | 81 |
| \`business_contact_relationships\` | 68 |
| Apollo staged leads (\`apollo_leads\`) | 400 |
| Apollo raw leads (\`apollo_raw_leads\`) | 400 |
| Sending domains | 8 |
| Inboxes | 2 (1 active) |
| Smartlead provider rows | 1 (connected) |
| Smartlead campaign mappings | 0 |
| Smartlead lead mappings | 0 |
| Smartlead provider events | 0 |
| Smartlead activation-checklist rows | 0 |

The Apollo lead pool and the inbox/domain rows are **legacy Neon Candy-era** material. They are
not the planned education outbound estate and must stay segregated.

## 101.2 Apollo — implemented capability vs limitation

Implemented and retained: \`apollo-sync-search\`, \`apollo-sync-enrich\`,
\`apollo-unlock-shortlist\`, \`apollo-unlock-selected\`, \`apollo-qualify\`,
\`apollo-pull-verified\`, \`apollo-education-recovery\`, \`apollo-daily-runner\`,
\`apollo-test-connection\`, \`_shared/apolloRelationshipUpsert.ts\`.

**Working now:** credit-free People Search (\`POST /api/v1/mixed_people/api_search\`) with title,
exclusion, seniority, geography, keyword, verified-email and saved-list criteria; staging into
Apollo-specific tables before CRM promotion; seen-person-ID tracking and resumable pagination;
deterministic and AI-assisted qualification; selective reveal via \`people/match\` and
\`people/bulk_match\` driven by \`selected_apollo_person_ids\`; founder confirmation and dry-run
cost preview on unlocks; CRM/suppression/duplicate checks around reveal and import.

**Current limitations (must be fixed before generic education automation):**
1. Several search/quality paths still carry **Neon Candy/music-specific defaults and taxonomy**.
2. Generic sync caps are per run, **not per supplied company/organisation**.
3. **No portfolio-wide Apollo credit ledger/ceiling** across every paid enrichment path.
4. \`apollo-daily-runner\` can invoke enrichment when a segment sets \`auto_enrich=true\`; paid
   automatic enrichment must stay disabled until the global credit firewall exists.
5. Bulk enrichment can fall back to individual \`people/match\` calls — the future firewall must
   guard the combined operation, not just the first call.
6. No production orchestrator yet for: supplied company universe → best decision-makers per
   organisation → selective reveal of only the chosen contacts.

**Operating rule:** free Apollo search only, through an approved generic/education-safe search
configuration. Automatic paid enrichment stays OFF.

## 101.3 Education universe — historical evidence, not live truth

The August recovery recorded 2,520 education rows, 2,441 distinct Apollo person IDs, 266
organisations, 110 verified-email rows, 1,424 reveal-required and 986 with no email on file.
**The 10 September 2026 live check found zero \`school_education_contact\` rows in
\`relationship_intelligence_contacts\`.**

Therefore: the 2,520-row education universe must **not** be described as currently live. The
recovery artefacts remain valid historical evidence and recovery input; restoring/reconciling the
live education universe is a deliberate later stage. No education data was recreated, deleted,
enriched or moved by this reconciliation.

## 101.4 Central CRM versus research pools

The operational CRM (81 contacts, 68 business relationships) is **not** the education research
universe. Research candidates may exist without becoming CRM contacts; a person is promoted into
the canonical \`contacts\` spine only when the workflow requires it and identity/dedupe checks
pass. Legacy outreach datasets must not be merged into the education programme merely because
they share provider tables. This separation protects both data integrity and Apollo credit spend.

## 101.5 Smartlead — connected, closed loop NOT activated

**Implemented in code:** founder/admin-only read-only connection test (campaigns, email accounts,
overall analytics); whitelisted mailbox health fields (SMTP/IMAP success, warm-up status,
messages/day); bounded per-campaign webhook discovery via
\`GET /campaigns/{campaign_id}/webhooks\`; controlled-activation/readiness function with a defined
checklist; provider campaign-mapping and lead-mapping tables; a Smartlead → Liftor contact import
for leads already inside a mapped campaign, with paginated/resumable import, business-ownership
resolution, duplicate recovery and relationship create/update; tests plus an import idempotency
migration pack.

**Live-configured state:** provider connected; **0** campaign mappings, **0** lead mappings,
**0** provider events, **0** activation-checklist rows.

> Smartlead API connectivity and significant supporting code are implemented, but the production
> closed loop is **not activated**. Campaign mapping, lead mapping, mailbox/warm-up state, webhook
> receiver proof and capture, event return and a controlled first push all remain outstanding.

The controlled-activation code fails closed: it checks API key presence, mailbox connection,
warm-up state, campaign existence, campaign mapping, sequence verification, webhook
secret/receiver evidence, webhook capture, lead-push preview, external-action gates, campaign
paused/draft state, explicit founder authorisation and \`auto_send\` remaining disabled. The
readiness function performs no Smartlead POST, no send and no Apollo call.

**Direction of the import path:** \`smartlead-campaign-lead-import\` is a Smartlead → Liftor
recovery/synchronisation path using GET operations only. It is **not** the acquisition flow, and
Smartlead is **not** the preferred education prospect-data source. The intended education flow
remains: Apollo/search data → Liftor staging/quality/dedupe → canonical contact + business/campaign
eligibility → Smartlead scale delivery → events/replies back into Liftor.

**Closed-loop gaps still to prove live:** campaign discovery/creation policy and explicit
Liftor ↔ Smartlead campaign mapping; contact ↔ lead mapping; production webhook receiver
deployment/secret/readiness; at least one captured and normalised event; reply/bounce/unsubscribe
mutation back into the correct Liftor state; mailbox inventory sync and warm-up health; a
controlled test push while the campaign is paused/draft; separate founder send authorisation.

## 101.6 Sending estate — legacy, not the planned estate

8 sending-domain records and 2 inbox records (1 active) exist. These do **not** evidence the
planned education sending estate. The planned scale estate (initial target ~50 mailboxes, then
expansion) is a new controlled infrastructure programme: recorded mailbox/domain ownership,
provider IDs, visible SMTP/IMAP and warm-up state, governed daily/hourly limits and returned
health/bounce/reply metrics. No fresh mailbox is scale-ready merely because it exists. Legacy
Neon Candy inbox/domain records stay segregated for regression/testing history.

## 101.7 Source manifest / fidelity layer — new since the August baseline

\`src/components/founder/knowledge/BusinessSourceManifestBlock.tsx\`,
\`supabase/functions/_shared/sourceManifest.ts\`,
\`supabase/functions/business-source-manifest-register/index.ts\`,
\`supabase/functions/business-source-fidelity-check/index.ts\` plus fidelity tests and activation
wiring. This layer records and validates the source material behind business knowledge so later
automation runs from intended inputs rather than inferred or stale material. It is an internal
data-integrity control and authorises no external action.

## 101.8 Statements superseded or tightened

1. Education live counts — the August 2,520-row recovery is historical evidence, not a verified
   current live count.
2. Smartlead — connectivity verified, but campaign/lead/event mappings are empty; never describe
   it as "fully connected end-to-end".
3. Apollo — real and valuable, but Neon Candy-specific search/quality defaults must not be reused
   unchanged for Education.
4. Apollo automation — free discovery and paid reveal are separate control planes; discovery
   never implies permission to enrich.
5. Mailboxes — existing inbox/domain rows are legacy; the education sending estate is unbuilt.
6. CRM — operational CRM contacts are not the education research universe.
7. Smartlead data — delivery provider for education outbound, **not** the prospect-data source.

## 101.9 Build discipline for the next phase

- **GitHub \`main\` is the code source of truth.**
- Reconciliation, code search, diff review, documentation and ordinary source changes go through
  GitHub-first workflows wherever practical.
- Lovable AI is reserved for work with material value: complex application-aware edits, Lovable/
  backend integration, UI/preview validation and deployment-specific tasks.
- Work in discrete reviewed branches/units, not long mixed-purpose conversations.
- Every material architecture change ships its manual/current-state update in the same build unit.
- Live database state and repository implementation state are labelled separately in all manuals.

## 101.10 External-action posture

Unchanged. This reconciliation authorises no sending, no Smartlead campaign start, no Apollo paid
enrichment, no mailbox activation and no provider mutation.

### Stage 4 (Apollo Education Infrastructure) — IMPLEMENTED, PAID ENRICHMENT STILL LOCKED

**Implemented in code and live in the database:**
- **Portfolio Apollo Credit Firewall.** `apollo_portfolio_credit_policy`, `apollo_credit_reservations`,
  `apollo_paid_attempts` plus atomic `apollo_credit_status/reserve/settle/release` RPCs. Every paid Apollo
  path (`apollo-sync-enrich`, `apollo-unlock-selected`, `autopilot-orchestrator`) must hold a reservation
  before a request leaves the platform, keyed by a deterministic operation key so a retry cannot double-spend.
  The bulk-to-single fallback can no longer re-charge a person already covered by a successful bulk batch, and
  people Apollo previously returned with no email are skipped by default.
- **Education 152 account universe importer** (`apollo-education-account-import`) — idempotent upsert into the
  existing `strategic_account_lists` / `strategic_target_accounts` tables under stable
  `education_152_master:EDU-###` source keys. Dry-run by default; writes only on explicit founder confirmation.
  It creates no contacts, no research candidates, and makes no provider call.
- **Education FREE-discovery orchestrator** (`apollo-education-discovery`) — reads the master account list and
  uses only the credit-free Apollo People Search endpoint. It has a true plan mode that makes zero provider
  calls.
- **Deterministic education role scorer** — campaign-neutral, contains no Neon Candy or music taxonomy.
- **Founder read-only firewall panel** on `/founder/outreach/apollo`. It contains no control that can spend a
  credit or send an email.

### 101.11 CRM-native education correction (10 September 2026) — SUPERSEDES Stage-4 placement

**Superseded:** the Stage-4 wording above that places education companies solely in
\`strategic_target_accounts\` and education people in \`relationship_intelligence_contacts\` as the canonical
destination is **no longer correct**. It is retained only as build history.

**Current canonical placement:**
- \`organisations\` is the **canonical education company/account spine**. It carries additive education/source
  fields (\`account_domain\`, \`source_key\`, \`education_group_id\`, \`qualification\`, \`operating_footprint\`,
  \`primary_source\`, \`source_version\`, \`research_program_key\`, \`is_education_account\`) with partial unique
  indexes on \`source_key\` and \`lower(account_domain)\` so a company cannot be duplicated.
- \`contacts\` is the **canonical person registry**, with a real \`organisation_id\` foreign key plus minimal
  education mapping fields (\`education_group_id\`, \`education_role_family\`, \`education_role_score\`,
  \`research_program_key\`, \`reveal_status\`, \`is_research_candidate\`). \`contacts.company\` remains for legacy
  display only.
- \`strategic_target_accounts\` remains the research/pipeline view and now points back at the canonical CRM
  company through \`existing_organisation_id\`. The account importer resolves or creates the CRM organisation
  **first**, then links the strategic target.
- \`apollo-education-discovery\` writes and updates **non-sendable CRM contacts** linked to the correct
  organisation. It dedupes by Apollo person id and never erases a verified email, suppression flag, hard
  bounce or do-not-contact state. Default 10 candidates per account, configurable maximum 25.
- \`apollo-education-reveal-selected\` is the founder-controlled selected reveal path. It operates on CRM
  contact ids, is business-email only (no phone, no personal email, no waterfall), routes every paid call
  through the shared firewall, fails closed on a duplicate business email, updates the same contact row while
  preserving its organisation link, and never sends or auto-assigns a portfolio business.
- Relationship Intelligence stays the research/evidence layer; it is not the operational education CRM.

**Live-configured state (unchanged by this build unit):** paid enrichment **disabled**, hard portfolio credit
limit **0**, phone reveal / personal-email reveal / waterfall all **false**. The 152 education accounts are
**NOT yet imported**, no education research candidates exist yet, and Smartlead state is untouched.

*End of Section 101 — September 2026 Architecture Reconciliation.*
`;

