# Founder-Led Exit Sales Engine

Date: 2026-06-16
Scope: Internal founder/admin only. No public claims, no buyer outreach, no adviser activation.

## Purpose

Liftor supports **owner-led sale preparation**. Mandy runs the sale process directly. M&A advisers are
**optional, not required by default**. Lawyers and tax advisers remain required for **completion only**.
No buyer outreach happens without explicit founder approval. After approximately 12 months of operation,
Liftor begins prompting a sale-readiness review for the business.

## Internal modules in scope

- Portfolio Exit Command Centre
- M&A Intelligence Workspace
- Exit Valuation Engine
- Buyer Warm-up
- Data Room (view-only / no-download / watermarked / zero active tokens unless approved)
- Exit Metrics
- Portfolio Exit Hardening
- Execution Handoff
- Funding Radar / Quarterly Build Selector (for "build for value" upstream)
- **Founder-Led Exit page** (`/founder/founder-led-exit`) — the dedicated owner-led surface

## Tables added (founder/admin only via RLS)

- `founder_led_sale_reviews` — 12-month sale-readiness milestone per business
  - `launch_date`, `operating_start_date`, `review_due_date`
  - `sale_review_status` ∈ {not_due, due, in_review, hold, prepare_for_sale, actively_marketing, sold, parked}
  - `founder_decision`, `target_sale_value_cents`, `target_buyer_category`
  - `readiness_blockers`, `evidence_gaps`, `next_action`, audit timestamps
- `founder_led_buyer_targets` — founder-controlled buyer list
  - `buyer_name`, `sector`, `why_they_might_buy`, `prior_acquisitions`, `strategic_fit`, `likely_valuation_logic`
  - `relationship_status`, `outreach_status` (default `not_contacted`)
  - `founder_approved_to_contact` (default `false`) — **DB trigger blocks advancing outreach without approval**
  - `notes`, `evidence_links`, `source_links`
- `founder_led_sale_readiness_scores` — simple founder-facing snapshot
  - 10 dimensions scored 0–10 (revenue quality, margin, customer concentration, SOP/training, contracts/IP,
    finance records, compliance, data room readiness, buyer fit, valuation confidence)
  - `overall_recommendation` ∈ {sell_now, hold_and_improve, scale_for_higher_value, park, not_saleable_yet}

RLS: every policy is `public._is_founder_or_admin()`. No anonymous grants.

## Founder-led sale process stages

A. Build for value
B. Operate and evidence
C. 12-month review
D. Buyer target list
E. Sale readiness score
F. Founder decision
G. Prepare data room
H. Founder-approved buyer contact
I. Buyer conversation
J. Diligence
K. Offer
L. Lawyer / tax adviser completion
M. Sold / retained / parked

## Command Centre attention (founder-only)

`FounderLedExitAttentionPanel` surfaces:
- Businesses due for 12-month sale review
- Businesses marked `prepare_for_sale`
- Buyer outreach awaiting founder approval
- Active offers / diligence

Empty by default — quiet until the founder records real data.

## Safety gates (verified)

- DB trigger `enforce_founder_approval_for_buyer_outreach` prevents any buyer row from advancing past
  `warm_path_identified` unless `founder_approved_to_contact = true`.
- Data Room remains view-only / no-download / watermarked / zero active tokens unless founder approves;
  NDA status tracked; access revocable. (Unchanged from existing controls.)
- No emails, no external buyer contact, no investor/adviser portal access enabled.
- No automation of legal, tax, investment, or sale decisions.

## What remains manual (by design)

- Recording the 12-month review trigger and decision
- Approving any buyer contact
- Engaging a lawyer / tax adviser for completion
- All NDA handling and data-room access approvals

## Plain-English summary

Liftor gives Mandy a private, owner-led workspace to identify candidate buyers, score sale readiness, run
the 12-month review, prepare the data room, and progress a sale herself. M&A firms are optional. External
lawyers and tax advisers are used only at completion. Nothing in this engine contacts a buyer, exposes a
data room, or makes a legal/tax decision on Mandy's behalf.