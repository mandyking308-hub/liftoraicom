import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Map as MapIcon, ChevronDown, ChevronRight, ExternalLink, ShieldAlert,
  CheckCircle2, AlertTriangle, Lock, Layers,
} from "lucide-react";

/* ──────────────────────────────────────────────────────────────────────────
 * COMMAND CENTRE MASTER INDEX
 * Read-only system map. Mounted on /founder/command-centre.
 * Does NOT mutate live data, send email, call SMTP/Apollo, or change cron.
 * ────────────────────────────────────────────────────────────────────────── */

type Risk =
  | "read-only"
  | "live-action"
  | "send-adjacent"
  | "financial"
  | "compliance-sensitive"
  | "admin-security"
  | "external-integration"
  | "legacy-archive";

export type LinkStatus =
  | "valid"
  | "alias"
  | "legacy"
  | "no-dedicated-ui"
  | "nearest-route-only"
  | "dynamic";

export interface RegistryItem {
  name: string;
  /** Canonical route, "" when no dedicated UI */
  path: string;
  /** Where shown in Master Index */
  section: string;
  risk: Risk;
  status: LinkStatus;
  source: string;
  /** Optional nearest control route when path is "" */
  nearest?: string;
  notes?: string;
}

/* All NON-DYNAMIC founder routes discovered in src/App.tsx (67 paths).
 * Each must appear in REGISTRY exactly once OR be intentionally aliased/legacy. */
export const DISCOVERED_FOUNDER_ROUTES: string[] = [
  "/founder",
  "/founder/access-control",
  "/founder/activity",
  "/founder/agents",
  "/founder/analytics",
  "/founder/architectures",
  "/founder/assignments",
  "/founder/brain",
  "/founder/build-log",
  "/founder/command-center",
  "/founder/command-center/legacy",
  "/founder/command-centre",
  "/founder/compliance",
  "/founder/compliance/events",
  "/founder/compliance/rules",
  "/founder/conversations",
  "/founder/copilot",
  "/founder/crm",
  "/founder/crm/contacts",
  "/founder/crm/inboxes",
  "/founder/decisions",
  "/founder/demos",
  "/founder/deployments",
  "/founder/documents",
  "/founder/executions",
  "/founder/expansion",
  "/founder/finance",
  "/founder/finance/deals",
  "/founder/finance/invoices",
  "/founder/finance/payments",
  "/founder/finance/targets",
  "/founder/integrations",
  "/founder/internal-proposals",
  "/founder/knowledge",
  "/founder/legal",
  "/founder/manual",
  "/founder/manual/full",
  "/founder/monitoring",
  "/founder/operations",
  "/founder/optimisation",
  "/founder/organisations",
  "/founder/outreach",
  "/founder/outreach/apollo",
  "/founder/outreach/campaigns",
  "/founder/outreach/engagement",
  "/founder/outreach/imports",
  "/founder/outreach/live-monitor",
  "/founder/outreach/queue",
  "/founder/outreach/queue-audit",
  "/founder/outreach/send-preview",
  "/founder/pipeline",
  "/founder/priority",
  "/founder/processes",
  "/founder/projects",
  "/founder/proposals",
  "/founder/revenue",
  "/founder/security",
  "/founder/sending",
  "/founder/strategy",
  "/founder/suppliers",
  "/founder/system",
  "/founder/system/events",
  "/founder/system/health",
  "/founder/system/modes",
  "/founder/templates",
  "/founder/testing",
  "/founder/workflows",
];

/* All DYNAMIC founder routes (with :id / :token / parameter segments) extracted
 * from src/App.tsx. These are not directly clickable from the Master Index
 * because they require a generated id/token; each is represented as a
 * "Dynamic route — accessed by generated id/link" entry near its parent list. */
export const DISCOVERED_DYNAMIC_FOUNDER_ROUTES: string[] = [
  "/founder/proposals/:id",
  "/founder/projects/:id",
  "/founder/monitoring/:id",
  "/founder/agents/:id",
  "/founder/workflows/:id",
  "/founder/integrations/:id",
  "/founder/executions/:id",
  "/founder/processes/:id",
  "/founder/architectures/:id",
  "/founder/deployments/:id",
  "/founder/knowledge/:id",
  "/founder/organisations/:id",
  "/founder/templates/:id",
  "/founder/expansion/:id",
  "/founder/manual/:id",
  "/founder/crm/contacts/:id",
  "/founder/crm/inboxes/:id/configure",
  "/founder/conversations/:id",
  "/founder/internal-proposals/:id",
  "/founder/suppliers/:id",
];

/* Public / portal / partner / supplier dynamic routes — represented under
 * Section 7 (client journey) and Section 14 (legacy/cross-area) so they are
 * never silently excluded. */
export const DISCOVERED_NON_FOUNDER_DYNAMIC_ROUTES: string[] = [
  "/portal/projects/:id",
  "/portal/systems/:id",
  "/partner/opportunities/:id",
  "/partner/projects/:id",
  "/proposals/view/:token",
  "/proposals/accept/:token",
  "/demo/:token",
];

/* Route reconciliation table — explains 87 (prior coverage map) vs 67 (router
 * snapshot of non-dynamic founder paths) and lists every category of route. */
export interface ReconciliationRow {
  category: string;
  count: number;
  notes: string;
  representation: string;
}
export const RECONCILIATION_ROWS: ReconciliationRow[] = [
  { category: "Total routes (prior coverage map)", count: 145, notes: "Full sitemap snapshot incl. dynamic, public, legal, portal, partner, supplier, founder.", representation: "Coverage Map" },
  { category: "Total routes (router snapshot)", count: 145, notes: "Re-counted from src/App.tsx (public + legal + portal + founder + public proposal/demo + supplier + partner).", representation: "App.tsx" },
  { category: "Founder routes (prior coverage map)", count: 87, notes: "Counted dynamic + non-dynamic founder paths together (67 + 20).", representation: "Coverage Map" },
  { category: "Founder non-dynamic routes (router)", count: 67, notes: "Listed in DISCOVERED_FOUNDER_ROUTES; each represented in REGISTRY.", representation: "Master Index sections 0–14" },
  { category: "Founder dynamic routes (router)", count: 20, notes: "Detail/edit pages requiring :id; explains the 87 → 67 gap (87 − 67 = 20).", representation: "Dynamic route entries near each parent" },
  { category: "Aliases (founder)", count: 1, notes: "/founder/command-center → /founder/command-centre (Navigate).", representation: "Section 14" },
  { category: "Legacy (founder)", count: 1, notes: "/founder/command-center/legacy retained for fallback.", representation: "Section 14" },
  { category: "Portal / client routes", count: 17, notes: "Auth + protected client area. Not represented per item; shown as nearest-route-only in Section 7.", representation: "Section 7 (nearest-route-only)" },
  { category: "Supplier routes", count: 3, notes: "External supplier portal.", representation: "Section 9 (nearest-route-only)" },
  { category: "Partner routes", count: 7, notes: "Partner portal (incl. 2 dynamic).", representation: "Section 13 cards + dynamic entries" },
  { category: "Public marketing routes", count: 12, notes: "Marketing site (/, /about, /platform, etc.).", representation: "Out of Master Index scope (founder cockpit only)" },
  { category: "Public legal routes", count: 13, notes: "/legal hub + 12 documents.", representation: "Section 5 via /legal entry" },
  { category: "Public proposal / demo routes", count: 3, notes: "Token-based public views (/proposals/view/:token, /proposals/accept/:token, /demo/:token).", representation: "Section 7 dynamic entries" },
  { category: "Manual-derived concepts (no route)", count: 40, notes: "Edge functions / schema concepts surfaced from Liftor manual.", representation: "no-dedicated-ui in nearest section" },
  { category: "Routes intentionally excluded from founder Master Index", count: 0, notes: "None silently excluded. Public marketing pages are out-of-scope by design (founder cockpit only) and are explicitly noted above.", representation: "n/a" },
];

