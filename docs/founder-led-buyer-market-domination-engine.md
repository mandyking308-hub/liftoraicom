# Founder-Led Buyer & Market Domination Engine

Date: 2026-06-16
Scope: Internal founder/admin only. No public exposure, no automatic outreach, no scraping of private/logged-in/customer data, no copying of protected material.

## Why this exists

From the moment a business is attached to Liftor, the system quietly begins tracking:

- Who might buy it (worldwide, multiple buyer types)
- Who competes with it (public/lawful sources only)
- Which customer/market segments it can lawfully target
- What evidence is needed to sell it
- When Mandy should begin founder-led buyer conversations (≈ 12 months after attachment)

Owner-led. M&A advisers are optional, not required by default. Lawyers and tax advisers remain required for completion only.

## Tables added (founder/admin only via RLS)

- **business_exit_intelligence_profiles** — one per business, auto-created on attachment. Fields: business model, sector, target customer type, target buyer categories, likely strategic/competitor/financial/cash-rich/international buyers, operating start date, 12-month review date, sale review status, founder decision. Defaults: `for_sale=false`, `outreach_approved=false`, `data_room_open=false`, `sale_review_status='not_due'`.
- **competitor_intelligence_map** — competitor name, website, product/service, pricing notes, customer segment, public customer evidence, strengths, weaknesses, market gap, what we can do better, buyer relevance, risk level, source links. Flagged `lawful_public_source_only=true`.
- **customer_prospect_segment_map** — segment name, customer type, geography, pain point, buying trigger, public data source, outreach suitability, lawful basis, compliance status, email source status, competitor overlap flag, target priority, campaign idea, approval status.
- **founder_led_buyer_targets** (extended) — added `buyer_type`, `country_region`, `website`, `public_source_evidence`, `acquisition_history`, `fit_score` (0-100), `cash_strength_notes`, `warm_path`, `draft_prepared`, `jurisdiction_compliance_status`. Expanded outreach states to include `monitoring` and `draft_prepared`. DB trigger still blocks advancing outreach without founder approval.

All tables guarded by `public._is_founder_or_admin()`. No anon grants.

## Auto-attach trigger

`trg_auto_create_exit_intelligence_profile` fires on `businesses` INSERT and creates the matching profile with the 12-month review date set to attachment date + 12 months. No outreach is triggered. No data room is opened.

## Worldwide tagging

Buyer rows tag region via `country_region` (UK, US, EU, UAE, Canada, Australia, India, Africa, Global, etc). `jurisdiction_compliance_status` must be one of: `not_checked` (default), `needs_adviser_review`, `approved_for_research_only`, `approved_for_founder_contact`, `blocked`. Liftor does not assume legal compliance globally — the founder records that status explicitly.

## Buyer warm-up workflow (founder-led)

A. Identify buyer · B. Gather public evidence · C. Score fit · D. Identify warm path · E. Draft soft relationship email · F. Founder approves · G. Contact made · H. Response logged · I. Relationship warmed · J. Sale conversation ready · K. Diligence / data room decision · L. Offer / park / hold.

Drafts only. No automatic sending. Outbound is blocked at the DB layer until `founder_approved_to_contact=true`.

## Command Centre integration

`FounderLedExitAttentionPanel` now surfaces, in addition to the existing exit counters:
- Businesses approaching their 12-month review (within 30 days, status still `not_due`)
- High-fit buyers identified (`fit_score >= 70`)
- Data room readiness blockers (`prepare_for_sale` businesses with `data_room_open=false`)

All quiet by default — empty until real records exist.

## Routes

- `/founder/founder-led-buyer-market` — Exit profiles · Buyer universe · Competitor map · Customer segments · Warm-up workflow
- `/founder/founder-led-exit` — Sale reviews · Buyer targets · Readiness scores · Process stages (unchanged from prior pass)

Both founder/admin gated. Not linked from public navigation, footer, or sitemap.

## Safety gates

- Founder/admin RLS on every new table; no anon grants.
- DB trigger `enforce_founder_approval_for_buyer_outreach` blocks any buyer row from advancing past `warm_path_identified` without `founder_approved_to_contact=true`.
- `customer_prospect_segment_map.compliance_status` defaults to `not_checked`; outreach requires explicit approval.
- Data Room defaults unchanged: view-only / no-download / watermarked / zero active tokens unless founder approves; NDA tracked; revocable.
- No outbound email, no provider activation, no investor/buyer/customer portal exposure, no scheduled jobs.
- No copying of protected assets, code, branding, confidential material, or private customer lists.
- All changes logged via standard `updated_at` triggers; integrate with `global_audit_events` for handoff actions as adopted.

## Founder-led sale language used

Founder-Led Exit · Direct Buyer Sales Process · Buyer Warm-Up · Sale Readiness · Founder-Controlled Exit. No wording implies an M&A firm is required.

## What remains manual (by design)

- Founder decision on whether to engage M&A advisers (optional)
- Founder approval of any buyer contact
- Lawyer / tax adviser engagement at completion
- NDA handling and data-room token approvals
- Jurisdiction compliance status changes