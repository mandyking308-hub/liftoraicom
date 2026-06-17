# Liftor First-Run Founder Setup — Report

Date: 2026-06-17

## A. Overall status
**PASS**

## B. Files changed
- Added `src/pages/founder/StartHere.tsx`
- Added `src/pages/founder/StartHereSetupBusiness.tsx`
- Added `src/pages/founder/FounderUserGuide.tsx`
- Added `src/components/founder/command/StartHereCard.tsx`
- Edited `src/pages/founder/CommandCentre.tsx` (mount StartHereCard)
- Edited `src/App.tsx` (3 new founder-gated routes)
- Edited `supabase/functions/founder-copilot/index.ts` (Liftor lifecycle context + safety rules)
- Added `docs/liftor-founder-user-guide.md`
- Added `docs/liftor-first-run-founder-setup-report.md`

## C. Start Here route result
`/founder/start-here` mounted, wrapped in `<FounderRoute>`. Renders 10-step guided morning path plus quick-link buttons to Setup Wizard, User Guide and Co-Pilot. Safety reminders panel included.

## D. Business setup wizard result
`/founder/start-here/setup-business` mounted, wrapped in `<FounderRoute>`. Six-step wizard: shell → basics → evidence → dry-run readiness (score, missing context, risk flags) → founder-approved save (requires phrase `FOUNDER APPROVED`, saves draft to local storage only, no external side effects) → next-step links to Command Centre, Onboarding Factory, Starter Pack Materialiser, External Activation Readiness, Monday Readiness, Finance, Marketing, Operating Loops, Healthcare (if regulated), Data Room and Buyer Warm-Up.

## E. User guide result
`/founder/user-guide` mounted and founder-gated. Mirrored to `docs/liftor-founder-user-guide.md` for offline review.

## F. Co-Pilot context upgrade result
`founder-copilot` edge function now also queries (tolerantly): businesses, business_activation_profiles, business_onboarding_factory_runs, business_runtime_activation, business_daily_operating_runs, business_weekly_review_runs, founder_approval_items, master_work_items, funding_shortlist, ma_build_candidates, healthcare_readiness, insurance_claims (count only), statutory_filings, corporate_secretarial_records, international_expansion_runs, release_workflow_items, portfolio_exit_targets, portfolio_exit_target_alerts, data_room_access_tokens (count of active), video_library_training_assignments, founder_led_buyer_targets, founder_led_buyer_warm_up_actions, business_exit_intelligence_profiles. Each query is wrapped to never crash if a table is missing or empty. System prompt now includes safety rules (healthcare blocked, data room closed, buyer warm-up quiet, no cron/sending/provider activation) plus a "known questions" cheat sheet covering the 10 founder questions. Streaming path unchanged.

## G. Command Centre Start Here card result
`StartHereCard` mounted at top of `/founder/command-centre`, directly under the view-mode bar. Links to Start Here, Setup Wizard, User Guide and Co-Pilot.

## H. Safety verification
- All three new routes wrapped in `<FounderRoute>`.
- No public nav/footer link added.
- Wizard save persists to local storage only; no Supabase write, no email, no provider call.
- Co-Pilot system prompt enforces: no flipping healthcare live, no data-room tokens, no buyer outreach without approval, no cron/sending/provider activation, no public exposure.
- No RLS changes. No new tables. No cron. No external connectors enabled.

## I. What Mandy should do first tomorrow
Follow the 10-step Start Here path. The wizard at step 4 is the fastest way to attach her first real draft business to Liftor without risking anything external.

## J. Remaining issues
- The wizard currently persists drafts to `localStorage` for safety. When she's ready, we can wire the wizard into `businesses` + `business_knowledge_profiles` (still draft / not_live) with founder confirmation — out of scope for this overnight pass.
- Co-Pilot context relies on table presence; any future renamed table will silently drop from context (by design — no crash).

## K. Plain-English answer
**Yes — Mandy can open Liftor tomorrow morning and be guided step-by-step through setting up and testing a real business without getting lost or accidentally exposing anything externally.** The Start Here page tells her what to click first, the wizard walks her through capturing a new business as a safe draft, the User Guide explains every surface in plain English, and the Co-Pilot can answer her operating questions using live Liftor context with hard safety rules baked into the prompt.
