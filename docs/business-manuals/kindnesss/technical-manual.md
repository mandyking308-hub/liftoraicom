# Kindnesss — Technical Manual

_Canonical source: GitHub `docs/business-manuals/kindnesss/technical-manual.md`. The in-app Business Manuals screen renders this exact file._

## 1. Purpose and product
Kindnesss — **Small acts. Big hearts.** — supplies short, low-preparation wellbeing and PSHE activities for schools: tutor-time routines, kindness prompts and student-experience practices that fit the time staff actually have.

## 2. Architecture and integrations
One of four canonical education businesses in `public.businesses` (exact name: `Kindnesss`). It reuses the shared education commercial layer: relevance engine, business relationship layer, portfolio ownership/collision, campaign shell, outreach eligibility gate. Any future send is delivered only through the existing Smartlead mapping architecture. Kindnesss never calls Apollo and never alters the Apollo Credit Firewall.

## 3. Data model
`public.contacts` (person truth, never duplicated) → `public.organisations` via `organisation_id` (account truth) → `public.business_contact_relationships` (per-business relevance) → `public.portfolio_contact_ownership` + `public.portfolio_ownership_events` (ownership and audit) → `public.outreach_campaign_drafts` with `campaign_key = edu-kindnesss-2026-shell`.

## 4. Liftor touchpoints
Founder → Business Manuals; Founder → Education Commercial Layer (business selector set to Kindnesss); CRM contact detail.

## 5. CRM relationship logic
Deterministic weighting: wellbeing 38, PSHE 28, SEN 18, curriculum 14, leadership 12, parent experience 12, partnerships 6, plus seniority bonus. A wellbeing or pastoral leader therefore ranks Kindnesss first. Score, reasons, categories and engine version are recorded on the relationship row.

## 6. Campaign logic
`edu-kindnesss-2026-shell` targets large education groups plus primary, secondary and sixth form, excluding nurseries. Qualification threshold 55, batch guidance 25–50. Prepared and non-live: `is_live = false`, `external_send_blocked = true`, `smartlead_campaign_id = null`, founder approval not requested.

## 7. Analytics
Reported through `public.education_commercial_funnel`, reusing `campaign_metrics` and `business_revenue_events`. Unmeasurable downstream stages return zero or null with explicit provenance.

## 8. Operational controls
One active portfolio owner per contact enforced at database level. Cross-brand cooldown default 30 days, configurable in `public.portfolio_collision_policy`. Founder override may reorder priority but never bypasses suppression, unsubscribe/DNC, hard bounce or an active reply. Kindnesss and Billy overlap on wellbeing and inclusion, so collision protection matters here more than anywhere else in the portfolio.

## 9. Compliance and safety
Unsubscribe required on every sequence. Wellbeing copy must not present the product as a mental health intervention or clinical service. Sending stays blocked until Smartlead mapping readiness and sender infrastructure readiness are both true.

## 10. Maintenance and troubleshooting
If a contact ranks high for both Kindnesss and Billy, prioritisation resolves deterministically by score then fixed brand order; the reason is written to the ownership audit. Eligibility failures list explicit gate codes. Rescoring is pure and idempotent per engine version.
