import { format } from "date-fns";

export const generateManualMarkdown = (): string => {
  const now = format(new Date(), "MMMM d, yyyy HH:mm");
  return `# Liftor AI — Founder Manual
## Complete Engineering-Level Platform Documentation

**Version:** 3.0  
**Generated:** ${now}  
**Classification:** Founder / Internal Engineering

---

## Table of Contents

1. Platform Overview
2. Full Platform Architecture
3. Platform Modules
4. Database Structure
5. Edge Functions
6. Platform Testing & Validation Suite
7. Platform Build Log
8. Founder Control Systems
9. AI Brain Architecture
10. Navigation & Routes
11. Deployment Architecture

---

## 1. Platform Overview

Liftor AI is a full-stack AI engineering platform that designs, builds, deploys, and manages enterprise AI systems. The platform enables end-to-end lifecycle management of AI automation projects — from client proposal generation through to live system monitoring and optimisation.

**Core Purpose:** To operate as a productised AI studio with founder-level visibility over every system, agent, workflow, deployment, and client organisation managed by the platform.

**Target Users:**
- **Public Visitors** — Prospective clients browsing services
- **Clients** — Organisations with active AI projects in delivery or maintenance
- **Partners** — Referral/agency partners submitting opportunities
- **Founder** — Full platform administrator with command-level access

**Technology Stack:** React + Vite + TypeScript + Tailwind CSS + shadcn/ui, Lovable Cloud (Supabase) for backend, Deno edge functions, Lovable AI gateway for AI capabilities.

---

## 2. Full Platform Architecture

### Layer 1 — Public Platform
Marketing website with 9 public routes: Home, What We Build, Industries, Method, Case Studies, Partners, Project Discovery, About, AI Proposal Generator. No authentication required. SEO-optimised with structured content.

### Layer 2 — Client Portal (Authenticated)
15 protected routes for clients: Dashboard, Projects, Project Detail, Documents, Messages, Support, Maintenance (Dashboard/Schedule/Updates/Features), System Monitoring, Control Panel, System Detail, Analytics, Optimisation. Protected via ProtectedRoute component. Clients see only their own data via RLS policies referencing profiles.user_id.

### Layer 3 — Partner Portal (Authenticated)
7 protected routes for partners: Dashboard, Opportunities, Opportunity Detail, Projects, Project Detail, Documents, Messages. Protected via PartnerRoute component with partner role check.

### Layer 4 — Founder Console (Founder Role Only)
39 protected routes for the founder covering every aspect of platform operations. Protected via FounderRoute component which checks user_roles table for 'founder' role. Includes: Command Center, AI Co-Pilot, AI Brain, Decisions, Strategy, Operations, Organisations, Overview, Revenue, Analytics, Optimisation, Proposals, Pipeline, Projects, Monitoring, Agents, Workflows, Executions, Processes, Architectures, Deployments, Integrations, Activity, Knowledge, Access Control, Security, Templates, Expansion, Manual, Build Log, Documents, Platform Testing.

### Layer 5 — AI Brain Layer
Autonomous intelligence layer comprising: Brain Core (insights + learning records), Decision Engine (recommendations), Strategy Engine (strategic insights), Automation Optimisation Engine, AI Brain Orchestrator (signal flow pipeline), Founder AI Co-Pilot (conversational interface to platform data).

### Layer 6 — Platform Infrastructure
Lovable Cloud (Supabase) provides: PostgreSQL database with 50+ tables, Row-Level Security on every table, Edge Functions for serverless compute, Storage buckets for document management, Authentication via Supabase Auth with email/password.

---

## 3. Platform Modules

### Command Center
Central operational hub showing real-time platform health: active systems, agents, workflows, recent activity, and quick actions.
**Route:** /founder/command-center

### AI Co-Pilot
Conversational AI assistant powered by Gemini via founder-copilot edge function. Queries real-time platform data and provides strategic recommendations.
**Route:** /founder/copilot

### AI Brain Core
Central intelligence engine managing brain_insights, brain_recommendations, and brain_learning_records.
**Route:** /founder/brain

### Decision Engine
Manages decision_recommendations with categories (operational, strategic, expansion), priorities, potential benefits/risks, and decision tracking.
**Route:** /founder/decisions

### Strategy Engine
Strategic intelligence module tracking market signals, industry opportunities, and platform expansion strategies.
**Route:** /founder/strategy

### Global Operations
High-level operations dashboard aggregating data from all systems, organisations, and deployments.
**Route:** /founder/operations

### Organisation Directory
Manages client organisations with industry classification, status tracking, member management, and document storage.
**Route:** /founder/organisations

### System Monitoring
Real-time monitoring of all deployed client systems with status tracking and health indicators.
**Route:** /founder/monitoring

### AI Agent Directory
Registry of all AI agents deployed across client systems. Tracks agent function, status, task completion, pending tasks, and system assignments.
**Route:** /founder/agents

### Workflow Directory
Manages automation_workflows with execution tracking, success/failure counts, and automation type classification.
**Route:** /founder/workflows

### Execution Dashboard
Tracks workflow_executions and execution_steps with detailed logging via execution_logs table.
**Route:** /founder/executions

### Process Directory
Business process management and documentation.
**Route:** /founder/processes

### Architecture Directory
System architecture management with architecture_components and architecture_relationships for visual system design.
**Route:** /founder/architectures

### Deployment Manager
Manages system deployments with deployment_stages, deployment_checklist, and deployment_logs for staged rollouts.
**Route:** /founder/deployments

### Integration Directory
Manages external integrations (API keys, webhooks, AI models) with activity logging and alert monitoring.
**Route:** /founder/integrations

### Analytics Dashboard
Platform-wide analytics aggregating workflow performance, agent metrics, and system health data.
**Route:** /founder/analytics

### Optimisation Engine
Generates and tracks optimisation_insights with recommended actions, priorities, and entity-level targeting.
**Route:** /founder/optimisation

### Knowledge Base
Platform knowledge management with knowledge_entries and knowledge_documents. Links to agents and workflows.
**Route:** /founder/knowledge

### Template Library
Reusable system_templates for rapid deployment of standardised AI systems.
**Route:** /founder/templates

### Platform Expansion
Manages launched_platforms with launch_checklist for scaling the platform to new organisations and industries.
**Route:** /founder/expansion

### Revenue Console
Financial tracking with source attribution, currency support, and revenue trend analysis.
**Route:** /founder/revenue

### Proposal Management
Manages AI-generated project proposals with the generate-proposal edge function. Tracks proposal lifecycle.
**Route:** /founder/proposals

### Lead Pipeline
Sales pipeline management for tracking proposal-to-project conversion.
**Route:** /founder/pipeline

### Access Control
Platform role management via platform_roles table with access_audit_log and access_anomalies monitoring.
**Route:** /founder/access-control

### Security Dashboard
Security and compliance management via compliance_items and compliance_documents.
**Route:** /founder/security

### Build Log
Append-only engineering log tracking every platform change with author, module, and change type.
**Route:** /founder/build-log

### Founder Manual
Complete platform documentation with Markdown export (this document).
**Route:** /founder/manual

### Platform Testing
Automated validation suite running 20+ tests across all modules.
**Route:** /founder/testing

---

## 4. Database Structure

The platform uses 50+ PostgreSQL tables with Row-Level Security (RLS) on every table.

### Core Platform
\`profiles, projects, subscriptions, user_roles, activity_log\`

### Client Systems
\`monitored_systems, automation_workflows, ai_agents, agent_system_assignments, agent_task_stats, agent_activity_logs, agent_alerts\`

### Workflow Execution
\`workflow_executions, workflow_steps, execution_steps, execution_logs\`

### AI Brain
\`brain_insights, brain_recommendations, brain_learning_records\`

### Decision & Strategy
\`decision_recommendations, strategy_insights\`

### Architecture & Deployment
\`architectures, architecture_components, architecture_relationships, deployments, deployment_stages, deployment_checklist, deployment_logs\`

### Integrations
\`integrations, integration_activity_logs, integration_alerts, integration_linked_systems\`

### Knowledge & Documentation
\`knowledge_entries, knowledge_documents, manual_pages, manual_versions\`

### Organisations
\`organisations, organisation_members, organisation_documents\`

### Expansion
\`launched_platforms, launch_checklist, system_templates\`

### Security & Compliance
\`platform_roles, access_audit_log, access_anomalies, compliance_items, compliance_documents\`

### Partners
\`partner_applications, partner_opportunities, partner_deals, partner_documents, partner_messages\`

### Revenue
\`revenue_records\`

### Optimisation
\`optimisation_insights\`

### Build & Testing
\`build_log_entries, platform_test_runs, platform_test_results\`

### Client Portal
\`feature_requests, maintenance_events, support_tickets, messages, documents\`

### RLS Policy Pattern
Every table has founder-level ALL access via \`has_role(auth.uid(), 'founder')\`. Client-facing tables additionally have SELECT policies scoped to the user's profile/subscription/organisation. A security-definer function \`has_role(_user_id, _role)\` prevents recursive RLS checks.

### Key Database Functions
- \`handle_new_user()\` — Trigger on auth.users insert, creates profiles row
- \`has_role(_user_id, _role)\` — Security definer role check
- \`update_updated_at_column()\` — Auto-updates updated_at timestamps
- \`log_new_proposal()\` — Trigger logging new proposals to activity_log
- \`log_new_support_request()\` — Trigger logging support requests
- \`log_new_opportunity()\` — Trigger logging partner opportunities

### Storage Buckets
\`project-documents, partner-documents, knowledge-documents, organisation-documents, compliance-documents\` (all private)

---

## 5. Edge Functions

### generate-proposal
**Purpose:** AI-powered proposal generation for prospective clients.  
**Model:** google/gemini-3-flash-preview via Lovable AI gateway.  
**Input:** projectTypes, businessProblem, processesToAutomate, projectScale, timeline, industry.  
**Output:** suggested_solution, estimated_scope, estimated_timeline via tool calling.  
**Error handling:** 429 rate limiting, 402 credit exhaustion, general error catch.

### founder-copilot
**Purpose:** Conversational AI assistant for the founder with real-time platform context.  
**Model:** google/gemini-3-flash-preview with streaming responses.  
**Context injection:** Fetches live data from 9 tables (workflows, agents, systems, organisations, brain_insights, decision_recommendations, strategy_insights, revenue_records, system_templates) and injects into system prompt.  
**Auth:** Uses SUPABASE_SERVICE_ROLE_KEY for unrestricted data access.

### platform-testing
**Purpose:** Automated platform validation suite running 20+ tests.  
**Test categories:** Organisations, Automations, AI Agents, Systems, Brain, Decisions, Strategy, Deployments, Architectures, Templates, Knowledge, Integrations, Build Log, Optimisation, Security, Data Integrity, Manual, Executions, Expansion, Compliance.  
**Behaviour:** Creates test data → runs validations → records results to platform_test_runs/platform_test_results → cleans up test data (deletes rows with [TEST] prefix).  
**Auth:** Uses SUPABASE_SERVICE_ROLE_KEY to bypass RLS.

---

## 6. Platform Testing & Validation Suite

### Database Tables
- **platform_test_runs** — Stores test run metadata: run_name, status, total_tests, passed, failed, warnings, duration_ms, triggered_by, completed_at
- **platform_test_results** — Stores individual test results: run_id (FK), module, test_name, status, details, duration_ms

### Edge Function: platform-testing
Runs 20+ validation tests across all platform modules. Creates temporary test records, validates CRUD operations, checks data integrity (orphan references), then cleans up all test data. Results are persisted to the test tables for audit history.

### Dashboard Features
- Health overview cards (total/passed/failed/warnings)
- Run Full Validation button triggering the edge function
- Tabbed results view grouped by module
- Test run history with timestamps and duration

### Route
\`/founder/testing\`

### RLS Policies
Both tables use founder-only ALL access policy.

---

## 7. Platform Build Log

The Build Log is an append-only engineering record stored in the \`build_log_entries\` table. RLS allows founder INSERT and SELECT only — no UPDATE or DELETE — ensuring immutability.

### Reconstructed Build History

1. **Foundation** — React + Vite + TypeScript project scaffolded. Tailwind CSS + shadcn/ui design system configured. Dark-themed UI with HSL-based semantic tokens.

2. **Public Website** — 9 marketing pages created: Index, WhatWeBuild, Industries, Method, CaseStudies, PartnerProgram, ProjectDiscovery, About, AIProposal. Navbar + Footer layout components.

3. **Authentication System** — Supabase Auth with email/password. Login, Signup, Forgot Password, Reset Password pages. AuthContext provider. ProtectedRoute component. profiles table with handle_new_user trigger.

4. **Client Portal** — 15 portal routes: Dashboard, Projects, ProjectDetail, Documents, Messages, Support, Maintenance suite (Dashboard/Schedule/Updates/Features), System Monitoring, Control Panel, SystemDetail, Analytics, Optimisation. PortalLayout component.

5. **Core Database Schema** — Created: profiles, projects, subscriptions, monitored_systems, automation_workflows, ai_agents, user_roles (with app_role enum: admin, moderator, user, founder, partner). RLS policies on all tables.

6. **Founder Console** — FounderLayout sidebar navigation with 39 routes. FounderRoute guard checking user_roles for 'founder' role. FounderOverview dashboard.

7. **System Monitoring Module** — MonitoringDashboard + MonitoringSystemDetail pages. monitored_systems table with client_id, project_id, organisation_id references.

8. **AI Agent System** — AgentDirectory + AgentProfile pages. ai_agents table with system_id FK. agent_system_assignments, agent_task_stats, agent_activity_logs, agent_alerts tables.

9. **Workflow Engine** — WorkflowDirectory + WorkflowDetail pages. automation_workflows table with execution tracking. workflow_executions, workflow_steps, execution_steps, execution_logs tables.

10. **Execution Dashboard** — ExecutionDashboard + ExecutionDetail pages for monitoring workflow execution lifecycle.

11. **Integration Framework** — IntegrationDirectory + IntegrationDetail pages. integrations table. integration_activity_logs, integration_alerts, integration_linked_systems tables.

12. **Architecture Manager** — ArchitectureDirectory + ArchitectureDetail pages. architectures, architecture_components, architecture_relationships tables.

13. **Deployment Manager** — DeploymentDirectory + DeploymentDetail pages. deployments, deployment_stages, deployment_checklist, deployment_logs tables.

14. **Organisation Management** — OrganisationDirectory + OrganisationProfile pages. organisations, organisation_members, organisation_documents tables.

15. **Knowledge Base** — KnowledgeDirectory + KnowledgeDetail pages. knowledge_entries, knowledge_documents tables with agent/workflow linking.

16. **Template Library** — TemplateDirectory + TemplateDetail pages. system_templates table.

17. **Platform Expansion** — PlatformExpansion + PlatformLaunchDetail pages. launched_platforms, launch_checklist tables.

18. **Analytics Dashboard** — FounderAnalytics page aggregating workflow, agent, and system metrics.

19. **Optimisation Engine** — OptimisationDashboard page. optimisation_insights table.

20. **Access Control & Security** — AccessControl + SecurityDashboard pages. platform_roles, access_audit_log, access_anomalies, compliance_items, compliance_documents tables.

21. **Command Center** — CommandCenter dashboard providing real-time operational overview.

22. **AI Proposal Generator** — AIProposal public page + generate-proposal edge function using Gemini AI with tool calling.

23. **Partner Portal** — 7 partner routes. PartnerRoute guard. partner_applications, partner_opportunities, partner_deals, partner_documents, partner_messages tables.

24. **AI Brain Core** — BrainCore page. brain_insights, brain_recommendations, brain_learning_records tables. Signal pipeline: Observation → Learning → Optimisation → Decision → Strategy.

25. **Decision Engine** — DecisionEngine page. decision_recommendations table.

26. **Strategy Engine** — StrategyEngine page. strategy_insights table.

27. **Founder AI Co-Pilot** — FounderCoPilot page + founder-copilot edge function. Streaming AI with live platform data injection.

28. **Revenue Console** — FounderRevenue page. revenue_records table.

29. **Global Operations** — GlobalOperations dashboard.

30. **Build Log System** — BuildLog page + build_log_entries table. Append-only with CSV and Markdown export.

31. **Founder Manual v1** — FounderManual + ManualPageDetail pages. manual_pages, manual_versions tables.

32. **Platform Testing Suite** — PlatformTesting page + platform-testing edge function. 20+ automated tests. platform_test_runs, platform_test_results tables.

33. **Founder Manual v3 (Current)** — Complete rebuild with all 11 sections, full build history, engineering-level documentation, and structured Markdown export.

### Build Log Table Schema
\`build_log_entries: id, title, description, change_type, module_affected, author, created_at\`

**RLS:** Founder INSERT + SELECT only. No UPDATE/DELETE (append-only).

**Change Types:** feature_added, module_created, module_updated, bug_fixed, integration_added, workflow_created, agent_created, system_deployment, template_created.

---

## 8. Founder Control Systems

### Founder Console
The central management interface with 39 navigation items. FounderLayout provides a fixed sidebar with grouped navigation. FounderRoute enforces founder-only access by checking user_roles table. All founder pages use the same layout for consistency.

### Revenue Console
Financial dashboard at \`/founder/revenue\`. Tracks revenue_records with fields: source_name, source_type, revenue_value, client_organisation, currency, period. Supports GBP and multi-currency display.

### Founder Manual
This document at \`/founder/manual\`. Engineering-level platform documentation with 11 sections and full Markdown export.

### Platform Testing Dashboard
At \`/founder/testing\`. Triggers the platform-testing edge function, displays results grouped by module, maintains test run history.

---

## 9. AI Brain Architecture

The AI Brain is a multi-layer intelligence system that processes platform signals and generates actionable insights.

### AI Brain Core (/founder/brain)
**Tables:** brain_insights, brain_recommendations, brain_learning_records.  
**Signal flow:** Platform data → Observation → Pattern detection → Learning records → Insight generation → Recommendation output.

### AI Decision Engine (/founder/decisions)
**Table:** decision_recommendations.  
**Fields:** title, description, category (operational/strategic/expansion), priority, status (pending/approved/rejected/implemented), potential_benefits, potential_risks, target_module, decision_maker, decided_at.

### AI Strategy Engine (/founder/strategy)
**Table:** strategy_insights.  
**Fields:** title, description, category (market_signal/competitive/expansion/operational), confidence_level, target_industry, status.

### Automation Optimisation Engine (/founder/optimisation)
**Table:** optimisation_insights.  
**Fields:** entity_type (workflow/agent/system), entity_id, entity_name, insight_type (performance/efficiency/reliability), priority, recommended_action, system_id, status.

### AI Brain Orchestrator
Coordinates signal flow across brain components: Observation → Learning → Optimisation → Decision → Strategy. Each stage processes and enriches signals before passing to the next layer.

### Founder AI Co-Pilot (/founder/copilot)
Conversational interface backed by the founder-copilot edge function. Uses google/gemini-3-flash-preview with streaming. Injects real-time data from 9 platform tables into the system prompt.

---

## 10. Navigation & Routes

### Public Routes (9)
\`/ /what-we-build /industries /method /case-studies /partners /project-discovery /about /ai-proposal\`

### Auth Routes (4)
\`/portal/login /portal/signup /portal/forgot-password /portal/reset-password\`

### Client Portal Routes (15)
\`/portal/dashboard /portal/projects /portal/projects/:id /portal/documents /portal/messages /portal/support /portal/maintenance /portal/maintenance/schedule /portal/maintenance/updates /portal/maintenance/features /portal/monitoring /portal/systems /portal/systems/:id /portal/analytics /portal/optimisation\`

### Founder Console Routes (39)
\`/founder /founder/command-center /founder/copilot /founder/brain /founder/decisions /founder/strategy /founder/operations /founder/organisations /founder/organisations/:id /founder/revenue /founder/analytics /founder/optimisation /founder/proposals /founder/proposals/:id /founder/pipeline /founder/projects /founder/projects/:id /founder/monitoring /founder/monitoring/:id /founder/agents /founder/agents/:id /founder/workflows /founder/workflows/:id /founder/executions /founder/executions/:id /founder/processes /founder/processes/:id /founder/architectures /founder/architectures/:id /founder/deployments /founder/deployments/:id /founder/integrations /founder/integrations/:id /founder/activity /founder/knowledge /founder/knowledge/:id /founder/access-control /founder/security /founder/templates /founder/templates/:id /founder/expansion /founder/expansion/:id /founder/manual /founder/manual/:id /founder/build-log /founder/documents /founder/testing\`

### Partner Portal Routes (7)
\`/partner /partner/opportunities /partner/opportunities/:id /partner/projects /partner/projects/:id /partner/documents /partner/messages\`

---

## 11. Deployment Architecture

### Frontend
React 18 + Vite + TypeScript SPA. Deployed via Lovable hosting. Tailwind CSS with HSL-based semantic design tokens. shadcn/ui component library. framer-motion for animations. @tanstack/react-query for server state. react-router-dom v6 for routing. recharts for data visualisation.

### Database
PostgreSQL via Lovable Cloud (Supabase). 50+ tables with full RLS. app_role enum (admin, moderator, user, founder, partner). Security-definer functions for role checks. Automatic triggers for profile creation, activity logging, and timestamp updates.

### Edge Functions
3 Deno-based serverless functions deployed automatically: generate-proposal, founder-copilot, platform-testing. All use CORS headers. AI functions use Lovable AI gateway (ai.gateway.lovable.dev) with LOVABLE_API_KEY.

### Authentication
Supabase Auth with email/password. Email verification required (no auto-confirm). AuthContext provides user state. Role-based routing: ProtectedRoute (any authenticated user), FounderRoute (founder role), PartnerRoute (partner role).

### Storage
5 private storage buckets: project-documents, partner-documents, knowledge-documents, organisation-documents, compliance-documents. All access controlled via RLS.

### AI Integration
Lovable AI gateway provides access to multiple models without API keys. Currently using google/gemini-3-flash-preview for proposal generation and co-pilot conversations. Tool calling for structured outputs.

### Secrets
SUPABASE_SERVICE_ROLE_KEY, SUPABASE_DB_URL, SUPABASE_PUBLISHABLE_KEY, LOVABLE_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY

---

*End of Liftor AI Founder Manual v3.0*  
*Generated by the Liftor AI platform documentation system.*
`;
};
