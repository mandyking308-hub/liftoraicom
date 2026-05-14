import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ListChecks, AlertTriangle, ShieldAlert, Layers, Map as MapIcon } from "lucide-react";

/**
 * Command Centre Coverage Map — Draft (read-only, diagnostic).
 *
 * This component is a TEMPORARY blueprint surface. It does NOT mutate any data,
 * does NOT call any edge function, and does NOT touch outreach / Apollo / SMTP.
 *
 * Source of inventory:
 *  - Routes: derived statically from src/App.tsx founder/portal/partner/supplier routes.
 *  - System totals: from Liftor Full System Manual v539 + system_pages_index counts.
 *  - AI agents / workflows / integrations: live tables ai_agents/automation_workflows/
 *    integrations are currently empty (0 rows) — canonical inventory comes from
 *    system_workflows_full / system_integrations_full / agent components in the codebase.
 *
 * No layout refactor of /founder/command-centre is performed by this file.
 */

type Visibility =
  | "visible"
  | "partial"
  | "hidden"
  | "missing"
  | "legacy"
  | "duplicated";

type Risk =
  | "safe-read"
  | "live-action"
  | "send-adjacent"
  | "financial"
  | "compliance"
  | "admin";

type Display =
  | "summary-card"
  | "process-stage"
  | "agent-card"
  | "status-strip"
  | "accordion"
  | "diagnostics-drawer"
  | "route-link"
  | "legacy";

type Item = {
  name: string;
  type: "route" | "module" | "agent" | "workflow" | "integration" | "rule" | "data-flow";
  source: "route-file" | "manual" | "db-table" | "component";
  route?: string;
  visibility: Visibility;
  recommendedSection: string;
  recommendedDisplay: Display;
  risk: Risk;
  guard: boolean;
  notes?: string;
};

