---
name: Liftor Financial System
description: Revenue targets, deals pipeline, invoices, payments, payment events, chasing engine, target-vs-actual reporting.
type: feature
---

Founder-only finance stack covering forecast → pipeline → invoice → cash.

**Tables (founder-only RLS):**
- `revenue_targets` — business_name, month (unique together), monthly_target, pipeline_target, conversion_assumption, currency.
- `deals` — contact_id (FK contacts), business_name, deal_name, estimated_value_min/max, probability 0–100, status (NEW/QUALIFIED/PROPOSAL_SENT/WON/LOST), won_at, lost_at.
- `invoices` — deal_id, contact_id, business_name, invoice_number (unique, INV-YYYY-NNNNN), amount_min/max, **expected_amount** (defaults to midpoint, used for payment comparison + reporting + forecasting), issued_date, due_date (default +14d), status (DRAFT/SENT/PARTIALLY_PAID/PAID/OVERDUE), **payment_risk_flag** (boolean, auto-true when >14d overdue), notes (always carries "non-binding estimate" copy).
- `payments` — invoice_id (FK), business_name (auto-stamped from invoice), amount_received, received_date, method (bank/stripe/cash/other), reference.
- `payment_events` — invoice_id (FK), business_name (auto-stamped from invoice), event_type (reminder_sent/escalation_sent/critical_flagged/payment_received).

**Triggers:**
- `handle_deal_won` (BEFORE UPDATE on deals): when status flips to WON, sets `won_at`, auto-creates a DRAFT invoice (with expected_amount = midpoint, 14-day due date), AND **promotes the linked contact to CLIENT status** (which blocks further outreach via the sanity layer). No-op invoice if one already exists. Also stamps `lost_at` on LOST.
- `handle_payment_received` (AFTER INSERT on payments): logs `payment_received` event; if cumulative payments ≥ invoice expected_amount → PAID; if 0 < total < expected → PARTIALLY_PAID.
- `set_invoice_expected_amount` (BEFORE INSERT/UPDATE on invoices): defaults expected_amount to midpoint of (amount_min + amount_max) when null.
- `stamp_business_name_from_invoice` (BEFORE INSERT on payments + payment_events): auto-copies business_name from parent invoice for multi-business safety.

**RPCs:**
- `finance_mark_overdue_invoices()` → flips SENT/PARTIALLY_PAID past due_date to OVERDUE, sets payment_risk_flag=true on invoices >14d overdue, returns count.
- `finance_target_vs_actual(_business_name?, _month?)` → returns per-business: monthly_target, pipeline_target, pipeline_value, closed_value, collected_value, outstanding_value, overdue_value, progress_pct.
- `generate_invoice_number()` → INV-YYYY-NNNNN sequenced per calendar year.

**Edge Function `finance-chase-overdue`:** called daily via pg_cron. Calls `finance_mark_overdue_invoices`, then for each past-due SENT/OVERDUE invoice logs (deduped per day per invoice):
- 3+ days overdue → `reminder_sent`
- 7+ days overdue → `escalation_sent`
- 14+ days overdue → `critical_flagged`
Returns `{ summary: { checked, reminders, escalations, critical, marked_overdue } }`. Founder dashboard has a "Run Chasing" button to invoke on demand.

**Founder routes:**
- `/founder/finance` — dashboard (6 stat cards: Monthly Target, Revenue Closed, Revenue Collected, Pipeline Value, Outstanding Invoices, Overdue Invoices) + per-business target-vs-actual progress bars.
- `/founder/finance/targets` — set monthly target / pipeline target / conversion % per business+month (upsert).
- `/founder/finance/deals` — pipeline list, status changer, contact link, "moving to WON auto-creates invoice".
- `/founder/finance/invoices` — invoice registry with status filter and inline status changer.
- `/founder/finance/payments` — record payments against invoices; auto-flips invoice to PAID when covered.

**Rules:**
- Invoices are auto-created when a deal moves to WON (founder may also create manually later).
- Payments must link to invoices via `invoice_id` (CASCADE on delete).
- All amounts are non-binding estimates (stored as min/max numeric ranges, mid = (min+max)/2).
- Multi-currency: stored as `currency text` per row; dashboard renders USD by default until per-business currency UI is added.
- All financial state lives in these 5 tables; nothing else in the codebase stores monetary data.

**CRM linkage:** `deals.contact_id` references `contacts.id`. Outreach sanity layer remains the gate for any communications related to a deal.
