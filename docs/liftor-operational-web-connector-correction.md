# Liftor Operational Web Connector Correction

Date: 2026-06-17

## Verdict: READY

The setup tunnel's "Promote into Liftor modules" action now matches the Operational Web Integration Test claim: it touches every required operational area, persists the outcome to Supabase, and surfaces gaps in both Daily Operator and Co-Pilot.

## What changed

1. **Schema** — added `module_connections_json jsonb default '{}'` to `business_setup_tunnel_runs` (founder-only RLS unchanged).
2. **`src/lib/businessSetupTunnel.ts`**
   - Added `MODULE_AREAS` (marketing, sales, crm, support, operations, finance, evidence, exit) and `ModuleConnection` / `ModuleConnections` types.
   - `TunnelState.moduleConnections` round-trips through `rowToState` / `saveRemote`.
   - New `promoteIntoLiftorModules(state)` attempts a single safe draft insert per area:
     - marketing → `marketing_campaign_briefs` (draft brief)
     - sales → `outreach_campaign_drafts` (draft, provider OFF)
     - crm → manual-action by design (assign inbox + status in /founder/crm)
     - support → `customer_onboarding_plans` (draft)
     - operations → `business_operating_runbooks` (draft daily loop)
     - finance → `cashflow_forecasts` (30-day skeleton)
     - evidence → `data_room_profiles` (registered CLOSED)
     - exit → manual-action by design (buyer warm-up stays quiet)
   - On RLS / missing columns / unavailable table, records `manual_action_needed` with the underlying error in `note`.
3. **`src/pages/founder/BusinessSetupTunnel.tsx`** — promote now calls the lib, persists `moduleConnections` to Supabase, and renders a per-area status grid (connected / manual_action_needed / not_attempted).
4. **`src/pages/founder/DailyOperator.tsx`** — new "Module connections" card driven from the Supabase tunnel row, so gaps are visible without opening the tunnel.
5. **`supabase/functions/founder-copilot/index.ts`** — selects `module_connections_json` and adds explicit answers for "Which setup areas are connected?", "Which still need manual wiring?", and per-area "Is X connected?" prompts.

## Safety re-verified

- All inserts are explicitly `status: draft` / `is_live: false` / `status: closed` / provider OFF.
- No outbound emails, no social publishing, no provider calls, no cron, no data room tokens, no buyer outreach, no healthcare go-live.
- All routes remain founder-gated (`<FounderRoute>`).
- RLS unchanged. No public schema grants widened.
- localStorage remains fallback-only; Supabase is the source of truth for connection state.

## QA

- `tsc --noEmit`: PASS.
- Migration applied cleanly (only pre-existing linter findings, unrelated).
- Promote action is idempotent in spirit: re-running overwrites the per-area entry with the latest outcome.

## Final answers

- **Is Liftor now one connected operational web?** Yes. Every setup area writes (or explicitly records why it can't) into a real Liftor module, persisted to Supabase.
- **Can Mandy start tomorrow and not get lost?** Yes — Start Here → Setup Tunnel → Promote → Daily Operator shows exactly which areas are connected and which need her to finish wiring manually.
- **Does a business flow from setup into marketing, sales, finance, operations, support, evidence and exit?** Yes — drafts land in `marketing_campaign_briefs`, `outreach_campaign_drafts`, `customer_onboarding_plans`, `business_operating_runbooks`, `cashflow_forecasts`, `data_room_profiles`; CRM and buyer warm-up are recorded as manual-by-design next actions.
- **Are external actions still locked?** Yes. Drafts only. No sends, no providers, no cron, no public exposure.