// ---------------- MODULES ----------------
const MODULES: Item[] = [
  { name: "Outreach Dashboard", type: "module", source: "route-file", route: "/founder/outreach", visibility: "partial", recommendedSection: "3 Business Workflow Runway", recommendedDisplay: "summary-card", risk: "send-adjacent", guard: true },
  { name: "Outreach Queue", type: "module", source: "route-file", route: "/founder/outreach/queue", visibility: "partial", recommendedSection: "3 Business Workflow Runway", recommendedDisplay: "accordion", risk: "send-adjacent", guard: true },
  { name: "Queue Audit (read-only brake)", type: "module", source: "route-file", route: "/founder/outreach/queue-audit", visibility: "visible", recommendedSection: "1 Safety / Brake / System Mode", recommendedDisplay: "diagnostics-drawer", risk: "send-adjacent", guard: true },
  { name: "Controlled Send Preview", type: "module", source: "route-file", route: "/founder/outreach/send-preview", visibility: "partial", recommendedSection: "3 Business Workflow Runway", recommendedDisplay: "diagnostics-drawer", risk: "send-adjacent", guard: true, notes: "Preview only — manual send apply not built." },
  { name: "Outreach Imports", type: "module", source: "route-file", route: "/founder/outreach/imports", visibility: "hidden", recommendedSection: "3 Business Workflow Runway", recommendedDisplay: "route-link", risk: "live-action", guard: false },
  { name: "Outreach Campaigns", type: "module", source: "route-file", route: "/founder/outreach/campaigns", visibility: "hidden", recommendedSection: "3 Business Workflow Runway", recommendedDisplay: "route-link", risk: "send-adjacent", guard: true },
  { name: "Campaign Live Monitor", type: "module", source: "route-file", route: "/founder/outreach/live-monitor", visibility: "hidden", recommendedSection: "11 Monitoring / Security / System Health", recommendedDisplay: "route-link", risk: "safe-read", guard: false },
  { name: "Apollo Integration", type: "module", source: "route-file", route: "/founder/outreach/apollo", visibility: "partial", recommendedSection: "10 Integrations / External Systems", recommendedDisplay: "route-link", risk: "financial", guard: true, notes: "Apollo credit spend gate required." },
  { name: "Engagement Tracking", type: "module", source: "route-file", route: "/founder/outreach/engagement", visibility: "hidden", recommendedSection: "11 Monitoring / Security / System Health", recommendedDisplay: "route-link", risk: "safe-read", guard: false },
  { name: "Sending Health", type: "module", source: "route-file", route: "/founder/sending", visibility: "hidden", recommendedSection: "1 Safety / Brake / System Mode", recommendedDisplay: "status-strip", risk: "safe-read", guard: false },
  { name: "CRM Dashboard", type: "module", source: "route-file", route: "/founder/crm", visibility: "partial", recommendedSection: "4 CRM / Contacts / Inboxes", recommendedDisplay: "summary-card", risk: "safe-read", guard: false },
  { name: "CRM Contacts", type: "module", source: "route-file", route: "/founder/crm/contacts", visibility: "hidden", recommendedSection: "4 CRM / Contacts / Inboxes", recommendedDisplay: "route-link", risk: "compliance", guard: true },
  { name: "CRM Inboxes", type: "module", source: "route-file", route: "/founder/crm/inboxes", visibility: "partial", recommendedSection: "4 CRM / Contacts / Inboxes", recommendedDisplay: "route-link", risk: "live-action", guard: true },
  { name: "Compliance Dashboard", type: "module", source: "route-file", route: "/founder/compliance", visibility: "hidden", recommendedSection: "5 Compliance / Legal / Rules", recommendedDisplay: "summary-card", risk: "compliance", guard: true },
  { name: "Compliance Events", type: "module", source: "route-file", route: "/founder/compliance/events", visibility: "hidden", recommendedSection: "5 Compliance / Legal / Rules", recommendedDisplay: "route-link", risk: "compliance", guard: true },
  { name: "Compliance Rules", type: "module", source: "route-file", route: "/founder/compliance/rules", visibility: "hidden", recommendedSection: "5 Compliance / Legal / Rules", recommendedDisplay: "route-link", risk: "compliance", guard: true },
  { name: "Legal Console", type: "module", source: "route-file", route: "/founder/legal", visibility: "hidden", recommendedSection: "5 Compliance / Legal / Rules", recommendedDisplay: "route-link", risk: "compliance", guard: true },
  { name: "Conversations", type: "module", source: "route-file", route: "/founder/conversations", visibility: "partial", recommendedSection: "6 Conversations / AI Drafts / Replies", recommendedDisplay: "accordion", risk: "live-action", guard: true },
  { name: "Internal Proposals", type: "module", source: "route-file", route: "/founder/internal-proposals", visibility: "partial", recommendedSection: "7 Proposals / Demos / Client Journey", recommendedDisplay: "accordion", risk: "live-action", guard: true },
  { name: "Proposals (external)", type: "module", source: "route-file", route: "/founder/proposals", visibility: "hidden", recommendedSection: "7 Proposals / Demos / Client Journey", recommendedDisplay: "route-link", risk: "live-action", guard: true },
  { name: "Demos", type: "module", source: "route-file", route: "/founder/demos", visibility: "hidden", recommendedSection: "7 Proposals / Demos / Client Journey", recommendedDisplay: "route-link", risk: "live-action", guard: true },
  { name: "Lead Pipeline", type: "module", source: "route-file", route: "/founder/pipeline", visibility: "hidden", recommendedSection: "8 Deals / Finance / Revenue", recommendedDisplay: "summary-card", risk: "safe-read", guard: false },
  { name: "Finance Dashboard", type: "module", source: "route-file", route: "/founder/finance", visibility: "hidden", recommendedSection: "8 Deals / Finance / Revenue", recommendedDisplay: "summary-card", risk: "financial", guard: true },
  { name: "Finance Targets", type: "module", source: "route-file", route: "/founder/finance/targets", visibility: "hidden", recommendedSection: "8 Deals / Finance / Revenue", recommendedDisplay: "route-link", risk: "financial", guard: true },
  { name: "Finance Deals", type: "module", source: "route-file", route: "/founder/finance/deals", visibility: "hidden", recommendedSection: "8 Deals / Finance / Revenue", recommendedDisplay: "route-link", risk: "financial", guard: true },
  { name: "Finance Invoices", type: "module", source: "route-file", route: "/founder/finance/invoices", visibility: "hidden", recommendedSection: "8 Deals / Finance / Revenue", recommendedDisplay: "route-link", risk: "financial", guard: true },
  { name: "Finance Payments", type: "module", source: "route-file", route: "/founder/finance/payments", visibility: "hidden", recommendedSection: "8 Deals / Finance / Revenue", recommendedDisplay: "route-link", risk: "financial", guard: true },
  { name: "Suppliers", type: "module", source: "route-file", route: "/founder/suppliers", visibility: "hidden", recommendedSection: "9 Suppliers / Assignments / Delivery", recommendedDisplay: "summary-card", risk: "live-action", guard: true },
  { name: "Assignments", type: "module", source: "route-file", route: "/founder/assignments", visibility: "hidden", recommendedSection: "9 Suppliers / Assignments / Delivery", recommendedDisplay: "summary-card", risk: "live-action", guard: true },
  { name: "Priority Engine", type: "module", source: "route-file", route: "/founder/priority", visibility: "hidden", recommendedSection: "11 Monitoring / Security / System Health", recommendedDisplay: "status-strip", risk: "safe-read", guard: false },
  { name: "Monitoring", type: "module", source: "route-file", route: "/founder/monitoring", visibility: "hidden", recommendedSection: "11 Monitoring / Security / System Health", recommendedDisplay: "summary-card", risk: "safe-read", guard: false },
  { name: "System Oversight", type: "module", source: "route-file", route: "/founder/system", visibility: "partial", recommendedSection: "11 Monitoring / Security / System Health", recommendedDisplay: "summary-card", risk: "safe-read", guard: false },
  { name: "System Events", type: "module", source: "route-file", route: "/founder/system/events", visibility: "partial", recommendedSection: "11 Monitoring / Security / System Health", recommendedDisplay: "route-link", risk: "safe-read", guard: false },
  { name: "System Health", type: "module", source: "route-file", route: "/founder/system/health", visibility: "hidden", recommendedSection: "11 Monitoring / Security / System Health", recommendedDisplay: "route-link", risk: "safe-read", guard: false },
  { name: "Execution Modes", type: "module", source: "route-file", route: "/founder/system/modes", visibility: "hidden", recommendedSection: "1 Safety / Brake / System Mode", recommendedDisplay: "status-strip", risk: "admin", guard: true },
  { name: "Access Control", type: "module", source: "route-file", route: "/founder/access-control", visibility: "hidden", recommendedSection: "11 Monitoring / Security / System Health", recommendedDisplay: "route-link", risk: "admin", guard: true },
  { name: "Security", type: "module", source: "route-file", route: "/founder/security", visibility: "hidden", recommendedSection: "11 Monitoring / Security / System Health", recommendedDisplay: "route-link", risk: "admin", guard: true },
  { name: "Knowledge", type: "module", source: "route-file", route: "/founder/knowledge", visibility: "hidden", recommendedSection: "12 Knowledge / Manual / Build Log", recommendedDisplay: "route-link", risk: "safe-read", guard: false },
  { name: "Documents", type: "module", source: "route-file", route: "/founder/documents", visibility: "hidden", recommendedSection: "12 Knowledge / Manual / Build Log", recommendedDisplay: "route-link", risk: "safe-read", guard: false },
  { name: "Operations", type: "module", source: "route-file", route: "/founder/operations", visibility: "hidden", recommendedSection: "0 Executive Control Strip", recommendedDisplay: "summary-card", risk: "safe-read", guard: false },
  { name: "Organisations", type: "module", source: "route-file", route: "/founder/organisations", visibility: "hidden", recommendedSection: "4 CRM / Contacts / Inboxes", recommendedDisplay: "route-link", risk: "safe-read", guard: false },
  { name: "Templates", type: "module", source: "route-file", route: "/founder/templates", visibility: "hidden", recommendedSection: "12 Knowledge / Manual / Build Log", recommendedDisplay: "route-link", risk: "safe-read", guard: false },
  { name: "Expansion", type: "module", source: "route-file", route: "/founder/expansion", visibility: "hidden", recommendedSection: "12 Knowledge / Manual / Build Log", recommendedDisplay: "route-link", risk: "safe-read", guard: false },
  { name: "Manual", type: "module", source: "route-file", route: "/founder/manual", visibility: "hidden", recommendedSection: "12 Knowledge / Manual / Build Log", recommendedDisplay: "route-link", risk: "safe-read", guard: false },
  { name: "System Mirror (full)", type: "module", source: "route-file", route: "/founder/manual/full", visibility: "hidden", recommendedSection: "12 Knowledge / Manual / Build Log", recommendedDisplay: "route-link", risk: "safe-read", guard: false },
  { name: "Build Log", type: "module", source: "route-file", route: "/founder/build-log", visibility: "hidden", recommendedSection: "12 Knowledge / Manual / Build Log", recommendedDisplay: "route-link", risk: "safe-read", guard: false },
  { name: "Brain / Decisions / Strategy", type: "module", source: "route-file", route: "/founder/brain", visibility: "hidden", recommendedSection: "2 AI Agent Control Room", recommendedDisplay: "summary-card", risk: "safe-read", guard: false },
  { name: "Co-Pilot", type: "module", source: "route-file", route: "/founder/copilot", visibility: "hidden", recommendedSection: "2 AI Agent Control Room", recommendedDisplay: "route-link", risk: "live-action", guard: true },
  { name: "Platform Testing", type: "module", source: "route-file", route: "/founder/testing", visibility: "hidden", recommendedSection: "13 Legacy / Historical / Archive", recommendedDisplay: "route-link", risk: "safe-read", guard: false },
  { name: "Legacy Command Center", type: "route", source: "route-file", route: "/founder/command-center/legacy", visibility: "legacy", recommendedSection: "13 Legacy / Historical / Archive", recommendedDisplay: "legacy", risk: "safe-read", guard: false, notes: "Untouched by refactor." },
];

