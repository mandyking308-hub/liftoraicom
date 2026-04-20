---
name: Oversight & Failsafe Engine
description: Rules-based monitoring layer that detects anomalies across every Liftor module, auto-retries safe operations, escalates critical issues, and snapshots system health metrics.
type: feature
---

**Tables (founder-only RLS):**
- `system_events` — event_type, entity_type/id, business_name, severity (low/medium/high/critical), message, metadata, resolved, resolved_at, resolution_note. Service role + founder can insert; founder can read/update.
- `retry_queue` — entity_type/id, action_type (send_email/ai_reply/assignment_retry), retry_count, next_retry_at, status (pending/completed/failed), last_error. Service role only writes; founder reads.
- `system_health` — time-series rows: metric_name, value, timestamp. Snapshots every 15 min.

**Functions:**
- `log_system_event(event_type, entity_type, entity_id, business_name, severity, message, metadata)` — dedups within 6h on (event_type, entity_type, entity_id, resolved=false), writes to activity_log, auto-creates a `system_tasks` escalate row when severity=critical and entity_type∈(contact/deal/assignment/conversation).
- `detect_anomalies()` — every 10 min via cron. Detects: email_queue stuck >30min (also enqueues retry), campaign with 50+ sends and 0 replies, AI conversation >20 actions/day, assignment idle >24h, invoice overdue >14d, compliance_score >70, inbox reputation <20.
- `auto_resolve_system_events()` — hourly. Marks events resolved when underlying state recovers (queue progressed, assignment updated, invoice paid/voided, compliance score recovered, inbox reputation ≥40).
- `process_retry_queue()` — every 5 min. Only safe action: requeue email_queue items by flipping status delayed/throttled→pending. Exponential backoff 5/15/60 min; after 3 attempts logs `retry_exhausted` critical event.
- `compute_system_health()` — every 15 min. Snapshots emails_sent_per_hour (1h), reply_rate (7d), conversion_rate (30d demos→won deals), assignment_completion_rate (30d), payment_collection_rate (30d).

**View:**
- `system_health_score` (security_invoker=true) — 0-100 weighted composite: reply×0.20 + conversion×0.20 + assignment×0.25 + payment×0.25 + emails/hr×0.10, minus 5 per open critical/high event.

**Cron jobs:**
- `detect-anomalies-10min` (*/10 * * * *)
- `auto-resolve-events-hourly` (0 * * * *)
- `process-retry-queue-5min` (*/5 * * * *)
- `compute-system-health-15min` (*/15 * * * *)

**Founder UI:**
- `/founder/system` — System Oversight dashboard: health score gauge, critical/active alerts, 7d resolution rate, latest metrics breakdown, active alerts table, retry queue table, manual "Run Detection" button.
- `/founder/system/events` — full event audit trail with active/resolved/all tabs and manual resolve action.
- `/founder/system/health` — 7d trend charts (recharts) for all 5 metrics.
- Sidebar item "System Oversight" (Siren icon) with destructive badge counting open critical+high events, refreshing every 30s.

**Safety:**
- No destructive auto-actions. Only requeue is auto-corrected; everything else flags + escalates.
- Severity drives behaviour: low=log only, medium=visible alert, high=highlighted, critical=auto-task + sidebar badge.
- All anomalies go through `log_system_event` (dedup) → activity_log entry with event_type='system_alert'.