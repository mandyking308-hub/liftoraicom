# Section S — Disaster-recovery rebuild runbook

Blank repository and blank database → functioning Liftor, with every external action still locked.

## S1. Repository

```bash
git clone <repo> && cd liftor
npm install
cp .env.example .env    # fill VITE_SUPABASE_URL / _PUBLISHABLE_KEY / _PROJECT_ID
npm run dev             # http://localhost:8080
```

Verify: `npm test` (expect 689 passing), `tsgo --noEmit -p tsconfig.app.json`, `npm run build`.

## S2. Database

1. Create a Supabase project. Enable `pgvector`, `pg_trgm`, `pgcrypto`.
2. Apply `supabase/migrations/*.sql` in filename order (442 files, Section G).
3. Verify object counts against Section F1 and run the RLS query in F6. Expect no RLS-off tables in a clean rebuild — the three in F5 are defects to fix, not to reproduce.

## S3. Auth and roles

1. Enable email/password auth. Do not enable anonymous sign-ups. Do not auto-confirm email.
2. Create the founder user, then insert their `user_roles` row with `role = 'founder'`.
3. Confirm `_is_founder_or_admin` returns true for that user; confirm `/founder/*` loads and a non-founder is redirected to `/portal/dashboard`.

## S4. Seed and configuration

| Seed | Required state |
|---|---|
| `external_action_gates` | 19 rows, **all `enabled = false`**, phrases and `max_batch_size` per Section J1 |
| `system_execution_modes` | `sales`, `outreach` (default), `hybrid`; ledger entry `LIVE_INTERNAL_TEST` |
| `ai_kill_switch_state` | singleton, `global_ai_paused = false`, `simulation_mode = false` |
| `businesses` | the portfolio rows |
| `apollo_portfolio_credit_policy` | safety reserve and per-run cap set before any Apollo call |
| `portfolio_collision_policy` | 30-day cross-brand cooldown |
| `business_launch_checklist_items` | 12 canonical keys per business |

## S5. Secrets

Set the backend secret **names** from Section A4 in project secrets. Never place a provider secret in `.env`, source, a table, a log or a response. Frontend receives publishable keys only.

## S6. Edge functions

Deploy all 620 functions. Re-apply `supabase/config.toml` so exactly the 16 functions listed in Section O1 have `verify_jwt = false` — and no others.

## S7. Provider hookups (in this order)

1. **Winnr** — set `WINNR_API_TOKEN`; run the read-only inspector; reconcile domains/mailboxes with `gsm-winnr-sync` (metadata only, no secrets persisted); confirm estate classification GSM vs GHAT.
2. **Smartlead** — set `SMARTLEAD_API_KEY`; run `smartlead-test-connection` and `smartlead-mailbox-discovery` (read-only); connect mailboxes; configure the webhook secret; verify with `smartlead-webhook-status`.
3. **Apollo** — set the key and credit policy; verify with `apollo-test-connection`; keep all three gates disabled.
4. **AI gateway** — set `LOVABLE_API_KEY`; verify with `liftor-brain-provider-check`.
5. **Stripe / Gmail / social / voice** — only if the corresponding subsystem is being brought up.

## S8. Validation before declaring the rebuild good

- `npm test`, typecheck and build all pass.
- Founder route guard and RLS behaviour verified with a non-founder account.
- `smartlead-send-dry-run` returns `BLOCKED`, `would_send = false`, zero writes.
- Eligibility check returns `sender_infrastructure_ready = false` while mailboxes are unconnected.
- All 19 gates read `enabled = false`.
- `gsm_mailbox_readiness` shows 0 campaign-ready.

## S9. Must remain locked until separately approved

External action gates (all 19), Smartlead campaign start and lead push, Apollo credit spend, native email send, social scheduling and DMs, invoice send, and estate-wide sender activation. The first permitted external step after a rebuild is the ≤5-recipient pilot in Section N6 — not a campaign.