const AGENTS: Item[] = [
  { name: "Lead Quality Autopilot", type: "agent", source: "component", route: "/founder/agents", visibility: "partial", recommendedSection: "2 AI Agent Control Room", recommendedDisplay: "agent-card", risk: "live-action", guard: true },
  { name: "Apollo Daily Runner", type: "agent", source: "component", route: "/founder/outreach/apollo", visibility: "partial", recommendedSection: "2 AI Agent Control Room", recommendedDisplay: "agent-card", risk: "financial", guard: true },
  { name: "Autopilot Orchestrator", type: "agent", source: "component", route: "/founder/agents", visibility: "partial", recommendedSection: "2 AI Agent Control Room", recommendedDisplay: "agent-card", risk: "send-adjacent", guard: true },
  { name: "Outreach Send Worker", type: "agent", source: "component", visibility: "hidden", recommendedSection: "1 Safety / Brake / System Mode", recommendedDisplay: "status-strip", risk: "send-adjacent", guard: true, notes: "Brake confirmed: auto_send_enabled=false." },
  { name: "Inbound Poller / Webhook", type: "agent", source: "component", visibility: "hidden", recommendedSection: "6 Conversations / AI Drafts / Replies", recommendedDisplay: "agent-card", risk: "live-action", guard: false },
  { name: "AI Conversation Engine", type: "agent", source: "component", route: "/founder/conversations", visibility: "partial", recommendedSection: "6 Conversations / AI Drafts / Replies", recommendedDisplay: "agent-card", risk: "live-action", guard: true },
  { name: "Compliance Approver", type: "agent", source: "component", route: "/founder/compliance", visibility: "hidden", recommendedSection: "5 Compliance / Legal / Rules", recommendedDisplay: "agent-card", risk: "compliance", guard: true },
  { name: "Finance Chase Overdue", type: "agent", source: "component", route: "/founder/finance", visibility: "hidden", recommendedSection: "8 Deals / Finance / Revenue", recommendedDisplay: "agent-card", risk: "financial", guard: true },
  { name: "Platform Diagnostics", type: "agent", source: "component", route: "/founder/system/health", visibility: "hidden", recommendedSection: "11 Monitoring / Security / System Health", recommendedDisplay: "agent-card", risk: "safe-read", guard: false },
  { name: "Founder Co-Pilot", type: "agent", source: "component", route: "/founder/copilot", visibility: "hidden", recommendedSection: "2 AI Agent Control Room", recommendedDisplay: "agent-card", risk: "live-action", guard: true },
];

