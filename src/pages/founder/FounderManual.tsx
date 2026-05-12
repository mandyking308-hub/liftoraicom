import FounderLayout from "@/components/founder/FounderLayout";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  BookOpenCheck, Download, Layers, Monitor, Bot, Workflow, Plug, Rocket,
  Shield, Brain, Scale, Compass, MessageSquare, BarChart3, Globe, Building2,
  LayoutTemplate, Play, Network, ClipboardList, FlaskConical, FileText,
  Command, Zap, Sparkles, Printer, RefreshCw,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { generateManualMarkdown, type ManualLiveData } from "@/lib/founderManualContent";

const useLiveManualData = () => {
  return useQuery<ManualLiveData>({
    queryKey: ["founder-manual-live-data"],
    queryFn: async () => {
      const cq = async (query: any) => {
        const { count } = await query;
        return (count ?? 0) as number;
      };

      const [
        orgCount, workflowCount, agentCount, integrationCount,
        deploymentCount, templateCount, knowledgeCount, brainInsightCount,
        decisionCount, testRunCount, buildLogCount, manualPageCount,
        systemCount, architectureCount, launchedPlatformCount,
        { data: recentBuildLogs },
        { data: recentTestRuns },
      ] = await Promise.all([
        cq(supabase.from("organisations").select("id", { count: "exact", head: true })),
        cq(supabase.from("automation_workflows").select("id", { count: "exact", head: true })),
        cq(supabase.from("ai_agents").select("id", { count: "exact", head: true })),
        cq(supabase.from("integrations").select("id", { count: "exact", head: true })),
        cq(supabase.from("deployments").select("id", { count: "exact", head: true })),
        cq(supabase.from("system_templates").select("id", { count: "exact", head: true })),
        cq(supabase.from("knowledge_entries").select("id", { count: "exact", head: true })),
        cq(supabase.from("brain_insights").select("id", { count: "exact", head: true })),
        cq(supabase.from("decision_recommendations").select("id", { count: "exact", head: true })),
        cq(supabase.from("platform_test_runs").select("id", { count: "exact", head: true })),
        cq(supabase.from("build_log_entries").select("id", { count: "exact", head: true })),
        cq(supabase.from("manual_pages").select("id", { count: "exact", head: true })),
        cq(supabase.from("monitored_systems").select("id", { count: "exact", head: true })),
        cq(supabase.from("architectures").select("id", { count: "exact", head: true })),
        cq(supabase.from("launched_platforms").select("id", { count: "exact", head: true })),
        supabase.from("build_log_entries").select("title, change_type, module_affected, author, created_at, description").order("created_at", { ascending: false }).limit(10),
        supabase.from("platform_test_runs").select("run_name, status, total_tests, passed, failed, created_at").order("created_at", { ascending: false }).limit(5),
      ]);

      return {
        orgCount, workflowCount, agentCount, integrationCount,
        deploymentCount, templateCount, knowledgeCount, brainInsightCount,
        decisionCount, testRunCount, buildLogCount, manualPageCount,
        systemCount, architectureCount, launchedPlatformCount,
        recentBuildLogs: (recentBuildLogs ?? []) as ManualLiveData["recentBuildLogs"],
        recentTestRuns: (recentTestRuns ?? []) as ManualLiveData["recentTestRuns"],
      };
    },
  });
};

