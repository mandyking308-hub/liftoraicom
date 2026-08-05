# Social Distribution Fabric — Production QA (final targeted closure)

Date: 2026-08-05. **No real Buffer calls were made and no social post was sent.**
Every Buffer GraphQL request in the test suite is served by a mocked `fetch`; the
production `BUFFER_API_KEY` is not present in this environment, and the reconciler /
dispatcher hard-abort with `buffer_api_key_missing` when it is absent.

## 1. Bounded Buffer reconciliation — ENABLED

- No feature flag remains: `BUFFER_POSTS_QUERY_VERIFIED` does not exist anywhere in the tree.
- Query: `posts(input:{organizationId}, first:$first, after:$after)` with
  `pageInfo { hasNextPage endCursor }` and `edges { node { id status dueAt channelId } }`.
  `externalLink` is intentionally **not** requested on `posts` (current schema does not
  accept it there) — so no external URL is ever stored or invented.
- Hard caps: `POSTS_PAGE_SIZE = 50`, `POSTS_MAX_PAGES = 2`, `POSTS_MAX_TOTAL = 100`.
  The page `first` argument is clamped so the total can never exceed 100 posts.
- Scope: only jobs of the requested `business_id` with a `provider_post_id`, and only
  channels mapped to that business.
- Status allowlist only: `draft` → `draft_in_provider`; `scheduled`/`buffer`/`queued`/`pending`
  → `scheduled`; `sent`/`published` → `sent`; `error`/`failed` → `failed`. Anything else
  leaves Liftor unchanged and is counted/audited as `unknown_provider_status`.

Mocked tests (in `src/lib/__tests__/socialDistributionDraftAndMaintenance.test.ts`):
pagination + page cap, cursor propagation, known statuses, unknown statuses,
business scoping, unmapped-channel skip, kill switch, missing API key, org env fallback.

## 2. Schedule flag unified

`SOCIAL_DISPATCH_CRON_REGISTERED` is the single canonical flag for both the dispatcher
and the maintenance cron hook. `SOCIAL_MAINTENANCE_CRON_REGISTERED` and
`SOCIAL_DISPATCH_SCHEDULE_REGISTERED` were removed from code, health responses, UI and
both documentation files (grep returns zero hits). Health reports `LIVE` only when the
flag is `true` **and** both heartbeats are fresh (<30 min).

## 3. Organisation configuration

`resolveOrganizationId(connection.provider_organization_id)` — founder-selected
organisation on `social_provider_connections` first, `BUFFER_ORGANIZATION_ID` env as an
**optional** secure fallback. Applied to channel sync, submit/dispatch and reconcile.
`BUFFER_API_KEY` remains the only hard requirement. No secret is stored in an ordinary
table or returned by any endpoint.

## 4. Cron activation — CONFIGURATION REQUIRED (not registered)

`pg_cron`, `pg_net` and Vault exist in the production database, but no schedule and no
`SOCIAL_DISPATCH_SECRET` are configured. Nothing claims otherwise: health returns
`ARMED — dispatcher_schedule_missing` / `maintenance_schedule_missing` with
`CONFIGURATION REQUIRED`. The exact one-time activation SQL (secret supplied as an Edge
Function secret and echoed only in the protected cron header) is in
`docs/social-distribution-buffer-live.md`. Function names in the docs were corrected
(`social-buffer-channel-sync`).

## 5. QA command results

| Check | Command | Result |
| --- | --- | --- |
| Unit/integration tests | `npx vitest run` | **PASS** — 25 files, **298 tests**, 0 failures |
| Typecheck | `npx tsgo --noEmit -p tsconfig.app.json` | **PASS** — 0 errors |
| Production build | `npm run build` | **PASS** — built in ~37s (large-chunk warning only, pre-existing) |
| Lint | `npx eslint .` | 8 507 pre-existing repo-wide problems (mostly `no-explicit-any`). **No new lint category introduced by this feature**; the repo has never been lint-clean, so this was not treated as a regression. |
| Edge function imports | `deno check` on all 8 distribution functions | All module specifiers resolve. The only diagnostic is the repo-wide `Deno.serve` handler-overload typing pattern present in every existing function (unchanged by this work). |
| Migrations | Parse/structure check of the three distribution migrations | Valid, balanced, terminated |

### Function inventory (distribution)

`social-buffer-connection-test`, `social-buffer-channel-sync`,
`social-distribution-preview`, `social-distribution-submit`,
`social-distribution-dispatch-due`, `social-distribution-retry`,
`social-distribution-reconcile`, `social-distribution-maintenance`,
`social-distribution-health`. `social-distribution-dispatch-due` and
`social-distribution-maintenance` are registered in `supabase/config.toml` with
`verify_jwt = false` (scheduler secret enforced in code).

### Migration inventory

- `20260804195001_*.sql` — provider connections/channels, channel map, dispatch runs.
- `20260804200430_*.sql` — dispatch mode + policy extensions.
- `20260805021320_*.sql` — maintenance/reconcile support columns and indexes.

## 6. Unaffected surfaces re-verified

Content pack generation, approvals, calendar views and manual CSV/scheduler exports are
untouched and still wired (`social-content-pack-generate`,
`social-approval-batch-decision-apply`, `social-calendar-month-view`,
`social-scheduler-csv-generate`, `social-manual-export-create` all still referenced from
their panels). Manual export is now described as the **fallback** path, not the only path.
Stale "provider execution LOCKED" text in the Command Centre block is now driven by live
distribution health.

## 7. Known external blockers

1. `BUFFER_API_KEY` not set — no provider call can succeed (by design in QA).
2. `SOCIAL_DISPATCH_SECRET` not set and no cron schedule registered — unattended
   dispatch/maintenance is inert; health correctly reports CONFIGURATION REQUIRED.
3. Repo-wide ESLint debt predates this feature and was not mass-rewritten.