const WORKFLOWS: Item[] = [
  "lead_to_payment","reply_to_proposal","demo_to_deal","deal_to_invoice",
  "deal_to_assignment","assignment_to_completion","compliance_oversight",
  "priority_engine","oversight_recovery","proposal_to_demo",
].map((name) => ({
  name, type: "workflow", source: "manual", route: "/founder/workflows",
  visibility: "hidden",
  recommendedSection: "3 Business Workflow Runway",
  recommendedDisplay: "process-stage",
  risk: name.includes("compliance") ? "compliance" : name.includes("payment") || name.includes("invoice") ? "financial" : "live-action",
  guard: true,
}));

const INTEGRATIONS: Item[] = [
  { name: "SMTP outbound (Resend/provider)", type: "integration", source: "manual", route: "/founder/integrations", visibility: "hidden", recommendedSection: "10 Integrations / External Systems", recommendedDisplay: "summary-card", risk: "send-adjacent", guard: true },
  { name: "IMAP / inbound webhook", type: "integration", source: "manual", route: "/founder/integrations", visibility: "hidden", recommendedSection: "10 Integrations / External Systems", recommendedDisplay: "summary-card", risk: "live-action", guard: false },
  { name: "Apollo enrichment + reveal", type: "integration", source: "manual", route: "/founder/outreach/apollo", visibility: "partial", recommendedSection: "10 Integrations / External Systems", recommendedDisplay: "summary-card", risk: "financial", guard: true },
  { name: "Lovable AI Gateway", type: "integration", source: "manual", visibility: "hidden", recommendedSection: "10 Integrations / External Systems", recommendedDisplay: "summary-card", risk: "live-action", guard: false },
  { name: "Stripe / Payments (planned)", type: "integration", source: "manual", visibility: "hidden", recommendedSection: "10 Integrations / External Systems", recommendedDisplay: "summary-card", risk: "financial", guard: true },
  { name: "Tracking pixels (open/click)", type: "integration", source: "manual", visibility: "hidden", recommendedSection: "10 Integrations / External Systems", recommendedDisplay: "summary-card", risk: "compliance", guard: true, notes: "Tracking disclosure pending." },
];

