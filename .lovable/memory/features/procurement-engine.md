---
name: procurement-recruitment-engine
description: Supplier sourcing, approval pipeline, availability tracking, deal-linked assignments, and a token-based supplier portal.
type: feature
---
The Procurement / Recruitment Engine manages the supplier side of fulfilment.

**Tables:** `suppliers` (status: NEW→CONTACTED→QUALIFIED→APPROVED/REJECTED/INACTIVE, unique email), `supplier_pipeline` (stages: sourced→contacted→responded→evaluated→approved/rejected, with notes), `supplier_availability` (available/busy/unavailable, capacity, manual_override flag), `assignments` (links supplier+deal+contact, status: assigned→in_progress→completed/failed).

**Supplier Portal layer:** `supplier_users` (per-supplier portal access; email unique, `access_token` auto-generated, `active` flag, `last_login_at`). `assignments` extended with `share_contact_details` (founder picks per assignment whether supplier sees client email) and `supplier_note`. RLS: admin-only on `supplier_users`. Suppliers never query tables directly — all portal access goes through SECURITY DEFINER RPCs granted to anon: `supplier_login_with_token`, `supplier_list_assignments`, `supplier_update_assignment_status` (only allows `in_progress` or `completed`; `failed` requires founder). `supplier_portal_stats` (admin) returns 24h logins, status updates, and completion rate.

**Automation rules:**
- New supplier auto-seeds a `sourced` pipeline row + `available` availability row + activity log entry.
- Supplier status changes auto-advance the pipeline (CONTACTED→contacted, QUALIFIED→evaluated, APPROVED→approved, REJECTED→rejected) and stamp approved_at/rejected_at.
- DB trigger `guard_assignment_supplier_approved` blocks any insert into `assignments` for non-APPROVED suppliers.
- When a deal flips to WON, `try_auto_assign_supplier_on_deal_won` checks for matching APPROVED+available suppliers (matched by business_name, blanks treated as global): if exactly 1 match, an assignment is auto-created with `auto_assigned=true`; otherwise founder picks manually.
- Assignment lifecycle (assigned/in_progress/completed/failed) automatically syncs `supplier_availability.status` between busy and available — UNLESS `manual_override=true`, in which case the founder controls availability directly. Toggling the override off resyncs from current assignments.
- Helper RPC `eligible_suppliers_for_deal(_deal_id)` returns the filtered shortlist for the manual picker on the assignments page.
- All supplier portal events (login, status update) are written to `activity_log` with `event_type` `supplier_portal_login` / `supplier_status_update`.

**Pages:**
- Founder: `/founder/suppliers` (list + add + supplier KPIs + portal stats card), `/founder/suppliers/:id` (approve/reject, pipeline notes, availability override, **Portal access panel** to grant/revoke supplier_users + copy magic link `/supplier/login?token=…`), `/founder/assignments` (filterable list, manual create, inline status, per-row `share_contact_details` toggle).
- Supplier portal (token-gated, no Supabase Auth): `/supplier/login` (paste token or arrive via magic link, token persisted in `localStorage` as `liftor.supplier_token`), `/supplier/dashboard` (welcome + 3 stat cards + upcoming queue), `/supplier/assignments` (list, contact email shown only if `share_contact_details=true`, "Start work" → in_progress, "Mark completed" → completed, optional note dialog).

**Access:** Admin-only RLS on all five tables via `has_role(auth.uid(),'admin')`. Suppliers see only their own assignments (enforced inside the SECURITY DEFINER RPCs by joining on `supplier_users.access_token`). Suppliers cannot access CRM, deals, invoices, financial data, or other suppliers. Suppliers cannot mark `failed` — founder retains override on every assignment. Schema is ready for a future Supabase Auth upgrade via the nullable `auth_user_id` column on `supplier_users`.
