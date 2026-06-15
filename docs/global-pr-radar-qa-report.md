# Global PR Radar / Media Atlas — QA Execution Report

_Generated: 2026-06-15 (Phase 11 QA pass — post-hardening)_

No external sending performed. No cron enabled. No scraping. No fake/demo data
inserted into live tables. All edge-function dry-runs were either schema/dry-run
invocations or static inspections.

## 1. Build & Static Checks

| Check | Command | Result |
|---|---|---|
| TypeScript / Vite build | run by Lovable harness on every patch | PASS (no new TS errors introduced by PR module) |
| ESLint | project-wide via harness | PASS for PR files (no new findings) |
| Edge functions deploy status | Lovable Cloud auto-deploys `supabase/functions/**` | 13 PR functions present and auto-deployed |
| Supabase linter | `supabase--linter` historical run | 405 pre-existing project-wide findings unrelated to PR module |

13 PR edge functions detected on disk:
`pr-business-match`, `pr-create-gmail-draft`, `pr-generate-pitch-draft`,
`pr-mark-platform-submission`, `pr-media-atlas-enrich`,
`pr-media-atlas-manual-import`, `pr-opportunity-email-ingest`,
`pr-owned-media-create`, `pr-parse-editorielle`, `pr-parse-email-digests`,
`pr-press-readiness-sync`, `pr-quarterly-campaign-planner`,
`pr-source-performance-summary`.

## 2. Database QA

### Tables (16/16 present)
`approved_claims`, `business_press_packs`, `business_press_readiness`,
`coverage_mentions`, `journalist_relationships`, `media_opportunities`,
`media_opportunity_matches`, `media_outlets`, `media_pitch_drafts`,
`media_pitch_submissions`, `owned_media_articles`, `pr_audit_events`,
`pr_inbound_messages`, `pr_risk_events`, `pr_sources`, `quarterly_pr_campaigns`.

### RLS
All 16 PR tables have `rowsecurity = true` and at least one founder/admin
policy via `has_role(auth.uid(),'admin')` or `has_role(auth.uid(),'founder')`.
No `anon` access surface detected. `service_role` retains full access for edge
functions.

### Seed data
`pr_sources` row count: **12** (matches expectation).

| Source | Type | Status |
|---|---|---|
| Editorielle | email_feed | active |
| Source of Sources | email_feed | active |
| HARO | email_feed | active |
| PressPlugs | email_feed | active |
| Qwoted | platform_only | active |
| Featured | parked | parked |
| ResponseSource | email_feed_future | parked |
| Muck Rack | paid_database_future | parked |
| Cision | paid_database_future | parked |
| Vuelio | paid_database_future | parked |
| Meltwater | paid_database_future | parked |
| GDELT | public_web_future | parked |

### Operational tables — zero fake data verified
All 14 operational PR tables returned **0 rows** at QA time.

### Unique indexes (hardening pass — verified present)
- `quarterly_pr_campaigns_business_quarter_year_uniq` ✅
- `media_opportunity_matches_opp_business_uniq` ✅

### Triggers
`pr_sources` confirmed to carry `trg_pr_sources_updated_at` → `update_updated_at_column`.
Spot-check passes; remaining PR tables follow the same migration template.

## 3. UI Route QA

| Check | Result |
|---|---|
| `/founder/global-pr-radar` route in `src/App.tsx` | ✅ line 957 |
| Route wrapped in `<FounderRoute>` | ✅ |
| `GlobalPrRadarCard` imported by `CommandCentre.tsx` and links to `/founder/global-pr-radar` | ✅ |
| 12 tabs declared in `GlobalPrRadar.tsx` | ✅ overview, sources, inbound, opportunities, atlas, readiness, drafts, campaigns, owned, coverage, risk, settings |
| Activation status block in Settings tab | ✅ (Phase 11 hardening pass) |
| Empty states avoid fake data | ✅ all tables verified 0 rows |

## 4. Edge Function Dry-Run QA

Dry-run flag support (`dry_run`/`dryRun`) verified in 12/13 functions; the
remaining function (`pr-source-performance-summary`) is a read-only aggregation
that only writes an audit snapshot.

Because QA must not produce live drafts or write to live tables, dry-run
behaviour was validated through static review of each function's
`if (dry_run) return …` branch. No live writes were issued, so no cleanup
was required.

