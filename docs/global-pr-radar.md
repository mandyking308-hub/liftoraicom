# Global PR Radar & Media Atlas — Operator Guide

Founder/admin only. No external sending, no auto-send, no Qwoted/LinkedIn scraping,
no automated public-web scraping, no direct AI provider calls.

## Overview
Liftor's Global PR Radar captures PR opportunities from approved sources, parses them
into structured opportunities, matches them to active/press-ready businesses, drafts
founder-controlled pitches, and tracks coverage. The entire pipeline is read/draft only.

## Gmail labels expected
- `Liftor/PR Opportunities`
- `Liftor/PR Opportunities/Editorielle`
- `Liftor/PR Opportunities/Source of Sources`
- `Liftor/PR Opportunities/HARO`
- `Liftor/PR Opportunities/Qwoted`
- `Liftor/PR Opportunities/PressPlugs`
- `Liftor/PR Opportunities/ResponseSource`

## PR source rules
- **Editorielle / Source of Sources / HARO / PressPlugs / ResponseSource** — email-feed sources, parsed in-app.
- **Qwoted** — platform-only intelligence. Pasted manually; contact happens inside Qwoted unless a separate lawful route is recorded. No scraping, no bulk export.
- **Featured** — parked.
- **Muck Rack / Cision / Vuelio / Meltwater** — future paid/demo platforms.
- **GDELT** — future public-web intelligence.

## Daily operating rhythm
| Step | When |
|---|---|
| Liftor main sweep planned | 13:15 UK weekdays |
| Mandy review control point | 13:30 UK weekdays |
| Liftor urgent scan planned | 17:30 UK weekdays |
| Mandy urgent check | 17:45 UK weekdays |
| Three-month review | 15 September 2026 |

## Workflows

### Gmail intake
`pr-opportunity-email-ingest` reads only the `Liftor/PR Opportunities` label
(and known PR-source senders) and writes raw rows into `pr_inbound_messages`.
No AI, no sending.

### Parsers
- `pr-parse-editorielle` — Editorielle daily emails.
- `pr-parse-email-digests` — Source of Sources / HARO / PressPlugs digests.

Rules-based, deduplicated, no AI. Already-parsed messages are skipped unless
`force_reparse=true`.

### Media Atlas
- `pr-media-atlas-enrich` — upserts `media_outlets` and `journalist_relationships`
  from accumulated opportunities.
- `pr-media-atlas-manual-import` — paste-based import for Qwoted/manual/public sources.
  Qwoted rows default to `platform_only`.

### Press readiness
`pr-press-readiness-sync` seeds `business_press_readiness` rows from canonical
`businesses`. Founder/admin manually flips `is_active`, fills approved descriptions,
claims, quote, logo, images, compliance clearance.

### Opportunity matching
`pr-business-match` scores each opportunity against active + press-ready businesses
and records a `media_opportunity_matches` row with a recommended action:
`draft_pitch`, `request_assets`, `monitor`, or `block`.

### Pitch drafts & approval
`pr-generate-pitch-draft` writes a template draft into `media_pitch_drafts`.
Founder edits subject/body, sets `approval_status` (`draft → needs_review →
founder_review → founder_approved | rejected`). No external send anywhere.

### Gmail draft (founder-approved only)
`pr-create-gmail-draft` creates a Gmail draft via the Gmail API only when
`approval_status = 'founder_approved'`. Liftor never sends.

### Platform submission
For Qwoted / HARO platform / similar:
1. Copy approved message from the draft.
2. Open the platform manually.
3. Submit there.
4. Hit **Mark submitted** — `pr-mark-platform-submission` logs the action.

### Quarterly PR planner
`pr-quarterly-campaign-planner` creates one `quarterly_pr_campaigns` row per
active + press-ready business per quarter/year. Founder-entered fields are
preserved unless `force_update=true`. Recommended campaign statuses:
`planned`, `in_progress`, `needs_assets`, `founder_review`, `approved`,
`completed`, `parked`.

### Owned media
`pr-owned-media-create` creates `owned_media_articles` records from approved
press-pack fields. Article types: `newsroom_update`, `blog_post`, `press_note`,
`charity_update`, `product_announcement`, `expert_commentary`, `mini_report`,
`case_study`, `founder_note`.

Owned media content rules:
- Use approved claims only.
- No private Liftor structure, entity/tax/adviser structure, Delaware/Dubai/
  Zorvian/GSM, family/school/Christine, or non-public founder strategy.
- No invented claims, metrics, awards, partnerships, endorsements or case studies.
- No implied public-figure/expert support unless permission is recorded.
- Missing proof/quote/assets → placeholder/checklist notes inside `draft_body`.

### Coverage tracking
Manual coverage records in `coverage_mentions`. Liftor does not scrape article
URLs. `featured_in_allowed` must be true before any “Featured in” claim is
displayed publicly.

### Source performance / ROI review
`pr-source-performance-summary` aggregates inbound, opportunities, matches,
drafts, approvals, Gmail drafts, platform submissions, and average urgency/risk/
publication/SEO/sales scores per source, and recommends one of
`keep | upgrade | monitor | park | cancel | needs_more_data`. Snapshots are
stored as `pr_source_performance_snapshot` audit events.

## Safety rules
- No auto-send. Founder approval required for any outbound action.
- No implied endorsements; no public figure / expert / philanthropist is shown
  as endorsing unless `permission_status = approved/recorded`.
- No private architecture / tax / entity / adviser / family / school details
  in any public-facing content.
- Active + press-ready businesses only enter draftable PR campaigns.
- Approved public claims only.