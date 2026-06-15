# Global PR Radar / Media Atlas — Controlled Live Test Report

_Generated: 2026-06-15_

## Result: STOPPED AT PRE-CHECK — `gmail_not_configured`

The pre-check requires four Gmail secrets to be present before any live
intake or parse can run. They are not configured in this environment,
so per the controlled-live-test protocol the run was halted before any
edge function was invoked and before any row was written to live tables.

## Pre-check: Gmail secrets

`secrets--fetch_secrets` returned 5 configured secrets at test time:

- APOLLO_ENCRYPTION_KEY
- GOOGLE_SEARCH_CONSOLE_API_KEY (connector-managed)
- INBOX_CREDENTIALS_KEY
- LOVABLE_API_KEY (managed)
- SMARTLEAD_API_KEY

Required PR Gmail secrets — **all missing**:

| Secret | Status |
|---|---|
| `GMAIL_CLIENT_ID` | ❌ missing |
| `GMAIL_CLIENT_SECRET` | ❌ missing |
| `GMAIL_REFRESH_TOKEN` | ❌ missing |
| `PR_GMAIL_ACCOUNT` | ❌ missing |

Status returned: **`gmail_not_configured`**.

## Actions Run

| Step | Action | Result |
|---|---|---|
| Pre-check | `secrets--fetch_secrets` | 4/4 required Gmail secrets missing |
| 1. Gmail PR intake dry run | **skipped** — pre-check failed | not executed |
| 2. Gmail PR intake live | **skipped** | not executed |
| 3. Editorielle parser dry run | **skipped** — no inbound rows possible without Gmail intake | not executed |
| 4. Editorielle parser live | **skipped** | not executed |
| 5. SoS / HARO / PressPlugs parser dry run | **skipped** | not executed |
| 6. Media Atlas enrichment dry run | **skipped** — no opportunities to enrich from | not executed |
| 7. Media Atlas enrichment live | **skipped** | not executed |
| 8. Pitch draft generation | **skipped** — also blocked by `no_press_ready_businesses_for_drafting` (zero rows in `business_press_readiness`) | not executed |

## Rows Inserted / Changed

**None.** No edge functions were invoked, no INSERT/UPDATE/DELETE was
issued against any PR table.

PR table row counts remain as at the QA pass:
- `pr_inbound_messages`: 0
- `media_opportunities`: 0
- `media_outlets`: 0
- `journalist_relationships`: 0
- `media_pitch_drafts`: 0
- `media_pitch_submissions`: 0
- `media_opportunity_matches`: 0
- `coverage_mentions`: 0
- `quarterly_pr_campaigns`: 0
- `owned_media_articles`: 0
- `business_press_readiness`: 0
- `business_press_packs`: 0
- `pr_audit_events`: 0
- `pr_risk_events`: 0
- `pr_sources`: 12 (seed, unchanged)
- `approved_claims`: 0

## Sources Ingested

None — Gmail intake did not run.

## Opportunities / Media Atlas Records / Rows Needing Review

None.

## Errors

`gmail_not_configured` — expected and handled at pre-check.

## Safety Confirmation (post-run)

| Control | Status |
|---|---|
| External emails sent | ❌ none |
| Gmail drafts created | ❌ none |
| Cron enabled | ❌ no PR-* schedule exists in `supabase/config.toml` |
| Scraping (Qwoted / LinkedIn / public web) | ❌ none |
| AI provider calls | ❌ none |
| Fake / test data inserted | ❌ none |
| Businesses auto-marked active or press-ready | ❌ none — `business_press_readiness` remains empty and founder-managed |

## Ready for Founder Review?

**Not yet** — the platform is structurally ready (QA pass green, hardening
applied) but the controlled live test cannot execute until Gmail OAuth
secrets and the PR mailbox identifier are configured.

## Cron Activation

**Still deferred.** No cron schedule has been added for any `pr-*` function.
All runs remain founder-triggered.

## Manual Setup Still Required Before the Next Attempt

1. Add the four Gmail secrets via Workspace Settings → Secrets:
   `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`,
   `PR_GMAIL_ACCOUNT`.
2. Re-run this controlled live test (dry-run first, then live with
   `lookback_days: 7`).
3. Before any pitch-draft attempt, seed at least one row in
   `business_press_readiness` with `is_active = true` and
   `press_ready_status = 'ready'` manually.

## Founder-only Gmail OAuth helper (added after this report)

A guided OAuth flow now exists in Global PR Radar → Settings:

1. Create a Google Cloud OAuth 2.0 **Web** client. Authorise the callback URL
   `https://<project-ref>.functions.supabase.co/pr-gmail-oauth-callback`.
2. Add `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `PR_GMAIL_ACCOUNT` in
   Lovable Cloud secrets.
3. Click **Start OAuth (intake read-only)**, sign in as `mandyking308@gmail.com`,
   approve, copy the one-time refresh token, add it as `GMAIL_REFRESH_TOKEN`.
4. Click **Check Gmail connection** — `pr-gmail-connection-check` validates
   secrets, refreshes the token and lists Gmail labels (no ingest, no writes,
   no drafts, no send). Only when it returns `ready_for_live_test: true`
   should this controlled live test be re-attempted.

Draft-creation scope (`gmail.compose`) is a separate, optional OAuth mode.
Cron remains OFF.