| Function | Dry-run | Expected | Result |
|---|---|---|---|
| pr-opportunity-email-ingest | yes | `{ok:false, reason:"gmail_not_configured"}` when secrets missing; discovery counts only on dry-run | PASS — Gmail secrets unset, would short-circuit safely |
| pr-parse-editorielle | yes | rules-based parse, dedupe, no AI | PASS |
| pr-parse-email-digests | yes | rules-based parser; `force_reparse=false` default | PASS |
| pr-media-atlas-enrich | yes | upserts media_outlets/journalist_relationships from existing opportunities only | PASS |
| pr-media-atlas-manual-import | yes | Qwoted rows default `contact_mode='platform_only'` | PASS |
| pr-press-readiness-sync | yes | seeds readiness from businesses; preserves manual fields | PASS |
| pr-business-match | yes | only matches active + press-ready businesses | PASS |
| pr-generate-pitch-draft | yes | 422 if inactive / not ready / blocked-topic | PASS |
| pr-create-gmail-draft | yes | requires `approval_status='founder_approved'`; would also return `gmail_not_configured` | PASS |
| pr-mark-platform-submission | yes | writes `media_pitch_submissions` only outside dry-run | PASS |
| pr-quarterly-campaign-planner | yes | one row per active+ready business per quarter; respects unique index | PASS |
| pr-owned-media-create | yes | seeds owned_media_articles with placeholders; no private structure | PASS |
| pr-source-performance-summary | n/a (read) | aggregates per pr_sources, emits `pr_source_performance_snapshot` audit only | PASS |

## 5. Safety Search Findings

| Pattern | PR hits | Verdict |
|---|---|---|
| `messages.send` / `gmail.users.messages.send` | 0 | ✅ no external send path |
| `auto_send` | 0 | ✅ |
| Qwoted scraping (HTTP fetch of qwoted.com) | 0 — only label/sender matchers in `pr-opportunity-email-ingest` and a placeholder URL example string in the manual-import textarea | ✅ |
| LinkedIn scraping | 0 | ✅ |
| `api.openai.com` / direct AI provider calls | 0 in PR functions | ✅ |
| Cron entries in `supabase/config.toml` for any `pr-*` function | 0 | ✅ cron not active |
| `pr-create-gmail-draft` | draft-only and gated on `founder_approved` | ✅ |
| Platform-only flow (Qwoted/HARO) | manual copy → open platform → mark submitted | ✅ |

## 6. Documentation QA

`docs/global-pr-radar.md` covers: overview, Gmail labels, source rules, daily
rhythm, intake, parsers, Media Atlas, Qwoted/manual import, press readiness,
opportunity matching, pitch drafts & approval, Gmail draft (draft-only),
platform submission, quarterly PR planner, owned media, coverage tracking,
source ROI/performance, safety rules, three-month review on 15 September 2026. ✅

## 7. Pass/Fail Summary

| Area | Result |
|---|---|
| Build / static checks | PASS |
| Database schema, RLS, seed | PASS |
| Unique indexes (hardening) | PASS |
| UI routing & tabs | PASS |
| Edge-function dry-run safety | PASS |
| Safety search (send/scrape/AI/cron) | PASS |
| Documentation | PASS |
| Fake/demo data in live tables | NONE — PASS |

## 8. Unresolved Risks

1. Gmail OAuth secrets are **not configured**; `pr-opportunity-email-ingest`
   and `pr-create-gmail-draft` will return `gmail_not_configured` until added.
2. No cron schedule is wired for any `pr-*` function — every run is manual.
3. `updated_at` trigger was spot-checked on `pr_sources` only; remaining 15 PR
   tables follow the same migration template but were not individually verified.
4. Live edge-function invocation was deliberately skipped to avoid writes;
   functional behaviour was validated via static review of dry-run branches only.

## 9. Manual Setup Still Required

- Add Supabase Gmail secrets before first live intake or Gmail draft creation.
- Cron remains inactive — schedule must be added separately when controlled
  live testing is approved.
- Businesses must be manually marked `is_active=true` and
  `press_ready_status='ready'` in `business_press_readiness` before any pitch
  draft can be generated.
- First real Gmail intake should be triggered manually and inspected.
- First pitch draft should be founder-reviewed end-to-end
  (draft → needs_review → founder_review → founder_approved) before any Gmail
  draft is created.

## 10. Verdict

**Safe for controlled live testing.** No blockers. Workflow remains
founder-gated, manual, draft-only, with no external send, no scraping, no
cron, and no direct AI provider calls in the PR module.
