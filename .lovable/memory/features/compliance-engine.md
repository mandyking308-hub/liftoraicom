---
name: legal-compliance-engine
description: Visibility-first (non-blocking) compliance engine — rule-based risk detection across CRM, outreach, proposals, procurement, and finance, with jurisdiction profiles, severity-weighted scoring, entity + business risk trends, false-positive control, rule hit-frequency tracking, deal-close compliance snapshots, and a founder dashboard.
type: feature
---
Phase-1 compliance layer. Read-only over existing systems; never blocks an action — flags + scores + logs only. Future enforcement upgrade is wired via `compliance_rules.enforcement_mode` (log_only/warn/block, default log_only).

**Tables:**
- `compliance_rules` (+ `hit_count`, `last_hit_at` — auto-incremented per event via `bump_rule_hit_count` trigger).
- `compliance_events` (+ `resolution_note`, `resolved_at` — `resolved_at` auto-stamped when `resolved` flips true).
- `jurisdiction_profiles`, `contract_templates` — unchanged.
- `compliance_scores` (+ `previous_score`, `risk_trend` text up/stable/down, `high_risk` bool — auto when score>70).
- `business_risk_scores` (new) — `business_name` unique, `score`, `previous_score`, `risk_trend`, `high_risk`, `event_count`, `last_event_at`.
- `deals.compliance_score_at_close` — snapshot stamped on WON via `snapshot_deal_compliance_on_won` trigger (max of contact + business risk).

**Engine:** single dispatcher `run_compliance_checks(entity_type, entity_id)` routes to `compliance_check_outbound_communication`, `compliance_check_contact`, `compliance_check_demo`, `compliance_check_proposal`, `compliance_check_assignment`, `compliance_check_invoice`, `compliance_check_payment`. Each calls `log_compliance_event(rule_name, entity_type, entity_id, business, jurisdiction, flag_type, message, metadata)` which (1) inserts the event, (2) writes a summary row to `activity_log` with `event_type='compliance_flag'`, (3) calls `recompute_compliance_score(entity_type, entity_id)` (severity weights low=5, medium=15, high=30, critical=50; aggregated over the last 30 days, capped 0–100).

**v2 scoring & trends:**
- `recompute_compliance_score` now uses a 7-day window for the current score and 8–14d window for `previous_score`. Trend = up if Δ>+5, down if Δ<-5, else stable. `high_risk = (score>70)`. After update, cascades to `recompute_business_risk_score(business_name)` using the latest event business.
- `recompute_business_risk_score(_business_name)` aggregates the same way at business level (same weights, same trend logic, same threshold).
- `refresh_all_business_risk_scores()` rebuilds all rows; called once at migration time.

**Triggers (AFTER, never block):** `communications` (outbound), `contacts` (insert), `demo_access` (insert), `internal_proposals` (insert + status→sent), `assignments` (insert), `invoices` (insert + status/due_date update), `payments` (insert).
Plus v2 triggers: `bump_rule_hit_count` (AFTER INSERT on compliance_events), `stamp_compliance_event_resolution` (BEFORE UPDATE), `snapshot_deal_compliance_on_won` (BEFORE UPDATE on deals).

**Seeded rules (16):** outreach_do_not_contact (critical), outreach_consent_required (high, EU), outreach_frequency_cap (medium, >5/24h), outreach_unsubscribe_missing (medium), data_source_missing (low), data_cross_border (high, GDPR contact assigned to non-EU/UK business), demo_weak_token (high, <24 chars), demo_long_expiry (medium, >60d), proposal_non_binding_missing (medium), proposal_template_missing (medium), delivery_supplier_not_approved (critical), delivery_jurisdiction_mismatch (medium), delivery_sla_missing (low), finance_overdue_14d (high), finance_large_value (medium, ≥50k), finance_payment_orphan (critical).

**Seeded jurisdictions (6):** UK, EU, US, CA, AE, GLOBAL (default fallback).

**Pages:**
- `/founder/compliance` — KPIs (7d events, criticals, **HIGH_RISK entities**, **HIGH_RISK businesses**), severity breakdown, jurisdiction coverage, **high-risk entities table with trend arrow**, **business-level risk table with previous-score + trend**, recent alert feed.
- `/founder/compliance/events` — filter by severity/open, **resolve dialog with resolution_note** capture; resolved rows show truncated note inline.
- `/founder/compliance/rules` — grouped by category, ordered by hit_count desc per group; **Hits column** (destructive >50, default >10), toggle active, switch enforcement_mode for future phase.
- `/founder/legal` (FounderLegalConsole) — policy versions and acceptance records; linked as **Legal Console** beside **Compliance**.

**Access:** all five tables admin-only RLS via `has_role(auth.uid(),'admin')`. Triggers and helper functions are SECURITY DEFINER with `SET search_path TO 'public'`.

**Safety guarantees:** no blocking, no data deletion, no enforcement. Every check writes both `compliance_events` and `activity_log`. Every entity defaults to `GLOBAL` jurisdiction when no country is known.