const SECTIONS: { id: string; title: string }[] = [
  { id: "0", title: "0 · Executive Control" },
  { id: "1", title: "1 · Safety / Brake / System Mode" },
  { id: "2", title: "2 · AI Agent Control Room" },
  { id: "3", title: "3 · Outreach Runway" },
  { id: "4", title: "4 · CRM / Contacts / Inboxes" },
  { id: "5", title: "5 · Compliance / Legal / Rules" },
  { id: "6", title: "6 · Conversations / Replies / AI Drafts" },
  { id: "7", title: "7 · Proposals / Demos / Client Journey" },
  { id: "8", title: "8 · Deals / Finance / Revenue" },
  { id: "9", title: "9 · Suppliers / Assignments / Delivery" },
  { id: "10", title: "10 · Integrations / External Systems" },
  { id: "11", title: "11 · Monitoring / Security / System Health" },
  { id: "12", title: "12 · Knowledge / Manual / Build Log / Architecture" },
  { id: "13", title: "13 · Strategy / Brain / Expansion / Partners" },
  { id: "14", title: "14 · Legacy / Historical / Archive" },
];

export const REGISTRY: RegistryItem[] = [
  // ─────────── 0 · Executive Control
  { name: "Founder Overview", path: "/founder", section: "0", risk: "read-only", status: "valid", source: "App.tsx" },
  { name: "Command Centre (this page)", path: "/founder/command-centre", section: "0", risk: "read-only", status: "valid", source: "App.tsx" },
  { name: "System Mode / Test-Live", path: "/founder/system/modes", section: "0", risk: "admin-security", status: "valid", source: "App.tsx" },
  { name: "Execution Modes", path: "/founder/system/modes", section: "0", risk: "admin-security", status: "valid", source: "App.tsx", notes: "Same route as System Mode (alias card)." },
  { name: "Founder Co-Pilot", path: "/founder/copilot", section: "0", risk: "read-only", status: "valid", source: "App.tsx" },
  { name: "Diagnostics", path: "/founder/testing", section: "0", risk: "read-only", status: "valid", source: "App.tsx" },
  { name: "Founder Activity", path: "/founder/activity", section: "0", risk: "read-only", status: "valid", source: "App.tsx" },
  { name: "Priority Dashboard", path: "/founder/priority", section: "0", risk: "read-only", status: "valid", source: "App.tsx" },
  { name: "Global Operations", path: "/founder/operations", section: "0", risk: "read-only", status: "valid", source: "App.tsx" },

  // ─────────── 1 · Safety / Brake / System Mode
  { name: "Outreach Safety / Queue Brake", path: "/founder/outreach/queue-audit", section: "1", risk: "send-adjacent", status: "valid", source: "App.tsx" },
  { name: "Queue Audit", path: "/founder/outreach/queue-audit", section: "1", risk: "send-adjacent", status: "valid", source: "App.tsx" },
  { name: "System Dashboard", path: "/founder/system", section: "1", risk: "admin-security", status: "valid", source: "App.tsx" },
  { name: "System Events", path: "/founder/system/events", section: "1", risk: "admin-security", status: "valid", source: "App.tsx" },
  { name: "System Health", path: "/founder/system/health", section: "1", risk: "admin-security", status: "valid", source: "App.tsx" },
  { name: "Security Dashboard", path: "/founder/security", section: "1", risk: "admin-security", status: "valid", source: "App.tsx" },
  { name: "Access Control", path: "/founder/access-control", section: "1", risk: "admin-security", status: "valid", source: "App.tsx" },
  { name: "Compliance Dashboard", path: "/founder/compliance", section: "1", risk: "compliance-sensitive", status: "valid", source: "App.tsx" },
  { name: "Sending Health", path: "/founder/sending", section: "1", risk: "send-adjacent", status: "valid", source: "App.tsx" },

  // ─────────── 2 · AI Agent Control Room (canonical concepts; live ai_agents=0)
  { name: "Agent Directory", path: "/founder/agents", section: "2", risk: "live-action", status: "valid", source: "App.tsx" },
  { name: "Lead Quality Autopilot", path: "", nearest: "/founder/agents", section: "2", risk: "live-action", status: "no-dedicated-ui", source: "edge-fn:lead-quality-autopilot" },
  { name: "Apollo Daily Runner", path: "", nearest: "/founder/outreach/apollo", section: "2", risk: "external-integration", status: "no-dedicated-ui", source: "edge-fn:apollo-daily-runner" },
  { name: "Autopilot Orchestrator", path: "", nearest: "/founder/agents", section: "2", risk: "live-action", status: "no-dedicated-ui", source: "edge-fn:autopilot-orchestrator" },
  { name: "Outreach Send Worker", path: "", nearest: "/founder/sending", section: "2", risk: "send-adjacent", status: "no-dedicated-ui", source: "edge-fn:outreach-send-worker" },
  { name: "Inbound Poller / Webhook", path: "", nearest: "/founder/conversations", section: "2", risk: "external-integration", status: "no-dedicated-ui", source: "edge-fn:outreach-inbound-poll" },
  { name: "AI Conversation Engine", path: "", nearest: "/founder/conversations", section: "2", risk: "live-action", status: "no-dedicated-ui", source: "edge-fn:ai-conversation-engine" },
  { name: "Compliance Approver", path: "", nearest: "/founder/compliance", section: "2", risk: "compliance-sensitive", status: "no-dedicated-ui", source: "edge-fn:compliance-approve" },
  { name: "Finance Chaser", path: "", nearest: "/founder/finance/invoices", section: "2", risk: "financial", status: "no-dedicated-ui", source: "edge-fn:finance-chase-overdue" },
  { name: "Platform Diagnostics Agent", path: "/founder/testing", section: "2", risk: "read-only", status: "valid", source: "App.tsx" },
  { name: "Founder Co-Pilot Agent", path: "/founder/copilot", section: "2", risk: "read-only", status: "valid", source: "App.tsx" },
  { name: "Workflow Directory", path: "/founder/workflows", section: "2", risk: "live-action", status: "valid", source: "App.tsx" },
  { name: "Execution Dashboard", path: "/founder/executions", section: "2", risk: "read-only", status: "valid", source: "App.tsx" },

  // ─────────── 3 · Outreach Runway
  { name: "Outreach Dashboard", path: "/founder/outreach", section: "3", risk: "send-adjacent", status: "valid", source: "App.tsx" },
  { name: "Outreach Imports", path: "/founder/outreach/imports", section: "3", risk: "compliance-sensitive", status: "valid", source: "App.tsx" },
  { name: "Outreach Campaigns", path: "/founder/outreach/campaigns", section: "3", risk: "send-adjacent", status: "valid", source: "App.tsx" },
  { name: "Outreach Queue", path: "/founder/outreach/queue", section: "3", risk: "send-adjacent", status: "valid", source: "App.tsx" },
  { name: "Apollo Integration / Candidate Pull", path: "/founder/outreach/apollo", section: "3", risk: "external-integration", status: "valid", source: "App.tsx" },
  { name: "Engagement Tracking", path: "/founder/outreach/engagement", section: "3", risk: "read-only", status: "valid", source: "App.tsx" },
  { name: "Controlled Send Preview", path: "/founder/outreach/send-preview", section: "3", risk: "send-adjacent", status: "valid", source: "App.tsx" },
  { name: "Campaign Live Monitor", path: "/founder/outreach/live-monitor", section: "3", risk: "send-adjacent", status: "valid", source: "App.tsx" },
  { name: "Lead Pipeline", path: "/founder/pipeline", section: "3", risk: "read-only", status: "valid", source: "App.tsx" },
  { name: "Lead Quality Gate", path: "", nearest: "/founder/pipeline", section: "3", risk: "compliance-sensitive", status: "no-dedicated-ui", source: "edge-fn:lead-quality-scan" },
  { name: "Email Reveal Approval", path: "", nearest: "/founder/outreach/apollo", section: "3", risk: "compliance-sensitive", status: "no-dedicated-ui", source: "edge-fn:apollo-unlock-shortlist" },
  { name: "Post-Reveal Validation", path: "", nearest: "/founder/outreach/apollo", section: "3", risk: "compliance-sensitive", status: "no-dedicated-ui", source: "edge-fn:apollo-qualify" },
  { name: "Promote to CRM", path: "", nearest: "/founder/crm/contacts", section: "3", risk: "compliance-sensitive", status: "no-dedicated-ui", source: "edge-fn:promote-leads-to-contacts" },
  { name: "Compliance Approval Gate", path: "/founder/compliance", section: "3", risk: "compliance-sensitive", status: "valid", source: "App.tsx" },
  { name: "Stage-to-Queue Gate", path: "", nearest: "/founder/outreach/queue", section: "3", risk: "send-adjacent", status: "no-dedicated-ui", source: "edge-fn:stage-to-queue-eligibility" },
  { name: "Queue Creation Gate", path: "", nearest: "/founder/outreach/queue", section: "3", risk: "send-adjacent", status: "no-dedicated-ui", source: "edge-fn:create-queue-from-staged" },

  // ─────────── 4 · CRM / Contacts / Inboxes
  { name: "CRM Dashboard", path: "/founder/crm", section: "4", risk: "read-only", status: "valid", source: "App.tsx" },
  { name: "CRM Contacts", path: "/founder/crm/contacts", section: "4", risk: "compliance-sensitive", status: "valid", source: "App.tsx" },
  { name: "CRM Inboxes", path: "/founder/crm/inboxes", section: "4", risk: "send-adjacent", status: "valid", source: "App.tsx" },
  { name: "Businesses / Organisations", path: "/founder/organisations", section: "4", risk: "read-only", status: "valid", source: "App.tsx" },
  { name: "Business Contact Relationships", path: "", nearest: "/founder/crm/contacts", section: "4", risk: "compliance-sensitive", status: "no-dedicated-ui", source: "schema:business_contact_relationships" },
  { name: "Internal Identities", path: "", nearest: "/founder/crm/inboxes", section: "4", risk: "admin-security", status: "no-dedicated-ui", source: "schema:internal_identities" },
  { name: "Sending Domains", path: "", nearest: "/founder/sending", section: "4", risk: "send-adjacent", status: "no-dedicated-ui", source: "schema:sending_domains" },

  // ─────────── 5 · Compliance / Legal / Rules
  { name: "Compliance Events", path: "/founder/compliance/events", section: "5", risk: "compliance-sensitive", status: "valid", source: "App.tsx" },
  { name: "Compliance Rules", path: "/founder/compliance/rules", section: "5", risk: "compliance-sensitive", status: "valid", source: "App.tsx" },
  { name: "Founder Legal Console", path: "/founder/legal", section: "5", risk: "compliance-sensitive", status: "valid", source: "App.tsx" },
  { name: "Legal Hub (public)", path: "/legal", section: "5", risk: "read-only", status: "valid", source: "App.tsx" },
  { name: "Legal Document Versions", path: "", nearest: "/founder/legal", section: "5", risk: "compliance-sensitive", status: "no-dedicated-ui", source: "schema:legal_documents" },
  { name: "Outreach Lawful Basis", path: "", nearest: "/founder/compliance/rules", section: "5", risk: "compliance-sensitive", status: "no-dedicated-ui", source: "schema:contact_compliance" },
  { name: "Unsubscribe / Suppression / Bounce", path: "", nearest: "/founder/compliance", section: "5", risk: "compliance-sensitive", status: "no-dedicated-ui", source: "edge-fn:unsubscribe-contact" },

  // ─────────── 6 · Conversations / Replies / AI Drafts
  { name: "Conversations Dashboard", path: "/founder/conversations", section: "6", risk: "live-action", status: "valid", source: "App.tsx" },
  { name: "AI Drafts / Replies Approval", path: "/founder/conversations", section: "6", risk: "live-action", status: "valid", source: "App.tsx", notes: "Inline within Conversations." },
  { name: "Inbound Messages", path: "", nearest: "/founder/conversations", section: "6", risk: "external-integration", status: "no-dedicated-ui", source: "edge-fn:outreach-inbound-webhook" },

  // ─────────── 7 · Proposals / Demos / Client Journey
  { name: "Founder Proposals", path: "/founder/proposals", section: "7", risk: "read-only", status: "valid", source: "App.tsx" },
  { name: "Internal Proposals", path: "/founder/internal-proposals", section: "7", risk: "read-only", status: "valid", source: "App.tsx" },
  { name: "Public Proposal View", path: "", nearest: "/founder/proposals", section: "7", risk: "read-only", status: "no-dedicated-ui", source: "App.tsx:/proposals/view/:token (public)" },
  { name: "Public Proposal Accept", path: "", nearest: "/founder/proposals", section: "7", risk: "live-action", status: "no-dedicated-ui", source: "App.tsx:/proposals/accept/:token (public)" },
  { name: "Demos Dashboard", path: "/founder/demos", section: "7", risk: "read-only", status: "valid", source: "App.tsx" },
  { name: "Client Projects (founder view)", path: "/founder/projects", section: "7", risk: "read-only", status: "valid", source: "App.tsx" },
  { name: "Client Documents (founder view)", path: "/founder/documents", section: "7", risk: "read-only", status: "valid", source: "App.tsx" },
  { name: "Client Portal Dashboard", path: "", nearest: "/portal/dashboard", section: "7", risk: "read-only", status: "nearest-route-only", source: "App.tsx:/portal/* (client-side)" },
  { name: "Client Control Panel", path: "", nearest: "/portal/systems", section: "7", risk: "read-only", status: "nearest-route-only", source: "App.tsx" },
  { name: "Client Analytics", path: "", nearest: "/portal/analytics", section: "7", risk: "read-only", status: "nearest-route-only", source: "App.tsx" },
  { name: "Client Optimisation", path: "", nearest: "/portal/optimisation", section: "7", risk: "read-only", status: "nearest-route-only", source: "App.tsx" },
  { name: "Maintenance Dashboard (client)", path: "", nearest: "/portal/maintenance", section: "7", risk: "read-only", status: "nearest-route-only", source: "App.tsx" },
  { name: "Client Monitoring", path: "", nearest: "/portal/monitoring", section: "7", risk: "read-only", status: "nearest-route-only", source: "App.tsx" },

  // ─────────── 8 · Deals / Finance / Revenue
  { name: "Founder Revenue", path: "/founder/revenue", section: "8", risk: "financial", status: "valid", source: "App.tsx" },
  { name: "Finance Dashboard", path: "/founder/finance", section: "8", risk: "financial", status: "valid", source: "App.tsx" },
  { name: "Finance Targets", path: "/founder/finance/targets", section: "8", risk: "financial", status: "valid", source: "App.tsx" },
  { name: "Finance Deals", path: "/founder/finance/deals", section: "8", risk: "financial", status: "valid", source: "App.tsx" },
  { name: "Finance Invoices", path: "/founder/finance/invoices", section: "8", risk: "financial", status: "valid", source: "App.tsx" },
  { name: "Finance Payments", path: "/founder/finance/payments", section: "8", risk: "financial", status: "valid", source: "App.tsx" },
  { name: "Overdue Invoice Chaser", path: "", nearest: "/founder/finance/invoices", section: "8", risk: "financial", status: "no-dedicated-ui", source: "edge-fn:finance-chase-overdue" },

  // ─────────── 9 · Suppliers / Assignments / Delivery
  { name: "Suppliers Dashboard", path: "/founder/suppliers", section: "9", risk: "read-only", status: "valid", source: "App.tsx" },
  { name: "Assignments Dashboard", path: "/founder/assignments", section: "9", risk: "read-only", status: "valid", source: "App.tsx" },
  { name: "Supplier Pipeline / Availability / SLA / Scoring", path: "/founder/suppliers", section: "9", risk: "read-only", status: "valid", source: "App.tsx", notes: "Inline tabs within Suppliers Dashboard." },
  { name: "Supplier Portal (external)", path: "", nearest: "/supplier/dashboard", section: "9", risk: "read-only", status: "nearest-route-only", source: "App.tsx:/supplier/* (external)" },

  // ─────────── 10 · Integrations / External Systems
  { name: "Integration Directory", path: "/founder/integrations", section: "10", risk: "external-integration", status: "valid", source: "App.tsx" },
  { name: "Apollo", path: "/founder/outreach/apollo", section: "10", risk: "external-integration", status: "valid", source: "App.tsx" },
  { name: "IONOS SMTP / Outbound Email", path: "", nearest: "/founder/sending", section: "10", risk: "send-adjacent", status: "no-dedicated-ui", source: "edge-fn:outreach-save-credentials" },
  { name: "IONOS IMAP / Inbound Polling", path: "", nearest: "/founder/crm/inboxes", section: "10", risk: "external-integration", status: "no-dedicated-ui", source: "edge-fn:outreach-test-imap" },
  { name: "AI Gateway", path: "", nearest: "/founder/integrations", section: "10", risk: "external-integration", status: "no-dedicated-ui", source: "lovable-ai-gateway" },
  { name: "Stripe (planned)", path: "", nearest: "/founder/finance", section: "10", risk: "financial", status: "no-dedicated-ui", source: "planned" },
  { name: "Tracking Pixels / Click Redirects", path: "/founder/outreach/engagement", section: "10", risk: "send-adjacent", status: "valid", source: "App.tsx" },
  { name: "Platform Testing Runner", path: "/founder/testing", section: "10", risk: "read-only", status: "valid", source: "App.tsx" },
  { name: "Inbound Webhook", path: "", nearest: "/founder/conversations", section: "10", risk: "external-integration", status: "no-dedicated-ui", source: "edge-fn:outreach-inbound-webhook" },

  // ─────────── 11 · Monitoring / Security / System Health
  { name: "Monitoring Dashboard", path: "/founder/monitoring", section: "11", risk: "read-only", status: "valid", source: "App.tsx" },
  { name: "Retry Queue", path: "", nearest: "/founder/executions", section: "11", risk: "live-action", status: "no-dedicated-ui", source: "schema:execution_retries" },
  { name: "Risk Indicators", path: "", nearest: "/founder/security", section: "11", risk: "admin-security", status: "no-dedicated-ui", source: "schema:risk_indicators" },
  { name: "Domain Protection Alerts", path: "", nearest: "/founder/security", section: "11", risk: "admin-security", status: "no-dedicated-ui", source: "schema:domain_alerts" },
  { name: "Integration Alerts", path: "", nearest: "/founder/integrations", section: "11", risk: "external-integration", status: "no-dedicated-ui", source: "schema:integration_alerts" },

  // ─────────── 12 · Knowledge / Manual / Build Log / Architecture
  { name: "Founder Manual", path: "/founder/manual", section: "12", risk: "read-only", status: "valid", source: "App.tsx" },
  { name: "Full System Mirror", path: "/founder/manual/full", section: "12", risk: "read-only", status: "valid", source: "App.tsx" },
  { name: "Build Log", path: "/founder/build-log", section: "12", risk: "read-only", status: "valid", source: "App.tsx" },
  { name: "Knowledge Directory", path: "/founder/knowledge", section: "12", risk: "read-only", status: "valid", source: "App.tsx" },
  { name: "Founder Documents", path: "/founder/documents", section: "12", risk: "read-only", status: "valid", source: "App.tsx" },
  { name: "Process Directory", path: "/founder/processes", section: "12", risk: "read-only", status: "valid", source: "App.tsx" },
  { name: "Architecture Directory", path: "/founder/architectures", section: "12", risk: "read-only", status: "valid", source: "App.tsx" },
  { name: "Templates", path: "/founder/templates", section: "12", risk: "read-only", status: "valid", source: "App.tsx" },
  { name: "Deployments", path: "/founder/deployments", section: "12", risk: "read-only", status: "valid", source: "App.tsx" },
  { name: "Founder Analytics", path: "/founder/analytics", section: "12", risk: "read-only", status: "valid", source: "App.tsx" },

  // ─────────── 13 · Strategy / Brain / Expansion / Partners
  { name: "Brain Core", path: "/founder/brain", section: "13", risk: "read-only", status: "valid", source: "App.tsx" },
  { name: "Decision Engine", path: "/founder/decisions", section: "13", risk: "read-only", status: "valid", source: "App.tsx" },
  { name: "Strategy Engine", path: "/founder/strategy", section: "13", risk: "read-only", status: "valid", source: "App.tsx" },
  { name: "Optimisation Dashboard", path: "/founder/optimisation", section: "13", risk: "read-only", status: "valid", source: "App.tsx" },
  { name: "Platform Expansion", path: "/founder/expansion", section: "13", risk: "admin-security", status: "valid", source: "App.tsx" },
  { name: "Partner Dashboard", path: "/partner", section: "13", risk: "read-only", status: "valid", source: "App.tsx" },
  { name: "Partner Opportunities", path: "/partner/opportunities", section: "13", risk: "read-only", status: "valid", source: "App.tsx" },
  { name: "Partner Projects", path: "/partner/projects", section: "13", risk: "read-only", status: "valid", source: "App.tsx" },
  { name: "Partner Documents", path: "/partner/documents", section: "13", risk: "read-only", status: "valid", source: "App.tsx" },
  { name: "Partner Messages", path: "/partner/messages", section: "13", risk: "read-only", status: "valid", source: "App.tsx" },
  { name: "Partner Program (public)", path: "/partners", section: "13", risk: "read-only", status: "valid", source: "App.tsx" },

  // ─────────── 14 · Legacy / Historical / Archive
  { name: "Legacy Command Centre", path: "/founder/command-center/legacy", section: "14", risk: "legacy-archive", status: "legacy", source: "App.tsx" },
  { name: "/founder/command-center → /founder/command-centre", path: "/founder/command-center", section: "14", risk: "legacy-archive", status: "alias", source: "App.tsx (Navigate)" },
  { name: "Legacy Apollo Pool / Historical Runs", path: "/founder/outreach/apollo", section: "14", risk: "legacy-archive", status: "valid", source: "App.tsx", notes: "Historical tab in Apollo Integration." },
  { name: "Duplicate / Held-Back Candidates", path: "/founder/outreach/queue-audit", section: "14", risk: "legacy-archive", status: "valid", source: "App.tsx", notes: "Surfaced via Queue Audit classification." },
  { name: "Old Snapshots / Raw Diagnostics", path: "/founder/testing", section: "14", risk: "legacy-archive", status: "valid", source: "App.tsx" },

  // ─────────── Dynamic founder routes (require :id) — represented near parent
  { name: "Proposal Detail (dynamic)", path: "/founder/proposals/:id", nearest: "/founder/proposals", section: "7", risk: "read-only", status: "dynamic", source: "App.tsx", notes: "Dynamic route — accessed by generated id from list." },
  { name: "Founder Project Detail (dynamic)", path: "/founder/projects/:id", nearest: "/founder/projects", section: "7", risk: "read-only", status: "dynamic", source: "App.tsx", notes: "Dynamic route — accessed by generated id." },
  { name: "Monitoring System Detail (dynamic)", path: "/founder/monitoring/:id", nearest: "/founder/monitoring", section: "11", risk: "read-only", status: "dynamic", source: "App.tsx", notes: "Dynamic route — accessed by generated id." },
  { name: "Agent Profile (dynamic)", path: "/founder/agents/:id", nearest: "/founder/agents", section: "2", risk: "read-only", status: "dynamic", source: "App.tsx", notes: "Dynamic route — accessed by generated id." },
  { name: "Workflow Detail (dynamic)", path: "/founder/workflows/:id", nearest: "/founder/workflows", section: "2", risk: "read-only", status: "dynamic", source: "App.tsx", notes: "Dynamic route — accessed by generated id." },
  { name: "Integration Detail (dynamic)", path: "/founder/integrations/:id", nearest: "/founder/integrations", section: "10", risk: "external-integration", status: "dynamic", source: "App.tsx", notes: "Dynamic route — accessed by generated id." },
  { name: "Execution Detail (dynamic)", path: "/founder/executions/:id", nearest: "/founder/executions", section: "11", risk: "read-only", status: "dynamic", source: "App.tsx", notes: "Dynamic route — accessed by generated id." },
  { name: "Process Detail (dynamic)", path: "/founder/processes/:id", nearest: "/founder/processes", section: "12", risk: "read-only", status: "dynamic", source: "App.tsx", notes: "Dynamic route — accessed by generated id." },
  { name: "Architecture Detail (dynamic)", path: "/founder/architectures/:id", nearest: "/founder/architectures", section: "12", risk: "read-only", status: "dynamic", source: "App.tsx", notes: "Dynamic route — accessed by generated id." },
  { name: "Deployment Detail (dynamic)", path: "/founder/deployments/:id", nearest: "/founder/deployments", section: "12", risk: "read-only", status: "dynamic", source: "App.tsx", notes: "Dynamic route — accessed by generated id." },
  { name: "Knowledge Detail (dynamic)", path: "/founder/knowledge/:id", nearest: "/founder/knowledge", section: "12", risk: "read-only", status: "dynamic", source: "App.tsx", notes: "Dynamic route — accessed by generated id." },
  { name: "Organisation Profile (dynamic)", path: "/founder/organisations/:id", nearest: "/founder/organisations", section: "4", risk: "read-only", status: "dynamic", source: "App.tsx", notes: "Dynamic route — accessed by generated id." },
  { name: "Template Detail (dynamic)", path: "/founder/templates/:id", nearest: "/founder/templates", section: "12", risk: "read-only", status: "dynamic", source: "App.tsx", notes: "Dynamic route — accessed by generated id." },
  { name: "Platform Launch Detail (dynamic)", path: "/founder/expansion/:id", nearest: "/founder/expansion", section: "13", risk: "admin-security", status: "dynamic", source: "App.tsx", notes: "Dynamic route — accessed by generated id." },
  { name: "Manual Page Detail (dynamic)", path: "/founder/manual/:id", nearest: "/founder/manual", section: "12", risk: "read-only", status: "dynamic", source: "App.tsx", notes: "Dynamic route — accessed by generated id." },
  { name: "CRM Contact Detail (dynamic)", path: "/founder/crm/contacts/:id", nearest: "/founder/crm/contacts", section: "4", risk: "compliance-sensitive", status: "dynamic", source: "App.tsx", notes: "Dynamic route — accessed by generated id." },
  { name: "CRM Inbox Configure (dynamic)", path: "/founder/crm/inboxes/:id/configure", nearest: "/founder/crm/inboxes", section: "4", risk: "send-adjacent", status: "dynamic", source: "App.tsx", notes: "Dynamic route — accessed by generated id." },
  { name: "Conversation Detail (dynamic)", path: "/founder/conversations/:id", nearest: "/founder/conversations", section: "6", risk: "live-action", status: "dynamic", source: "App.tsx", notes: "Dynamic route — accessed by generated id." },
  { name: "Internal Proposal Detail (dynamic)", path: "/founder/internal-proposals/:id", nearest: "/founder/internal-proposals", section: "7", risk: "read-only", status: "dynamic", source: "App.tsx", notes: "Dynamic route — accessed by generated id." },
  { name: "Supplier Detail (dynamic)", path: "/founder/suppliers/:id", nearest: "/founder/suppliers", section: "9", risk: "read-only", status: "dynamic", source: "App.tsx", notes: "Dynamic route — accessed by generated id." },

  // Public/portal/partner dynamic — kept visible so they are not silently excluded
  { name: "Public Proposal View (dynamic token)", path: "/proposals/view/:token", nearest: "/founder/proposals", section: "7", risk: "read-only", status: "dynamic", source: "App.tsx", notes: "Dynamic route — accessed by generated token/link." },
  { name: "Public Proposal Accept (dynamic token)", path: "/proposals/accept/:token", nearest: "/founder/proposals", section: "7", risk: "live-action", status: "dynamic", source: "App.tsx", notes: "Dynamic route — accessed by generated token/link." },
  { name: "Public Demo (dynamic token)", path: "/demo/:token", nearest: "/founder/demos", section: "7", risk: "read-only", status: "dynamic", source: "App.tsx", notes: "Dynamic route — accessed by generated token/link." },
  { name: "Portal Project Detail (dynamic)", path: "/portal/projects/:id", nearest: "/portal/projects", section: "7", risk: "read-only", status: "dynamic", source: "App.tsx", notes: "Dynamic route — client portal." },
  { name: "Portal System Detail (dynamic)", path: "/portal/systems/:id", nearest: "/portal/systems", section: "7", risk: "read-only", status: "dynamic", source: "App.tsx", notes: "Dynamic route — client portal." },
  { name: "Partner Opportunity Detail (dynamic)", path: "/partner/opportunities/:id", nearest: "/partner/opportunities", section: "13", risk: "read-only", status: "dynamic", source: "App.tsx", notes: "Dynamic route — partner portal." },
  { name: "Partner Project Detail (dynamic)", path: "/partner/projects/:id", nearest: "/partner/projects", section: "13", risk: "read-only", status: "dynamic", source: "App.tsx", notes: "Dynamic route — partner portal." },
];

