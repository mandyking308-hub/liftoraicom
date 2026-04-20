---
name: Strategic System Upgrades
description: Cross-cutting upgrades layered on top of existing modules — inbox scaling, contact enrichment, intent scoring, proposal/AI quality control, retry hardening, supplier load balancing, integrity checks, expanded health metrics, standardised logging, and a global test/live mode flag.
type: feature
---

**Tables / columns added:**
- `system_settings(key, value jsonb)` — global flags. `system_mode` defaults to `"test"` (no real sends until flipped to `"live"`). `get_system_mode()` reads it.
- `inboxes` + `emails_sent_today`, `reply_rate_per_inbox`, `bounce_rate_per_inbox`, `performance_score` (0–100).
- `contacts` + `company_size` (small/medium/large), `industry`, `linkedin_url`, `seniority` (junior/manager/director/c-level), `enriched_at`, `intent_score` (0–100).
- `conversations` + `intent_score`.
- `internal_proposals` + `proposal_quality_score`, `quality_flags jsonb`.
- `ai_actions` + `ai_quality_flag` (pass/fail/regenerated), `quality_reason`, `regenerated`.
- `retry_queue` + `retry_reason`, `last_error_message`, `business_name`, `escalated`.
- `suppliers` + `active_assignment_count`, `max_concurrent_assignments` (default 5).
- `activity_log` + `business_name` (standardised logging).

**Functions:**
- `recompute_inbox_performance(_inbox_id)` / `recompute_all_inbox_performance()` — recalc per-inbox sent/reply/bounce + composite performance score.
- `pick_inbox_for_business(_business)` — now orders by `performance_score DESC, reputation_score DESC, last_used_sequence_position ASC, current_send_count ASC`.
- `enrich_contact(_id)` / `enrich_all_contacts()` — assigns industry (per business), company size, seniority (regex from role + fallback), linkedin URL.
- `compute_intent_score(_contact_id)` / `recompute_all_intent_scores()` — replies +30, multi-reply +20, demo +25, proposal viewed +15, –5 per day inactivity.
- `priority_score_contact()` — engagement now blends demo activity + conversation_active + 0.7×intent_score (weight redistributed to 30/20/20/20/–10).
- `score_proposal_quality(_id)` — completeness/clarity/pricing buckets, flags `missing_solution`, `no_architecture`, `pricing_outside_band`, etc.; auto-runs on proposal insert/update via trigger.
- `evaluate_ai_reply(_text)` — checks ≤120 words, has CTA, no 4-gram repetition. Caller decides regenerate.
- `escalate_retry_failure(_retry_id)` — after 3 retries logs critical `retry_exhausted` system_event and marks queue row failed.
- `recompute_supplier_load(_supplier_id)` + trigger `trg_assignments_load` — keeps `active_assignment_count` in sync on assignment change.
- `pick_supplier_for_deal(_deal_id)` — APPROVED + business + skills match + load < max, ordered by lowest load → highest score → most recent activity.
- `validate_system_integrity()` — counts orphan proposals, deals without contact, assignments without deal, invoices without deal, queue without inbox; logs each as a system_event and writes activity_log row.
- `compute_system_health()` — extended with `avg_response_time` (AI latency 7d), `proposal_conversion_rate` (sent→accepted 30d), `demo_to_deal_rate` (high-intent demos→won deals 30d), `supplier_utilisation_rate`.
- `log_activity(_event_type, _description, _entity_type?, _entity_id?, _business_name?)` — standardised logger.

**Inbox scaling:**
- Migration provisions inboxes so each business has at least 5 (target 6). Schema supports up to 10+.
- Picker prefers high-performing inboxes and deprioritises low-reputation ones (already pauses < 20 via existing throttle).

**Test mode rule:** `get_system_mode()` returns `'test'` by default — outbound senders should treat this as "log + simulate, no real SMTP". Flip via `UPDATE system_settings SET value='"live"'::jsonb WHERE key='system_mode'`.
