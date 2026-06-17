# Liftor — Business Sales Target & Revenue Pace Engine

Status: **READY FOR COMMERCIAL OPERATIONS** (revenue feed is manual until Stripe is connected by founder).

## What was built

1. **Setup Tunnel** gained a required step `commercial` — "Sales target & revenue pace" — with all requested fields (monthly/annual target, MRR/ARR, AOV, subscription price, conversion / lead-to-call / call-to-sale / churn rates, gross margin, sales cycle, first-sale / first-£1k / first-£10k dates, commercial stage, max safe outreach per day, founder approval required).
2. **`/founder/money`** — founder/admin-only morning view: overnight totals, MTD, MRR/ARR, subs created/renewed/churned, failed payments, refunds, business-by-business revenue + pace, attention list, manual revenue-event entry.
3. **Command Centre** now shows a prominent **Money Overnight** card directly under Start Here.
4. **Daily Operator** now shows a per-business **Commercial pace** card (target, MTD, revenue gap, sales/leads needed per month/week/day, pace status, today's action).
5. **Co-Pilot** edge function now pulls `business_sales_targets`, `business_sales_pace_calculations`, `business_revenue_events`, `business_commercial_daily_snapshots`, and `stripe_webhook_events` count, and is taught how to answer every required commercial question.

## Tables created (founder/admin RLS, service_role full)

- `business_sales_targets`
- `business_sales_pace_calculations`
- `business_revenue_events`
- `business_commercial_daily_snapshots`

No anon access. No public access. Service role retained for edge functions.

## Calculation engine

`src/lib/commercialPace.ts` exposes `calculatePace()` which produces:

- sales needed / month, week, day
- leads needed / month, week, day
- revenue gap
- projected MRR/ARR
- pace_status (`behind` / `on_track` / `ahead` / `not_ready`)
- recommended_daily_action (drafts only — never auto-sends)

`loadCurrentRevenueRollup()` aggregates `business_revenue_events` into MTD / today / yesterday / MRR / ARR / failed / refunds / subs counts.

## Stripe integration

- If `stripe_webhook_events` already has rows, the existing payment-control centre continues to populate `qtc_payments` and any future webhook-to-event bridge will populate `business_revenue_events`.
- If Stripe is not connected, `/founder/money` shows a clear "Stripe not connected" notice and offers manual revenue-event entry. **Liftor never fakes revenue.**
- No Stripe activation, product creation, or live setting changes happen from this engine.

## QA checklist

| Question | Answer |
|---|---|
| Does every business have a sales target area? | Yes — setup tunnel step `commercial` per business + DB-backed `business_sales_targets`. |
| Sales needed per month/week/day? | Yes — calculated and persisted to `business_sales_pace_calculations`. |
| Leads needed per month/week/day? | Yes — same calc. |
| Command Centre shows money made overnight? | Yes — `MoneyOvernightCard` rendered directly under Start Here. |
| Daily Operator shows today's commercial pace? | Yes — per-business "Commercial pace" card. |
| Co-Pilot answers "how much money did we make last night?" | Yes — `moneyHints` block + 30-day events context. |
| Subscriptions tracked? | Yes — `subscription_created/renewed/failed/churn` event types + summary cards. |
| Failed payments surfaced? | Yes — Money view stat + per-business attention list + Co-Pilot. |
| External sends still blocked? | Yes — no provider activation, no cron, no email send, no buyer outreach, no data-room token issuance touched. |
| All new tables founder/admin only? | Yes — RLS `has_role('founder') OR has_role('admin')` on all four. |
| Ready for Mandy's first operational morning? | **Yes**, with the caveat that revenue is manual until Stripe is connected. |

## Safety verification

- No outbound provider calls added.
- No email send paths added.
- No cron, no scheduled jobs added.
- No public routes added — every new page sits behind `<FounderRoute>`.
- Data Room remains CLOSED; healthcare remains BLOCKED; buyer warm-up remains quiet.

## Mandy's first commercial morning — 6 clicks

1. `/founder/start-here` → 2. `/founder/money` (see overnight totals) → 3. `/founder/business-setup-tunnel` (select NeonCandy) → 4. step "Sales target & revenue pace" → fill + click **Save target & calculate pace** → 5. `/founder/daily-operator` (pick NeonCandy, read commercial pace) → 6. `/founder/copilot` ("how much money did we make last night?" / "what should NeonCandy do today?").

**Final verdict: READY FOR COMMERCIAL OPERATIONS.**