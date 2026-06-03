# AI Compliance Control Layer

Founder-only spine for AI compliance readiness across Liftor's AI-operated businesses.

## Purpose

Make Liftor evidence-ready and diligence-ready for advisers and buyers across:
- AI system inventory and risk classification
- Data flows and lawful basis
- Human oversight, approval gates and kill-switch records
- Evidence catalogue (policies, audit logs, approval logs, data flows, vendor records)
- Compliance gaps and remediation actions

It does **not** claim legal compliance or certification. Wording is restricted to
"AI compliance readiness", "evidence-ready", "control evidence", "risk classification",
"human oversight", "approval-gated", "adviser review required", "legal review required",
"not legal advice".

## Routes (founder-protected via `FounderRoute`)

- `/founder/ai-compliance` — Control Overview, summary cards, "What needs Mandy today".
- `/founder/ai-compliance/systems` — AI System Inventory (CRUD).
- `/founder/ai-compliance/data-flows` — Data Flow Register (CRUD).
- `/founder/ai-compliance/oversight` — Human Oversight + Approval/Intervention log.
- `/founder/ai-compliance/evidence` — Evidence Pack index.
- `/founder/ai-compliance/risk` — Per-system Risk Classifier with reasons.
- `/founder/ai-compliance/gaps` — Gaps & Actions (live-synthesised + tracked).

No public route. No `authenticated`-tier access beyond founder role.

## Tables

All `public.*`, RLS enforced by `public.has_role(auth.uid(), 'founder'::app_role)`:

- `ai_compliance_systems`
- `ai_data_flow_records`
- `ai_human_oversight_records`
- `ai_compliance_evidence_items`
- `ai_compliance_gap_actions`

Each table has GRANTs to `authenticated` (gated by RLS) and full to `service_role`.
`updated_at` is maintained by the shared `public.update_updated_at_column` trigger.

## Risk classification logic

`classifyRisk(system, ctx)` in `src/lib/aiComplianceEngine.ts` is deterministic and
returns `{ level, score, reasons[] }`. Weighted factors (additive score):

| Factor                                           | + score |
| ------------------------------------------------ | ------- |
| external_action_capable                          | 3       |
| autonomy ∈ semi/autonomous/external_action       | 2       |
| sensitive data                                   | 2       |
| children data                                    | 3       |
| health data                                      | 3       |
| financial data                                   | 2       |
| legal data                                       | 2       |
| personal data                                    | 1       |
| external surface (internal_or_external ≠ internal) | 1     |
| purpose touches regulated keywords               | 2       |
| not founder-confirmed                            | 1       |
| no scheduled review                              | 1       |
| review overdue                                   | 2       |
| missing data-flow record                         | 2       |
| no oversight events                              | 1       |

Thresholds: `score ≥ 9 → critical`, `≥ 6 → high`, `≥ 3 → medium`, else `low`.

## Gap engine

`synthesizeGaps()` computes gaps live from current state. Founder can "materialise"
them into `ai_compliance_gap_actions` to track owner/due/status. Rules:

- high/critical business profile with zero systems → `high` gap, founder decision.
- business has systems but no approval triggers → `medium` gap, founder decision.
- system without a matching data-flow record → `medium` (or `high` if personal/sensitive).
- system with personal/sensitive data and no oversight events → `high`, founder decision.
- external-action capable system in a business with no triggers → `critical`, founder decision.
- system not founder-confirmed → `low`, founder decision.
- system with overdue `next_review_due_at` → `medium`.

## Founder approval / oversight rules

- AI may recommend and prepare actions only.
- No external sending, buyer/adviser contact, data export, payment, entity change,
  legal/tax decision, external publishing or live send is triggered from this
  module. The page does not modify outreach state (Smartlead/Apollo,
  `auto_send_enabled`, etc.).
- Every external action elsewhere in the platform should record a row in
  `ai_human_oversight_records` via `recordOversight()`.

## Evidence Pack logic

Evidence items are pointers into other modules (policies, audit logs, approval
logs, vendor records, etc.). The Pack page shows live counts of inventoried
systems, data flows, oversight events and evidence items so reviewers can see
whether the underlying state matches what evidence claims. Export to PDF/CSV is
not yet wired — the UI exposes the data first.

## What this system does **not** claim