const ALL: Item[] = [...MODULES, ...AGENTS, ...WORKFLOWS, ...INTEGRATIONS];

// ---------------- PROPOSED STRUCTURE ----------------
const STRUCTURE: { n: number; title: string; bullets: string[] }[] = [
  { n: 0, title: "Executive Control Strip", bullets: ["business selector","operating mode","provider state","safety state","warnings","approvals","next safe action"] },
  { n: 1, title: "Safety / Brake / System Mode", bullets: ["system mode TEST/LIVE","outreach brake","cron/send guard","compliance warnings","blocked live actions"] },
  { n: 2, title: "AI Agent Control Room", bullets: ["every AI agent","role","status","last action","alerts","click-through to /founder/agents","filter by business/system"] },
  { n: 3, title: "Business Workflow Runway", bullets: ["source candidates","quality/dedupe","reveal","post-reveal validation","promote","compliance","stage-to-queue","queue audit","queue creation","controlled send","replies","proposals","demos","deals","finance"] },
  { n: 4, title: "CRM / Contacts / Inboxes", bullets: ["contacts","BCRs","inboxes","sending domains","identities","suppression/bounce state"] },
  { n: 5, title: "Compliance / Legal / Rules", bullets: ["compliance dashboard","compliance events","compliance rules","legal documents","GDPR/outreach state"] },
  { n: 6, title: "Conversations / AI Drafts / Replies", bullets: ["inbound messages","conversations","AI reply drafts","urgent approvals","warm lead signals"] },
  { n: 7, title: "Proposals / Demos / Client Journey", bullets: ["proposal requests","internal proposals","demo access","demo engagement","client portal links"] },
  { n: 8, title: "Deals / Finance / Revenue", bullets: ["pipeline","deals","invoices","payments","revenue targets","overdue chasers"] },
  { n: 9, title: "Suppliers / Assignments / Delivery", bullets: ["supplier directory","assignments","SLA","supplier scoring","supplier portal"] },
  { n: 10, title: "Integrations / External Systems", bullets: ["Apollo","email provider","AI gateway","inbound/outbound mail","diagnostics","integration alerts"] },
  { n: 11, title: "Monitoring / Security / System Health", bullets: ["system events","system health","monitoring","access control","security","anomalies","retry queue"] },
  { n: 12, title: "Knowledge / Manual / Build Log", bullets: ["founder manual","full system mirror","build log","knowledge directory","documents"] },
  { n: 13, title: "Legacy / Historical / Archive", bullets: ["old Apollo runs","historical snapshots","legacy pools","duplicate candidates","old command-center legacy route","raw diagnostics"] },
];

