# Aurelia — Technical Manual

_Canonical source: GitHub `docs/business-manuals/aurelia/technical-manual.md`. The in-app Business Manuals screen renders this exact file._

## 1. Purpose and product
Aurelia — **Create. Learn. Achieve. Safely.** — delivers creative digital learning to education groups with safeguarding and data handling designed in from the start, rather than bolted on after procurement.

## 2. Architecture and integrations
Aurelia is one of four canonical education businesses in `public.businesses` (exact name: `Aurelia`). It reuses the shared Liftor education commercial layer end to end: relevance engine, business relationship layer, portfolio ownership/collision, campaign shell and outreach eligibility gate. Delivery of any future send is through the existing Smartlead mapping table only. Aurelia never calls Apollo and never alters the Apollo Credit Firewall.

## 3. Data model
Person truth `public.contacts`; account truth `public.organisations` via `contacts.organisation_id`; business relevance `public.business_contact_relationships`; ownership `public.portfolio_contact_ownership` with audit in `public.portfolio_ownership_events`; campaign shell `public.outreach_campaign_drafts` with `campaign_key = edu-aurelia-2026-shell`.

## 4. Liftor touchpoints
Founder → Business Manuals; Founder → Education Commercial Layer (business selector set to Aurelia); CRM contact detail.

## 5. CRM relationship logic
Deterministic weighting: digital 40, safeguarding 25, innovation 18, curriculum 15, leadership 14, procurement 10, partnerships 8, plus a seniority bonus. A Digital Learning Director therefore ranks Aurelia first. Scores, reasons, categories and engine version are written to the relationship row.

## 6. Campaign logic
`edu-aurelia-2026-shell` targets large education groups plus primary, secondary and sixth form, excluding nurseries. Qualification threshold 55. Batch guidance 25–50. The shell is **prepared and non-live**: `is_live = false`, `external_send_blocked = true`, `smartlead_campaign_id = null`, founder approval not requested. It exists so contacts can be attached tomorrow without further architecture work.

## 7. Analytics
Reported through `public.education_commercial_funnel` alongside the other three brands, reusing `campaign_metrics` and `business_revenue_events`. Unmeasurable downstream stages return zero or null with provenance.

## 8. Operational controls
One active portfolio owner per contact, enforced by a unique partial index. Cross-brand cooldown default 30 days, configurable in `public.portfolio_collision_policy`. Founder override may reorder brand priority but cannot bypass suppression, unsubscribe/DNC, hard bounce or an active reply.

## 9. Compliance and safety
Unsubscribe required on every sequence. Safeguarding-led messaging must not imply certification Aurelia does not hold. Sending stays blocked until Smartlead mapping readiness and sender infrastructure readiness are both true.

## 10. Maintenance and troubleshooting
Check relationship eligibility, organisation link and email readiness before campaign state. Ownership rejections are explained by reason codes in the ownership audit table. Rescoring is pure and idempotent for a given engine version.