/* Snapshot of CURRENT visible Command Centre sections (manual baseline, before refactor).
 * Used as the contract that nothing disappears silently in a future layout pass. */
interface SnapshotItem {
  current: string;
  component: string;
  futureSection: string;
  status: "keep visible" | "move later" | "collapse later" | "route-link later" | "legacy/archive later";
}
const BEFORE_SNAPSHOT: SnapshotItem[] = [
  { current: "Executive control strip / Next recommended", component: "CommandCentre.tsx (top)", futureSection: "0 · Executive Control", status: "keep visible" },
  { current: "Outreach Safety / Queue Brake", component: "OutreachSafetyPanel", futureSection: "1 · Safety / Brake", status: "keep visible" },
  { current: "Today's founder actions", component: "CommandCentre.tsx Section", futureSection: "0 · Executive Control", status: "keep visible" },
  { current: "Business workflow rail", component: "CommandCentre.tsx Section", futureSection: "3 · Outreach Runway", status: "move later" },
  { current: "Controlled Live Batch (guarded)", component: "ControlledLiveBatch", futureSection: "3 · Outreach Runway", status: "collapse later" },
  { current: "Apollo Pull Panel", component: "ApolloPullPanel", futureSection: "3 · Outreach Runway", status: "collapse later" },
  { current: "Lead Quality Panel", component: "LeadQualityPanel", futureSection: "3 · Outreach Runway", status: "collapse later" },
  { current: "Source Quality Brief", component: "SourceQualityBrief", futureSection: "3 · Outreach Runway", status: "collapse later" },
  { current: "Autopilot Policy Panel", component: "AutopilotPolicyPanel", futureSection: "2 · AI Agent Control Room", status: "move later" },
  { current: "Agent Orchestration", component: "AgentOrchestration", futureSection: "2 · AI Agent Control Room", status: "move later" },
  { current: "Execution Status Panel", component: "ExecutionStatusPanel", futureSection: "11 · Monitoring", status: "move later" },
  { current: "Autonomous Pipeline Status", component: "AutonomousPipelineStatus", futureSection: "2 · AI Agent Control Room", status: "move later" },
  { current: "Neon Candy Monitor", component: "NeonCandyMonitor", futureSection: "3 · Outreach Runway", status: "keep visible" },
  { current: "Coverage Map (blueprint)", component: "CommandCentreCoverageMap", futureSection: "0 · Executive Control", status: "collapse later" },
];

