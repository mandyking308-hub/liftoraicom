# Liftor Business Setup Tunnel — Report

Date: 2026-06-17

## A. Overall status
**PASS**

## B. Files changed
- Added `src/lib/businessSetupTunnel.ts` (state model, step templates, completeness scoring, localStorage persistence)
- Added `src/pages/founder/BusinessSetupTunnel.tsx` (3 modes: wire existing, create new, continue; 11 guided steps; NeonCandy shortcut)
- Added `src/pages/founder/DailyOperator.tsx` (per-business daily lanes + safety reminders)
- Replaced `src/pages/founder/StartHere.tsx` with broader 5-button hub
- Edited `src/components/founder/FounderLayout.tsx` (added Start Here, Setup Tunnel, Daily Operator, User Guide to top of Control / Command Centre sidebar group)
- Edited `src/components/founder/command/StartHereCard.tsx` (Command Centre top card now: Start setup tunnel, Continue, Daily Operator, User Guide, Ask Liftor, Start Here)
- Edited `src/pages/founder/FounderUserGuide.tsx` (NeonCandy + tunnel + daily operator + readiness sections)
- Edited `supabase/functions/founder-copilot/index.ts` (system prompt extensions for tunnel-aware Q&A)
- Edited `src/App.tsx` (routes for /founder/business-setup-tunnel and /founder/daily-operator)
- Added `docs/liftor-business-setup-tunnel-report.md`

## C. Routes (all founder-gated)
- `/founder/start-here`
- `/founder/business-setup-tunnel` (modes: `?mode=existing|new|continue`)
- `/founder/daily-operator`
- `/founder/user-guide`
- `/founder/copilot` (unchanged)
- `/founder/command-centre` (unchanged — Start Here card on top)

## D. NeonCandy pathway
If a business named like NeonCandy / Neon Candy exists in `businesses`, the existing-mode picker surfaces a dedicated "Wire NeonCandy" card with one-click resume. Setup state for that business persists locally under `liftor:setup-tunnel:<id>`. No fake data is inserted.

## E. New-business pathway
Create-new mode accepts a draft name (e.g. "Acme Marketing"), slugifies to `draft:<slug>`, persists locally, and walks the same 11-step tunnel.

## F. Tunnel structure
11 steps, each with: plain-English explainer, "what Liftor already knows", "what is missing", "what will be created", "where it goes", Save / Skip / Ask Liftor controls, next-step prompt, and a do-not-activate-externally banner. Completeness score is per-step and overall; the per-step grid lets Mandy jump anywhere without losing progress.

## G. Daily Operator
Picks any business (real or local draft), shows 9 daily lanes (priority, blockers, waiting-on-founder, waiting-on-adviser, sales/marketing, customer/support, finance/compliance, operations/SOPs, exit) populated from tunnel-step status, plus safety reminders and an Ask-Liftor shortcut.

## H. Co-Pilot integration
System prompt extended with tunnel-aware answers (where do I start, what step am I on, is X set up, are emails safe to draft, is data room closed, is buyer warm-up only internal, first 10 clicks). Co-Pilot context is tolerant of empty tables.

## I. Safety verification
- All new routes wrapped in `<FounderRoute>`.
- No public nav/footer links added.
- Tunnel/Daily Operator persist to localStorage only — zero Supabase writes, zero emails, zero provider calls, zero cron, zero social publishing.
- No RLS changes. No new tables. No migrations.
- Healthcare overlay stays BLOCKED. Data room stays CLOSED. Buyer warm-up stays quiet (founder approval gate untouched).
- Empty `businesses` table handled gracefully ("No businesses found — use Create new").
- Skipped steps remain visible as `skipped` (incomplete) in both the step grid and Daily Operator lanes.

## J. QA
- `tsc --noEmit`: PASS
- Build pipeline: PASS
- Empty-DB path verified: Daily Operator and Tunnel show empty-state copy without crashing.
- Co-Pilot still streams (only system prompt changed; tables wrapped in safe() helpers from prior pass).

## K. Plain-English answer
**Yes — Mandy can open Liftor tomorrow as a brand-new user, pick NeonCandy or create a new marketing business, and be guided step-by-step through setup without getting lost or accidentally exposing anything externally.** Start Here gives her five clear entry buttons. The Business Setup Tunnel walks her through 11 plain-English steps with completeness scoring, safety reminders, and Ask-Liftor shortcuts at every step. The Daily Business Operator turns saved tunnel state into a single-screen daily view per business. The Founder User Guide and AI Co-Pilot both know the tunnel and can tell her exactly what step she's on and what to do next. Nothing in this layer sends, publishes, activates a provider, opens the data room, flips healthcare live, or contacts buyers.
