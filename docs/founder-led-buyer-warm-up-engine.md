# Founder-Led Buyer Warm-Up Engine

Extension of the Founder-Led Buyer & Market Domination Engine. Internal,
founder/admin only. No public exposure, no automatic outreach, no adviser
activation, no buyer/investor/customer access.

## Posture
- Liftor warms buyer relationships quietly and internally.
- Buyer warm-up begins from the moment a business is attached (existing
  `business_exit_intelligence_profiles` trigger surfaces the 12-month review).
- The founder controls every contact decision. No outbound action is taken
  by Liftor itself.
- M&A advisers are optional, not required. External lawyers / tax advisers
  may be engaged for specialist completion only.
- After ~12 months Liftor prompts sale-readiness and buyer conversation
  review through the Command Centre attention panels.
- Intelligence sources are lawful and public only. No scraping of private
  / logged-in / customer data, no stolen or confidential competitor data.

## Internal workflow labels
- Founder-Led Sale
- Direct Buyer Warm-Up
- Owner-Controlled Exit
- Buyer Relationship Preparation
- Adviser Optional / Completion Support Only

## Data
Extends `public.founder_led_buyer_targets` with:
- `warm_up_status` (monitoring → sale_conversation_ready)
- `buyer_motive`, `next_warm_up_action`, `next_action_due_date`, `warm_up_notes`

Adds `public.founder_led_buyer_warm_up_actions`:
- Action types: follow_company, monitor_acquisitions, monitor_hiring_growth,
  identify_warm_intro_path, draft_soft_relationship_email,
  draft_founder_positioning_note, draft_partnership_angle, draft_buyer_thesis,
  prepare_data_room_readiness_note, mark_buyer_ready_for_founder_review,
  mark_sale_conversation_ready.
- Status: planned, in_progress, blocked, awaiting_founder_approval,
  completed, cancelled.
- Trigger blocks completing any contact-style action without explicit
  founder approval recorded on the row.

## Safety
- RLS: all tables founder/admin only via `_is_founder_or_admin()`.
- No anon access. Not surfaced on any public nav, footer or sitemap.
- No buyer portal, no customer portal, no investor portal.
- DB-level trigger on `founder_led_buyer_targets` already blocks outreach
  status advancing without founder approval. A second trigger on warm-up
  actions blocks contact-style action completion without approval.
- No automatic legal/tax/investment/sale decisions. No emails sent.
- All changes go through standard audit + updated_at triggers.

## UI
- `/founder/founder-led-buyer-market` — Warm-up workflow tab shows live
  buyer warmth, next planned action, and the warm-up actions log.
- `/founder/founder-led-exit` — 12-month sale reviews and offer pipeline.
- Command Centre: two attention panels (founder-led exit + buyer warm-up)
  surface quiet counters only — no noisy alerts.