const RISK_LABELS: Record<Risk, string> = {
  "read-only": "Read-only",
  "live-action": "Live action",
  "send-adjacent": "Send-adjacent",
  financial: "Financial",
  "compliance-sensitive": "Compliance-sensitive",
  "admin-security": "Admin/security",
  "external-integration": "External integration",
  "legacy-archive": "Legacy/archive",
};

const RISK_BADGE_CLASS: Record<Risk, string> = {
  "read-only": "bg-secondary text-secondary-foreground",
  "live-action": "bg-destructive/15 text-destructive",
  "send-adjacent": "bg-destructive/10 text-destructive",
  financial: "bg-yellow-500/15 text-yellow-500",
  "compliance-sensitive": "bg-yellow-500/10 text-yellow-500",
  "admin-security": "bg-primary/15 text-primary",
  "external-integration": "bg-primary/10 text-primary",
  "legacy-archive": "bg-muted text-muted-foreground",
};

function guardLabelFor(risk: Risk): string | null {
  if (risk === "live-action" || risk === "send-adjacent") return "Guard required";
  if (risk === "financial") return "Founder review required";
  if (risk === "compliance-sensitive") return "Compliance review required";
  if (risk === "admin-security") return "Admin only";
  return null;
}

function guardRequired(risk: Risk): boolean {
  return guardLabelFor(risk) !== null;
}

