// Liftor — Architecture Documentation Sync (25 August 2026)
// Canonical reconciliation of the CURRENT implemented Liftor architecture on main.
// This file EXTENDS the Full Technical / Founder Manual. It does not replace it and
// it does not replace the Command Centre Truth Sync (live-state authority).
//
// Manual hierarchy (unchanged):
//   1. Command Centre Truth Sync   — live-state authority
//   2. Full Technical Manual       — canonical architecture (this file feeds it)
//   3. User Manual                 — plain-English operator instructions
//   4. Build Log                   — history / decisions / deferred work
//   5. Business Manuals            — business-specific tone/offers/rules/assets
//   6. Slim Mandy Manual           — portable handover only, NOT technical truth

export const ARCHITECTURE_SYNC_VERSION = "6.0 — August 2026 Architecture Reconciliation (25 August 2026)";
export const ARCHITECTURE_SYNC_DATE = "2026-08-25";
export const ARCHITECTURE_SYNC_SOURCE =
  "Repo-wide audit of src/App.tsx routes (799 founder routes), src/pages/founder/**, src/components/founder/**, src/lib/** engines, supabase/functions/** (604 functions), supabase/migrations/** and docs/**.";

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

**Education portfolio data asset (current):** 2,519 contacts, 266 organisations, 109 verified
work emails, 1,424 reveal-required, 986 no email on file — tagged
\`education_customer_universe\`, reusable across education-relevant businesses. Retention
rule: hold, never delete; stale snapshots must never overwrite live counts.

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

*End of Section 100 — August 2026 Architecture Reconciliation.*
`;