- It is **not** an EU AI Act certification.
- It is **not** legal, tax or compliance advice.
- "Evidence-ready" ≠ "legally compliant". Adviser/legal review is required for
  regulated decisions.
- Risk classification is deterministic and based on declared metadata, not a
  guarantee of safety.

## Known limitations

- Evidence Pack does not generate a downloadable export yet.
- Synthesised gaps are recomputed in the browser; for very large tenants this
  should move to a server-side cron.
- Cross-references to other modules are read-only links; no two-way sync.
- Oversight events must currently be logged manually or via `recordOversight()`
  from approval flows; no automatic ingestion yet.

## Adviser / legal review boundary

The system surfaces signals and gaps. It does **not** decide:

- whether a business is legally permitted to operate in a jurisdiction
- whether a marketing claim is legally defensible
- whether a data transfer is lawful
- whether an AI use case meets sector-specific regulatory requirements

Those decisions require a qualified adviser. The "adviser review required"
status exists explicitly for that handoff.
---

## Command Centre integration (v2)

A compact `AIComplianceControlPanel` is rendered inside `/founder/command-centre`
(directly after `FounderAlertEscalationPanel`, before `WhatNeedsAttentionToday`). It
reads live from the 5 compliance tables and reports:

- AI compliance status: `clear` / `needs_review` / `blocked`
- inventoried systems, high/critical count, external-action count, sensitive-data count
- open compliance gaps, founder decisions required, next review due
- a "What needs Mandy today" list of real founder-decision items only

Status logic (`aggregateCommandCentre`):

- `blocked` — any open critical gap, or any external-action system without oversight,
  or any sensitive-data system without a data-flow record
- `needs_review` — open gaps, founder items pending, or zero systems inventoried
- `clear` — none of the above

Founder navigation: a sidebar entry `AI Compliance Control` → `/founder/ai-compliance`
is registered in `FounderLayout`.

## Module scan (idempotent backfill)

`scanInternalModules()` writes/updates `ai_compliance_systems` from
`MODULE_SCAN_REGISTRY`, which currently covers: AI Gateway, Liftor Brain, AI Usage
Ledger, AI Approval Gates, AI Security Centre, AI Queue Control, AI Live
Operations, Agent Capabilities, Business Compliance Rules, Privacy, Incidents,
Audit Ledger, Policies, Connectors, Scheduled Jobs, Data Ingestion Centre,
Smartlead Outreach, Apollo Lead Sourcing, Social Publishing (Metricool), Revenue
Autopilot, Customer Sales, Quote to Cash, M&A Portfolio Exit Intelligence.

Rules:
- Lookup key: `system_name` with `business_id IS NULL` (global rows).
- Insert when missing.
- Update only missing/blank fields, never overwrite founder-confirmed rows.
- Risk level is only raised, never lowered automatically.
- All seeded rows start `founder_confirmed = false`, `current_status = 'under_review'`.
- External-action seeds default to `high` or `critical` risk.

## Gap synthesis (hardened)

`synthesizeGapsExtended` builds on `synthesizeGaps` and adds rules for:
no systems inventoried, high/critical not founder-confirmed, external-action
without oversight evidence, sensitive-data without data flow, regulated-data
without review evidence, missing/stale review dates, evidence pack missing for
high/critical systems, missing policy evidence, missing incident escalation
evidence. Dedup is keyed on
`business_id | system_id | gap_title`.

`materialiseGapsIdempotent` only inserts gaps that don't already exist as
`open / in_progress / blocked` — `done` and `parked` gaps are not reopened.

## Evidence roll-up

`rollupEvidence` aggregates the evidence index across canonical categories
(AI gateway, AI usage ledger, approval gates, audit ledger, business compliance,
privacy, incidents, policies, security/access, connectors, scheduled jobs,
external action gates, technical manual, user manual). Empty categories render as
`Not available yet` — no fake data is ever inserted.

## Safety constraints (unchanged)

This layer never:
- enables external sending or changes Smartlead campaign/Apollo/auto_send_enabled state
- calls paid APIs, exports data, contacts advisers or buyers
- changes public routes, RLS, secrets, or legal/tax/entity settings
- writes fake prospects, customers, revenue or compliance evidence

It only recommends, classifies and surfaces real records. External and irreversible
actions remain founder approval-gated.