/* Audit: every discovered founder route must be represented (or aliased/legacy). */
export function runAudit() {
  const represented = new Set(REGISTRY.map((r) => r.path).filter((p) => p.length > 0));
  const missing: string[] = [];
  for (const p of DISCOVERED_FOUNDER_ROUTES) {
    if (!represented.has(p)) missing.push(p);
  }
  // Dynamic founder routes must be represented as `dynamic`
  const dynamicMissing: string[] = [];
  for (const p of DISCOVERED_DYNAMIC_FOUNDER_ROUTES) {
    const item = REGISTRY.find((r) => r.path === p);
    if (!item || item.status !== "dynamic") dynamicMissing.push(p);
  }
  // Broken = path declared in registry but not in router (only check /founder/*)
  const allRouterPaths = new Set<string>([
    ...DISCOVERED_FOUNDER_ROUTES,
    ...DISCOVERED_DYNAMIC_FOUNDER_ROUTES,
  ]);
  const broken: string[] = [];
  for (const r of REGISTRY) {
    if (!r.path) continue;
    if (r.path.startsWith("/founder") && !allRouterPaths.has(r.path)) broken.push(`${r.name} → ${r.path}`);
  }
  // Confusing duplicates (same path appearing in 3+ different sections)
  const counts = new Map<string, Set<string>>();
  for (const r of REGISTRY) {
    if (!r.path) continue;
    if (!counts.has(r.path)) counts.set(r.path, new Set());
    counts.get(r.path)!.add(r.section);
  }
  const duplicates: string[] = [];
  counts.forEach((sections, path) => {
    if (sections.size >= 3) duplicates.push(`${path} appears in ${sections.size} sections`);
  });
  // Canonical command-centre rule
  const canonicalViolations: string[] = [];
  for (const r of REGISTRY) {
    if (r.path === "/founder/command-center" && r.status !== "alias") {
      canonicalViolations.push("/founder/command-center must be marked alias");
    }
  }
  const noRouteItems = REGISTRY.filter((r) => !r.path);
  const noRouteLabelled = noRouteItems.filter(
    (r) => r.status === "no-dedicated-ui" || r.status === "nearest-route-only",
  );
  const dynamicItems = REGISTRY.filter((r) => r.status === "dynamic");
  const aliases = REGISTRY.filter((r) => r.status === "alias");
  const legacy = REGISTRY.filter((r) => r.status === "legacy");
  const guarded = REGISTRY.filter((r) => guardRequired(r.risk));

  const passed =
    missing.length === 0 &&
    broken.length === 0 &&
    canonicalViolations.length === 0 &&
    dynamicMissing.length === 0 &&
    noRouteItems.length === noRouteLabelled.length;

  return {
    discovered: DISCOVERED_FOUNDER_ROUTES.length,
    discoveredDynamic: DISCOVERED_DYNAMIC_FOUNDER_ROUTES.length,
    represented: REGISTRY.filter((r) => r.path && r.path.startsWith("/founder")).length,
    missing,
    dynamicMissing,
    dynamicItems,
    broken,
    duplicates,
    canonicalViolations,
    noRouteItems,
    noRouteLabelled,
    aliases,
    legacy,
    guarded,
    passed,
  };
}

