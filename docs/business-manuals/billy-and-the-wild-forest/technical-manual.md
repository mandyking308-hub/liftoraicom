# Billy and the Wild Forest — Technical Manual

_Canonical source: GitHub `docs/business-manuals/billy-and-the-wild-forest/technical-manual.md`. The in-app Business Manuals screen renders this exact file._

## 1. Purpose and product
Billy and the Wild Forest publishes original, hand-illustrated story resources for children who find emotional language hard to reach — with a deliberate strength in SEN and SEND provision. Every title pairs beautiful original artwork with low-cognitive-load text plus inclusion discussion notes, so it can be used in a short session by a teaching assistant, SENCo or literacy lead without preparation. It supplements existing inclusion, wellbeing and literacy provision; it does not replace it and it does not claim measured attainment outcomes.

## 2. Architecture and integrations
- Runs inside Liftor as one of four canonical education portfolio businesses in `public.businesses` (exact name: `Billy and the Wild Forest`).
- Commercial layer: deterministic relevance engine → business relationship layer → portfolio ownership/collision → campaign shell → outreach eligibility gate.
- Sending is delegated to the existing Smartlead mapping architecture (`public.outbound_provider_campaign_mappings`). Billy owns no independent sending path.
- Apollo discovery/enrichment is owned separately and is protected by the Apollo Credit Firewall. This business layer never calls Apollo and never changes the firewall.

## 3. Data model
- `public.contacts` — one row per person, portfolio-wide. Never duplicated per brand.
- `public.contacts.organisation_id` → `public.organisations` — canonical education account link.
- `public.business_contact_relationships` — many-to-many business relevance layer, one row per (contact, business), carrying `business_relevance_score`, `business_relevance_level`, `business_relevance_reasons`, `business_relevance_categories`, `relevance_engine_version`, `campaign_eligible`, `do_not_contact`.
- `public.portfolio_contact_ownership` — at most one `active` row per contact across the whole portfolio.
- `public.portfolio_ownership_events` — append-only audit of claims, releases, blocks and founder overrides.
- `public.outreach_campaign_drafts` — the campaign shell (`campaign_key = edu-billy-2026-q4-controlled`).

## 4. Liftor touchpoints
- Founder → Business Manuals (`/founder/business-manuals`).
- Founder → Education Commercial Layer (`/founder/education-commercial`) for relevance, ownership, campaign state and funnel.
- CRM contact detail shows organisation link, relationship rows and email readiness.

## 5. CRM relationship logic
`src/lib/education/educationBusinessRelevance.ts` scores each contact deterministically from role, seniority, education role family, tags and organisation name. Billy's weighting is SEN 45, literacy 22, wellbeing 18, curriculum 18, leadership 14, PSHE 10. Scores of 60+ are high fit, 40–59 medium, 20–39 low. The engine version is stamped on every relationship row so scoring is reproducible and auditable. This is separate from the campaign-neutral Apollo `education_role_score`, which this layer never modifies.

## 6. Campaign logic
Campaign shell `edu-billy-2026-q4-controlled` targets large education groups plus primary, secondary and sixth-form settings, explicitly excluding nurseries. Qualification threshold is 60. Controlled initial batch is minimum 25 and maximum 50 excellent contacts. The shell ships `external_send_blocked = true`, `is_live = false`, no Smartlead campaign id and no founder approval. Email sequence is a primary message plus two short follow-ups with role-aware variants for SEN, literacy and leadership.

## 7. Analytics
`public.education_commercial_funnel` reports accounts in scope, relevant contacts, eligible contacts, allocated, contacted, replies, exclusions and collisions from live CRM data, and reuses `campaign_metrics` and `business_revenue_events` for downstream measures. Measures that are not yet observable return zero or null with explicit provenance rather than an invented figure.

## 8. Operational controls
- Relevance scoring alone never authorises a send.
- `public.claim_portfolio_contact` is the only supported way to take outbound ownership; a unique partial index enforces one active owner per contact.
- Cross-brand cooldown defaults to 30 days and is configurable in `public.portfolio_collision_policy`.
- Founder override can beat prioritisation and ownership; it can never beat suppression, unsubscribe/DNC, hard bounce or an active reply.

## 9. Compliance and safety
Every sequence carries an unsubscribe requirement. Global suppression, unsubscribe, do-not-contact and hard bounce block all four brands simultaneously. Copy avoids attainment claims. No child data is processed by this layer. Sending remains blocked until Smartlead mapping readiness and sender infrastructure readiness are both true.

## 10. Maintenance and troubleshooting
- Contact appears relevant but not eligible: check `campaign_eligible`, `organisation_id`, email readiness and campaign approval in that order.
- Ownership claim rejected: read `reason_codes` on the newest `portfolio_ownership_events` row.
- Funnel numbers look empty: expected before the controlled load and before any send.
- Rescoring: re-run the relevance engine; it is pure and idempotent for a given input and engine version.
