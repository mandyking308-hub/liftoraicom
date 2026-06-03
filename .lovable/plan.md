# Liftor Global AI Compliance Control Layer

A founder-only compliance spine that ties together AI system inventory, data flows, human oversight, approval gates, evidence and risk classification — built on top of the existing business compliance, privacy, incidents, audit and AI usage modules.

## Scope

In scope:
- New founder route `/founder/ai-compliance` (founder-protected, no public access).
- 5 new Supabase tables + RLS, plus a deterministic risk classifier in TypeScript.
- Cross-links to existing modules (business compliance, approvals, privacy, incidents, AI usage, policies). No duplication.
- Gap engine that turns existing business compliance signals into actionable items.
- Evidence Pack view (UI/data only, no PDF export yet).
- Tests for the risk classifier + smoke render test.
- Internal docs: `docs/AI_COMPLIANCE_CONTROL_LAYER.md`.

Out of scope (explicit):
- No external sending, no API calls, no Smartlead/Apollo/outreach state changes.
- No PDF/CSV export wired up yet.
- No "EU AI Act certified" claims — wording stays "readiness / evidence-ready / approval-gated".
- No seeded fake customers/revenue.

## Routes

- `/founder/ai-compliance` (Overview) — summary cards + "What needs Mandy today".
- `/founder/ai-compliance/systems` — AI System Inventory.
- `/founder/ai-compliance/data-flows` — Data Flow Register.
- `/founder/ai-compliance/oversight` — Human Oversight + Approval/Intervention Log.
- `/founder/ai-compliance/evidence` — Evidence Pack.
- `/founder/ai-compliance/risk` — Risk Classifier explorer.
- `/founder/ai-compliance/gaps` — Gaps & Actions.

All wrapped in `FounderRoute`, registered alongside existing founder routes in `App.tsx`.

## Database (single migration)

Tables, all founder/service-role only (no anon, no authenticated read for non-founders — enforced via `has_role(auth.uid(),'founder')` policy that already exists in the project):

1. `ai_compliance_systems` — inventory of AI systems, autonomy level, data sensitivity flags, external action capability, risk level, review dates.
2. `ai_data_flow_records` — source→destination flows, data categories, lawful basis, retention, cross-border, review status.
3. `ai_human_oversight_records` — every approval/rejection/override/escalation/kill-switch, with decision_by and evidence link.
4. `ai_compliance_evidence_items` — pointers to evidence (policy, audit log, approval log, etc.) with review status.
5. `ai_compliance_gap_actions` — open gaps surfaced by the engine, severity, owner, due date, status.

Each table:
- `id uuid pk`, `created_at`, `updated_at` with trigger.
- Full GRANT block (service_role full; authenticated SELECT/INSERT/UPDATE/DELETE so founder UI works; no anon).
- RLS: only users with `founder` role can read/write (uses existing `has_role` SECURITY DEFINER function).

## Code structure

- `src/lib/aiComplianceEngine.ts` — fetch/upsert helpers, risk classifier, gap synthesis, summary aggregator. Pure functions where possible.
- `src/lib/__tests__/aiComplianceEngine.test.ts` — unit tests for `classifyRisk()` and `synthesizeGaps()` (deterministic, no Supabase).
- `src/pages/founder/ai-compliance/_shared.tsx` — layout, tabs, status badges (mirrors `business-compliance/_shared`).
- `src/pages/founder/ai-compliance/Overview.tsx` + `Systems.tsx` + `DataFlows.tsx` + `Oversight.tsx` + `Evidence.tsx` + `Risk.tsx` + `Gaps.tsx`.
- `src/components/founder/ai-compliance/` — `SystemRowDialog`, `DataFlowDialog`, `OversightDialog`, `WhatNeedsMandyPanel`, `EvidencePackView`.
- Register routes in `src/App.tsx` and add a nav entry in the founder sidebar (wherever the existing AI/compliance links live).

## Risk classifier (deterministic)

`classifyRisk(system)` returns `{ level, score, reasons[] }`. Scoring adds points for: external_action_capable, autonomy ∈ {semi_autonomous, autonomous_internal, external_action_capable}, sensitive/children/health/financial/legal data, outbound contact, regulated-domain purpose keywords, missing data flow, missing oversight, missing founder confirmation, stale/no review date. Thresholds → low/medium/high/critical. Reasons are returned so the UI can show why.

## Gap engine

`synthesizeGaps({ businessProfiles, systems, flows, oversight, triggers })` emits gap rows for:
- critical/high business profile with zero systems inventoried
- system with no matching data flow record
- system with sensitive/personal data but no oversight events ever
- external_action_capable system with no approval trigger covering it
- system with no founder_confirmed
- review overdue (next_review_due_at < now)

Persisted into `ai_compliance_gap_actions` only on explicit founder action ("Materialise gaps") — by default we compute them live to avoid noise. This keeps the table for tracked, owned actions.

## UI principles

- Reuse `tech-card`, existing badge palette, founder layout.
- Empty states say what's missing and link to the right module instead of fabricating data.
- "What needs Mandy today" panel = only items with `founder_decision_required = true` OR severity ∈ {high, critical} OR review overdue.

## Integrations (read-only cross-references)

- Business compliance: reuse `businessComplianceEngine` for profiles/triggers → feed gap engine.
- Approval gates: when an approval decision is recorded elsewhere, expose helper `recordOversightFromApproval()` for future wiring; do not modify existing approval modules in this pass.
- Privacy / incidents / policies / AI usage: Evidence Pack reads from existing tables if present; otherwise shows "evidence missing — link from <module>".

## Safety guarantees

- No edits to outreach/Smartlead/Apollo/auto_send_enabled.
- No new secrets, no edge functions, no external API calls.
- No public routes added.
- Existing routes untouched apart from adding new ones.

## Acceptance checks

- `/founder/ai-compliance` renders behind FounderRoute.
- CRUD for systems / data flows / oversight against Supabase.
- Gap engine produces meaningful items from real data.
- Evidence Pack reflects real state with clear empty states.
- `classifyRisk` unit tests pass.
- Build passes.

## Execution order

1. Write & submit migration (5 tables + RLS + GRANTs + updated_at trigger reuse).
2. After approval: add engine + tests.
3. Add pages, dialogs, shared layout, route registration, sidebar link.
4. Add docs.
5. Verify build.