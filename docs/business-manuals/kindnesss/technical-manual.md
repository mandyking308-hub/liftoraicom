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


---

## Dated status delta — 13 October 2026 (documentation only; earlier text above preserved as history)

- **Active record:** Kindnesss `640de582-a112-4d16-a221-03c27f00c6ec` (active). An older Kindnesss record is archived (`legacy_prelaunch`) and preserved — never unarchive or merge.
- **Smartlead:** draft campaign **4103531** exists (status DRAFTED, 6 leads, 0 sent / 0 replies / 0 bounces, cap 3/day, tracking off, 2 GSM senders attached). This supersedes "no Smartlead campaign ID" above. One campaign mapping exists but is inactive; 0 lead mappings.
- **First pilot policy:** at most **5** evidence-cleared recipients with 1–2 individually verified GSM senders. The 25–50-recipient education batch above is HISTORICAL ONLY.
- **Contacts:** 30 linked contacts with verified emails; **0 eligible** — all `needs_review` / `pending_review`; lawful basis blank on 27, provisional legitimate interests on 3. Business-level readiness was confirmed by the owner; record-level evidence is still required.
- **Copy:** earlier generic copy rejected by the founder; current draft is unapproved and not loaded into Smartlead.
- **Senders:** 180 GSM + 20 GHAT registered, all `warming` in Liftor, 0 campaign-ready. GHAT charitable mailboxes are never used for Kindnesss. Provider warm-up for the chosen senders is not proven.
- **Event return:** signed webhook not proven (signing secret absent); scoped 10-minute REST polling is live.
- **Gates:** campaign start, lead push, native send and webhook create are all OFF. Nothing has been sent.