// ---------------- HELPERS ----------------
const visBadge = (v: Visibility) => {
  const map: Record<Visibility, string> = {
    visible: "bg-green-500/15 text-green-300 border-green-500/30",
    partial: "bg-yellow-500/15 text-yellow-200 border-yellow-500/30",
    hidden: "bg-secondary/40 text-muted-foreground border-border/50",
    missing: "bg-destructive/15 text-destructive border-destructive/40",
    legacy: "bg-secondary/40 text-muted-foreground border-border/50",
    duplicated: "bg-orange-500/15 text-orange-300 border-orange-500/30",
  };
  return <Badge variant="outline" className={`${map[v]} text-[10px]`}>{v}</Badge>;
};

const riskBadge = (r: Risk) => {
  const tone =
    r === "safe-read" ? "text-green-300 border-green-500/30" :
    r === "live-action" ? "text-yellow-200 border-yellow-500/30" :
    r === "send-adjacent" ? "text-destructive border-destructive/40" :
    r === "financial" ? "text-orange-300 border-orange-500/30" :
    r === "compliance" ? "text-blue-300 border-blue-500/30" :
    "text-purple-300 border-purple-500/30";
  return <Badge variant="outline" className={`${tone} bg-transparent text-[10px]`}>{r}</Badge>;
};

