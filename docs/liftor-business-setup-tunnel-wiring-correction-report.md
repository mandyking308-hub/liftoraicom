# Liftor Business Setup Tunnel — Wiring Correction Report

Date: 2026-06-17

## A. Overall status
**PASS**

## B. Files changed
- `src/lib/businessSetupTunnel.ts` — added Supabase persistence helpers (`loadRemote`, `saveRemote`, `listAllRemote`, `promoteDraftToBusiness`); localStorage kept as fallback.
- `src/pages/founder/BusinessSetupTunnel.tsx` — loads/saves to Supabase first, adds "Confirm draft → create real business" CTA, adds "Promote setup into Liftor modules (drafts only)" card.
- `src/pages/founder/StartHereSetupBusiness.tsx` — now a permanent `<Navigate>` redirect to `/founder/business-setup-tunnel?mode=new`. Canonical journey is the tunnel.
- `src/components/founder/command/BuyerWarmUpAttentionPanel.tsx` — broken `/founder/founder-led-buyer-market` links replaced with `/founder/portfolio-exit/buyer-warmup`.
- `src/components/founder/command/FounderLedExitAttentionPanel.tsx` — same link correction.
- `src/pages/founder/FounderUserGuide.tsx` — first-10-clicks corrected, setup-business pointer replaced with the canonical tunnel route.
- `supabase/functions/founder-copilot/index.ts` — pulls `business_setup_tunnel_runs` and adds tunnel-aware system prompt hints.
- `supabase/migrations/<timestamp>_business_setup_tunnel_runs.sql` — creates the table (see C).

## C. Tables created
- `public.business_setup_tunnel_runs` (founder-only via `public.has_role(auth.uid(), 'admin')`).
  - `business_id` (nullable FK → `businesses`), `draft_business_name`, `is_draft`, `setup_status`, `current_step`, `overall_completeness`, `steps_json`, `missing_context_json`, `safety_warnings_json`, `created_by`, `created_at`, `updated_at`.
  - Grants: `authenticated` + `service_role`. No `anon`.
  - RLS: single founder-only policy `FOR ALL` with `has_role(auth.uid(),'admin')`.

## D. Canonical routing
- Canonical setup journey: `/founder/business-setup-tunnel` (modes: `existing`, `new`, `continue`).
- `/founder/start-here/setup-business` → permanent redirect to `…/business-setup-tunnel?mode=new`.

## E. New business creation
- `Create new` mode still drafts locally for fast capture.
- A new "Confirm draft → create real business" button inserts a row into `businesses` (name only — table has no `status` column; record is treated as draft / not-live because no runtime activation or external action is triggered).
- After confirmation the tunnel run is attached to the new `business_id` in `business_setup_tunnel_runs`.
- No external activation, no provider calls, no sending, no public route opened.

## F. Existing business wiring (incl. NeonCandy)
- When the founder picks an existing business, the tunnel loads remote progress first via `loadRemote`, then falls back to localStorage, then to a fresh state.
- NeonCandy detection (case-insensitive `neon\s*candy`) still surfaces a dedicated card when the row exists; absent NeonCandy is handled gracefully ("No businesses found").
- No duplicate business rows are created — `promoteDraftToBusiness` only runs on a local draft.

## G. Promote setup into Liftor modules
After the 11 steps the tunnel exposes a "Promote into Liftor modules (drafts only)" button. It writes draft records into:
- `business_activation_profiles` (status `draft`, stage `setup_tunnel`)
- `business_onboarding_factory_runs` (status `draft`)
- `business_runtime_activation` (`runtime_mode = simulation`, `is_live = false`)

If any target table is missing or RLS rejects the write, the UI logs a "manual next action" toast instead of failing. No emails, no providers, no publishing, no buyer outreach, no data-room tokens, no healthcare go-live.

## H. Broken links fixed
- `/founder/founder-led-buyer-market` → `/founder/portfolio-exit/buyer-warmup` (Buyer Warm-Up attention panels + Exit attention panel + user guide).
- Finance Hub → `/founder/finance` (already correct in tunnel "Where this connects" card).
- Marketing Hub → `/founder/marketing` (already correct).
- Portfolio Exit → `/founder/portfolio-exit` (already correct).
- External Activation Readiness → `/founder/business-activation` (already correct).

## I. Command Centre Start Here card
`StartHereCard` is mounted at `src/pages/founder/CommandCentre.tsx:810`, immediately under `CommandCentreViewModeBar` and above the large panels. Links: Start Here, Setup Tunnel, Continue, Daily Operator, User Guide, Ask Liftor.

## J. Co-Pilot integration
`founder-copilot` now selects from `business_setup_tunnel_runs` and the system prompt explains how to answer: "which step is incomplete", "which business is closest to ready", "is NeonCandy fully wired", "is the new marketing business only a draft or properly attached", and the canonical route map.

## K. Safety verification
- All new routes founder-gated by `<FounderRoute>`.
- Migration grants only `authenticated`/`service_role`; RLS allows only founder/admin role.
- No public/anon access. No new public navigation links.
- No outbound emails, no provider activation, no cron, no data-room tokens, no buyer contact, no healthcare go-live, no publishing.
- Healthcare overlay still NOT LIVE / BLOCKED. Data room still CLOSED.
- localStorage retained as fallback only — Supabase is source of truth when the founder is signed in.

## L. QA
- TypeScript build clean (incremental). Defensive `(supabase.from as any)` cast added in `businessSetupTunnel.ts` to remain safe between type regenerations.
- Manual checks: `/founder/start-here`, `/founder/business-setup-tunnel`, `?mode=existing|new|continue`, `/founder/start-here/setup-business` (redirects), `/founder/daily-operator`, `/founder/user-guide`, `/founder/copilot`, `/founder/command-centre` all render under founder gate.

## M. Final verdict
**Yes — Mandy can rely on the Setup Tunnel tomorrow as the canonical step-by-step route for wiring NeonCandy or creating a new marketing business.** Progress persists to Supabase (founder-only RLS) with localStorage as a fallback. Creating a new business now produces a real draft row only after explicit confirmation. The tunnel can promote setup into existing Liftor modules as drafts only, with manual-action fallbacks if a target table is unavailable. All broken `/founder/founder-led-buyer-market` links are replaced with the correct `/founder/portfolio-exit/buyer-warmup`. The legacy quick-draft route now redirects into the canonical tunnel. The Co-Pilot reads the new table and can answer step-by-step "where am I" questions. Nothing external is sent, published, activated, or exposed.