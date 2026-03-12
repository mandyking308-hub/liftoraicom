import FounderLayout from "@/components/founder/FounderLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { BookOpenCheck, Download, Layers, Monitor, Bot, Workflow, Plug, Rocket, Shield, Brain, Scale, Compass, MessageSquare, BarChart3, Globe, Building2, LayoutTemplate, Play, Network, ClipboardList, FlaskConical, FileText, Command, Zap } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { generateManualMarkdown } from "@/lib/founderManualContent";

const FounderManual = () => {
  const handleExport = () => {
    const md = generateManualMarkdown();
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `liftor-ai-founder-manual-${format(new Date(), "yyyy-MM-dd")}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Complete Founder Manual exported as Markdown");
  };

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
              Complete engineering-level platform documentation — v3.0 · {format(new Date(), "MMMM d, yyyy")}
            </p>
          </div>
          <Button onClick={handleExport}>
            <Download size={16} className="mr-2" /> Export Full Manual (.md)
          </Button>
        </div>

        {/* TOC */}
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Table of Contents</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              <li>Platform Overview</li>
              <li>Full Platform Architecture</li>
              <li>Platform Modules</li>
              <li>Database Structure</li>
              <li>Edge Functions</li>
              <li>Platform Testing & Validation Suite</li>
              <li>Platform Build Log</li>
              <li>Founder Control Systems</li>
              <li>AI Brain Architecture</li>
              <li>Navigation & Routes</li>
              <li>Deployment Architecture</li>
            </ol>
          </CardContent>
        </Card>

        {/* All Sections */}
        <Accordion type="multiple" className="space-y-2" defaultValue={["s1"]}>
          {/* 1. Platform Overview */}
          <AccordionItem value="s1" className="border border-border/50 rounded-lg bg-card px-4">
            <AccordionTrigger className="text-sm font-semibold">
              <span className="flex items-center gap-2"><Layers size={16} className="text-primary" /> 1. Platform Overview</span>
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground space-y-3">
              <p>Liftor AI is a full-stack AI engineering platform that designs, builds, deploys, and manages enterprise AI systems. The platform enables end-to-end lifecycle management of AI automation projects — from client proposal generation through to live system monitoring and optimisation.</p>
              <p><strong>Core Purpose:</strong> To operate as a productised AI studio with founder-level visibility over every system, agent, workflow, deployment, and client organisation managed by the platform.</p>
              <p><strong>Target Users:</strong></p>
              <ul className="list-disc list-inside ml-2 space-y-1">
                <li><strong>Public Visitors</strong> — Prospective clients browsing services</li>
                <li><strong>Clients</strong> — Organisations with active AI projects in delivery or maintenance</li>
                <li><strong>Partners</strong> — Referral/agency partners submitting opportunities</li>
                <li><strong>Founder</strong> — Full platform administrator with command-level access</li>
              </ul>
              <p><strong>Technology Stack:</strong> React + Vite + TypeScript + Tailwind CSS + shadcn/ui, Lovable Cloud (Supabase) for backend, Deno edge functions, Lovable AI gateway for AI capabilities.</p>
            </AccordionContent>
          </AccordionItem>

          {/* 2. Full Platform Architecture */}
          <AccordionItem value="s2" className="border border-border/50 rounded-lg bg-card px-4">
            <AccordionTrigger className="text-sm font-semibold">
              <span className="flex items-center gap-2"><Network size={16} className="text-primary" /> 2. Full Platform Architecture</span>
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground space-y-4">
              <div>
                <p className="font-medium text-foreground mb-1">Layer 1 — Public Platform</p>
                <p>Marketing website with 9 public routes: Home, What We Build, Industries, Method, Case Studies, Partners, Project Discovery, About, AI Proposal Generator. No authentication required. SEO-optimised with structured content.</p>
              </div>
              <div>
                <p className="font-medium text-foreground mb-1">Layer 2 — Client Portal (Authenticated)</p>
                <p>15 protected routes for clients: Dashboard, Projects, Project Detail, Documents, Messages, Support, Maintenance (Dashboard/Schedule/Updates/Features), System Monitoring, Control Panel, System Detail, Analytics, Optimisation. Protected via ProtectedRoute component. Clients see only their own data via RLS policies referencing profiles.user_id.</p>
              </div>
              <div>
                <p className="font-medium text-foreground mb-1">Layer 3 — Partner Portal (Authenticated)</p>
                <p>7 protected routes for partners: Dashboard, Opportunities, Opportunity Detail, Projects, Project Detail, Documents, Messages. Protected via PartnerRoute component with partner role check.</p>
              </div>
              <div>
                <p className="font-medium text-foreground mb-1">Layer 4 — Founder Console (Founder Role Only)</p>
                <p>39 protected routes for the founder covering every aspect of platform operations. Protected via FounderRoute component which checks user_roles table for 'founder' role. Includes: Command Center, AI Co-Pilot, AI Brain, Decisions, Strategy, Operations, Organisations, Overview, Revenue, Analytics, Optimisation, Proposals, Pipeline, Projects, Monitoring, Agents, Workflows, Executions, Processes, Architectures, Deployments, Integrations, Activity, Knowledge, Access Control, Security, Templates, Expansion, Manual, Build Log, Documents, Platform Testing.</p>
              </div>
              <div>
                <p className="font-medium text-foreground mb-1">Layer 5 — AI Brain Layer</p>
                <p>Autonomous intelligence layer comprising: Brain Core (insights + learning records), Decision Engine (recommendations), Strategy Engine (strategic insights), Automation Optimisation Engine, AI Brain Orchestrator (signal flow pipeline), Founder AI Co-Pilot (conversational interface to platform data).</p>
              </div>
              <div>
                <p className="font-medium text-foreground mb-1">Layer 6 — Platform Infrastructure</p>
                <p>Lovable Cloud (Supabase) provides: PostgreSQL database with 50+ tables, Row-Level Security on every table, Edge Functions for serverless compute, Storage buckets for document management, Authentication via Supabase Auth with email/password.</p>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* 3. Platform Modules */}
          <AccordionItem value="s3" className="border border-border/50 rounded-lg bg-card px-4">
            <AccordionTrigger className="text-sm font-semibold">
              <span className="flex items-center gap-2"><Monitor size={16} className="text-primary" /> 3. Platform Modules</span>
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground space-y-3">
              {[
                { name: "Command Center", desc: "Central operational hub showing real-time platform health: active systems, agents, workflows, recent activity, and quick actions.", route: "/founder/command-center" },
                { name: "AI Co-Pilot", desc: "Conversational AI assistant powered by Gemini via founder-copilot edge function. Queries real-time platform data (workflows, agents, systems, orgs, insights, revenue, templates) and provides strategic recommendations.", route: "/founder/copilot" },
                { name: "AI Brain Core", desc: "Central intelligence engine managing brain_insights, brain_recommendations, and brain_learning_records. Tracks performance patterns, anomalies, and platform learning.", route: "/founder/brain" },
                { name: "Decision Engine", desc: "Manages decision_recommendations with categories (operational, strategic, expansion), priorities, potential benefits/risks, and decision tracking.", route: "/founder/decisions" },
                { name: "Strategy Engine", desc: "Strategic intelligence module tracking market signals, industry opportunities, and platform expansion strategies via strategy_insights table.", route: "/founder/strategy" },
                { name: "Global Operations", desc: "High-level operations dashboard aggregating data from all systems, organisations, and deployments.", route: "/founder/operations" },
                { name: "Organisation Directory", desc: "Manages client organisations with industry classification, status tracking, member management, and document storage.", route: "/founder/organisations" },
                { name: "System Monitoring", desc: "Real-time monitoring of all deployed client systems (monitored_systems table) with status tracking and health indicators.", route: "/founder/monitoring" },
                { name: "AI Agent Directory", desc: "Registry of all AI agents deployed across client systems. Tracks agent function, status, task completion, pending tasks, and system assignments.", route: "/founder/agents" },
                { name: "Workflow Directory", desc: "Manages automation_workflows with execution tracking, success/failure counts, and automation type classification.", route: "/founder/workflows" },
                { name: "Execution Dashboard", desc: "Tracks workflow_executions and execution_steps with detailed logging via execution_logs table.", route: "/founder/executions" },
                { name: "Process Directory", desc: "Business process management and documentation.", route: "/founder/processes" },
                { name: "Architecture Directory", desc: "System architecture management with architecture_components and architecture_relationships for visual system design.", route: "/founder/architectures" },
                { name: "Deployment Manager", desc: "Manages system deployments with deployment_stages, deployment_checklist, and deployment_logs for staged rollouts.", route: "/founder/deployments" },
                { name: "Integration Directory", desc: "Manages external integrations (API keys, webhooks, AI models) with activity logging and alert monitoring.", route: "/founder/integrations" },
                { name: "Analytics Dashboard", desc: "Platform-wide analytics aggregating workflow performance, agent metrics, and system health data.", route: "/founder/analytics" },
                { name: "Optimisation Engine", desc: "Generates and tracks optimisation_insights with recommended actions, priorities, and entity-level targeting.", route: "/founder/optimisation" },
                { name: "Knowledge Base", desc: "Platform knowledge management with knowledge_entries and knowledge_documents. Links to agents and workflows.", route: "/founder/knowledge" },
                { name: "Template Library", desc: "Reusable system_templates for rapid deployment of standardised AI systems.", route: "/founder/templates" },
                { name: "Platform Expansion", desc: "Manages launched_platforms with launch_checklist for scaling the platform to new organisations and industries.", route: "/founder/expansion" },
                { name: "Revenue Console", desc: "Financial tracking via revenue_records with source attribution, currency support, and revenue trend analysis.", route: "/founder/revenue" },
                { name: "Proposal Management", desc: "Manages AI-generated project proposals with the generate-proposal edge function. Tracks proposal lifecycle.", route: "/founder/proposals" },
                { name: "Lead Pipeline", desc: "Sales pipeline management for tracking proposal-to-project conversion.", route: "/founder/pipeline" },
                { name: "Access Control", desc: "Platform role management via platform_roles table with access_audit_log and access_anomalies monitoring.", route: "/founder/access-control" },
                { name: "Security Dashboard", desc: "Security and compliance management via compliance_items and compliance_documents.", route: "/founder/security" },
                { name: "Build Log", desc: "Append-only engineering log via build_log_entries tracking every platform change with author, module, and change type.", route: "/founder/build-log" },
                { name: "Founder Manual", desc: "This document. Complete platform documentation with Markdown export.", route: "/founder/manual" },
                { name: "Platform Testing", desc: "Automated validation suite running 20+ tests across all modules via platform-testing edge function.", route: "/founder/testing" },
              ].map((m) => (
                <div key={m.name} className="border-b border-border/30 pb-2 last:border-0">
                  <p className="font-medium text-foreground">{m.name} <span className="text-xs text-muted-foreground ml-2">{m.route}</span></p>
                  <p>{m.desc}</p>
                </div>
              ))}
            </AccordionContent>
          </AccordionItem>

          {/* 4. Database Structure */}
          <AccordionItem value="s4" className="border border-border/50 rounded-lg bg-card px-4">
            <AccordionTrigger className="text-sm font-semibold">
              <span className="flex items-center gap-2"><FileText size={16} className="text-primary" /> 4. Database Structure</span>
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground space-y-3">
              <p>The platform uses 50+ PostgreSQL tables with Row-Level Security (RLS) on every table. Key tables grouped by domain:</p>
              {[
                { group: "Core Platform", tables: "profiles, projects, subscriptions, user_roles, activity_log" },
                { group: "Client Systems", tables: "monitored_systems, automation_workflows, ai_agents, agent_system_assignments, agent_task_stats, agent_activity_logs, agent_alerts" },
                { group: "Workflow Execution", tables: "workflow_executions, workflow_steps, execution_steps, execution_logs" },
                { group: "AI Brain", tables: "brain_insights, brain_recommendations, brain_learning_records" },
                { group: "Decision & Strategy", tables: "decision_recommendations, strategy_insights" },
                { group: "Architecture & Deployment", tables: "architectures, architecture_components, architecture_relationships, deployments, deployment_stages, deployment_checklist, deployment_logs" },
                { group: "Integrations", tables: "integrations, integration_activity_logs, integration_alerts, integration_linked_systems" },
                { group: "Knowledge & Documentation", tables: "knowledge_entries, knowledge_documents, manual_pages, manual_versions" },
                { group: "Organisations", tables: "organisations, organisation_members, organisation_documents" },
                { group: "Expansion", tables: "launched_platforms, launch_checklist, system_templates" },
                { group: "Security & Compliance", tables: "platform_roles, access_audit_log, access_anomalies, compliance_items, compliance_documents" },
                { group: "Partners", tables: "partner_applications, partner_opportunities, partner_deals, partner_documents, partner_messages" },
                { group: "Revenue", tables: "revenue_records" },
                { group: "Optimisation", tables: "optimisation_insights" },
                { group: "Build & Testing", tables: "build_log_entries, platform_test_runs, platform_test_results" },
                { group: "Client Portal", tables: "feature_requests, maintenance_events, support_tickets, messages, documents" },
              ].map((g) => (
                <div key={g.group}>
                  <p className="font-medium text-foreground">{g.group}</p>
                  <p className="text-xs font-mono">{g.tables}</p>
                </div>
              ))}
              <div className="mt-2">
                <p className="font-medium text-foreground">RLS Policy Pattern</p>
                <p>Every table has founder-level ALL access via <code className="text-xs bg-secondary px-1 rounded">has_role(auth.uid(), 'founder')</code>. Client-facing tables additionally have SELECT policies scoped to the user's profile/subscription/organisation. A security-definer function <code className="text-xs bg-secondary px-1 rounded">has_role(_user_id, _role)</code> prevents recursive RLS checks.</p>
              </div>
              <div>
                <p className="font-medium text-foreground">Key Database Functions</p>
                <ul className="list-disc list-inside ml-2 space-y-1">
                  <li><code className="text-xs bg-secondary px-1 rounded">handle_new_user()</code> — Trigger on auth.users insert, creates profiles row</li>
                  <li><code className="text-xs bg-secondary px-1 rounded">has_role(_user_id, _role)</code> — Security definer role check</li>
                  <li><code className="text-xs bg-secondary px-1 rounded">update_updated_at_column()</code> — Auto-updates updated_at timestamps</li>
                  <li><code className="text-xs bg-secondary px-1 rounded">log_new_proposal()</code> — Trigger logging new proposals to activity_log</li>
                  <li><code className="text-xs bg-secondary px-1 rounded">log_new_support_request()</code> — Trigger logging support requests</li>
                  <li><code className="text-xs bg-secondary px-1 rounded">log_new_opportunity()</code> — Trigger logging partner opportunities</li>
                </ul>
              </div>
              <div>
                <p className="font-medium text-foreground">Storage Buckets</p>
                <p className="text-xs font-mono">project-documents, partner-documents, knowledge-documents, organisation-documents, compliance-documents (all private)</p>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* 5. Edge Functions */}
          <AccordionItem value="s5" className="border border-border/50 rounded-lg bg-card px-4">
            <AccordionTrigger className="text-sm font-semibold">
              <span className="flex items-center gap-2"><Play size={16} className="text-primary" /> 5. Edge Functions</span>
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground space-y-4">
              <div>
                <p className="font-medium text-foreground">generate-proposal</p>
                <p><strong>Purpose:</strong> AI-powered proposal generation for prospective clients.</p>
                <p><strong>Model:</strong> google/gemini-3-flash-preview via Lovable AI gateway.</p>
                <p><strong>Input:</strong> projectTypes, businessProblem, processesToAutomate, projectScale, timeline, industry.</p>
                <p><strong>Output:</strong> suggested_solution, estimated_scope, estimated_timeline via tool calling.</p>
                <p><strong>Error handling:</strong> 429 rate limiting, 402 credit exhaustion, general error catch.</p>
              </div>
              <div>
                <p className="font-medium text-foreground">founder-copilot</p>
                <p><strong>Purpose:</strong> Conversational AI assistant for the founder with real-time platform context.</p>
                <p><strong>Model:</strong> google/gemini-3-flash-preview with streaming responses.</p>
                <p><strong>Context injection:</strong> Fetches live data from 9 tables (workflows, agents, systems, organisations, brain_insights, decision_recommendations, strategy_insights, revenue_records, system_templates) and injects into system prompt.</p>
                <p><strong>Auth:</strong> Uses SUPABASE_SERVICE_ROLE_KEY for unrestricted data access.</p>
              </div>
              <div>
                <p className="font-medium text-foreground">platform-testing</p>
                <p><strong>Purpose:</strong> Automated platform validation suite running 20+ tests.</p>
                <p><strong>Test categories:</strong> Organisations, Automations, AI Agents, Systems, Brain, Decisions, Strategy, Deployments, Architectures, Templates, Knowledge, Integrations, Build Log, Optimisation, Security, Data Integrity, Manual, Executions, Expansion, Compliance.</p>
                <p><strong>Behaviour:</strong> Creates test data → runs validations → records results to platform_test_runs/platform_test_results → cleans up test data (deletes rows with [TEST] prefix).</p>
                <p><strong>Auth:</strong> Uses SUPABASE_SERVICE_ROLE_KEY to bypass RLS.</p>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* 6. Platform Testing */}
          <AccordionItem value="s6" className="border border-border/50 rounded-lg bg-card px-4">
            <AccordionTrigger className="text-sm font-semibold">
              <span className="flex items-center gap-2"><FlaskConical size={16} className="text-primary" /> 6. Platform Testing & Validation Suite</span>
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground space-y-3">
              <p>The platform includes a complete automated testing system accessible at <code className="text-xs bg-secondary px-1 rounded">/founder/testing</code>.</p>
              <div>
                <p className="font-medium text-foreground">Database Tables</p>
                <ul className="list-disc list-inside ml-2 space-y-1">
                  <li><strong>platform_test_runs</strong> — Stores test run metadata: run_name, status, total_tests, passed, failed, warnings, duration_ms, triggered_by, completed_at</li>
                  <li><strong>platform_test_results</strong> — Stores individual test results: run_id (FK), module, test_name, status, details, duration_ms</li>
                </ul>
              </div>
              <div>
                <p className="font-medium text-foreground">Edge Function: platform-testing</p>
                <p>Runs 20+ validation tests across all platform modules. Creates temporary test records, validates CRUD operations, checks data integrity (orphan references), then cleans up all test data. Results are persisted to the test tables for audit history.</p>
              </div>
              <div>
                <p className="font-medium text-foreground">Dashboard Features</p>
                <ul className="list-disc list-inside ml-2 space-y-1">
                  <li>Health overview cards (total/passed/failed/warnings)</li>
                  <li>Run Full Validation button triggering the edge function</li>
                  <li>Tabbed results view grouped by module</li>
                  <li>Test run history with timestamps and duration</li>
                </ul>
              </div>
              <div>
                <p className="font-medium text-foreground">RLS Policies</p>
                <p>Both tables use founder-only ALL access policy.</p>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* 7. Platform Build Log */}
          <AccordionItem value="s7" className="border border-border/50 rounded-lg bg-card px-4">
            <AccordionTrigger className="text-sm font-semibold">
              <span className="flex items-center gap-2"><ClipboardList size={16} className="text-primary" /> 7. Platform Build Log</span>
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground space-y-3">
              <p>The Build Log is an append-only engineering record stored in the <code className="text-xs bg-secondary px-1 rounded">build_log_entries</code> table. RLS allows founder INSERT and SELECT only — no UPDATE or DELETE — ensuring immutability.</p>
              <div>
                <p className="font-medium text-foreground">Reconstructed Build History</p>
                <p>The following is the chronological build sequence of the Liftor AI platform:</p>
                <ol className="list-decimal list-inside ml-2 space-y-2 mt-2">
                  <li><strong>Foundation</strong> — React + Vite + TypeScript project scaffolded. Tailwind CSS + shadcn/ui design system configured. Dark-themed UI with HSL-based semantic tokens.</li>
                  <li><strong>Public Website</strong> — 9 marketing pages created: Index, WhatWeBuild, Industries, Method, CaseStudies, PartnerProgram, ProjectDiscovery, About, AIProposal. Navbar + Footer layout components.</li>
                  <li><strong>Authentication System</strong> — Supabase Auth with email/password. Login, Signup, Forgot Password, Reset Password pages. AuthContext provider. ProtectedRoute component. profiles table with handle_new_user trigger.</li>
                  <li><strong>Client Portal</strong> — 15 portal routes: Dashboard, Projects, ProjectDetail, Documents, Messages, Support, Maintenance suite (Dashboard/Schedule/Updates/Features), System Monitoring, Control Panel, SystemDetail, Analytics, Optimisation. PortalLayout component.</li>
                  <li><strong>Core Database Schema</strong> — Created: profiles, projects, subscriptions, monitored_systems, automation_workflows, ai_agents, user_roles (with app_role enum: admin, moderator, user, founder, partner). RLS policies on all tables.</li>
                  <li><strong>Founder Console</strong> — FounderLayout sidebar navigation with 39 routes. FounderRoute guard checking user_roles for 'founder' role. FounderOverview dashboard.</li>
                  <li><strong>System Monitoring Module</strong> — MonitoringDashboard + MonitoringSystemDetail pages. monitored_systems table with client_id, project_id, organisation_id references.</li>
                  <li><strong>AI Agent System</strong> — AgentDirectory + AgentProfile pages. ai_agents table with system_id FK. agent_system_assignments, agent_task_stats, agent_activity_logs, agent_alerts tables.</li>
                  <li><strong>Workflow Engine</strong> — WorkflowDirectory + WorkflowDetail pages. automation_workflows table with execution tracking. workflow_executions, workflow_steps, execution_steps, execution_logs tables.</li>
                  <li><strong>Execution Dashboard</strong> — ExecutionDashboard + ExecutionDetail pages for monitoring workflow execution lifecycle.</li>
                  <li><strong>Integration Framework</strong> — IntegrationDirectory + IntegrationDetail pages. integrations table. integration_activity_logs, integration_alerts, integration_linked_systems tables.</li>
                  <li><strong>Architecture Manager</strong> — ArchitectureDirectory + ArchitectureDetail pages. architectures, architecture_components, architecture_relationships tables for visual system design.</li>
                  <li><strong>Deployment Manager</strong> — DeploymentDirectory + DeploymentDetail pages. deployments, deployment_stages, deployment_checklist, deployment_logs tables for staged rollout management.</li>
                  <li><strong>Organisation Management</strong> — OrganisationDirectory + OrganisationProfile pages. organisations, organisation_members, organisation_documents tables.</li>
                  <li><strong>Knowledge Base</strong> — KnowledgeDirectory + KnowledgeDetail pages. knowledge_entries, knowledge_documents tables with agent/workflow linking.</li>
                  <li><strong>Template Library</strong> — TemplateDirectory + TemplateDetail pages. system_templates table for reusable system configurations.</li>
                  <li><strong>Platform Expansion</strong> — PlatformExpansion + PlatformLaunchDetail pages. launched_platforms, launch_checklist tables.</li>
                  <li><strong>Analytics Dashboard</strong> — FounderAnalytics page aggregating workflow, agent, and system metrics.</li>
                  <li><strong>Optimisation Engine</strong> — OptimisationDashboard page. optimisation_insights table with entity-level targeting and recommended actions.</li>
                  <li><strong>Access Control & Security</strong> — AccessControl + SecurityDashboard pages. platform_roles, access_audit_log, access_anomalies, compliance_items, compliance_documents tables.</li>
                  <li><strong>Command Center</strong> — CommandCenter dashboard providing real-time operational overview across all platform systems.</li>
                  <li><strong>AI Proposal Generator</strong> — AIProposal public page + generate-proposal edge function using Gemini AI with tool calling for structured proposal output.</li>
                  <li><strong>Partner Portal</strong> — 7 partner routes: Dashboard, Opportunities, OpportunityDetail, Projects, ProjectDetail, Documents, Messages. PartnerRoute guard. partner_applications, partner_opportunities, partner_deals, partner_documents, partner_messages tables.</li>
                  <li><strong>AI Brain Core</strong> — BrainCore page. brain_insights, brain_recommendations, brain_learning_records tables. Signal pipeline: Observation → Learning → Optimisation → Decision → Strategy.</li>
                  <li><strong>Decision Engine</strong> — DecisionEngine page. decision_recommendations table with category, priority, benefits/risks analysis, and decision tracking.</li>
                  <li><strong>Strategy Engine</strong> — StrategyEngine page. strategy_insights table with market signals, industry targeting, and confidence levels.</li>
                  <li><strong>Founder AI Co-Pilot</strong> — FounderCoPilot page + founder-copilot edge function. Streaming AI assistant with live platform data injection from 9 tables.</li>
                  <li><strong>Revenue Console</strong> — FounderRevenue page. revenue_records table with source attribution and currency support.</li>
                  <li><strong>Global Operations</strong> — GlobalOperations dashboard aggregating cross-system operational data.</li>
                  <li><strong>Build Log System</strong> — BuildLog page + build_log_entries table. Append-only with CSV and Markdown export. Change types: feature_added, module_created, module_updated, bug_fixed, integration_added, workflow_created, agent_created, system_deployment, template_created.</li>
                  <li><strong>Founder Manual v1</strong> — FounderManual + ManualPageDetail pages. manual_pages, manual_versions tables. Section-grouped documentation with Markdown export.</li>
                  <li><strong>Platform Testing Suite</strong> — PlatformTesting page + platform-testing edge function. 20+ automated tests across all modules. platform_test_runs, platform_test_results tables. Test data cleanup after execution.</li>
                  <li><strong>Founder Manual v3 (Current)</strong> — Complete rebuild with all 11 sections, full build history, engineering-level documentation, and structured Markdown export.</li>
                </ol>
              </div>
              <div>
                <p className="font-medium text-foreground">Build Log Table Schema</p>
                <p className="text-xs font-mono">build_log_entries: id, title, description, change_type, module_affected, author, created_at</p>
                <p>RLS: Founder INSERT + SELECT only. No UPDATE/DELETE (append-only).</p>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* 8. Founder Control Systems */}
          <AccordionItem value="s8" className="border border-border/50 rounded-lg bg-card px-4">
            <AccordionTrigger className="text-sm font-semibold">
              <span className="flex items-center gap-2"><Command size={16} className="text-primary" /> 8. Founder Control Systems</span>
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground space-y-3">
              <div>
                <p className="font-medium text-foreground">Founder Console</p>
                <p>The central management interface with 39 navigation items. FounderLayout provides a fixed sidebar with grouped navigation. FounderRoute enforces founder-only access by checking user_roles table. All founder pages use the same layout for consistency.</p>
              </div>
              <div>
                <p className="font-medium text-foreground">Revenue Console</p>
                <p>Financial dashboard at <code className="text-xs bg-secondary px-1 rounded">/founder/revenue</code>. Tracks revenue_records with fields: source_name, source_type, revenue_value, client_organisation, currency, period. Supports GBP and multi-currency display.</p>
              </div>
              <div>
                <p className="font-medium text-foreground">Founder Manual</p>
                <p>This document at <code className="text-xs bg-secondary px-1 rounded">/founder/manual</code>. Engineering-level platform documentation with 11 sections and full Markdown export. Previously backed by manual_pages + manual_versions tables; now self-contained with comprehensive hardcoded content reflecting the actual platform state.</p>
              </div>
              <div>
                <p className="font-medium text-foreground">Platform Testing Dashboard</p>
                <p>At <code className="text-xs bg-secondary px-1 rounded">/founder/testing</code>. Triggers the platform-testing edge function, displays results grouped by module, maintains test run history. Validates all platform tables and cross-references.</p>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* 9. AI Brain Architecture */}
          <AccordionItem value="s9" className="border border-border/50 rounded-lg bg-card px-4">
            <AccordionTrigger className="text-sm font-semibold">
              <span className="flex items-center gap-2"><Brain size={16} className="text-primary" /> 9. AI Brain Architecture</span>
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground space-y-3">
              <p>The AI Brain is a multi-layer intelligence system that processes platform signals and generates actionable insights.</p>
              <div>
                <p className="font-medium text-foreground">AI Brain Core <span className="text-xs">(/founder/brain)</span></p>
                <p>Tables: brain_insights (type, priority, source_module, system_affected, status), brain_recommendations (priority, affected_system, status), brain_learning_records (category, confidence_level, source_system, pattern_description).</p>
                <p>Signal flow: Platform data → Observation → Pattern detection → Learning records → Insight generation → Recommendation output.</p>
              </div>
              <div>
                <p className="font-medium text-foreground">AI Decision Engine <span className="text-xs">(/founder/decisions)</span></p>
                <p>Table: decision_recommendations. Fields: title, description, category (operational/strategic/expansion), priority, status (pending/approved/rejected/implemented), potential_benefits, potential_risks, target_module, decision_maker, decided_at.</p>
              </div>
              <div>
                <p className="font-medium text-foreground">AI Strategy Engine <span className="text-xs">(/founder/strategy)</span></p>
                <p>Table: strategy_insights. Fields: title, description, category (market_signal/competitive/expansion/operational), confidence_level, target_industry, status.</p>
              </div>
              <div>
                <p className="font-medium text-foreground">Automation Optimisation Engine <span className="text-xs">(/founder/optimisation)</span></p>
                <p>Table: optimisation_insights. Fields: entity_type (workflow/agent/system), entity_id, entity_name, insight_type (performance/efficiency/reliability), priority, recommended_action, system_id, status.</p>
              </div>
              <div>
                <p className="font-medium text-foreground">AI Brain Orchestrator</p>
                <p>Coordinates signal flow across brain components: Observation → Learning → Optimisation → Decision → Strategy. Each stage processes and enriches signals before passing to the next layer.</p>
              </div>
              <div>
                <p className="font-medium text-foreground">Founder AI Co-Pilot <span className="text-xs">(/founder/copilot)</span></p>
                <p>Conversational interface backed by the founder-copilot edge function. Uses google/gemini-3-flash-preview with streaming. Injects real-time data from 9 platform tables into the system prompt. Provides strategic recommendations, data analysis, and operational guidance.</p>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* 10. Navigation & Routes */}
          <AccordionItem value="s10" className="border border-border/50 rounded-lg bg-card px-4">
            <AccordionTrigger className="text-sm font-semibold">
              <span className="flex items-center gap-2"><Globe size={16} className="text-primary" /> 10. Navigation & Routes</span>
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground space-y-3">
              <div>
                <p className="font-medium text-foreground">Public Routes (9)</p>
                <p className="text-xs font-mono">/ /what-we-build /industries /method /case-studies /partners /project-discovery /about /ai-proposal</p>
              </div>
              <div>
                <p className="font-medium text-foreground">Auth Routes (4)</p>
                <p className="text-xs font-mono">/portal/login /portal/signup /portal/forgot-password /portal/reset-password</p>
              </div>
              <div>
                <p className="font-medium text-foreground">Client Portal Routes (15)</p>
                <p className="text-xs font-mono">/portal/dashboard /portal/projects /portal/projects/:id /portal/documents /portal/messages /portal/support /portal/maintenance /portal/maintenance/schedule /portal/maintenance/updates /portal/maintenance/features /portal/monitoring /portal/systems /portal/systems/:id /portal/analytics /portal/optimisation</p>
              </div>
              <div>
                <p className="font-medium text-foreground">Founder Console Routes (39)</p>
                <p className="text-xs font-mono">/founder /founder/command-center /founder/copilot /founder/brain /founder/decisions /founder/strategy /founder/operations /founder/organisations /founder/organisations/:id /founder/revenue /founder/analytics /founder/optimisation /founder/proposals /founder/proposals/:id /founder/pipeline /founder/projects /founder/projects/:id /founder/monitoring /founder/monitoring/:id /founder/agents /founder/agents/:id /founder/workflows /founder/workflows/:id /founder/executions /founder/executions/:id /founder/processes /founder/processes/:id /founder/architectures /founder/architectures/:id /founder/deployments /founder/deployments/:id /founder/integrations /founder/integrations/:id /founder/activity /founder/knowledge /founder/knowledge/:id /founder/access-control /founder/security /founder/templates /founder/templates/:id /founder/expansion /founder/expansion/:id /founder/manual /founder/manual/:id /founder/build-log /founder/documents /founder/testing</p>
              </div>
              <div>
                <p className="font-medium text-foreground">Partner Portal Routes (7)</p>
                <p className="text-xs font-mono">/partner /partner/opportunities /partner/opportunities/:id /partner/projects /partner/projects/:id /partner/documents /partner/messages</p>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* 11. Deployment Architecture */}
          <AccordionItem value="s11" className="border border-border/50 rounded-lg bg-card px-4">
            <AccordionTrigger className="text-sm font-semibold">
              <span className="flex items-center gap-2"><Rocket size={16} className="text-primary" /> 11. Deployment Architecture</span>
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground space-y-3">
              <div>
                <p className="font-medium text-foreground">Frontend</p>
                <p>React 18 + Vite + TypeScript SPA. Deployed via Lovable hosting. Tailwind CSS with HSL-based semantic design tokens. shadcn/ui component library. framer-motion for animations. @tanstack/react-query for server state. react-router-dom v6 for routing. recharts for data visualisation.</p>
              </div>
              <div>
                <p className="font-medium text-foreground">Database</p>
                <p>PostgreSQL via Lovable Cloud (Supabase). 50+ tables with full RLS. app_role enum (admin, moderator, user, founder, partner). Security-definer functions for role checks. Automatic triggers for profile creation, activity logging, and timestamp updates.</p>
              </div>
              <div>
                <p className="font-medium text-foreground">Edge Functions</p>
                <p>3 Deno-based serverless functions deployed automatically: generate-proposal, founder-copilot, platform-testing. All use CORS headers. AI functions use Lovable AI gateway (ai.gateway.lovable.dev) with LOVABLE_API_KEY.</p>
              </div>
              <div>
                <p className="font-medium text-foreground">Authentication</p>
                <p>Supabase Auth with email/password. Email verification required (no auto-confirm). AuthContext provides user state. Role-based routing: ProtectedRoute (any authenticated user), FounderRoute (founder role), PartnerRoute (partner role).</p>
              </div>
              <div>
                <p className="font-medium text-foreground">Storage</p>
                <p>5 private storage buckets: project-documents, partner-documents, knowledge-documents, organisation-documents, compliance-documents. All access controlled via RLS.</p>
              </div>
              <div>
                <p className="font-medium text-foreground">AI Integration</p>
                <p>Lovable AI gateway provides access to multiple models without API keys. Currently using google/gemini-3-flash-preview for proposal generation and co-pilot conversations. Tool calling for structured outputs.</p>
              </div>
              <div>
                <p className="font-medium text-foreground">Secrets</p>
                <p className="text-xs font-mono">SUPABASE_SERVICE_ROLE_KEY, SUPABASE_DB_URL, SUPABASE_PUBLISHABLE_KEY, LOVABLE_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY</p>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </FounderLayout>
  );
};

export default FounderManual;