/* Lightweight runtime assertion (dev visibility only). */
if (typeof window !== "undefined" && !(window as any).__liftorMasterIndexAudited) {
  (window as any).__liftorMasterIndexAudited = true;
  const a = runAudit();
  // eslint-disable-next-line no-console
  console.info(
    `[CommandCentreMasterIndex] discovered=${a.discovered} represented=${a.represented} missing=${a.missing.length} broken=${a.broken.length} no-route=${a.noRouteItems.length} guarded=${a.guarded.length} → ${a.passed ? "AUDIT PASSED" : "AUDIT FAILED"}`,
  );
  if (a.missing.length) console.warn("[CommandCentreMasterIndex] missing routes:", a.missing);
  if (a.broken.length) console.warn("[CommandCentreMasterIndex] broken links:", a.broken);
}

function ItemRow({ item }: { item: RegistryItem }) {
  const guard = guardLabelFor(item.risk);
  const isLink = !!item.path;
  const href = item.path || item.nearest || "";
  const Wrapper: any = href ? Link : "div";
  const wrapperProps = href ? { to: href } : {};
  return (
    <Wrapper
      {...wrapperProps}
      className={`flex flex-col gap-1 rounded-md border border-border/40 bg-secondary/30 p-2.5 text-xs transition-colors ${href ? "hover:bg-secondary/60" : "opacity-80"}`}
    >
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="font-medium text-foreground">{item.name}</span>
        {!isLink && (
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">No dedicated UI yet</span>
        )}
        {!isLink && item.nearest && (
          <span className="text-[10px] uppercase tracking-wide text-primary">→ Nearest control page</span>
        )}
        {item.status === "alias" && <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Alias</span>}
        {item.status === "legacy" && <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Legacy</span>}
        {href && <ExternalLink size={11} className="text-muted-foreground" />}
      </div>
      <div className="flex items-center gap-1.5 flex-wrap">
        <Badge variant="secondary" className={`text-[10px] ${RISK_BADGE_CLASS[item.risk]}`}>{RISK_LABELS[item.risk]}</Badge>
        {guard && (
          <span className="inline-flex items-center gap-1 text-[10px] text-yellow-500">
            <ShieldAlert size={10} /> {guard}
          </span>
        )}
        <span className="ml-auto text-[10px] text-muted-foreground font-mono truncate max-w-[55%]">
          {item.path || (item.nearest ? `≈ ${item.nearest}` : "—")}
        </span>
      </div>
      {item.notes && <p className="text-[10px] text-muted-foreground">{item.notes}</p>}
    </Wrapper>
  );
}

