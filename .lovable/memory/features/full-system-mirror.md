---
name: Full System Mirror & Deep Audit Layer
description: Auto-generated mirror of every page, content fragment, backend object, workflow, rule, integration and data flow with coverage validation and rebuild functions.
type: feature
---

**Tables (founder-only RLS):**
- `system_pages_index` — every route (public/auth/portal/founder/partner/supplier).
- `system_content` — visible text fragments (heading/button/body/email/template) per page.
- `system_backend_objects` — tables, functions, triggers, edge functions (kind/name/schema unique).
- `system_workflows_full` + `system_workflow_steps` — top-level flows (lead_to_payment, reply_to_proposal, demo_to_deal, deal_to_invoice, deal_to_assignment, assignment_to_completion, compliance_oversight, priority_engine, oversight_recovery, proposal_to_demo) with ordered steps.
- `system_rules` — compliance / priority / timing / oversight rules with condition/action/severity/source_function.
- `system_integrations_full` — outbound_email, inbound_webhook, supplier_rpc, ai_gateway, other.
- `system_data_flows` — entity→entity dependency graph.
- `system_changes` — append-only ledger (founder insert via has_role).
- `system_versions` — global manual snapshots, auto-bumped on rebuild.
- `system_coverage_reports` — output of validate_full_system_coverage runs.

**Functions:**
- `rebuild_full_manual()` — regenerates pages/backend/workflows/rules/integrations/flows from live state (information_schema for tables/functions/triggers + canonical seed for edge fns/rules/workflows). Bumps version, logs to `system_changes` + `activity_log`.
- `validate_full_system_coverage()` — counts documented vs total pages/tables/functions/workflows/rules. Logs critical `system_event` for each gap (event_type `coverage_gap_table` / `coverage_gap_function`). Writes weighted coverage score (25/25/25/12/13).
- `record_system_change(entity_type, entity_id, entity_key, change_type, summary, manual_version?)` — helper used by other modules.

**Founder UI:** `/founder/manual/full` — `FullSystemMirror.tsx` with tabs Overview, Pages, Content, Backend, Workflows, Rules, Integrations, Data Flows. Coverage strip (score, gaps, version, counts). Search across all tabs. Buttons: Rebuild Manual, Validate Coverage. Sidebar entry "System Mirror" (Layers icon).

**Initial run:** 100% coverage, 0 gaps — 97 pages, 138 tables, 136 functions, 10 workflows, 19 rules.

**Hardening (final):**
- `system_version_diffs` table stores compare_system_versions outputs (added/removed/modified counts + diff_summary jsonb).
- Functions: `compare_system_versions(a,b)`, `validate_runtime_vs_documentation()` (workflow steps reference real tables; mismatch → critical event), `detect_orphan_content()` (system_content not linked to page/feature → medium event), `export_full_system_snapshot()` (full JSON dump), `auto_partial_rebuild()` (DDL event trigger handler).
- Coverage hardened: any score <100% or gaps>0 → critical `coverage_below_100` event + activity_log alert. Each undocumented table/function emits its own critical event. Coverage score now uses 7-component weighting (pages/tables/functions = 20 each, workflows/rules/integrations/flows = 10 each).
- Event trigger `auto_mirror_rebuild_trigger` fires on CREATE/ALTER/DROP TABLE|FUNCTION|TRIGGER → logs to system_changes + runs rebuild_full_manual.
- Cron jobs: `mirror-coverage-6h` (every 6h), `mirror-runtime-12h` (every 12h), `mirror-orphan-daily` (daily 03:00).
- UI tabs added at /founder/manual/full: Versions, Diffs (compare form + history), Validation (3 manual triggers + latest detail), Export (JSON download).