const ItemTable = ({ items }: { items: Item[] }) => (
  <div className="overflow-x-auto">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="text-[11px]">Item</TableHead>
          <TableHead className="text-[11px]">Type</TableHead>
          <TableHead className="text-[11px]">Visibility</TableHead>
          <TableHead className="text-[11px]">Risk</TableHead>
          <TableHead className="text-[11px]">Guard</TableHead>
          <TableHead className="text-[11px]">Recommended placement</TableHead>
          <TableHead className="text-[11px]">Route</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((it) => (
          <TableRow key={`${it.type}-${it.name}`}>
            <TableCell className="text-xs">{it.name}{it.notes && <div className="text-[10px] text-muted-foreground mt-0.5">{it.notes}</div>}</TableCell>
            <TableCell className="text-[11px] text-muted-foreground">{it.type}</TableCell>
            <TableCell>{visBadge(it.visibility)}</TableCell>
            <TableCell>{riskBadge(it.risk)}</TableCell>
            <TableCell className="text-[11px]">{it.guard ? "yes" : "no"}</TableCell>
            <TableCell className="text-[11px] text-muted-foreground">{it.recommendedSection} · <span className="opacity-70">{it.recommendedDisplay}</span></TableCell>
            <TableCell className="text-[11px]">{it.route ? <Link to={it.route} className="text-primary hover:underline">{it.route}</Link> : <span className="text-muted-foreground">—</span>}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </div>
);

const CommandCentreCoverageMap = () => {
  const totalRoutes = 145;
  // Founder routes total = 67 non-dynamic + 20 dynamic (router truth from src/App.tsx).
  // Earlier coverage map reported 87 by counting both together; both numbers
  // describe the same router. The Master Index Link Coverage Audit is now the
  // authoritative source.
  const founderRoutes = 87;
  const founderNonDynamic = 67;
  const founderDynamic = 20;
  const visible = ALL.filter((i) => i.visibility === "visible").length;
  const partial = ALL.filter((i) => i.visibility === "partial").length;
  const hidden = ALL.filter((i) => i.visibility === "hidden").length;
  const missing = ALL.filter((i) => i.visibility === "missing").length;
  const legacy = ALL.filter((i) => i.visibility === "legacy").length;
  const duplicated = ALL.filter((i) => i.visibility === "duplicated").length;
  const guarded = ALL.filter((i) => i.guard).length;
  const noClickthrough = ALL.filter((i) => !i.route).length;
  const founderDecision = ALL.filter((i) => i.visibility === "hidden" || i.visibility === "missing").length;

  const missingItems = ALL.filter((i) => i.visibility === "hidden" || i.visibility === "missing");
  const partialItems = ALL.filter((i) => i.visibility === "partial");
  const dupOrLegacy = ALL.filter((i) => i.visibility === "duplicated" || i.visibility === "legacy");
  const liveAction = ALL.filter((i) => i.guard && (i.risk === "send-adjacent" || i.risk === "live-action" || i.risk === "financial" || i.risk === "compliance" || i.risk === "admin"));

  return (
    <Card className="bg-card border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <MapIcon size={16} className="text-primary" />
          Command Centre Coverage Map — Superseded baseline snapshot
          <Badge variant="outline" className="text-[10px] ml-2 bg-secondary/40 text-muted-foreground border-border/50">superseded · read-only</Badge>
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Frozen pre-Master-Index inventory snapshot retained as a historical baseline.
          Use the <Link to="#" className="text-primary underline">Master Index Link Coverage Audit</Link> above
          as the current source of truth for route counts and coverage. Numbers here are not refreshed.
        </p>
        <div className="mt-2 rounded-md border border-yellow-500/30 bg-yellow-500/5 p-2 text-[11px] text-yellow-100/90 space-y-0.5">
          <p><span className="font-medium text-yellow-200">Reconciliation:</span> 87 founder routes here = {founderNonDynamic} non-dynamic + {founderDynamic} dynamic founder paths in src/App.tsx. Both figures describe the same router.</p>
          <p>Dynamic routes (e.g. <code>/founder/proposals/:id</code>, <code>/proposals/view/:token</code>) are individually represented in the Master Index. Aliases (<code>/founder/command-center → /founder/command-centre</code>) and legacy (<code>/founder/command-center/legacy</code>) are tagged in Section 14.</p>
          <p>Portal, supplier, partner and public marketing routes are intentionally out-of-scope for the founder cockpit Master Index and are linked via "nearest-route-only" cards. <span className="font-medium">Excluded routes from Master Index: 0.</span></p>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Top stats */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
          {[
            ["Total routes", totalRoutes],
            ["Founder routes", founderRoutes],
            ["Modules", MODULES.length],
            ["AI agents", AGENTS.length],
            ["Workflows", WORKFLOWS.length],
            ["Integrations", INTEGRATIONS.length],
            ["Visible on CC", visible],
            ["Partial on CC", partial],
            ["Hidden / missing", hidden + missing],
            ["Duplicated / legacy", duplicated + legacy],
            ["Need guard", guarded],
            ["No click-through", noClickthrough],
          ].map(([label, value]) => (
            <div key={String(label)} className="p-2 rounded bg-secondary/40 border border-border/40">
              <p className="text-lg font-semibold">{value}</p>
              <p className="text-[10px] text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>

        {/* Manual / system mirror counts */}
        <div className="grid grid-cols-2 md:grid-cols-7 gap-2">
          {[
            ["Manual pages", 99],
            ["Backend objects", 473],
            ["System workflows", 10],
            ["System rules", 19],
            ["System integrations", 12],
            ["Data flows", 23],
            ["Founder decisions pending", founderDecision],
          ].map(([label, value]) => (
            <div key={String(label)} className="p-2 rounded bg-background/40 border border-border/40">
              <p className="text-base font-semibold">{value}</p>
              <p className="text-[10px] text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>

        {/* Refactor safety contract */}
        <div className="rounded-md border border-yellow-500/40 bg-yellow-500/5 p-3 text-xs text-yellow-100">
          <div className="flex items-start gap-2">
            <ShieldAlert size={14} className="text-yellow-300 mt-0.5" />
            <div>
              <p className="font-semibold mb-1">Refactor safety contract — before/after</p>
              <p>
                Before any Command Centre layout refactor, the system must capture a before-map of all currently
                visible sections and verify after refactor that every section is either: (1) still visible,
                (2) moved into a named section, (3) collapsed into a named accordion, (4) linked as a route card,
                or (5) explicitly marked legacy/archive. No current functionality may disappear silently.
              </p>
            </div>
          </div>
        </div>

        {/* Detail accordions */}
        <Accordion type="multiple" className="border border-border/50 rounded-md divide-y divide-border/40">
          <AccordionItem value="missing" className="px-3">
            <AccordionTrigger className="text-sm">
              <span className="flex items-center gap-2"><AlertTriangle size={14} className="text-yellow-300" /> Missing / hidden from Command Centre ({missingItems.length})</span>
            </AccordionTrigger>
            <AccordionContent><ItemTable items={missingItems} /></AccordionContent>
          </AccordionItem>
          <AccordionItem value="partial" className="px-3">
            <AccordionTrigger className="text-sm">Partially visible ({partialItems.length})</AccordionTrigger>
            <AccordionContent><ItemTable items={partialItems} /></AccordionContent>
          </AccordionItem>
          <AccordionItem value="dup" className="px-3">
            <AccordionTrigger className="text-sm">Duplicated / stale / legacy ({dupOrLegacy.length})</AccordionTrigger>
            <AccordionContent><ItemTable items={dupOrLegacy} /></AccordionContent>
          </AccordionItem>
          <AccordionItem value="guard" className="px-3">
            <AccordionTrigger className="text-sm">
              <span className="flex items-center gap-2"><ShieldAlert size={14} className="text-destructive" /> Live-action items requiring guards ({liveAction.length})</span>
            </AccordionTrigger>
            <AccordionContent><ItemTable items={liveAction} /></AccordionContent>
          </AccordionItem>
          <AccordionItem value="agents" className="px-3">
            <AccordionTrigger className="text-sm">AI Agents inventory ({AGENTS.length})</AccordionTrigger>
            <AccordionContent><ItemTable items={AGENTS} /></AccordionContent>
          </AccordionItem>
          <AccordionItem value="workflows" className="px-3">
            <AccordionTrigger className="text-sm">Workflows inventory ({WORKFLOWS.length})</AccordionTrigger>
            <AccordionContent><ItemTable items={WORKFLOWS} /></AccordionContent>
          </AccordionItem>
          <AccordionItem value="integrations" className="px-3">
            <AccordionTrigger className="text-sm">Integrations inventory ({INTEGRATIONS.length})</AccordionTrigger>
            <AccordionContent><ItemTable items={INTEGRATIONS} /></AccordionContent>
          </AccordionItem>
          <AccordionItem value="modules" className="px-3">
            <AccordionTrigger className="text-sm">All modules / routes ({MODULES.length})</AccordionTrigger>
            <AccordionContent><ItemTable items={MODULES} /></AccordionContent>
          </AccordionItem>
          <AccordionItem value="proposed" className="px-3">
            <AccordionTrigger className="text-sm">
              <span className="flex items-center gap-2"><Layers size={14} className="text-primary" /> Recommended final Command Centre structure (blueprint only — not applied)</span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2">
                {STRUCTURE.map((s) => (
                  <div key={s.n} className="rounded-md border border-border/50 bg-background/40 p-2">
                    <p className="text-xs font-semibold text-foreground">Section {s.n} — {s.title}</p>
                    <p className="text-[11px] text-muted-foreground mt-1">{s.bullets.join(" · ")}</p>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
          <ListChecks size={11} /> Inventory generated client-side from route file + manual mirror. ai_agents/automation_workflows/integrations live tables are currently empty (0 rows).
        </p>
      </CardContent>
    </Card>
  );
};

export default CommandCentreCoverageMap;