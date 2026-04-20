---
name: procurement-recruitment-engine
description: Supplier sourcing, approval pipeline, capacity- and skill-aware matching, SLA tracking, founder confirmation loop, finance handoff, and a token-based supplier portal.
type: feature
---
The Procurement / Recruitment Engine manages the supplier side of fulfilment.

**Tables:** `suppliers` (status NEW→CONTACTED→QUALIFIED→APPROVED/REJECTED/INACTIVE, unique email, plus `skills text[]` + `tags text[]` for matching), `supplier_pipeline` (sourced→contacted→responded→evaluated→approved/rejected, notes), `supplier_availability` (available/busy/unavailable, `capacity` int, `manual_override` flag), `assignments` (supplier+deal+contact, status assigned→in_progress→completed/failed, plus `expected_completion_date`, `sla_status` enum on_track/at_risk/overdue/n_a, `completion_confirmed_by_founder`, `confirmed_at`, `requires_finance_action`, `required_skills text[]`), `deals` extended with `required_skills text[]`.

**Supplier Portal layer:** `supplier_users` (per-supplier portal access; email unique, `access_token` auto-generated, `active` flag, `last_login_at`). `assignments` extended with `share_contact_details` (founder picks per assignment whether supplier sees client email) and `supplier_note`. RLS: admin-only on `supplier_users`. Suppliers never query tables directly — all portal access goes through SECURITY DEFINER RPCs granted to anon: `supplier_login_with_token`, `supplier_list_assignments`, `supplier_update_assignment_status` (only allows `in_progress` or `completed`; `failed` requires founder). `supplier_portal_stats` (admin) returns 24h logins, status updates, and completion rate.

**Automation rules:**
- New supplier auto-seeds a `sourced` pipeline row + `available` availability row + activity log entry.
- Supplier status changes auto-advance the pipeline (CONTACTED→contacted, QUALIFIED→evaluated, APPROVED→approved, REJECTED→rejected) and stamp approved_at/rejected_at.
- DB trigger `guard_assignment_supplier_approved` blocks any insert into `assignments` for non-APPROVED suppliers.
- **Capacity-aware availability:** `sync_supplier_availability_from_assignment` flips supplier to `busy` when active assignments ≥ `capacity` (default 1), back to `available` otherwise — UNLESS `manual_override=true`. Toggling override off resyncs.
- **Skill-aware matching:** `eligible_suppliers_for_deal` requires `suppliers.skills && deals.required_skills` when the deal lists required skills; results sorted by overlap count (more skill matches rank higher).
- **Auto-assign on WON:** `try_auto_assign_supplier_on_deal_won` applies business + skill filters; only auto-creates if exactly 1 match.
- **SLA tracking:** trigger `set_assignment_sla` recomputes `sla_status` on insert/update (overdue if `expected_completion_date < today`, at_risk if within 2 days, n_a once completed/failed). `refresh_all_assignment_sla()` is the cron-callable batch refresher.
- **Failure auto-recovery:** when an assignment is set to `failed`, availability resyncs (typically frees the supplier) and an `activity_log` entry `reassignment_suggested` is emitted.
- **Delivery confirmation loop:** suppliers marking an assignment `completed` no longer auto-finalises billing. Founder must invoke RPC `founder_confirm_assignment(_id)` (admin-only, requires status=`completed`), which sets `completion_confirmed_by_founder=true`, stamps `confirmed_at`, sets `requires_finance_action=true`, and writes activity event `assignment_ready_for_billing` — the hook that finance dashboards listen to.
- All supplier portal events (login, status update) are written to `activity_log` with `event_type` `supplier_portal_login` / `supplier_status_update`.

**Pages:**
- Founder: `/founder/suppliers` (list + add + supplier KPIs + portal stats card), `/founder/suppliers/:id` (approve/reject, pipeline notes, availability override, **Skills & tags** card, **Capacity** card, **Portal access** panel for supplier_users + magic links), `/founder/assignments` (filterable list, manual create, inline status, per-row `share_contact_details` toggle, inline `expected_completion_date` picker, SLA badges (overdue/at risk), **Confirm** button on completed-but-unconfirmed rows, `finance →` badge once confirmed).
- Supplier portal (token-gated, no Supabase Auth): `/supplier/login` (paste token or arrive via magic link, token persisted in `localStorage` as `liftor.supplier_token`), `/supplier/dashboard` (welcome + 3 stat cards + upcoming queue), `/supplier/assignments` (list, contact email shown only if `share_contact_details=true`, "Start work" → in_progress, "Mark completed" → completed, optional note dialog).

**Access:** Admin-only RLS on all five tables via `has_role(auth.uid(),'admin')`. Suppliers see only their own assignments (enforced inside the SECURITY DEFINER RPCs by joining on `supplier_users.access_token`). Suppliers cannot access CRM, deals, invoices, financial data, or other suppliers. Suppliers cannot mark `failed` and cannot finalise billing — founder retains override on every assignment. Finance integration is decoupled: any consumer queries `assignments WHERE requires_finance_action=true` or subscribes to the `assignment_ready_for_billing` activity event. Schema is ready for a future Supabase Auth upgrade via the nullable `auth_user_id` column on `supplier_users`.
