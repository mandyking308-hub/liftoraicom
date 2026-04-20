---
name: procurement-recruitment-engine
description: Supplier sourcing, approval pipeline, availability tracking, and assignment system linked to won deals.
type: feature
---
The Procurement / Recruitment Engine manages the supplier side of fulfilment.

**Tables:** `suppliers` (status: NEW→CONTACTED→QUALIFIED→APPROVED/REJECTED/INACTIVE, unique email), `supplier_pipeline` (stages: sourced→contacted→responded→evaluated→approved/rejected, with notes), `supplier_availability` (available/busy/unavailable, capacity, manual_override flag), `assignments` (links supplier+deal+contact, status: assigned→in_progress→completed/failed).

**Automation rules:**
- New supplier auto-seeds a `sourced` pipeline row + `available` availability row + activity log entry.
- Supplier status changes auto-advance the pipeline (CONTACTED→contacted, QUALIFIED→evaluated, APPROVED→approved, REJECTED→rejected) and stamp approved_at/rejected_at.
- DB trigger `guard_assignment_supplier_approved` blocks any insert into `assignments` for non-APPROVED suppliers.
- When a deal flips to WON, `try_auto_assign_supplier_on_deal_won` checks for matching APPROVED+available suppliers (matched by business_name, blanks treated as global): if exactly 1 match, an assignment is auto-created with `auto_assigned=true`; otherwise founder picks manually.
- Assignment lifecycle (assigned/in_progress/completed/failed) automatically syncs `supplier_availability.status` between busy and available — UNLESS `manual_override=true`, in which case the founder controls availability directly. Toggling the override off resyncs from current assignments.
- Helper RPC `eligible_suppliers_for_deal(_deal_id)` returns the filtered shortlist for the manual picker on the assignments page.

**Pages:** `/founder/suppliers` (list + add + KPIs), `/founder/suppliers/:id` (approve/reject, status, pipeline notes, availability with manual override), `/founder/assignments` (filterable list, manual create dialog with eligible-supplier dropdown, inline status changes).

**Access:** Admin-only RLS on all four tables via `has_role(auth.uid(),'admin')`. Suppliers are founder-managed (no supplier portal yet).
