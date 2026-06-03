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