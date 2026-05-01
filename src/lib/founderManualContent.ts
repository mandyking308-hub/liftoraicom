import { format } from "date-fns";

export interface ManualLiveData {
  orgCount: number;
  workflowCount: number;
  agentCount: number;
  integrationCount: number;
  deploymentCount: number;
  templateCount: number;
  knowledgeCount: number;
  brainInsightCount: number;
  decisionCount: number;
  testRunCount: number;
  buildLogCount: number;
  manualPageCount: number;
  systemCount: number;
  architectureCount: number;
  launchedPlatformCount: number;
  recentBuildLogs: Array<{ title: string; change_type: string; module_affected: string; author: string; created_at: string; description: string | null }>;
  recentTestRuns: Array<{ run_name: string; status: string; total_tests: number; passed: number; failed: number; created_at: string }>;
}

export const generateManualMarkdown = (data: ManualLiveData): string => {
  const now = format(new Date(), "MMMM d, yyyy HH:mm");

  return `# Liftor AI — Founder Manual
## Complete Engineering-Level Platform Documentation

**Version:** 4.1 — NeonCandy Operational Handover (1 May 2026)
**Generated:** ${now}
**Classification:** Founder / Internal Engineering / Investor Documentation
**Status:** Live — Auto-generated from platform state

---

## Table of Contents

0. Operational Handover — NeonCandy / Outreach (1 May 2026)
0a. Credentials & Secrets Register
1. Platform Overview
2. Full Platform Architecture
3. Platform Infrastructure Modules
4. Enterprise Platform Management
5. Platform Operations Control
6. Founder Control Systems
7. AI Brain Architecture
8. Platform Testing & Validation Suite
9. Database Structure
10. Edge Functions
11. Navigation & Routes
12. Deployment Architecture
13. Platform Build Log
14. Documentation Engine
15. Export System

---

## SECTION 0 — OPERATIONAL HANDOVER — NEONCANDY / OUTREACH (1 MAY 2026)

> This section is the single source of truth for the current live state of the
> only operational outreach pipeline. It supersedes any earlier wording in
> later sections where there is conflict.

### 0.1 NeonCandy Business Context

- **NeonCandy is the only live operational account currently being worked.**
- All other businesses (GloBlast, Liftor AI demo tenant, Health Access, etc.)
  have been archived as simulation/test data and removed from active operations.
- **Mode:** \`BUSINESS-LIVE\`.
- **Campaign:** \`Early Access Collaboration Test\`.
- **Sequence:** Day 0 (Step 1) → Day 3 (Step 2) → Day 7 (Step 3) → Day 14 (Step 4).
- **Sender daily cap:** 10 (provider-side IONOS new-mailbox limit; will increase as the mailbox warms).

### 0.2 Valid Sender / Inbox Rule

- The **only** valid live NeonCandy outbound and reply inbox is:
  - \`hello@neoncandy.online\` (IONOS)
- All sending, all replies, all queue creation, all AI drafts, and all
  inbound polling for NeonCandy MUST be routed through this inbox only.

### 0.3 Disabled music@neoncandy.net Rule

- \`music@neoncandy.net\` is **historical only / disabled**.
- It must NOT be used for: sending, fallback sender, campaign sender,
  staging, queue creation, inbound routing, AI replies, or business
  default sender.
- For NeonCandy, any inbox other than \`hello@neoncandy.online\` must be
  blocked at the sanity layer with the reason code:
  - \`NEONCANDY_INVALID_INBOX\`
- Manual rule: *"music@neoncandy.net must remain historical only.
  Operational use is forbidden."*

### 0.4 Apollo Integration

- Apollo connection is working end-to-end for NeonCandy.
- People Search and Person Enrichment both succeed.
- Endpoint corrected to \`/api/v1/mixed_people/api_search\`
  (the previous \`/people/search\` path was wrong and removed).
- Apollo People Search does **not** return raw emails; enrichment is
  required to obtain a deliverable address.
- Enrichment now has timeout/resume protection so partial batches recover.
- Pagination was fixed to stop repeating the first 25 results on every page.

### 0.5 Apollo Month 1 Segment

- Active segment: **NeonCandy Month 1**.
- Purpose: feed the Weekend Pool from a curated Apollo audience.
- Imported via Apollo Search → Bulk Enrichment → central \`contacts\` table
  → \`business_contact_relationships\` (BCR) attached to NeonCandy.

### 0.6 Weekend Pool

- Target size: **100 contacts**.
- Current pool reached **47 ready/staged** contacts before the final send fix.
- Pool feeds directly into the Early Access Collaboration Test campaign
  via the staging action.

### 0.7 Daily Monitor & Live Monitor

- **Daily Monitor** — founder-facing day view: today's due Step 1/2/3/4,
  reply backlog, sender cap remaining, AI drafts awaiting approval.
- **Live Monitor** — real-time card "Active campaign movement" showing:
  Ready to stage, Staged contacts, Active Step 1 pending, Real SMTP sent
  today, Valid follow-ups scheduled, Next due send, Queue integrity,
  Sender (\`hello@neoncandy.online\`).

### 0.8 Campaign Sequence

| Step | Day offset | Purpose |
|------|------------|---------|
| 1 | 0 | First touch — collaboration intro |
| 2 | +3 | Soft follow-up |
| 3 | +7 | Value reinforcement |
| 4 | +14 | Final follow-up / breakup |

### 0.9 CRM / Contact Pool & business_contact_relationships

- \`contacts\` is the central, business-agnostic pool of every person
  imported across all sources (Apollo, manual, etc.).
- \`business_contact_relationships\` (BCR) attaches a contact to a
  specific business with: \`qualification\`, \`campaign_eligible\`,
  \`current_stage\`, \`last_campaign_id\`, \`do_not_contact\`.
- A NeonCandy contact is "live" only when the BCR has
  \`business_name='Neon Candy'\` AND \`campaign_eligible=true\` AND
  \`current_stage='staged'\` AND \`last_campaign_id\` = Early Access
  Collaboration Test campaign id.

### 0.10 Suppression Rules

Always-suppress (never sendable, never overrideable by cleanup):
- \`contacts.is_globally_suppressed = true\`
- \`contacts.hard_bounced = true\`
- Any inbound STOP / unsubscribe event
- Bounce events
- Legal / privacy / GDPR-deletion request
- Founder-marked DNC on the BCR

### 0.11 AI Drafts / Founder Approval

- All AI-generated reply drafts are **human-in-the-loop**.
- Drafts are created by the AI agent and queued; nothing is sent until
  the founder explicitly approves and clicks send.
- Auto-send of AI drafts is **forbidden**.

### 0.12 Known Historical Simulated-Row Issue

Earlier in the build, the system created a large volume of simulated /
test outbound rows that were later mistaken for real sends. These
polluted the sanity layer's RECENT_COMMUNICATION_24H check and blocked
legitimate first-touch emails.

### 0.13 Queue Cleanup (Completed)

- **19 legacy simulated Step 1 rows quarantined** with reason code:
  \`SIMULATED_LEGACY_QUARANTINED\`
- **75 invalid follow-ups cancelled** with reason code:
  \`SIMULATED_PARENT_NOT_SENT\`
- **Active simulated rows after cleanup: 0**
- **Active invalid-parent follow-ups after cleanup: 0**
- All non-NeonCandy test businesses (GloBlast, Liftor AI demo, Health
  Access) were archived to \`cleanup_archive\` and removed from the
  active queue, contacts, BCR, and inboxes tables.

### 0.14 Staging Bug & Fix

- **Old behaviour:** the staging action only flipped contact stage flags
  but did not actually create email_queue rows, so contacts appeared
  "staged" while no Step 1/2/3/4 jobs existed.
- **Fix applied:** the staging action now invokes
  \`outreach-schedule-batch\` with the campaign id and the contact ids,
  guarantees creation of all 4 sequence rows per contact, and fails
  loudly if queue rows are not created.
- One-shot data fix executed for the 47 NeonCandy BCRs created **160
  sequence rows for 40 contacts** (Step 1 due immediately, Steps 2-4
  scheduled at the correct offsets).
- UI wording updated: the action label now reads
  *"Stage into campaign queue"* — never just "Stage".

### 0.15 Current Send-Worker Status

- The earlier \`outreach-send-worker\` crash from \`denomailer\`'s
  *invalid cmd* during SMTP \`QUIT\` has been fixed (swapped to
  \`nodemailer\`, added unhandledrejection/error shields, and only
  records communications after a successful SMTP accept).
- The worker now boots and completes its run cleanly.
- **16 real SMTP sends were delivered today via \`hello@neoncandy.online\`**
  with \`delivery_kind=smtp_real\`, \`smtp_accepted_at\` populated, and a
  valid IONOS \`provider_message_id\`.
- **Outstanding issues:**
  1. **IONOS provider rate limit** — IONOS returned
     \`450 Mail send limit exceeded\` on subsequent sends. This is the
     new-mailbox 24h rolling cap, not a Liftor bug. Resolves on its own
     as the rolling window slides; can be raised via IONOS support.
  2. **IMAP APPEND to Sent folder** — \`saved_to_sent_at\` is null on all
     16 sends. Emails are delivered to recipients but copies are not yet
     appearing in the IONOS webmail "Sent" view. Cosmetic, not a
     deliverability issue. Needs a fix in the worker's IMAP APPEND code
     path.

### 0.16 Immediate Next Operational Target

1. Run \`crm-send-check\` for a due Step 1 contact.
2. Identify whether \`RECENT_COMMUNICATION_24H\` is false (created by a
   simulated/blocked/non-SMTP/test row).
3. Mark only those false communications as
   \`ignored_for_send_check = true\` (with \`ignored_reason\`).
4. Run worker with \`?max=1\` for a single proof send.
5. Confirm on the queue row:
   - \`delivery_kind = smtp_real\`
   - \`smtp_accepted_at\` populated
   - \`provider_message_id\` populated
   - \`saved_to_sent_at\` populated **or** an \`append_error\` recorded
   - Email visible in IONOS Sent Items
6. If proof succeeds, run remaining safe capacity today, **max 9 more**.
7. Stop and review Tuesday once the IONOS rolling window resets.

### 0.17 Do Not Do Next

- Do not rebuild Apollo.
- Do not add more dashboards.
- Do not add more Apollo batches until the proof send works.
- Do not re-enable \`music@neoncandy.net\`.
- Do not treat simulated rows as live.
- Do not auto-send AI drafts.
- Do not stage future contacts without confirming queue rows were created.

---

## SECTION 0a — CREDENTIALS & SECRETS REGISTER

> **Raw passwords and API keys are not stored in this manual.**
> See the secure password manager / Lovable secrets / encrypted
> server-side storage for the actual values. This register only records
> *what exists, where it lives, who owns it, and how to recover it.*

### A. Liftor / Lovable

| Field | Value |
|-------|-------|
| System | Liftor AI |
| Manual paths | \`/founder/manual\`, \`/founder/manual/full\` |
| Purpose | Central portfolio CRM / outreach / AI operations engine |
| Login email | mandyking308@gmail.com (founder/admin) |
| Secret name(s) | \`INBOX_CREDENTIALS_KEY\`, \`APOLLO_ENCRYPTION_KEY\` |
| Storage | Lovable secure secrets / encrypted server-side storage |
| Owner | Mandy King |
| Status | active |
| Last 4 | n/a (managed secrets) |
| Recovery | Lovable account password reset → re-issue secret via Lovable secrets UI |
| Notes | Raw values must NEVER appear in code, logs, or this manual. |

### B. NeonCandy Sender — hello@neoncandy.online

| Field | Value |
|-------|-------|
| System | IONOS hosted mailbox |
| Email | hello@neoncandy.online |
| Purpose | Only valid live NeonCandy outbound send + reply inbox |
| SMTP host / port / security | smtp.ionos.co.uk / 587 / TLS (STARTTLS) |
| SMTP username | hello@neoncandy.online |
| IMAP host / port / SSL | imap.ionos.co.uk / 993 / SSL enabled |
| IMAP username | hello@neoncandy.online |
| Monitored folder | INBOX |
| Storage of password | Encrypted in Liftor \`inbox_credentials\` (encrypted with \`INBOX_CREDENTIALS_KEY\`) + Mandy's password manager |
| Owner | Mandy King |
| Status | active / live_ready |
| Last 4 | not displayed |
| Recovery | IONOS control panel → mailbox password reset → update encrypted credential in Liftor |
| Notes | Daily send cap currently 10 (IONOS new-mailbox warm-up limit). |

### C. Disabled NeonCandy Sender — music@neoncandy.net

| Field | Value |
|-------|-------|
| System | Legacy mailbox |
| Email | music@neoncandy.net |
| Purpose | Old / test / simulated path only |
| Storage of password | Historical only (do not surface) |
| Owner | Mandy King |
| Status | **disabled / historical** |
| Last 4 | not displayed |
| Recovery | n/a — do not restore for operational use |
| Notes | Forbidden for sending, fallback, campaign, staging, queue creation, inbound routing, AI replies, or business default sender. Sanity reason code: \`NEONCANDY_INVALID_INBOX\`. |

### D. Apollo

| Field | Value |
|-------|-------|
| System | Apollo.io |
| Login | Mandy's Apollo account |
| Plan | Basic monthly · 1 seat · 2,500 credits/month |
| API key name | \`Liftor - NeonCandy\` |
| Key type | Master API key |
| Used for | People API Search, Person Enrichment, Bulk Person Enrichment |
| Endpoints | \`/api/v1/mixed_people/api_search\`, \`/api/v1/people/bulk_match\`, \`/api/v1/people/match\`, \`/api/v1/people/show\` |
| Storage of API key | Encrypted in Liftor Apollo connection settings (encrypted with \`APOLLO_ENCRYPTION_KEY\`) |
| Owner | Mandy King |
| Status | active |
| Last 4 | not displayed |
| Recovery | Apollo dashboard → Settings → API → revoke + regenerate → re-paste into Liftor connection (will be re-encrypted) |
| Notes | People Search does not return emails — enrichment is required for deliverable addresses. |

### E. IONOS Account

| Field | Value |
|-------|-------|
| System | IONOS hosting / mail |
| Domain | neoncandy.online |
| Email | hello@neoncandy.online |
| Purpose | Real SMTP / IMAP for NeonCandy outreach |
| Storage | IONOS account credentials in Mandy's password manager; mailbox SMTP/IMAP password encrypted in Liftor |
| Owner | Mandy King |
| Status | active |
| Last 4 | not displayed |
| Recovery | IONOS account recovery → reset mailbox password → update encrypted credential in Liftor |
| Notes | Provider enforces a 24h rolling new-mailbox sending cap; can be raised via IONOS support after warm-up. |

### F. Social / Music Account Access Map

> Login routes only — no raw passwords. All passwords live in Mandy's
> password manager.

| Account | Login route | Owner | Status |
|---------|-------------|-------|--------|
| Neural Frames | Google login | Mandy | active |
| MusicHero | Username + Google login | Mandy | active |
| Facebook (NeonCandy page) | Meta / mobile-number route | Mandy | active |
| Instagram \`@neoncandyofficial\` | Linked through Meta route | Mandy | active |
| YouTube \`@neoncandyofficial\` | Google / new music-related email | Mandy | active |
| Metricool | NeonCandy / music-related email | Mandy | active |
| ManyChat | Meta / Google route — connected to Instagram + Facebook | Mandy | active |
| DistroKid | Mandy's personal Gmail login | Mandy | active |
| Lorca | Mandy's Gmail login | Mandy | active |

### G. PPL / PRS / Distribution Paperwork

- Track paperwork status separately from this manual.
- Confirm which PPL / PRS / distribution registrations are complete.
- Do **not** assume all registrations are done.
- When confirmed, add a row per registration here with: registry name,
  artist/track ID, date submitted, date confirmed, owner.

---

## SECTION 1 — PLATFORM OVERVIEW

Liftor AI is an AI infrastructure platform capable of building, deploying, running, and optimising AI systems for multiple organisations simultaneously.

### Purpose

The platform acts as an **AI operating system for organisations**, providing end-to-end lifecycle management from proposal generation through to live system monitoring, optimisation, and strategic intelligence.

### Platform Capabilities

- **Design & Build** — AI-powered proposal generation, system architecture design, template-based rapid deployment
- **Deploy & Launch** — Staged deployment pipelines with checklists, monitoring, and rollback capability
- **Run & Monitor** — Real-time system monitoring, AI agent management, workflow execution tracking
- **Optimise & Evolve** — AI Brain intelligence layer providing automated insights, decisions, and strategic recommendations
- **Scale & Expand** — Template library for venture creation, multi-organisation management, platform expansion system

### Platform Supports

- Internal companies and operations
- External client organisations
- Automation workflows across industries
- AI agents for task execution
- AI decision systems for strategic intelligence
- Venture creation using reusable templates

### Live Platform Statistics

| Metric | Count |
|--------|-------|
| Organisations | ${data.orgCount} |
| Monitored Systems | ${data.systemCount} |
| AI Agents | ${data.agentCount} |
| Automation Workflows | ${data.workflowCount} |
| Integrations | ${data.integrationCount} |
| Deployments | ${data.deploymentCount} |
| System Templates | ${data.templateCount} |
| Knowledge Entries | ${data.knowledgeCount} |
| Architectures | ${data.architectureCount} |
| Launched Platforms | ${data.launchedPlatformCount} |
| Brain Insights | ${data.brainInsightCount} |
| Decision Recommendations | ${data.decisionCount} |
| Build Log Entries | ${data.buildLogCount} |
| Test Runs Completed | ${data.testRunCount} |

### Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + TypeScript |
| UI Framework | Tailwind CSS + shadcn/ui |
| State Management | @tanstack/react-query |
| Routing | react-router-dom v6 |
| Animations | framer-motion |
| Charts | recharts |
| Backend | Lovable Cloud (Supabase PostgreSQL) |
| Edge Functions | Deno serverless runtime |
| AI Gateway | Lovable AI (google/gemini-3-flash-preview) |
| Auth | Supabase Auth (email/password) |
| Storage | 5 private Supabase Storage buckets |

---

## SECTION 2 — FULL PLATFORM ARCHITECTURE

The Liftor AI platform is structured across six architectural layers, each serving a distinct operational role.

### Layer 1 — Public Platform

The public-facing marketing and acquisition layer. No authentication required.

| Module | Route | Purpose |
|--------|-------|---------|
| Homepage | \`/\` | Brand positioning, value proposition, CTA |
| What We Build | \`/what-we-build\` | Service catalogue and capability overview |
| Industries | \`/industries\` | Industry-specific AI solution positioning |
| Method | \`/method\` | Engineering methodology and delivery process |
| Case Studies | \`/case-studies\` | Client success stories and project outcomes |
| Partner Program | \`/partners\` | Partner recruitment and referral programme |
| Project Discovery | \`/project-discovery\` | Client onboarding and requirements gathering |
| About | \`/about\` | Company information and team |
| AI Proposal Generator | \`/ai-proposal\` | AI-powered proposal generation using Gemini |

**Layout:** Navbar + Footer wrapper. SEO-optimised with semantic HTML, meta tags, and structured content.

### Layer 2 — Platform Infrastructure

The backend infrastructure powering all platform operations.

- **PostgreSQL Database** — 50+ tables with Row-Level Security on every table
- **Authentication** — Supabase Auth with email/password, email verification required
- **Edge Functions** — 3 Deno serverless functions (generate-proposal, founder-copilot, platform-testing)
- **Storage** — 5 private buckets (project-documents, partner-documents, knowledge-documents, organisation-documents, compliance-documents)
- **Role System** — app_role enum (admin, moderator, user, founder, partner) with security-definer function for role checks

### Layer 3 — Enterprise Platform Management

Client-facing systems for managing AI projects and monitoring deployed systems.

**Client Portal** (15 routes, ProtectedRoute guard):
- Dashboard, Projects, Documents, Messages, Support
- Maintenance suite (Dashboard, Schedule, Updates, Feature Requests)
- System Monitoring, Control Panel, System Detail
- Analytics, Optimisation

**Partner Portal** (7 routes, PartnerRoute guard):
- Dashboard, Opportunities, Projects, Documents, Messages

### Layer 4 — Platform Operations Control

Operational management layer for cross-platform coordination.

- **Global Operations** — Aggregated operational intelligence across all systems
- **Organisation Management** — Multi-tenant organisation directory with members, documents, and industry tracking
- **Access Control** — Platform roles, audit logging, anomaly detection
- **Security & Compliance** — Compliance items, compliance documents, security monitoring
- **Template Library** — Reusable system templates for rapid deployment
- **Platform Expansion** — Venture launcher with launch checklists and staged rollout

### Layer 5 — Founder Control Systems

Founder-exclusive command layer with 39 routes (FounderRoute guard).

- **Command Center** — Real-time operational hub
- **Revenue Console** — Financial tracking and analysis
- **Founder Manual** — This self-updating documentation system
- **Platform Testing** — Automated validation suite
- **AI Co-Pilot** — Conversational AI assistant with live platform context

### Layer 6 — AI Brain Layer

Autonomous intelligence layer providing platform-wide insights and strategic recommendations.

- **Brain Core** — Insight generation, learning records, recommendations
- **Decision Engine** — Structured decision support with benefits/risks analysis
- **Strategy Engine** — Strategic intelligence and market signal processing
- **Optimisation Engine** — Performance optimisation across workflows, agents, and systems
- **Brain Orchestrator** — Signal flow coordination (Observation → Learning → Optimisation → Decision → Strategy)
- **Founder AI Co-Pilot** — Conversational interface to all brain intelligence

---

## SECTION 3 — PLATFORM INFRASTRUCTURE MODULES

### Proposal Generator
**Route:** \`/ai-proposal\` (public)
**Edge Function:** \`generate-proposal\`
**Purpose:** AI-powered project proposal generation for prospective clients. Uses google/gemini-3-flash-preview with structured tool calling to output suggested_solution, estimated_scope, and estimated_timeline based on client requirements (industry, project types, business problem, processes to automate, scale, timeline).

### Client Portal
**Routes:** 15 protected routes under \`/portal/*\`
**Guard:** ProtectedRoute (any authenticated user)
**Purpose:** Client-facing project management interface. Clients view their own projects, documents, messages, support tickets, and maintenance schedules. System monitoring shows real-time status of deployed AI systems. Analytics and optimisation dashboards provide performance insights. All data scoped via RLS to client's profile.

### Founder Console
**Routes:** 39 protected routes under \`/founder/*\`
**Guard:** FounderRoute (checks user_roles for 'founder')
**Purpose:** Central command interface for the platform founder/CEO. Provides unrestricted visibility across all organisations, systems, agents, workflows, deployments, revenue, and strategic intelligence. FounderLayout provides consistent sidebar navigation.

### Partner Portal
**Routes:** 7 protected routes under \`/partner/*\`
**Guard:** PartnerRoute (checks user_roles for 'partner')
**Purpose:** Partner management interface for referral and agency partners. Partners submit opportunities, track project conversions, manage documents, and communicate via messaging. Partner deals track commission and project value.

### Subscription Maintenance System
**Routes:** \`/portal/maintenance/*\` (4 sub-routes)
**Tables:** maintenance_events, feature_requests, subscriptions
**Purpose:** Client-facing maintenance management. Clients view scheduled maintenance, updates, and submit feature requests linked to their subscriptions. Founders manage all maintenance events and feature request statuses.

### Monitoring Dashboard
**Routes:** \`/founder/monitoring\`, \`/founder/monitoring/:id\`, \`/portal/monitoring\`
**Tables:** monitored_systems
**Purpose:** Real-time monitoring of all deployed client systems. Shows system status (operational/degraded/offline), links to client profiles and organisations. Client-side view is scoped to their own systems.

### Workflow Builder
**Routes:** \`/founder/workflows\`, \`/founder/workflows/:id\`
**Tables:** automation_workflows, workflow_steps
**Purpose:** Manage automation workflows with step definitions, execution tracking, success/failure counts, and automation type classification. Workflows are linked to monitored systems and can trigger AI agent assignments.

### AI Agent Management
**Routes:** \`/founder/agents\`, \`/founder/agents/:id\`
**Tables:** ai_agents, agent_system_assignments, agent_task_stats, agent_activity_logs, agent_alerts
**Purpose:** Registry and management of all AI agents deployed across client systems. Tracks agent function, status, task completion metrics, system assignments, activity logs, and alerts.

### Automation Execution Engine
**Routes:** \`/founder/executions\`, \`/founder/executions/:id\`
**Tables:** workflow_executions, execution_steps, execution_logs
**Purpose:** Execution lifecycle management for automation workflows. Tracks execution status, individual step progress, agent assignments per step, results, errors, and timing. Provides detailed audit trail via execution logs.

---

## SECTION 4 — ENTERPRISE PLATFORM MANAGEMENT

### Enterprise Process Automation Designer
**Route:** \`/founder/processes\`, \`/founder/processes/:id\`
**Purpose:** Business process design and documentation system. Maps organisational processes to automation opportunities, enabling structured automation planning before workflow creation.

### AI System Architecture Designer
**Routes:** \`/founder/architectures\`, \`/founder/architectures/:id\`
**Tables:** architectures, architecture_components, architecture_relationships
**Purpose:** Visual system architecture design tool. Create system architectures with typed components (custom, workflow, agent, integration), define relationships between components, and link architectures to deployments. Supports multiple system types (platform, automation, analytics).

### Deployment & Launch Manager
**Routes:** \`/founder/deployments\`, \`/founder/deployments/:id\`
**Tables:** deployments, deployment_stages, deployment_checklist, deployment_logs
**Purpose:** Staged deployment pipeline management. Each deployment progresses through ordered stages with completion tracking. Deployment checklists ensure all requirements are met before launch. Deployment logs provide audit trail. Links to architectures for system design traceability.

### Client System Control Panel
**Routes:** \`/portal/systems\`, \`/portal/systems/:id\`
**Purpose:** Client-facing system management interface. Clients view and interact with their deployed AI systems, monitor status, and access system-specific controls. Scoped to client's own systems via RLS.

### Analytics & Performance Dashboard
**Routes:** \`/founder/analytics\`, \`/portal/analytics\`
**Purpose:** Platform-wide and client-specific analytics. Aggregates workflow execution performance, agent task completion metrics, system health indicators, and automation efficiency data. Founder view shows global analytics; client view shows their own system metrics.

### Automation Optimisation Engine
**Route:** \`/founder/optimisation\`, \`/portal/optimisation\`
**Table:** optimisation_insights
**Purpose:** Generates and tracks performance optimisation recommendations at the entity level (workflow, agent, system). Each insight includes type (performance/efficiency/reliability), priority, recommended action, and status tracking. Feeds into the AI Brain for strategic decision support.

### Knowledge Base & System Memory
**Routes:** \`/founder/knowledge\`, \`/founder/knowledge/:id\`
**Tables:** knowledge_entries, knowledge_documents
**Purpose:** Platform knowledge management system. Stores operational knowledge, system documentation, procedures, and references. Entries can be linked to specific agents and workflows via linked_agent_ids and linked_workflow_ids arrays. Supports document attachments via knowledge-documents storage bucket.

### Lifecycle Management

Enterprise AI systems follow a managed lifecycle through the platform:

1. **Discovery** — Client requirements captured via Project Discovery or Partner opportunities
2. **Proposal** — AI-generated proposals via generate-proposal edge function
3. **Architecture** — System architecture designed in Architecture Designer
4. **Build** — Workflows, agents, and integrations created and configured
5. **Test** — Platform Testing Suite validates system components
6. **Deploy** — Staged deployment via Deployment Manager with checklists
7. **Monitor** — Real-time monitoring via Monitoring Dashboard
8. **Optimise** — Continuous optimisation via Optimisation Engine and AI Brain
9. **Maintain** — Ongoing maintenance via Subscription Maintenance System

---

## SECTION 5 — PLATFORM OPERATIONS CONTROL

### Global AI Operations Manager
**Route:** \`/founder/operations\`
**Purpose:** High-level operations dashboard aggregating cross-system operational data. Provides unified view of all active systems, organisations, and deployments. Enables founder to identify operational patterns, bottlenecks, and scaling opportunities across the entire platform.

### Multi-Organisation Management
**Routes:** \`/founder/organisations\`, \`/founder/organisations/:id\`
**Tables:** organisations, organisation_members, organisation_documents
**Purpose:** Multi-tenant organisation management. Each organisation has industry classification, status tracking, member management with roles (admin/editor/viewer), and document storage. Organisations link to monitored systems, enabling per-organisation system views. Currently managing ${data.orgCount} organisations.

**Multi-Organisation Support:**
- Each organisation operates in an isolated data environment via RLS
- Organisation members can only view their own organisation's data
- Founders have cross-organisation visibility
- Documents stored in private organisation-documents bucket
- Systems, agents, and workflows are scoped to organisations via monitored_systems.organisation_id

### Role & Access Control System
**Route:** \`/founder/access-control\`
**Tables:** platform_roles, access_audit_log, access_anomalies, user_roles
**Purpose:** Platform-wide role management and access auditing. Defines platform roles with access levels, logs all access events for audit compliance, and detects access anomalies with severity classification and flagging.

**Role Architecture:**
- \`app_role\` enum: admin, moderator, user, founder, partner
- \`user_roles\` table: Maps users to roles (many-to-many)
- \`has_role()\` function: Security-definer function preventing recursive RLS checks
- \`platform_roles\` table: Defines custom platform roles with descriptions and access levels

### Security & Compliance Manager
**Route:** \`/founder/security\`
**Tables:** compliance_items, compliance_documents
**Purpose:** Security posture management and compliance tracking. Compliance items track regulatory requirements with review schedules. Compliance documents stored in private compliance-documents bucket. Integrates with access anomaly detection.

### System Template Library
**Routes:** \`/founder/templates\`, \`/founder/templates/:id\`
**Table:** system_templates
**Purpose:** Reusable system templates enabling rapid deployment of standardised AI systems. Templates define system configurations that can be instantiated for new organisations. Currently managing ${data.templateCount} templates. Template types support various AI system patterns.

### Platform Expansion / Venture Launcher
**Routes:** \`/founder/expansion\`, \`/founder/expansion/:id\`
**Tables:** launched_platforms, launch_checklist
**Purpose:** Platform scaling and venture creation system. Enables launching new platform instances for organisations using templates. Each launch follows a checklist workflow ensuring all requirements are met. Tracks industry targeting, organisation assignment, and launch status. Currently ${data.launchedPlatformCount} platforms launched.

---

## SECTION 6 — FOUNDER CONTROL SYSTEMS

### Founder Console
**Route:** \`/founder\` (39 sub-routes)
**Component:** FounderLayout (sidebar) + FounderRoute (guard)
**Purpose:** Central management interface providing the founder/CEO with unrestricted visibility and control over every aspect of the platform.

**Founder Visibility Across:**

| Domain | Dashboard | Key Metrics |
|--------|-----------|-------------|
| Architecture | Architecture Designer | System designs, component relationships |
| Operations | Global Operations, Command Center | System status, workflow execution, agent performance |
| Revenue | Revenue Console | Revenue streams, source attribution, currency tracking |
| Ventures | Platform Expansion | Launched platforms, template usage, industry coverage |
| Platform Scale | Analytics, Monitoring | ${data.systemCount} systems, ${data.agentCount} agents, ${data.workflowCount} workflows |
| Intelligence | AI Brain, Decisions, Strategy | ${data.brainInsightCount} insights, ${data.decisionCount} decisions |
| Quality | Platform Testing | ${data.testRunCount} test runs completed |

### Founder Revenue Console
**Route:** \`/founder/revenue\`
**Table:** revenue_records
**Purpose:** Financial dashboard tracking revenue with source attribution (source_name, source_type), client organisation linking, multi-currency support (GBP primary), and period-based analysis. Provides revenue trend visualisation and source breakdown.

### Founder Manual (This Document)
**Route:** \`/founder/manual\`
**Purpose:** Self-updating engineering-level platform documentation. Automatically regenerates from live platform data. Supports Markdown and PDF export. Contains 15 sections covering complete platform architecture, build history, and operational documentation.

### Platform Testing Dashboard
**Route:** \`/founder/testing\`
**Tables:** platform_test_runs, platform_test_results
**Edge Function:** platform-testing
**Purpose:** Automated platform validation suite. Triggers 20+ tests across all modules, displays results grouped by module, maintains test run history. Validates data integrity, CRUD operations, and cross-module references.

---

## SECTION 7 — AI BRAIN ARCHITECTURE

The AI Brain is a multi-layer autonomous intelligence system that processes platform signals and generates actionable insights for the founder.

### AI Brain Core
**Route:** \`/founder/brain\`
**Tables:** brain_insights, brain_recommendations, brain_learning_records

**Insight Types:** performance, anomaly, opportunity, risk
**Priority Levels:** critical, high, medium, low
**Learning Categories:** automation, performance, operational

The Brain Core processes platform signals through a structured pipeline:
1. **Observation** — Raw data collection from platform systems
2. **Pattern Detection** — Identifying trends and anomalies in operational data
3. **Learning** — Recording patterns with confidence levels and source attribution
4. **Insight Generation** — Creating actionable insights with priority classification
5. **Recommendation Output** — Producing specific recommendations with affected system context

Currently tracking ${data.brainInsightCount} brain insights.

### Automation Optimisation Engine
**Route:** \`/founder/optimisation\`
**Table:** optimisation_insights

Generates performance optimisation recommendations at the entity level:
- **Entity Types:** workflow, agent, system
- **Insight Types:** performance, efficiency, reliability
- **Actions:** Each insight includes a recommended_action field with specific improvement steps
- **System Linking:** Insights can be linked to specific monitored_systems via system_id

### AI Decision Engine
**Route:** \`/founder/decisions\`
**Table:** decision_recommendations

Structured decision support system:
- **Categories:** operational, strategic, expansion
- **Status Flow:** pending → approved/rejected → implemented
- **Analysis Fields:** potential_benefits, potential_risks, target_module
- **Decision Tracking:** decision_maker, decided_at timestamp

Currently tracking ${data.decisionCount} decision recommendations.

### AI Strategy Engine
**Route:** \`/founder/strategy\`
**Table:** strategy_insights

Strategic intelligence and market signal processing:
- **Categories:** market_signal, competitive, expansion, operational
- **Confidence Levels:** high, medium, low
- **Industry Targeting:** target_industry field for market-specific insights
- **Status Tracking:** pending, active, implemented, archived

### AI Brain Orchestrator

Coordinates signal flow across all brain components:

\`\`\`
Platform Data → Observation → Learning Records → Optimisation Insights
                                                  ↓
                                    Decision Recommendations
                                                  ↓
                                      Strategy Insights
\`\`\`

Each stage processes and enriches signals before passing to the next layer. The orchestrator ensures that operational data flows upward into strategic intelligence.

### AI Brain Data Sources

| Source | Data Type | Brain Component |
|--------|-----------|-----------------|
| Automation Engine | Workflow success/failure rates, execution counts | Optimisation Engine |
| Analytics System | Performance metrics, trend data | Brain Core |
| Revenue Console | Revenue streams, growth patterns | Strategy Engine |
| Operations Manager | System health, operational status | Brain Core |
| Template Library | Template usage, deployment patterns | Strategy Engine |
| Knowledge Base | Operational knowledge, procedures | Brain Core |
| Agent System | Task completion, workload patterns | Optimisation Engine |
| Monitoring Dashboard | System status, health indicators | Brain Core |
| Deployment Manager | Deployment success, stage completion | Decision Engine |

### Founder AI Co-Pilot
**Route:** \`/founder/copilot\`
**Edge Function:** founder-copilot

Conversational AI interface backed by google/gemini-3-flash-preview with streaming responses. The system prompt is dynamically constructed by injecting real-time data from 9 platform tables:

1. automation_workflows (name, status, success/failure counts)
2. ai_agents (name, status, task metrics)
3. monitored_systems (system_name, status)
4. organisations (name, industry, status)
5. brain_insights (title, description, priority)
6. decision_recommendations (title, priority, status)
7. strategy_insights (title, category, confidence)
8. revenue_records (source, value, organisation)
9. system_templates (name, type, usage count)

---

## SECTION 8 — PLATFORM TESTING & VALIDATION SUITE

### Database Tables

**platform_test_runs**
| Column | Type | Purpose |
|--------|------|---------|
| id | uuid | Primary key |
| run_name | text | Test run identifier |
| status | text | passed / failed |
| total_tests | integer | Total tests executed |
| passed | integer | Tests passed |
| failed | integer | Tests failed |
| warnings | integer | Tests with warnings |
| duration_ms | integer | Total execution time |
| triggered_by | text | Who initiated the run |
| completed_at | timestamptz | Completion timestamp |
| created_at | timestamptz | Creation timestamp |

**platform_test_results**
| Column | Type | Purpose |
|--------|------|---------|
| id | uuid | Primary key |
| run_id | uuid | FK to platform_test_runs |
| module | text | Module being tested |
| test_name | text | Specific test name |
| status | text | passed / failed / warning |
| details | text | Test result details |
| duration_ms | integer | Individual test duration |

### Edge Function: platform-testing

The platform-testing edge function executes 20+ automated tests across all platform modules:

**Test Categories:**
1. **Organisation Tests** — Create test orgs, verify CRUD operations
2. **Automation Tests** — Read workflows, verify execution data
3. **AI Agent Tests** — Read agents, verify status and assignments
4. **System Tests** — Read monitored systems, verify status tracking
5. **Brain Tests** — Create/read insights, recommendations, learning records
6. **Decision Tests** — Create/read decision recommendations
7. **Strategy Tests** — Create/read strategy insights
8. **Deployment Tests** — Read deployment data and stages
9. **Architecture Tests** — Read architecture components
10. **Template Tests** — Read system templates
11. **Knowledge Tests** — Read knowledge entries
12. **Integration Tests** — Read integrations and status
13. **Build Log Tests** — Create test build log entries
14. **Optimisation Tests** — Read optimisation insights
15. **Security Tests** — Read platform roles, audit logs, compliance items
16. **Data Integrity Tests** — Check workflow-system references, agent-system references for orphans
17. **Manual Tests** — Read manual pages
18. **Execution Tests** — Read workflow executions
19. **Expansion Tests** — Read launched platforms
20. **Compliance Tests** — Read compliance items

**Test Lifecycle:**
1. Edge function receives request
2. Creates temporary test data with [TEST] prefix
3. Runs all validation tests sequentially
4. Records results to platform_test_runs and platform_test_results
5. Cleans up all test data (deletes [TEST] prefixed records)
6. Returns JSON with run_id, total, passed, failed, warnings, duration, and detailed results

### Testing Dashboard
**Route:** \`/founder/testing\`
**Features:**
- Health overview cards (total/passed/failed/warnings)
- "Run Full Validation" button triggering the edge function
- Tabbed results view grouped by module
- Test run history with timestamps and duration
- RLS: Founder-only ALL access on both tables

### Recent Test Runs

${data.recentTestRuns.length > 0 ? data.recentTestRuns.map(r => `- **${r.run_name}** — ${r.status.toUpperCase()} — ${r.passed}/${r.total_tests} passed — ${format(new Date(r.created_at), "MMM d, yyyy HH:mm")}`).join("\n") : "No test runs recorded yet."}

---

## SECTION 9 — DATABASE STRUCTURE

The platform uses 50+ PostgreSQL tables with Row-Level Security (RLS) enabled on every table.

### Core Platform Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| profiles | User profiles (auto-created on signup) | id, user_id, full_name |
| projects | Client projects | id, name, status, client_id |
| subscriptions | Client subscriptions | id, client_id, plan, status |
| user_roles | Role assignments (many-to-many) | user_id, role (app_role enum) |
| activity_log | Platform activity audit trail | event_type, description, entity_type, entity_id |

### Client System Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| monitored_systems | Deployed client systems | system_name, status, client_id, project_id, organisation_id |
| automation_workflows | Automation workflow definitions | name, status, automation_type, execution_count, success_count, failure_count, system_id |
| ai_agents | AI agent registry | name, agent_function, status, tasks_completed_total, tasks_pending, system_id |
| agent_system_assignments | Agent-to-system mappings | agent_id, system_id |
| agent_task_stats | Daily agent task metrics | agent_id, date, tasks_completed, tasks_failed, tasks_pending |
| agent_activity_logs | Agent activity audit trail | agent_id, action, details, system_name |
| agent_alerts | Agent alerts and warnings | agent_id, title, severity, affected_system, resolved |

### Workflow Execution Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| workflow_executions | Execution run records | workflow_id, system_id, status, started_at, completed_at |
| workflow_steps | Step definitions within workflows | workflow_id, step_name, order_index, agent_id |
| execution_steps | Per-execution step tracking | execution_id, step_name, status, result, error_message, agent_id |
| execution_logs | Detailed execution event logs | execution_id, event, step_name, details, result |

### AI Brain Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| brain_insights | AI-generated platform insights | title, insight_type, priority, source_module, system_affected, status |
| brain_recommendations | Brain-generated recommendations | title, priority, affected_system, status |
| brain_learning_records | Pattern learning records | pattern_description, category, confidence_level, source_system |

### Decision & Strategy Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| decision_recommendations | Structured decision support | title, category, priority, status, potential_benefits, potential_risks, target_module, decision_maker |
| strategy_insights | Strategic intelligence | title, category, confidence_level, target_industry, status |

### Architecture & Deployment Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| architectures | System architecture definitions | name, system_type, client_organisation, system_purpose, status |
| architecture_components | Components within architectures | name, component_type, architecture_id, agent_id, workflow_id, integration_id |
| architecture_relationships | Component relationships | source_component_id, target_component_id, relationship_label |
| deployments | Deployment records | system_name, client_organisation, status, architecture_id, expected_launch_date |
| deployment_stages | Staged deployment phases | deployment_id, name, status, order_index |
| deployment_checklist | Pre-launch requirements | deployment_id, item, completed, order_index |
| deployment_logs | Deployment event audit | deployment_id, event, details |

### Integration Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| integrations | External service integrations | name, service_type, auth_method, endpoint_url, status |
| integration_activity_logs | Integration event logs | integration_id, event_type, details |
| integration_alerts | Integration alerts | integration_id, title, severity, resolved |
| integration_linked_systems | Integration-to-entity mappings | integration_id, entity_type, entity_id, entity_name |

### Knowledge & Documentation Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| knowledge_entries | Knowledge base content | title, entry_type, category, content, linked_agent_ids, linked_workflow_ids |
| knowledge_documents | Knowledge attachments | knowledge_entry_id, name, file_path, file_size |
| manual_pages | Manual page definitions | module_name, section, purpose, core_functions, version, order_index |
| manual_versions | Manual version history | version_number, summary |

### Organisation Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| organisations | Client organisations | name, industry, status, primary_contact |
| organisation_members | Organisation membership | organisation_id, user_id, role, status |
| organisation_documents | Organisation documents | organisation_id, name, file_path, category |

### Expansion Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| launched_platforms | Launched platform instances | name, organisation_name, industry, template_id, status |
| launch_checklist | Launch requirements | platform_id, item, completed, order_index |
| system_templates | Reusable system templates | name, template_type, usage_count |

### Security & Compliance Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| platform_roles | Platform role definitions | name, access_level, description |
| access_audit_log | Access event audit trail | user_id, action, details, ip_address |
| access_anomalies | Detected access anomalies | anomaly_type, severity, user_id, flagged |
| compliance_items | Compliance requirements | area, status, last_review_date, next_review_date |
| compliance_documents | Compliance documentation | name, category, file_path |

### Partner Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| partner_applications | Partner programme applications | company_name, partner_type, status, user_id |
| partner_opportunities | Partner-submitted opportunities | company_name, industry, project_description, partner_id, status |
| partner_deals | Partner deal tracking | project_name, project_value, partner_commission, deal_status |
| partner_documents | Opportunity documents | opportunity_id, name, file_path |
| partner_messages | Opportunity messaging | opportunity_id, user_id, content |

### Build & Testing Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| build_log_entries | Engineering build log (append-only) | title, change_type, module_affected, author, description |
| platform_test_runs | Test run metadata | run_name, status, total_tests, passed, failed, warnings |
| platform_test_results | Individual test results | run_id, module, test_name, status, details, duration_ms |

### Client Portal Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| feature_requests | Client feature requests | title, description, business_impact, subscription_id, user_id, status |
| maintenance_events | Scheduled maintenance | title, description, scheduled_date, subscription_id, status |

### RLS Policy Architecture

Every table implements Row-Level Security:
- **Founder policies** — \`has_role(auth.uid(), 'founder')\` grants ALL access
- **Client policies** — SELECT scoped to user's profile/subscription/organisation
- **Partner policies** — SELECT scoped to partner's own submissions
- **System policies** — INSERT allowed for trigger-based activity logging
- **Security function** — \`has_role(_user_id, _role)\` is SECURITY DEFINER to prevent recursive RLS

### Database Functions

| Function | Type | Purpose |
|----------|------|---------|
| handle_new_user() | Trigger | Creates profiles row on auth.users insert |
| has_role(_user_id, _role) | Security Definer | Non-recursive role check for RLS policies |
| update_updated_at_column() | Trigger | Auto-updates updated_at timestamps |
| log_new_proposal() | Trigger | Logs proposals to activity_log |
| log_new_support_request() | Trigger | Logs support requests to activity_log |
| log_new_opportunity() | Trigger | Logs partner opportunities to activity_log |

### Storage Buckets

| Bucket | Access | Purpose |
|--------|--------|---------|
| project-documents | Private | Client project files |
| partner-documents | Private | Partner opportunity documents |
| knowledge-documents | Private | Knowledge base attachments |
| organisation-documents | Private | Organisation files |
| compliance-documents | Private | Compliance documentation |

---

## SECTION 10 — EDGE FUNCTIONS

### generate-proposal
**Path:** \`supabase/functions/generate-proposal/index.ts\`
**Purpose:** AI-powered project proposal generation for prospective clients.
**Model:** google/gemini-3-flash-preview via Lovable AI gateway (ai.gateway.lovable.dev)
**Auth:** LOVABLE_API_KEY
**Method:** POST with tool calling

**Input Schema:**
\`\`\`json
{
  "projectTypes": ["string"],
  "businessProblem": "string",
  "processesToAutomate": ["string"],
  "projectScale": "string",
  "timeline": "string",
  "industry": "string"
}
\`\`\`

**Output Schema (via tool call):**
\`\`\`json
{
  "suggested_solution": "string",
  "estimated_scope": "string",
  "estimated_timeline": "string"
}
\`\`\`

**Error Handling:** 429 (rate limiting), 402 (credit exhaustion), 500 (general error)

### founder-copilot
**Path:** \`supabase/functions/founder-copilot/index.ts\`
**Purpose:** Conversational AI assistant with real-time platform context injection.
**Model:** google/gemini-3-flash-preview with streaming
**Auth:** LOVABLE_API_KEY + SUPABASE_SERVICE_ROLE_KEY

**Context Injection:** Fetches live data from 9 tables before each response:
automation_workflows, ai_agents, monitored_systems, organisations, brain_insights, decision_recommendations, strategy_insights, revenue_records, system_templates

**System Prompt:** Dynamically constructed with platform data, guidelines for structured responses, and founder-appropriate communication style.

**Response Format:** Server-Sent Events (SSE) stream for real-time typing effect.

### platform-testing
**Path:** \`supabase/functions/platform-testing/index.ts\`
**Purpose:** Automated platform validation suite with 20+ tests.
**Auth:** SUPABASE_SERVICE_ROLE_KEY (bypasses RLS)

**Execution Flow:**
1. Create test data with [TEST] prefix
2. Run validation tests across all modules
3. Record results to platform_test_runs / platform_test_results
4. Clean up test data
5. Return JSON results

**Test Coverage:** Organisations, Automations, Agents, Systems, Brain, Decisions, Strategy, Deployments, Architectures, Templates, Knowledge, Integrations, Build Log, Optimisation, Security, Data Integrity, Manual, Executions, Expansion, Compliance

---

## SECTION 11 — NAVIGATION & ROUTES

### Public Routes (9 routes)

| Route | Page | Purpose |
|-------|------|---------|
| \`/\` | Index | Homepage |
| \`/what-we-build\` | WhatWeBuild | Services |
| \`/industries\` | Industries | Industry solutions |
| \`/method\` | Method | Methodology |
| \`/case-studies\` | CaseStudies | Case studies |
| \`/partners\` | PartnerProgram | Partner programme |
| \`/project-discovery\` | ProjectDiscovery | Client onboarding |
| \`/about\` | About | Company info |
| \`/ai-proposal\` | AIProposal | AI proposal generator |

### Auth Routes (4 routes)

| Route | Page | Purpose |
|-------|------|---------|
| \`/portal/login\` | PortalLogin | Sign in |
| \`/portal/signup\` | PortalSignup | Create account |
| \`/portal/forgot-password\` | ForgotPassword | Password reset request |
| \`/portal/reset-password\` | ResetPassword | Password reset |

### Client Portal Routes (15 routes)

| Route | Page | Purpose |
|-------|------|---------|
| \`/portal/dashboard\` | Dashboard | Client overview |
| \`/portal/projects\` | Projects | Project list |
| \`/portal/projects/:id\` | ProjectDetail | Project detail |
| \`/portal/documents\` | Documents | Document management |
| \`/portal/messages\` | Messages | Messaging |
| \`/portal/support\` | Support | Support tickets |
| \`/portal/maintenance\` | MaintenanceDashboard | Maintenance overview |
| \`/portal/maintenance/schedule\` | MaintenanceSchedule | Maintenance calendar |
| \`/portal/maintenance/updates\` | MaintenanceUpdates | Update history |
| \`/portal/maintenance/features\` | FeatureRequests | Feature requests |
| \`/portal/monitoring\` | ClientSystemMonitoring | System monitoring |
| \`/portal/systems\` | ClientControlPanel | System control |
| \`/portal/systems/:id\` | ClientSystemDetail | System detail |
| \`/portal/analytics\` | ClientAnalytics | Analytics |
| \`/portal/optimisation\` | ClientOptimisation | Optimisation |

### Founder Console Routes (39 routes)

| Route | Page | Category |
|-------|------|----------|
| \`/founder\` | FounderOverview | Overview |
| \`/founder/command-center\` | CommandCenter | Operations |
| \`/founder/copilot\` | FounderCoPilot | AI Brain |
| \`/founder/brain\` | BrainCore | AI Brain |
| \`/founder/decisions\` | DecisionEngine | AI Brain |
| \`/founder/strategy\` | StrategyEngine | AI Brain |
| \`/founder/operations\` | GlobalOperations | Operations |
| \`/founder/organisations\` | OrganisationDirectory | Management |
| \`/founder/organisations/:id\` | OrganisationProfile | Management |
| \`/founder/revenue\` | FounderRevenue | Finance |
| \`/founder/analytics\` | FounderAnalytics | Intelligence |
| \`/founder/optimisation\` | OptimisationDashboard | Intelligence |
| \`/founder/proposals\` | FounderProposals | Sales |
| \`/founder/proposals/:id\` | ProposalDetail | Sales |
| \`/founder/pipeline\` | LeadPipeline | Sales |
| \`/founder/projects\` | FounderProjects | Delivery |
| \`/founder/projects/:id\` | FounderProjectDetail | Delivery |
| \`/founder/monitoring\` | MonitoringDashboard | Systems |
| \`/founder/monitoring/:id\` | MonitoringSystemDetail | Systems |
| \`/founder/agents\` | AgentDirectory | AI Systems |
| \`/founder/agents/:id\` | AgentProfile | AI Systems |
| \`/founder/workflows\` | WorkflowDirectory | Automation |
| \`/founder/workflows/:id\` | WorkflowDetail | Automation |
| \`/founder/executions\` | ExecutionDashboard | Automation |
| \`/founder/executions/:id\` | ExecutionDetail | Automation |
| \`/founder/processes\` | ProcessDirectory | Automation |
| \`/founder/processes/:id\` | ProcessDetail | Automation |
| \`/founder/architectures\` | ArchitectureDirectory | Engineering |
| \`/founder/architectures/:id\` | ArchitectureDetail | Engineering |
| \`/founder/deployments\` | DeploymentDirectory | Engineering |
| \`/founder/deployments/:id\` | DeploymentDetail | Engineering |
| \`/founder/integrations\` | IntegrationDirectory | Engineering |
| \`/founder/integrations/:id\` | IntegrationDetail | Engineering |
| \`/founder/activity\` | FounderActivity | Audit |
| \`/founder/knowledge\` | KnowledgeDirectory | Knowledge |
| \`/founder/knowledge/:id\` | KnowledgeDetail | Knowledge |
| \`/founder/access-control\` | AccessControl | Security |
| \`/founder/security\` | SecurityDashboard | Security |
| \`/founder/templates\` | TemplateDirectory | Templates |
| \`/founder/templates/:id\` | TemplateDetail | Templates |
| \`/founder/expansion\` | PlatformExpansion | Growth |
| \`/founder/expansion/:id\` | PlatformLaunchDetail | Growth |
| \`/founder/manual\` | FounderManual | Documentation |
| \`/founder/manual/:id\` | ManualPageDetail | Documentation |
| \`/founder/build-log\` | BuildLog | Documentation |
| \`/founder/documents\` | FounderDocuments | Documentation |
| \`/founder/testing\` | PlatformTesting | Quality |

### Partner Portal Routes (7 routes)

| Route | Page | Purpose |
|-------|------|---------|
| \`/partner\` | PartnerDashboard | Partner overview |
| \`/partner/opportunities\` | PartnerOpportunities | Opportunity management |
| \`/partner/opportunities/:id\` | PartnerOpportunityDetail | Opportunity detail |
| \`/partner/projects\` | PartnerProjects | Project tracking |
| \`/partner/projects/:id\` | PartnerProjectDetail | Project detail |
| \`/partner/documents\` | PartnerDocuments | Document management |
| \`/partner/messages\` | PartnerMessages | Messaging |

---

## SECTION 12 — DEPLOYMENT ARCHITECTURE

### Frontend Application

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Framework | React 18 + Vite | SPA with hot module replacement |
| Language | TypeScript | Type safety across all components |
| Styling | Tailwind CSS | Utility-first CSS with HSL semantic tokens |
| Components | shadcn/ui | Accessible, customisable component library |
| State | @tanstack/react-query | Server state management with caching |
| Routing | react-router-dom v6 | Client-side routing with nested layouts |
| Animations | framer-motion | Declarative motion components |
| Charts | recharts | Data visualisation for dashboards |
| Hosting | Lovable hosting | Automatic deployment on code changes |

### Backend Infrastructure

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Database | PostgreSQL (Lovable Cloud) | 50+ tables with full RLS |
| Auth | Supabase Auth | Email/password with verification |
| Edge Functions | Deno runtime | 3 serverless functions (auto-deployed) |
| Storage | Supabase Storage | 5 private buckets for documents |
| AI Gateway | Lovable AI (ai.gateway.lovable.dev) | Access to Gemini models without API keys |

### Component Interaction

\`\`\`
[Browser] → [React SPA] → [Supabase Client SDK] → [PostgreSQL + RLS]
                ↓
         [Edge Functions] → [Lovable AI Gateway] → [Gemini Models]
                ↓
         [Supabase Storage] → [Private Buckets]
\`\`\`

### Authentication Flow

1. User submits email/password at \`/portal/signup\`
2. Supabase Auth creates user in auth.users
3. \`handle_new_user()\` trigger creates profiles row
4. Email verification sent (no auto-confirm)
5. User verifies email and logs in at \`/portal/login\`
6. AuthContext stores session, provides user state
7. Route guards (ProtectedRoute/FounderRoute/PartnerRoute) check auth + roles
8. RLS policies enforce data access at the database level

### Secrets

| Secret | Purpose |
|--------|---------|
| SUPABASE_SERVICE_ROLE_KEY | Unrestricted DB access in edge functions |
| SUPABASE_DB_URL | Direct database connection |
| SUPABASE_PUBLISHABLE_KEY | Client-side Supabase access |
| LOVABLE_API_KEY | AI gateway authentication |
| SUPABASE_URL | Supabase project URL |
| SUPABASE_ANON_KEY | Anonymous/public Supabase access |

---

## SECTION 13 — PLATFORM BUILD LOG

The Build Log is an append-only engineering record stored in the \`build_log_entries\` table. RLS allows founder INSERT and SELECT only — no UPDATE or DELETE — ensuring immutability.

### Full Platform Build History

The following is the complete chronological build sequence of the Liftor AI platform:

**Phase 1 — Foundation**
1. React + Vite + TypeScript project scaffolded
2. Tailwind CSS + shadcn/ui design system configured
3. Dark-themed UI with HSL-based semantic tokens in index.css
4. Component library initialised (40+ shadcn components)

**Phase 2 — Public Website**
5. 9 public marketing pages created (Index, WhatWeBuild, Industries, Method, CaseStudies, PartnerProgram, ProjectDiscovery, About, AIProposal)
6. Navbar + Footer layout components
7. SEO optimisation with meta tags and semantic HTML
8. Responsive design across all breakpoints

**Phase 3 — Authentication System**
9. Supabase Auth configured with email/password
10. Login, Signup, Forgot Password, Reset Password pages
11. AuthContext provider for session management
12. ProtectedRoute component for client portal access
13. profiles table created with handle_new_user trigger

**Phase 4 — Client Portal**
14. PortalLayout component created
15. 15 client portal routes implemented
16. Dashboard, Projects, ProjectDetail, Documents, Messages, Support pages
17. Maintenance suite (Dashboard, Schedule, Updates, Feature Requests)
18. System Monitoring, Control Panel, SystemDetail, Analytics, Optimisation pages

**Phase 5 — Core Database Schema**
19. profiles, projects, subscriptions tables created
20. monitored_systems table with client/project/org references
21. automation_workflows table with execution tracking
22. ai_agents table with system assignments
23. user_roles table with app_role enum (admin, moderator, user, founder, partner)
24. RLS policies applied to all tables
25. has_role() security-definer function created

**Phase 6 — Founder Console Foundation**
26. FounderLayout sidebar with 39 navigation items
27. FounderRoute guard (checks user_roles for 'founder')
28. FounderOverview dashboard page

**Phase 7 — System Monitoring & Agent Management**
29. MonitoringDashboard + MonitoringSystemDetail pages
30. AgentDirectory + AgentProfile pages
31. agent_system_assignments, agent_task_stats, agent_activity_logs, agent_alerts tables

**Phase 8 — Workflow & Execution Engine**
32. WorkflowDirectory + WorkflowDetail pages
33. ExecutionDashboard + ExecutionDetail pages
34. workflow_executions, workflow_steps, execution_steps, execution_logs tables

**Phase 9 — Integration & Architecture Systems**
35. IntegrationDirectory + IntegrationDetail pages
36. integrations, integration_activity_logs, integration_alerts, integration_linked_systems tables
37. ArchitectureDirectory + ArchitectureDetail pages
38. architectures, architecture_components, architecture_relationships tables

**Phase 10 — Deployment & Organisation Management**
39. DeploymentDirectory + DeploymentDetail pages
40. deployments, deployment_stages, deployment_checklist, deployment_logs tables
41. OrganisationDirectory + OrganisationProfile pages
42. organisations, organisation_members, organisation_documents tables

**Phase 11 — Knowledge, Templates & Expansion**
43. KnowledgeDirectory + KnowledgeDetail pages
44. knowledge_entries, knowledge_documents tables
45. TemplateDirectory + TemplateDetail pages
46. system_templates table
47. PlatformExpansion + PlatformLaunchDetail pages
48. launched_platforms, launch_checklist tables

**Phase 12 — Analytics, Optimisation & Security**
49. FounderAnalytics page
50. OptimisationDashboard page + optimisation_insights table
51. AccessControl + SecurityDashboard pages
52. platform_roles, access_audit_log, access_anomalies tables
53. compliance_items, compliance_documents tables

**Phase 13 — Command Center & Operations**
54. CommandCenter dashboard page
55. GlobalOperations dashboard page
56. ProcessDirectory + ProcessDetail pages

**Phase 14 — AI Proposal Generator**
57. AIProposal public page
58. generate-proposal edge function (Gemini AI with tool calling)

**Phase 15 — Partner Portal**
59. PartnerLayout + PartnerRoute components
60. 7 partner portal routes
61. partner_applications, partner_opportunities, partner_deals tables
62. partner_documents, partner_messages tables

**Phase 16 — AI Brain Layer**
63. BrainCore page + brain_insights, brain_recommendations, brain_learning_records tables
64. DecisionEngine page + decision_recommendations table
65. StrategyEngine page + strategy_insights table

**Phase 17 — Founder AI Co-Pilot**
66. FounderCoPilot page with chat interface
67. founder-copilot edge function (streaming Gemini AI with 9-table context injection)

**Phase 18 — Revenue & Financials**
68. FounderRevenue page + revenue_records table

**Phase 19 — Build Log & Manual v1**
69. BuildLog page + build_log_entries table (append-only with CSV/MD export)
70. FounderManual v1 + ManualPageDetail pages
71. manual_pages, manual_versions tables

**Phase 20 — Platform Testing Suite**
72. PlatformTesting page
73. platform-testing edge function (20+ automated tests)
74. platform_test_runs, platform_test_results tables

**Phase 21 — Founder Manual v4 (Current)**
75. Complete rebuild with 15 engineering-level sections
76. Self-updating architecture pulling live platform data
77. Markdown + PDF export system
78. Full platform build history reconstruction

### Recent Build Log Entries

${data.recentBuildLogs.length > 0 ? data.recentBuildLogs.map(e => `- **${e.title}** — ${e.change_type.replace(/_/g, " ")} — Module: ${e.module_affected || "—"} — ${e.author} — ${format(new Date(e.created_at), "MMM d, yyyy HH:mm")}`).join("\n") : "No build log entries recorded yet. Use the Build Log dashboard at /founder/build-log to add entries."}

---

## SECTION 14 — DOCUMENTATION ENGINE (SELF-UPDATING MANUAL)

### Architecture

The Founder Manual is a self-updating documentation system that automatically regenerates from live platform data on every page load.

### Data Sources

The manual pulls live statistics from the following platform tables:

| Table | Data Extracted | Section Used |
|-------|---------------|--------------|
| organisations | Count | Sections 1, 5 |
| automation_workflows | Count | Sections 1, 6 |
| ai_agents | Count | Sections 1, 6 |
| integrations | Count | Section 1 |
| deployments | Count | Section 1 |
| system_templates | Count | Sections 1, 5 |
| knowledge_entries | Count | Section 1 |
| brain_insights | Count | Sections 1, 7 |
| decision_recommendations | Count | Sections 1, 7 |
| platform_test_runs | Count + recent runs | Section 8 |
| build_log_entries | Count + recent entries | Section 13 |
| manual_pages | Count | Section 1 |
| monitored_systems | Count | Sections 1, 6 |
| architectures | Count | Section 1 |
| launched_platforms | Count | Sections 1, 5 |

### Update Mechanism

1. User navigates to \`/founder/manual\`
2. React Query fetches live counts from all platform tables in parallel
3. ManualLiveData interface aggregates all statistics
4. generateManualMarkdown() function constructs complete documentation using live data
5. UI renders all 15 sections with current statistics
6. Export functions generate Markdown/PDF with real-time data embedded

### No Manual Maintenance Required

Because the documentation is generated from the actual database state, it never becomes stale. Adding new organisations, agents, workflows, or running tests will immediately be reflected in the manual's statistics and recent activity sections.

---

## SECTION 15 — EXPORT SYSTEM

### Markdown Export

The full Founder Manual can be exported as a structured Markdown document (.md file) containing all 15 sections with live platform data embedded at the time of export.

**Usage:** Click "Export Markdown" button on the Founder Manual page.
**Output:** \`liftor-ai-founder-manual-YYYY-MM-DD.md\`
**Content:** Complete engineering documentation with tables, code blocks, and hierarchical headings.

### PDF Export

The manual can be exported as a formatted PDF document using the browser's native print functionality with optimised print styles.

**Usage:** Click "Export PDF" button on the Founder Manual page.
**Output:** Browser print dialog with PDF option.
**Formatting:** Print-optimised styles remove navigation chrome, expand all sections, and format tables for paper output.

### Export Use Cases

| Audience | Format | Purpose |
|----------|--------|---------|
| Engineering Team | Markdown | Technical reference, onboarding, system reconstruction |
| Investors | PDF | Due diligence, technical capability demonstration |
| Operations | PDF | Operational procedures, compliance documentation |
| Partners | PDF | Platform capability overview, integration documentation |
| Audit | PDF | Security review, compliance evidence |

---

*End of Liftor AI Founder Manual v4.0*
*Self-updating documentation generated from live platform state.*
*${now}*
`;
};