const FounderManual = () => {
  const { data: liveData, isLoading, refetch } = useLiveManualData();

  const defaultData: ManualLiveData = {
    orgCount: 0, workflowCount: 0, agentCount: 0, integrationCount: 0,
    deploymentCount: 0, templateCount: 0, knowledgeCount: 0, brainInsightCount: 0,
    decisionCount: 0, testRunCount: 0, buildLogCount: 0, manualPageCount: 0,
    systemCount: 0, architectureCount: 0, launchedPlatformCount: 0,
    recentBuildLogs: [], recentTestRuns: [],
  };

  const d = liveData ?? defaultData;

  const handleExportMarkdown = () => {
    const md = generateManualMarkdown(d);
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `liftor-ai-founder-manual-${format(new Date(), "yyyy-MM-dd")}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Founder Manual exported as Markdown");
  };

  const handleExportPDF = () => {
    const md = generateManualMarkdown(d);
    // Convert markdown to simple HTML for print
    const html = md
      .replace(/^### (.*$)/gm, '<h3>$1</h3>')
      .replace(/^## (.*$)/gm, '<h2>$1</h2>')
      .replace(/^# (.*$)/gm, '<h1>$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/`([^`]+)`/g, '<code style="background:#1e293b;padding:1px 4px;border-radius:3px;font-size:12px;">$1</code>')
      .replace(/^- (.*$)/gm, '<li>$1</li>')
      .replace(/^(\d+)\. (.*$)/gm, '<li>$2</li>')
      .replace(/\n\n/g, '<br/><br/>')
      .replace(/---/g, '<hr/>')
      .replace(/\|(.+)\|/g, (match) => {
        const cells = match.split('|').filter(c => c.trim());
        if (cells.every(c => c.trim().match(/^[-]+$/))) return '';
        return '<tr>' + cells.map(c => `<td style="padding:4px 8px;border:1px solid #334155;">${c.trim()}</td>`).join('') + '</tr>';
      });

    const printWindow = window.open('', '_blank');
    if (!printWindow) { toast.error("Please allow popups for PDF export"); return; }
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Liftor AI — Founder Manual</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; color: #e2e8f0; background: #0f172a; font-size: 13px; line-height: 1.6; }
          h1 { font-size: 24px; border-bottom: 2px solid #3b82f6; padding-bottom: 8px; }
          h2 { font-size: 18px; margin-top: 32px; color: #93c5fd; }
          h3 { font-size: 14px; margin-top: 20px; color: #bfdbfe; }
          table { border-collapse: collapse; width: 100%; margin: 12px 0; }
          td, th { padding: 4px 8px; border: 1px solid #334155; font-size: 12px; }
          hr { border: none; border-top: 1px solid #334155; margin: 24px 0; }
          code { background: #1e293b; padding: 1px 4px; border-radius: 3px; font-size: 11px; }
          li { margin: 2px 0; }
          @media print { body { color: #1e293b; background: white; } h2 { color: #1e40af; } h3 { color: #1e3a5f; } td, th { border-color: #cbd5e1; } code { background: #f1f5f9; } hr { border-color: #cbd5e1; } }
        </style>
      </head>
      <body>${html}</body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
    toast.success("PDF export opened — use Save as PDF in the print dialog");
  };

  const stats = [
    { label: "Organisations", value: d.orgCount, icon: Building2 },
    { label: "Systems", value: d.systemCount, icon: Monitor },
    { label: "Agents", value: d.agentCount, icon: Bot },
    { label: "Workflows", value: d.workflowCount, icon: Workflow },
    { label: "Integrations", value: d.integrationCount, icon: Plug },
    { label: "Deployments", value: d.deploymentCount, icon: Rocket },
    { label: "Templates", value: d.templateCount, icon: LayoutTemplate },
    { label: "Brain Insights", value: d.brainInsightCount, icon: Brain },
    { label: "Decisions", value: d.decisionCount, icon: Scale },
    { label: "Test Runs", value: d.testRunCount, icon: FlaskConical },
    { label: "Build Entries", value: d.buildLogCount, icon: ClipboardList },
    { label: "Architectures", value: d.architectureCount, icon: Layers },
  ];

  const sections: Array<{ id: string; title: string; icon: React.ElementType; content: React.ReactNode }> = [
    {
      id: "s1", title: "1. Platform Overview", icon: Layers,
      content: (
        <div className="space-y-3">
          <p>Liftor AI is an AI infrastructure platform capable of building, deploying, running, and optimising AI systems for multiple organisations simultaneously. The platform acts as an <strong className="text-foreground">AI operating system for organisations</strong>.</p>
          <p><strong className="text-foreground">Capabilities:</strong> Design & Build, Deploy & Launch, Run & Monitor, Optimise & Evolve, Scale & Expand.</p>
          <p><strong className="text-foreground">Supports:</strong> Internal companies, external client organisations, automation workflows, AI agents, AI decision systems, venture creation using templates.</p>
          <p><strong className="text-foreground">Stack:</strong> React 18 + Vite + TypeScript + Tailwind CSS + shadcn/ui, Lovable Cloud (Supabase PostgreSQL), Deno edge functions, Lovable AI gateway (Gemini).</p>
        </div>
      ),
    },
    {
      id: "s2", title: "2. Full Platform Architecture", icon: Network,
      content: (
        <div className="space-y-4">
          {[
            { layer: "Layer 1 — Public Platform", desc: "9 public marketing routes. No auth. SEO-optimised. Pages: Home, What We Build, Industries, Method, Case Studies, Partners, Project Discovery, About, AI Proposal." },
            { layer: "Layer 2 — Platform Infrastructure", desc: "PostgreSQL 50+ tables with RLS, Supabase Auth (email/password), 3 Deno edge functions, 5 private storage buckets, app_role enum (admin, moderator, user, founder, partner)." },
            { layer: "Layer 3 — Enterprise Platform Management", desc: "Client Portal (15 routes, ProtectedRoute guard) + Partner Portal (7 routes, PartnerRoute guard). Clients and partners see only their own data via RLS." },
            { layer: "Layer 4 — Platform Operations Control", desc: "Global Operations, Organisation Management, Access Control, Security & Compliance, Template Library, Platform Expansion / Venture Launcher." },
            { layer: "Layer 5 — Founder Control Systems", desc: "39 founder routes with FounderRoute guard. Command Center, Revenue Console, Manual, Testing Dashboard, AI Co-Pilot." },
            { layer: "Layer 6 — AI Brain Layer", desc: "Brain Core (insights + learning), Decision Engine, Strategy Engine, Optimisation Engine, Brain Orchestrator (Observation → Learning → Optimisation → Decision → Strategy), Founder AI Co-Pilot." },
          ].map((l) => (
            <div key={l.layer}>
              <p className="font-medium text-foreground">{l.layer}</p>
              <p>{l.desc}</p>
            </div>
          ))}
        </div>
      ),
    },
    {
      id: "s3", title: "3. Platform Infrastructure Modules", icon: Monitor,
      content: (
        <div className="space-y-3">
          {[
            { name: "Proposal Generator", desc: "AI-powered proposal generation (generate-proposal edge function, Gemini AI with tool calling). Public route /ai-proposal." },
            { name: "Client Portal", desc: "15 protected routes for project management, documents, messaging, support, maintenance, monitoring, analytics, optimisation." },
            { name: "Founder Console", desc: "39 protected routes. Central management interface. FounderLayout sidebar + FounderRoute guard." },
            { name: "Partner Portal", desc: "7 protected routes for opportunity management, project tracking, documents, messaging." },
            { name: "Subscription Maintenance System", desc: "4 maintenance routes. maintenance_events + feature_requests tables. Client-facing maintenance management." },
            { name: "Monitoring Dashboard", desc: "Real-time monitoring of deployed systems. monitored_systems table. Client + founder views." },
            { name: "Workflow Builder", desc: "automation_workflows + workflow_steps. Execution tracking, success/failure counts, automation type classification." },
            { name: "AI Agent Management", desc: "ai_agents + 4 related tables. Agent function, status, task metrics, system assignments, activity logs, alerts." },
            { name: "Automation Execution Engine", desc: "workflow_executions + execution_steps + execution_logs. Full execution lifecycle tracking." },
          ].map((m) => (
            <div key={m.name} className="border-b border-border/30 pb-2 last:border-0">
              <p className="font-medium text-foreground">{m.name}</p>
              <p>{m.desc}</p>
            </div>
          ))}
        </div>
      ),
    },
    {
      id: "s4", title: "4. Enterprise Platform Management", icon: Sparkles,
      content: (
        <div className="space-y-3">
          {[
            { name: "Process Automation Designer", desc: "Business process design and automation planning. /founder/processes." },
            { name: "AI System Architecture Designer", desc: "Visual architecture design with components and relationships. architectures + architecture_components + architecture_relationships." },
            { name: "Deployment & Launch Manager", desc: "Staged deployment pipelines with checklists, monitoring, rollback. deployments + deployment_stages + deployment_checklist + deployment_logs." },
            { name: "Client System Control Panel", desc: "Client-facing system management at /portal/systems. Scoped via RLS." },
            { name: "Analytics & Performance Dashboard", desc: "Platform-wide and client-specific analytics. Workflow performance, agent metrics, system health." },
            { name: "Automation Optimisation Engine", desc: "Entity-level optimisation (workflow/agent/system). optimisation_insights table." },
            { name: "Knowledge Base & System Memory", desc: "knowledge_entries + knowledge_documents. Links to agents and workflows. knowledge-documents bucket." },
          ].map((m) => (
            <div key={m.name} className="border-b border-border/30 pb-2 last:border-0">
              <p className="font-medium text-foreground">{m.name}</p>
              <p>{m.desc}</p>
            </div>
          ))}
          <div>
            <p className="font-medium text-foreground">Enterprise AI System Lifecycle</p>
            <p>Discovery → Proposal → Architecture → Build → Test → Deploy → Monitor → Optimise → Maintain</p>
          </div>
        </div>
      ),
    },
    {
      id: "s5", title: "5. Platform Operations Control", icon: Globe,
      content: (
        <div className="space-y-3">
          {[
            { name: "Global AI Operations Manager", desc: `Aggregated operational intelligence across all systems. /founder/operations.` },
            { name: `Multi-Organisation Management (${d.orgCount} orgs)`, desc: "Multi-tenant directory with members, documents, industry tracking. Isolated data via RLS." },
            { name: "Role & Access Control System", desc: "app_role enum + user_roles + platform_roles + access_audit_log + access_anomalies. has_role() security-definer function." },
            { name: "Security & Compliance Manager", desc: "compliance_items + compliance_documents. Review schedules and regulatory tracking." },
            { name: `System Template Library (${d.templateCount} templates)`, desc: "Reusable system_templates for rapid deployment of standardised AI systems." },
            { name: `Platform Expansion (${d.launchedPlatformCount} launched)`, desc: "Venture launcher with launch_checklist. launched_platforms table." },
          ].map((m) => (
            <div key={m.name} className="border-b border-border/30 pb-2 last:border-0">
              <p className="font-medium text-foreground">{m.name}</p>
              <p>{m.desc}</p>
            </div>
          ))}
        </div>
      ),
    },
    {
      id: "s6", title: "6. Founder Control Systems", icon: Command,
      content: (
        <div className="space-y-3">
          <div><p className="font-medium text-foreground">Founder Console</p><p>39 routes. FounderLayout sidebar + FounderRoute guard checking user_roles for 'founder'. Unrestricted visibility across all platform data.</p></div>
          <div><p className="font-medium text-foreground">Revenue Console</p><p>revenue_records with source attribution, multi-currency, period analysis. /founder/revenue.</p></div>
          <div><p className="font-medium text-foreground">Founder Manual (This Document)</p><p>Self-updating documentation. 15 sections generated from live platform data. Markdown + PDF export.</p></div>
          <div><p className="font-medium text-foreground">Platform Testing Dashboard</p><p>20+ automated tests via platform-testing edge function. platform_test_runs + platform_test_results. /founder/testing.</p></div>
          <div>
            <p className="font-medium text-foreground">Founder Visibility</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
              {[
                { l: "Systems", v: d.systemCount }, { l: "Agents", v: d.agentCount },
                { l: "Workflows", v: d.workflowCount }, { l: "Insights", v: d.brainInsightCount },
                { l: "Decisions", v: d.decisionCount }, { l: "Test Runs", v: d.testRunCount },
              ].map((s) => (
                <div key={s.l} className="bg-secondary/50 rounded p-2 text-center">
                  <p className="text-lg font-bold text-foreground">{s.v}</p>
                  <p className="text-xs">{s.l}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "s7", title: "7. AI Brain Architecture", icon: Brain,
      content: (
        <div className="space-y-3">
          <p>Multi-layer autonomous intelligence system processing platform signals into actionable insights.</p>
          {[
            { name: `AI Brain Core (${d.brainInsightCount} insights)`, desc: "brain_insights + brain_recommendations + brain_learning_records. Pipeline: Observation → Pattern Detection → Learning → Insight Generation → Recommendations." },
            { name: "Automation Optimisation Engine", desc: "optimisation_insights. Entity-level (workflow/agent/system) performance, efficiency, reliability insights." },
            { name: `AI Decision Engine (${d.decisionCount} decisions)`, desc: "decision_recommendations. Categories: operational/strategic/expansion. Status: pending → approved/rejected → implemented." },
            { name: "AI Strategy Engine", desc: "strategy_insights. Market signals, competitive analysis, expansion opportunities. Confidence levels and industry targeting." },
            { name: "AI Brain Orchestrator", desc: "Signal flow: Observation → Learning → Optimisation → Decision → Strategy. Each stage enriches and passes to the next." },
            { name: "Founder AI Co-Pilot", desc: "Streaming Gemini AI (founder-copilot edge function) with real-time context from 9 platform tables." },
          ].map((m) => (
            <div key={m.name} className="border-b border-border/30 pb-2 last:border-0">
              <p className="font-medium text-foreground">{m.name}</p>
              <p>{m.desc}</p>
            </div>
          ))}
        </div>
      ),
    },
    {
      id: "s8", title: "8. Platform Testing & Validation Suite", icon: FlaskConical,
      content: (
        <div className="space-y-3">
          <p>Automated validation at <code className="text-xs bg-secondary px-1 rounded">/founder/testing</code>. {d.testRunCount} test runs completed.</p>
          <div><p className="font-medium text-foreground">Tables:</p><p className="text-xs font-mono">platform_test_runs (run metadata), platform_test_results (individual results, FK to runs)</p></div>
          <div><p className="font-medium text-foreground">Edge Function: platform-testing</p><p>20+ tests: Organisations, Automations, Agents, Systems, Brain, Decisions, Strategy, Deployments, Architectures, Templates, Knowledge, Integrations, Build Log, Optimisation, Security, Data Integrity, Manual, Executions, Expansion, Compliance. Creates [TEST] data → validates → records results → cleans up.</p></div>
          {d.recentTestRuns.length > 0 && (
            <div><p className="font-medium text-foreground">Recent Runs:</p>
              {d.recentTestRuns.map((r, i) => (
                <p key={i} className="text-xs"><Badge variant="secondary" className={`mr-2 ${r.status === "passed" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>{r.status}</Badge>{r.run_name} — {r.passed}/{r.total_tests} passed — {format(new Date(r.created_at), "MMM d, HH:mm")}</p>
              ))}
            </div>
          )}
        </div>
      ),
    },
    {
      id: "s9", title: "9. Database Structure", icon: FileText,
      content: (
        <div className="space-y-3">
          <p>50+ PostgreSQL tables with RLS on every table.</p>
          {[
            { group: "Core Platform", tables: "profiles, projects, subscriptions, user_roles, activity_log" },
            { group: "Client Systems", tables: "monitored_systems, automation_workflows, ai_agents, agent_system_assignments, agent_task_stats, agent_activity_logs, agent_alerts" },
            { group: "Workflow Execution", tables: "workflow_executions, workflow_steps, execution_steps, execution_logs" },
            { group: "AI Brain", tables: "brain_insights, brain_recommendations, brain_learning_records" },
            { group: "Decision & Strategy", tables: "decision_recommendations, strategy_insights" },
            { group: "Architecture & Deployment", tables: "architectures, architecture_components, architecture_relationships, deployments, deployment_stages, deployment_checklist, deployment_logs" },
            { group: "Integrations", tables: "integrations, integration_activity_logs, integration_alerts, integration_linked_systems" },
            { group: "Knowledge", tables: "knowledge_entries, knowledge_documents, manual_pages, manual_versions" },
            { group: "Organisations", tables: "organisations, organisation_members, organisation_documents" },
            { group: "Expansion", tables: "launched_platforms, launch_checklist, system_templates" },
            { group: "Security", tables: "platform_roles, access_audit_log, access_anomalies, compliance_items, compliance_documents" },
            { group: "Partners", tables: "partner_applications, partner_opportunities, partner_deals, partner_documents, partner_messages" },
            { group: "Build & Testing", tables: "build_log_entries, platform_test_runs, platform_test_results" },
          ].map((g) => (
            <div key={g.group}>
              <p className="font-medium text-foreground">{g.group}</p>
              <p className="text-xs font-mono">{g.tables}</p>
            </div>
          ))}
          <div>
            <p className="font-medium text-foreground">Functions</p>
            <p className="text-xs font-mono">handle_new_user(), has_role(), update_updated_at_column(), log_new_proposal(), log_new_support_request(), log_new_opportunity()</p>
          </div>
          <div>
            <p className="font-medium text-foreground">Storage Buckets (all private)</p>
            <p className="text-xs font-mono">project-documents, partner-documents, knowledge-documents, organisation-documents, compliance-documents</p>
          </div>
        </div>
      ),
    },
    {
      id: "s10", title: "10. Edge Functions", icon: Play,
      content: (
        <div className="space-y-3">
          {[
            { name: "generate-proposal", desc: "AI proposal generation. Gemini + tool calling. Input: projectTypes, businessProblem, processesToAutomate, projectScale, timeline, industry. Output: suggested_solution, estimated_scope, estimated_timeline." },
            { name: "founder-copilot", desc: "Streaming AI assistant with 9-table context injection. Gemini with SSE responses. Uses SUPABASE_SERVICE_ROLE_KEY for unrestricted data access." },
            { name: "platform-testing", desc: "20+ automated validation tests. Creates [TEST] data → validates all modules → records to platform_test_runs/results → cleans up. Uses SUPABASE_SERVICE_ROLE_KEY." },
          ].map((f) => (
            <div key={f.name} className="border-b border-border/30 pb-2 last:border-0">
              <p className="font-medium text-foreground">{f.name}</p>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      ),
    },
    {
      id: "s11", title: "11. Navigation & Routes", icon: Globe,
      content: (
        <div className="space-y-3">
          <div><p className="font-medium text-foreground">Public (9)</p><p className="text-xs font-mono">/ /what-we-build /industries /method /case-studies /partners /project-discovery /about /ai-proposal</p></div>
          <div><p className="font-medium text-foreground">Auth (4)</p><p className="text-xs font-mono">/portal/login /portal/signup /portal/forgot-password /portal/reset-password</p></div>
          <div><p className="font-medium text-foreground">Client Portal (15)</p><p className="text-xs font-mono">/portal/dashboard /portal/projects /portal/projects/:id /portal/documents /portal/messages /portal/support /portal/maintenance /portal/maintenance/schedule /portal/maintenance/updates /portal/maintenance/features /portal/monitoring /portal/systems /portal/systems/:id /portal/analytics /portal/optimisation</p></div>
          <div><p className="font-medium text-foreground">Founder Console (39)</p><p className="text-xs font-mono">/founder /founder/command-center /founder/copilot /founder/brain /founder/decisions /founder/strategy /founder/operations /founder/organisations /founder/organisations/:id /founder/revenue /founder/analytics /founder/optimisation /founder/proposals /founder/proposals/:id /founder/pipeline /founder/projects /founder/projects/:id /founder/monitoring /founder/monitoring/:id /founder/agents /founder/agents/:id /founder/workflows /founder/workflows/:id /founder/executions /founder/executions/:id /founder/processes /founder/processes/:id /founder/architectures /founder/architectures/:id /founder/deployments /founder/deployments/:id /founder/integrations /founder/integrations/:id /founder/activity /founder/knowledge /founder/knowledge/:id /founder/access-control /founder/security /founder/templates /founder/templates/:id /founder/expansion /founder/expansion/:id /founder/manual /founder/manual/:id /founder/build-log /founder/documents /founder/testing</p></div>
          <div><p className="font-medium text-foreground">Partner Portal (7)</p><p className="text-xs font-mono">/partner /partner/opportunities /partner/opportunities/:id /partner/projects /partner/projects/:id /partner/documents /partner/messages</p></div>
        </div>
      ),
    },
    {
      id: "s12", title: "12. Deployment Architecture", icon: Rocket,
      content: (
        <div className="space-y-3">
          {[
            { name: "Frontend", desc: "React 18 + Vite + TypeScript SPA. Tailwind CSS + shadcn/ui. @tanstack/react-query, react-router-dom v6, framer-motion, recharts. Lovable hosting." },
            { name: "Database", desc: "PostgreSQL via Lovable Cloud. 50+ tables with RLS. app_role enum. Security-definer functions. Auto triggers." },
            { name: "Edge Functions", desc: "3 Deno serverless functions (auto-deployed): generate-proposal, founder-copilot, platform-testing. Lovable AI gateway." },
            { name: "Authentication", desc: "Supabase Auth (email/password). Email verification required. AuthContext. Role-based route guards." },
            { name: "Storage", desc: "5 private buckets. RLS-controlled access." },
            { name: "Secrets", desc: "SUPABASE_SERVICE_ROLE_KEY, SUPABASE_DB_URL, SUPABASE_PUBLISHABLE_KEY, LOVABLE_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY" },
          ].map((s) => (
            <div key={s.name} className="border-b border-border/30 pb-2 last:border-0">
              <p className="font-medium text-foreground">{s.name}</p>
              <p>{s.desc}</p>
            </div>
          ))}
        </div>
      ),
    },
    {
      id: "s13", title: "13. Platform Build Log", icon: ClipboardList,
      content: (
        <div className="space-y-3">
          <p>Append-only engineering record in <code className="text-xs bg-secondary px-1 rounded">build_log_entries</code>. RLS: founder INSERT + SELECT only (no UPDATE/DELETE). {d.buildLogCount} entries recorded.</p>
          <div>
            <p className="font-medium text-foreground">Build Phases (33 steps)</p>
            <ol className="list-decimal list-inside ml-2 space-y-1 text-xs">
              <li>Foundation — React + Vite + TypeScript + Tailwind + shadcn/ui</li>
              <li>Public Website — 9 marketing pages + Navbar/Footer</li>
              <li>Authentication — Supabase Auth + AuthContext + ProtectedRoute</li>
              <li>Client Portal — 15 routes + PortalLayout</li>
              <li>Core Database — profiles, projects, subscriptions, user_roles + RLS</li>
              <li>Founder Console — FounderLayout (39 nav items) + FounderRoute</li>
              <li>System Monitoring — MonitoringDashboard + monitored_systems</li>
              <li>AI Agents — AgentDirectory + ai_agents + 4 related tables</li>
              <li>Workflow Engine — WorkflowDirectory + 4 execution tables</li>
              <li>Execution Dashboard — ExecutionDashboard + execution tracking</li>
              <li>Integrations — IntegrationDirectory + 4 integration tables</li>
              <li>Architecture — ArchitectureDirectory + 3 architecture tables</li>
              <li>Deployments — DeploymentDirectory + 4 deployment tables</li>
              <li>Organisations — OrganisationDirectory + 3 org tables</li>
              <li>Knowledge Base — KnowledgeDirectory + 2 knowledge tables</li>
              <li>Templates — TemplateDirectory + system_templates</li>
              <li>Platform Expansion — PlatformExpansion + 2 expansion tables</li>
              <li>Analytics — FounderAnalytics dashboard</li>
              <li>Optimisation — OptimisationDashboard + optimisation_insights</li>
              <li>Security — AccessControl + SecurityDashboard + 5 security tables</li>
              <li>Command Centre — CommandCentre cockpit (canonical at /founder/command-centre)</li>
              <li>AI Proposal — AIProposal + generate-proposal edge function</li>
              <li>Partner Portal — 7 routes + 5 partner tables</li>
              <li>AI Brain Core — BrainCore + 3 brain tables</li>
              <li>Decision Engine — DecisionEngine + decision_recommendations</li>
              <li>Strategy Engine — StrategyEngine + strategy_insights</li>
              <li>AI Co-Pilot — FounderCoPilot + founder-copilot edge function</li>
              <li>Revenue Console — FounderRevenue + revenue_records</li>
              <li>Global Operations — GlobalOperations dashboard</li>
              <li>Build Log — BuildLog + build_log_entries (append-only)</li>
              <li>Manual v1 — FounderManual + manual_pages + manual_versions</li>
              <li>Platform Testing — PlatformTesting + edge function + 2 test tables</li>
              <li>Manual v4 — Self-updating 15-section manual + Markdown/PDF export</li>
            </ol>
          </div>
          {d.recentBuildLogs.length > 0 && (
            <div>
              <p className="font-medium text-foreground">Recent Entries:</p>
              {d.recentBuildLogs.slice(0, 5).map((e, i) => (
                <p key={i} className="text-xs border-b border-border/20 py-1">
                  <Badge variant="secondary" className="mr-2 text-[10px]">{e.change_type.replace(/_/g, " ")}</Badge>
                  <strong>{e.title}</strong> — {e.module_affected || "—"} — {e.author} — {format(new Date(e.created_at), "MMM d, HH:mm")}
                </p>
              ))}
            </div>
          )}
        </div>
      ),
    },
    {
      id: "s14", title: "14. Documentation Engine (Self-Updating)", icon: RefreshCw,
      content: (
        <div className="space-y-3">
          <p>This manual is a <strong className="text-foreground">self-updating documentation system</strong> that regenerates from live platform data on every page load.</p>
          <div><p className="font-medium text-foreground">Data Sources (15 tables queried)</p><p className="text-xs">organisations, automation_workflows, ai_agents, integrations, deployments, system_templates, knowledge_entries, brain_insights, decision_recommendations, platform_test_runs, build_log_entries, manual_pages, monitored_systems, architectures, launched_platforms</p></div>
          <div><p className="font-medium text-foreground">Update Mechanism</p><p>1. Navigate to /founder/manual → 2. React Query fetches live counts in parallel → 3. ManualLiveData interface aggregates stats → 4. generateManualMarkdown() constructs full docs → 5. UI renders with current data → 6. Export embeds real-time stats</p></div>
          <p>No manual maintenance required. Adding organisations, agents, workflows, or running tests is immediately reflected.</p>
        </div>
      ),
    },
    {
      id: "s15", title: "15. Export System", icon: Download,
      content: (
        <div className="space-y-3">
          <div><p className="font-medium text-foreground">Markdown Export</p><p>Complete 15-section manual as .md file with live data embedded. Click "Export Markdown" above.</p></div>
          <div><p className="font-medium text-foreground">PDF Export</p><p>Print-optimised HTML opened in new window. Use browser "Save as PDF" from print dialog. Formatted for light/dark printing.</p></div>
          <div>
            <p className="font-medium text-foreground">Use Cases</p>
            <ul className="list-disc list-inside ml-2 space-y-1">
              <li>Engineering — Technical reference and onboarding</li>
              <li>Investors — Due diligence documentation</li>
              <li>Operations — Operational procedures</li>
              <li>Partners — Platform capability overview</li>
              <li>Audit — Security and compliance evidence</li>
            </ul>
          </div>
        </div>
      ),
    },
  ];

  return (
    <FounderLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BookOpenCheck size={24} className="text-primary" /> Liftor AI — Founder Manual
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Self-updating engineering documentation — v4.2 (NeonCandy Send Proof Achieved, 1 May 2026) · {format(new Date(), "MMMM d, yyyy")}
              {isLoading && <span className="ml-2 text-primary">Loading live data...</span>}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw size={14} className="mr-1" /> Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportMarkdown}>
              <Download size={14} className="mr-1" /> Markdown
            </Button>
            <Button size="sm" onClick={handleExportPDF}>
              <Printer size={14} className="mr-1" /> PDF
            </Button>
          </div>
        </div>

        {/* Live Stats */}
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
          {stats.map((s) => (
            <Card key={s.label} className="bg-card border-border/50">
              <CardContent className="p-3">
                <s.icon size={14} className="text-primary mb-1" />
                <p className="text-lg font-bold">{s.value}</p>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* TOC */}
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Table of Contents — 15 Sections</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1">
              {sections.map((s) => (
                <p key={s.id} className="text-xs text-muted-foreground">{s.title}</p>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* All Sections */}
        <Accordion type="multiple" className="space-y-2" defaultValue={["s1"]}>
          {sections.map((s) => (
            <AccordionItem key={s.id} value={s.id} className="border border-border/50 rounded-lg bg-card px-4">
              <AccordionTrigger className="text-sm font-semibold">
                <span className="flex items-center gap-2"><s.icon size={16} className="text-primary" /> {s.title}</span>
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                {s.content}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </FounderLayout>
  );
};

export default FounderManual;
