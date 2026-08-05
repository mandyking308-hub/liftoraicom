# Liftor Viral Opportunity Radar / Viral Conversion Intelligence

## Stage 1 status (foundation) — honest state

Architecture principle: **buy data, build the brain.** Liftor owns normalisation,
scoring, ranking and brief generation; any signal vendor is a replaceable input
behind the provider registry in `supabase/functions/_shared/socialViralProvider.ts`.

- **Tubular is NOT connected.** No real provider call has ever been made. The
  adapter is a safe-off shell that returns `NOT_CONFIGURED` or
  `API_CONTRACT_UNCONFIRMED` and never invents endpoints or payloads.
- **Active mode: manual import only** (`ManualImportAdapter`, zero network calls).
- **Activation blockers:** (1) `TUBULAR_API_KEY` not available; (2)
  `TUBULAR_API_CONTRACT_CONFIRMED` not set — real request/response shapes must be
  confirmed against vendor documentation before any call is written; (3) TikTok
  and other platform coverage, rate limits and historical depth unverified;
  (4) commercial data-usage/contract rights for storing and scoring third-party
  signals still to confirm.
- Secrets live in server-side env only and are never persisted in rows
  (`secret_ref_name` stores a name, never a value) and never returned to the browser.
- Provider status can never read `connected`/live without a real successful
  authenticated sync — enforced by `resolveProviderStatus` and covered by tests.
- All scores are labelled **potential, not guaranteed performance**.

Extension of the existing Social Autopilot. Buffer publishing, the Content Factory,
the Social Relationship Engine and every existing module are untouched. The radar
produces **briefs**, never posts.

## Purpose

Commercial virality, not vanity views: reach → attention → click → conversion.
Every score is labelled **potential, not guaranteed performance**.

## Data layer (business-isolated, RLS, founder/admin only)

| Table | Purpose |
| --- | --- |
| `social_viral_provider_connections` | Provider config, honest status, capability verification |
| `social_viral_watchlists` | Niche, audience, platforms, keywords, exclusions, conversion route |
| `social_viral_sync_runs` | Every import/sync attempt with counts and provider-call totals |
| `social_viral_signals` | Normalised observations (metrics + provenance only) |
| `social_viral_opportunities` | Scored, ranked, founder-reviewable opportunities |
| `social_viral_score_snapshots` | Immutable score history with formula version and weights |
| `social_viral_content_briefs` | Original-angle briefs handed to the Content Factory |
| `social_viral_audit` | Who did what, when, with provider-call counts |

Idempotency: `UNIQUE (business_id, provider_slug, platform, external_id)` on signals,
`UNIQUE (business_id, signal_id)` on opportunities, `UNIQUE (business_id, opportunity_id, brief_title)` on briefs.

## Scoring formula v1 (deterministic)

| Component | Weight |
| --- | --- |
| Viral reach | 30% |
| Trend velocity | 20% |
| Audience fit | 17.5% |
| Conversion potential | 17.5% |
| Timing / saturation | 10% |
| Safety & brand fit | 5% |

Hard blockers force the score to 0 and the status to `needs_review`:
`wrong_audience`, `excluded_topic`, `stale_trend`, `no_conversion_route`,
`prohibited_regulated_risk`, `missing_evidence`. Big reach with no route to a click
is treated as empty virality, not opportunity.

## Providers

- `manual_import` — always available, zero external calls.
- `tubular` — safe-off shell. Requires `TUBULAR_API_KEY` **and**
  `TUBULAR_API_CONTRACT_CONFIRMED`; capabilities stay `unverified` and status stays
  `not_configured` until a real authenticated sync succeeds. Secrets are server-side only
  and never returned to the browser; provider errors are sanitised before display.

## Edge functions

| Function | Role |
| --- | --- |
| `social-viral-intelligence-healthcheck` | Counts, provider truth, honest empty-state reasons |
| `social-viral-provider` | status / capabilities / test / configure |
| `social-viral-watchlists` | list / create / update / pause / resume / archive |
| `social-viral-signal-import` | Dry-run preview then idempotent import (max 200 rows) |
| `social-viral-opportunity-score` | Scores a signal, persists opportunity + snapshot |
| `social-viral-opportunities` | list / detail / review (approve, reject, needs_review) |
| `social-viral-opportunity-to-brief` | Brief creation plus brief list / approve / link |

Every mutating call is dry-run by default and needs an exact confirmation phrase:
`SAVE VIRAL WATCHLIST`, `IMPORT VIRAL SIGNALS`, `SCORE VIRAL OPPORTUNITY`,
`REVIEW VIRAL OPPORTUNITY`, `CREATE VIRAL CONTENT BRIEF`, `CONFIGURE VIRAL PROVIDER`.
All queries are scoped by `business_id`; cross-business ids return 404.

## Safety and IP

- No scraping, no bulk downloading, no publishing, no DMs, no comments.
- Signals store metrics, links and provenance only — never captions, scripts or media.
- Briefs always instruct an original rebuild and explicitly forbid copying source
  wording, footage, audio or edits.
- Regulated topics (medical, financial, legal, gambling, adult) flag
  `requires_compliance_review` and cannot be approved without an explicit compliance step.
- Approved opportunity → brief → **existing** Content Factory → founder approval →
  calendar → Buffer. The radar never shortcuts that chain.

## Founder UI

`/founder/social-autopilot` → "Viral Opportunity Radar / Viral Conversion Intelligence":
health, providers, watchlists, signal import, ranked opportunity board with component
score breakdown and blockers, and the brief queue.

## Tests

`src/lib/__tests__/socialViralRadar.test.ts` covers weight integrity, determinism,
hard blockers, empty-virality guard, normalisation and https validation, idempotency,
brief gating, provider status honesty and confirmation phrases.