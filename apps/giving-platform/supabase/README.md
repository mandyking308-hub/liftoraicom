# Giving Rail production backend

This folder is the production data/security model for the standalone Giving Rail platform.

## What is implemented

### Core entities
- users / profiles;
- business, charity and nonprofit organisations;
- organisation membership and authority roles;
- business and charity profiles;
- verification checks;
- projects and supporter follows;
- business-giving campaigns;
- recipient approvals;
- immutable-style campaign event history;
- payment ledger records;
- volunteer opportunities, profiles and applications;
- pilot leads;
- complaints;
- audit records.

### Controlled campaign state machine

The database deliberately separates these states:

`draft → submitted → approved → live → reconciliation_due → settled`

with `declined` and `suspended` available as controlled outcomes.

A business can draft and submit a campaign but cannot approve its own sales-linked relationship. Approval is a recipient-charity action through `gr_decide_campaign`. Starting a public promotion is a separate `gr_start_campaign` action after approval.

### Security

- Row Level Security is enabled on all client-facing tables.
- Organisation membership checks use pinned `SECURITY DEFINER` helper functions to avoid recursive RLS.
- Verification decisions, payment writes, audit writes and public-form intake are server-controlled.
- Payment settlement uses a trusted server function intended for provider webhooks / service-role code.
- Public pilot/complaint intake is routed through a rate-limited edge function rather than anonymous table writes.

## Files

- `migrations/20260917190000_giving_rail_core.sql` — core schema, indexes and RLS.
- `migrations/20260917190500_giving_rail_workflows.sql` — organisation bootstrap and controlled campaign workflow functions.
- `migrations/20260917191000_giving_rail_public_intake.sql` — public form rate-limit storage/function.
- `functions/gr-public-intake/index.ts` — validated public pilot lead / complaint intake.

## Frontend integration

`src/lib/supabase.ts` creates the production browser client only when `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are configured.

`src/lib/platformApi.ts` exposes the first authenticated API layer for:
- magic-link authentication;
- organisation creation;
- charity/project discovery;
- campaign creation/submission/approval/start/reconciliation;
- project follows;
- volunteer profile/application workflows;
- public intake.

Until the dedicated Supabase project is attached, the current launch UI continues to identify its browser-local forms as pilot workspace functionality rather than production accounts.

## Deployment sequence

1. Attach / create the dedicated Supabase project for Giving Rail.
2. Apply migrations in timestamp order.
3. Deploy `gr-public-intake`.
4. Configure auth redirect URLs for the production Giving Rail domain.
5. Put `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` into the deployed frontend environment.
6. Wire the launch forms to `platformApi` and retain local demo fallback only in non-production environments.
7. Add payment-provider webhook function after the regulated marketplace architecture and connected-account model are confirmed.

## Payment boundary

The payment ledger is ready, but there is intentionally **no generic multi-charity checkout edge function yet**. The final payment implementation depends on the chosen regulated marketplace model (for example connected charity accounts using Stripe Connect or an equivalent provider). That decision changes onboarding/KYC, destination charges, refunds, disputes and contractual responsibilities; it should not be faked in code before the provider architecture is chosen.
