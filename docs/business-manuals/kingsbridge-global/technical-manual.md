# Kingsbridge Global — Technical Manual

_Canonical source: GitHub `docs/business-manuals/kingsbridge-global/technical-manual.md`. The in-app Business Manuals screen renders this exact file._

## 1. Purpose and product
Kingsbridge Global — **Education Without Borders.** — works with education groups on cross-border partnership and international provision: partnership structuring, governance across regions and consistency of academic standards internationally.

## 2. Architecture and integrations
One of four canonical education businesses in `public.businesses` (exact name: `Kingsbridge Global`). It reuses the shared education commercial layer: relevance engine, business relationship layer, portfolio ownership/collision, campaign shell, outreach eligibility gate. Any future send is delivered only through the existing Smartlead mapping architecture. Kingsbridge Global never calls Apollo and never alters the Apollo Credit Firewall.

## 3. Data model
`public.contacts` (person truth) → `public.organisations` via `organisation_id` (account truth) → `public.business_contact_relationships` (per-business relevance) → `public.portfolio_contact_ownership` + `public.portfolio_ownership_events` → `public.outreach_campaign_drafts` with `campaign_key = edu-kingsbridge-2026-shell`.

## 4. Liftor touchpoints
Founder → Business Manuals; Founder → Education Commercial Layer (business selector set to Kingsbridge Global); CRM contact detail.

## 5. CRM relationship logic
Deterministic weighting: international 40, partnerships 26, leadership 18, procurement 14, curriculum 10, parent experience 4, plus seniority bonus. An international or partnerships executive therefore ranks Kingsbridge Global first. Score, reasons, categories and engine version are recorded on the relationship row.

## 6. Campaign logic
`edu-kingsbridge-2026-shell` targets large and international education groups plus primary, secondary and sixth form, excluding nurseries. Qualification threshold 55, batch guidance 25–50. Prepared and non-live: `is_live = false`, `external_send_blocked = true`, `smartlead_campaign_id = null`, founder approval not requested.

## 7. Analytics
Reported through `public.education_commercial_funnel`, reusing `campaign_metrics` and `business_revenue_events`. Unmeasurable downstream stages return zero or null with explicit provenance.

## 8. Operational controls
One active portfolio owner per contact enforced at database level. Cross-brand cooldown default 30 days, configurable in `public.portfolio_collision_policy`. Group and international leaders often score for more than one brand, so prioritisation and collision resolution are especially load-bearing here. Founder override may reorder priority but never bypasses suppression, unsubscribe/DNC, hard bounce or an active reply.

## 9. Compliance and safety
Unsubscribe required on every sequence. International outreach must respect the destination jurisdiction's marketing rules; the existing compliance layer remains authoritative. Sending stays blocked until Smartlead mapping readiness and sender infrastructure readiness are both true.

## 10. Maintenance and troubleshooting
Multi-brand relevance is expected at group leadership level; read the prioritisation reason to understand which brand was chosen and why. Eligibility failures return explicit gate codes. Rescoring is pure and idempotent per engine version.