function SectionBlock({ id, title }: { id: string; title: string }) {
  const items = REGISTRY.filter((r) => r.section === id);
  const [open, setOpen] = useState(id === "0" || id === "1" || id === "3");
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-lg border border-border/50 bg-card/50">
      <CollapsibleTrigger className="w-full flex items-center justify-between p-3 hover:bg-secondary/30">
        <div className="flex items-center gap-2">
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <span className="text-sm font-semibold">{title}</span>
          <Badge variant="secondary" className="text-[10px]">{items.length}</Badge>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 p-3 pt-0">
          {items.map((it, i) => <ItemRow key={`${id}-${i}-${it.name}`} item={it} />)}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export default function CommandCentreMasterIndex() {
  const [open, setOpen] = useState(false);
  const audit = useMemo(runAudit, []);
  const totalItems = REGISTRY.length;
  const directRoute = REGISTRY.filter((r) => r.path && r.status === "valid").length;
  const noRoute = audit.noRouteItems.length;
  const guarded = audit.guarded.length;
  const legacy = audit.legacy.length + audit.aliases.length;

  return (
    <Card className="bg-card border-border/50">
      <CardHeader>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <MapIcon size={18} className="text-primary" />
              Liftor System Map / Master Index
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Read-only navigation map of every major Liftor function. No live data is changed here.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className={audit.passed ? "bg-green-500/15 text-green-500" : "bg-destructive/15 text-destructive"}>
              {audit.passed ? <CheckCircle2 size={12} className="mr-1" /> : <AlertTriangle size={12} className="mr-1" />}
              {audit.passed ? "Link audit passed" : "Link audit failed — review required"}
            </Badge>
            <button
              onClick={() => setOpen((v) => !v)}
              className="text-xs px-3 py-1.5 rounded bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {open ? "Hide System Map" : "Open System Map"}
            </button>
          </div>
        </div>

        {/* Summary counters always visible */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 mt-3 text-[11px]">
          <Stat label="Total routes (sitemap)" value={145} hint="coverage map snapshot" />
          <Stat label="Founder routes (router)" value={audit.discovered} />
          <Stat label="Sections" value={SECTIONS.length} />
          <Stat label="Index items" value={totalItems} />
          <Stat label="Direct route" value={directRoute} />
          <Stat label="No dedicated UI" value={noRoute} />
          <Stat label="Guarded items" value={guarded} />
          <Stat label="Legacy / alias" value={legacy} />
          <Stat label="Modules (manual)" value={49} hint="coverage map snapshot" />
          <Stat label="Agents (canonical)" value={REGISTRY.filter((r) => r.section === "2").length} />
          <Stat label="Workflows (manual)" value={10} hint="coverage map snapshot" />
          <Stat label="Integrations" value={REGISTRY.filter((r) => r.section === "10").length} />
        </div>
      </CardHeader>

      {open && (
        <CardContent className="space-y-3">
          {SECTIONS.map((s) => <SectionBlock key={s.id} id={s.id} title={s.title} />)}

          {/* Before-refactor snapshot */}
          <Collapsible className="rounded-lg border border-border/50 bg-card/50">
            <CollapsibleTrigger className="w-full flex items-center gap-2 p-3 hover:bg-secondary/30">
              <Layers size={14} />
              <span className="text-sm font-semibold">Before Refactor Snapshot</span>
              <Badge variant="secondary" className="text-[10px]">{BEFORE_SNAPSHOT.length}</Badge>
              <span className="ml-auto text-[10px] text-muted-foreground">No section may be marked delete.</span>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="overflow-x-auto p-3 pt-0">
                <table className="w-full text-[11px]">
                  <thead className="text-muted-foreground">
                    <tr className="text-left">
                      <th className="py-1 pr-2">Current section</th>
                      <th className="py-1 pr-2">Component</th>
                      <th className="py-1 pr-2">Future destination</th>
                      <th className="py-1 pr-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {BEFORE_SNAPSHOT.map((row, i) => (
                      <tr key={i} className="border-t border-border/30">
                        <td className="py-1 pr-2">{row.current}</td>
                        <td className="py-1 pr-2 font-mono text-muted-foreground">{row.component}</td>
                        <td className="py-1 pr-2">{row.futureSection}</td>
                        <td className="py-1 pr-2">
                          <Badge variant="secondary" className="text-[10px]">{row.status}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Link Coverage Audit */}
          <Collapsible defaultOpen className="rounded-lg border border-border/50 bg-card/50">
            <CollapsibleTrigger className="w-full flex items-center gap-2 p-3 hover:bg-secondary/30">
              <Lock size={14} />
              <span className="text-sm font-semibold">Link Coverage Audit</span>
              <Badge variant="secondary" className={audit.passed ? "bg-green-500/15 text-green-500" : "bg-destructive/15 text-destructive"}>
                {audit.passed ? "PASSED" : "FAILED"}
              </Badge>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="p-3 pt-0 space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                  <Stat label="Routes discovered" value={audit.discovered} />
                  <Stat label="Represented" value={audit.represented} />
                  <Stat label="Missing" value={audit.missing.length} />
                  <Stat label="Broken" value={audit.broken.length} />
                  <Stat label="Confusing duplicates" value={audit.duplicates.length} />
                  <Stat label="Aliases" value={audit.aliases.length} />
                  <Stat label="Legacy/archive" value={audit.legacy.length} />
                  <Stat label="No-route concepts" value={audit.noRouteItems.length} />
                  <Stat label="No-route correctly labelled" value={audit.noRouteLabelled.length} />
                  <Stat label="Guarded live-action / send-adjacent" value={REGISTRY.filter((r) => r.risk === "live-action" || r.risk === "send-adjacent").length} />
                  <Stat label="Canonical violations" value={audit.canonicalViolations.length} />
                </div>

                {!audit.passed && (
                  <div className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-[11px] text-destructive">
                    {audit.missing.length > 0 && <p>Missing: {audit.missing.join(", ")}</p>}
                    {audit.broken.length > 0 && <p>Broken: {audit.broken.join(", ")}</p>}
                    {audit.canonicalViolations.length > 0 && <p>Canonical: {audit.canonicalViolations.join(", ")}</p>}
                  </div>
                )}

                <div className="overflow-x-auto max-h-[420px] overflow-y-auto border border-border/30 rounded-md">
                  <table className="w-full text-[11px]">
                    <thead className="bg-secondary/40 sticky top-0">
                      <tr className="text-left">
                        <th className="py-1.5 px-2">Item</th>
                        <th className="py-1.5 px-2">Path</th>
                        <th className="py-1.5 px-2">Source</th>
                        <th className="py-1.5 px-2">Section</th>
                        <th className="py-1.5 px-2">Represented</th>
                        <th className="py-1.5 px-2">Status</th>
                        <th className="py-1.5 px-2">Risk</th>
                        <th className="py-1.5 px-2">Guard</th>
                      </tr>
                    </thead>
                    <tbody>
                      {REGISTRY.map((r, i) => (
                        <tr key={i} className="border-t border-border/30">
                          <td className="py-1 px-2">{r.name}</td>
                          <td className="py-1 px-2 font-mono text-muted-foreground">{r.path || (r.nearest ? `≈ ${r.nearest}` : "—")}</td>
                          <td className="py-1 px-2 text-muted-foreground">{r.source}</td>
                          <td className="py-1 px-2">{r.section}</td>
                          <td className="py-1 px-2">{r.path ? "yes" : (r.nearest ? "nearest" : "no")}</td>
                          <td className="py-1 px-2">{r.status}</td>
                          <td className="py-1 px-2">{RISK_LABELS[r.risk]}</td>
                          <td className="py-1 px-2">{guardRequired(r.risk) ? "yes" : "no"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <p className="text-[10px] text-muted-foreground">
                  Discovered routes are extracted from <code>src/App.tsx</code>; coverage map snapshot values
                  reflect the prior inventory. Detail routes (e.g. <code>/founder/projects/:id</code>) are
                  represented via their parent list page in this index.
                </p>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      )}
    </Card>
  );
}

function Stat({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <div className="rounded-md border border-border/40 bg-secondary/30 p-2">
      <p className="text-base font-semibold leading-none">{value}</p>
      <p className="text-[10px] text-muted-foreground mt-1">{label}</p>
      {hint && <p className="text-[9px] text-muted-foreground/70 italic">{hint}</p>}
    </div>
  );
}