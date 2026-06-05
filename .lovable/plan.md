# Human Workforce Control — Build Plan

A secure two-portal worker system with strict role isolation, time-windowed access, oversight review, and founder approval gates. No external sending, publishing, or data export.

## 1. Database (one migration)

New `app_role` enum values: `technical_operator`, `dubai_oversight`, `professional_reviewer`, `legal_research`, `admin_support`. (`admin` already exists for founder; `has_role` already exists.)

New tables (all with `GRANT`s + RLS):
- `worker_profiles`
- `worker_access_windows`
- `worker_sessions`
- `worker_tasks`
- `worker_task_logs`
- `worker_evidence_uploads`
- `worker_oversight_reviews`
- `worker_audit_events`
- `monthly_business_content_plans`
- `monthly_content_items`

Plus a small settings table `worker_kill_switch` (single row) for the emergency global lock.

### Security-definer helpers
- `current_worker_id()` — resolves `auth.uid()` → `worker_profiles.id`.
- `worker_has_active_window(worker_id, portal_type)` — checks active `worker_access_windows` AND not killed AND not revoked session.
- `is_kill_switch_active()`.

### RLS pattern
- Founder (`has_role(auth.uid(),'admin')`) = full read/write on everything.
- Workers can only `SELECT/UPDATE` their **own** rows on `worker_tasks`, `worker_task_logs`, `worker_evidence_uploads`, `worker_sessions`, scoped further by `worker_has_active_window`.
- Oversight roles can `SELECT` submitted tasks + logs + evidence assigned to workers, and `INSERT` `worker_oversight_reviews` (own rows only). They cannot edit task content.
- `monthly_content_items` and `monthly_business_content_plans`: workers read only items linked to their assigned tasks; only founder can flip `founder_approved_*`. `external_publish_blocked` defaults `true` and only founder may flip it.
- All tables: writes by anyone other than founder require an active access window for that portal.

## 2. Auth & Roles
- Reuse existing `user_roles` + `has_role`.
- After signup, founder assigns role via Human Workforce Control. New worker is `status='pending'` until activated.
- Operator login route validates role `technical_operator` only; oversight login route validates `dubai_oversight` or `professional_reviewer`.
- Founder remains on `/founder/*` — workers redirected away with toast.

## 3. Routes added in `src/App.tsx`
- `/operator-login`, `/operator-portal`
- `/oversight-login`, `/oversight-portal`
- `/founder/human-workforce-control`

Worker portals wrapped in `WorkerRoute` guard that:
1. Verifies session + role match for portal.
2. Calls RPC `assert_active_access_window(portal_type)`; on failure shows "No active access window. Please contact Mandy." and forces sign-out.
3. Starts a `worker_sessions` row, polls every 30s, force-logs-out at `end_time` or `login_at + max_session_minutes`.

## 4. Operator Portal UI
Single page, tabs:
- **Today** — active window countdown, assigned tasks list.
- **Task detail** — SOP/instructions, Start, Submit work log, Upload evidence (Supabase Storage bucket `worker-evidence`, private), Request clarification (creates log entry), Mark submitted.
No send/publish/delete/export/secrets buttons.

## 5. Oversight Portal UI
- Today's queue (tasks with `status='submitted'` assigned to operators).
- For each task: operator logs, evidence (signed URLs), risk flags.
- Buttons: Reviewed OK / Reviewed Issue / Escalated, notes, minutes spent.
- "Confirm today's oversight complete" → inserts daily summary audit event.

## 6. Founder Human Workforce Control UI
Single page with sub-tabs:
1. **Workers** — list, create, edit role/NDA/rate/status.
2. **Access** — today's windows, active sessions, force-logout, revoke, extend (+30/+60), create one-off window, **kill switch toggle**.
3. **Tasks** — assign, view all, approval queue (requires_founder_approval + submitted).
4. **Oversight** — review status, missed reviews.
5. **Monthly Content & Campaign Control** — per-business plan generator, plan/items table, approval gate.
6. **Business Onboarding** — form to create new business onboarding bundle (AI starter pack stub creates plan + operator + oversight tasks; no external calls).
7. **Audit log** — recent worker_audit_events.

## 7. Engines (`src/lib/`)
- `humanWorkforce.ts` — types, fetchers, session lifecycle helpers, kill switch.
- `monthlyContentPlanner.ts` — local deterministic generator that creates a 30-day skeleton plan + items + operator/oversight tasks (no external AI calls in this build).
- `__tests__/humanWorkforce.test.ts` — access window validation, kill switch precedence, session expiry math, role→portal mapping, external-action defaults.

## 8. Audit logging
Helper `logAuditEvent(event_type, portal_type, related_task_id?, metadata?)` called on: login, logout, forced_logout, failed_login, expired_session, task_view, task_edit, evidence_upload, review_action, founder_approval, kill_switch_toggle, window_created, window_revoked, window_extended.

## 9. Storage
Create private bucket `worker-evidence` via migration with RLS: workers can upload to `{worker_id}/{task_id}/...`; founder + matching oversight can read.

## 10. Sidebar / nav
Add **Human Workforce Control** entry to founder sidebar → `/founder/human-workforce-control`. No links to founder routes from worker portals.

## 11. Hard constraints honoured
- No external sending, publishing, Smartlead/Metricool/Gmail/GitHub/bank integration.
- `external_action_blocked` defaults `true` on `worker_tasks`; `external_publish_blocked` defaults `true` on `monthly_content_items`.
- No demo data inserted into live tables; UIs render real empty states.
- No secrets, env vars, or founder data surfaced in worker portals.

## 12. Tests
- Unit tests for engine logic (window active/expired, kill switch, session expiry, role/portal mapping, default blocks).
- Re-run full vitest suite; must remain green.

## Out of scope (explicit)
- Real publishing integrations.
- Per-user OAuth to external networks.
- Bank, GitHub, secret access for workers.
- Real AI generation for content plans — placeholder deterministic generator with founder-approval gate.
