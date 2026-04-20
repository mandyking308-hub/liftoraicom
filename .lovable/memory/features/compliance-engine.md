---
name: legal-compliance-engine
description: Visibility-first (non-blocking) compliance engine — rule-based risk detection across CRM, outreach, proposals, procurement, and finance, with jurisdiction profiles, severity-weighted scoring, and a founder dashboard.
type: feature
---
Phase-1 compliance layer. Read-only over existing systems; never blocks an action — flags + scores + logs only. Future enforcement upgrade is wired via `compliance_rules.enforcement_mode` (log_only/warn/block, default log_only).

**Tables:** `compliance_rules` (name, category enum outreach/data_privacy/contracts/delivery/payments, jurisdiction, severity enum low/medium/high/critical, description, active, enforcement_mode, conditions jsonb), `compliance_events` (rule_id, entity_type enum contact/campaign/message/proposal/demo/deal/assignment/supplier/invoice/payment, entity_id, business_name, jurisdiction, severity, flag_type, message, metadata, resolved), `jurisdiction_profiles` (country unique, region, gdpr_applicable, email_marketing_allowed, consent_required, data_transfer_restrictions, notes), `contract_templates` (business_name, template_name, jurisdiction, template_text, version, active), `compliance_scores` (entity_type+entity_id unique, score 0–100, event_count, last_event_at).

**Engine:** single dispatcher `run_compliance_checks(entity_type, entity_id)` routes to `compliance_check_outbound_communication`, `compliance_check_contact`, `compliance_check_demo`, `compliance_check_proposal`, `compliance_check_assignment`, `compliance_check_invoice`, `compliance_check_payment`. Each calls `log_compliance_event(rule_name, entity_type, entity_id, business, jurisdiction, flag_type, message, metadata)` which (1) inserts the event, (2) writes a summary row to `activity_log` with `event_type='compliance_flag'`, (3) calls `recompute_compliance_score(entity_type, entity_id)` (severity weights low=5, medium=15, high=30, critical=50; aggregated over the last 30 days, capped 0–100).

**Triggers (AFTER, never block):** `communications` (outbound), `contacts` (insert), `demo_access` (insert), `internal_proposals` (insert + status→sent), `assignments` (insert), `invoices` (insert + status/due_date update), `payments` (insert).

**Seeded rules (16):** outreach_do_not_contact (critical), outreach_consent_required (high, EU), outreach_frequency_cap (medium, >5/24h), outreach_unsubscribe_missing (medium), data_source_missing (low), data_cross_border (high, GDPR contact assigned to non-EU/UK business), demo_weak_token (high, <24 chars), demo_long_expiry (medium, >60d), proposal_non_binding_missing (medium), proposal_template_missing (medium), delivery_supplier_not_approved (critical), delivery_jurisdiction_mismatch (medium), delivery_sla_missing (low), finance_overdue_14d (high), finance_large_value (medium, ≥50k), finance_payment_orphan (critical).

**Seeded jurisdictions (6):** UK, EU, US, CA, AE, GLOBAL (default fallback).

**Pages:** `/founder/compliance` (dashboard — 7d KPIs, severity breakdown, jurisdiction coverage, top high-risk entities, recent alert feed), `/founder/compliance/events` (filterable by severity/open, mark-resolved), `/founder/compliance/rules` (grouped by category; toggle active; switch enforcement_mode for future phase). Existing `/founder/legal` (FounderLegalConsole — policy versions and user acceptance records) remains and is now linked from the sidebar as **Legal Console**, beside the new **Compliance** entry.

**Access:** all five tables admin-only RLS via `has_role(auth.uid(),'admin')`. Triggers and helper functions are SECURITY DEFINER with `SET search_path TO 'public'`.

**Safety guarantees:** no blocking, no data deletion, no enforcement. Every check writes both `compliance_events` and `activity_log`. Every entity defaults to `GLOBAL` jurisdiction when no country is known.
