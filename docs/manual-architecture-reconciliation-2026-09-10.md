# Manual Architecture Reconciliation — 10 September 2026

**Change type:** documentation/current-state reconciliation only (no application behaviour change)  
**Baseline:** `af0d5da7c34e6125ea92c94583baa7b4d02196db` — “Updated Liftor manuals”, 25 August 2026  
**Current repo state audited:** `main` at `39a74d96df08d5364027c32e39252f3b850a0cab`  
**Purpose:** make the manuals accurately distinguish what is implemented in code, what is configured in the live database, what is still gated, and what is historical/legacy before the next execution/build phase.

## Manual hierarchy — unchanged

The existing hierarchy remains authoritative:

1. **Command Centre Truth Sync** — live-state authority.
2. **Full Technical / Founder Manual** — canonical architecture and operating rules.
3. **User Manual** — plain-English operator instructions.
4. **Build Log** — historical changes, tests, decisions and deferred work.
5. **Business Manuals** — business-specific tone, offers, ICPs, assets and policies.
6. **Slim Mandy Manual** — portable handover only; not technical truth.

This September reconciliation is the canonical dated delta after the 25 August 2026 reconciliation. Where a historical manual statement conflicts with this document and the current code/live state, this document controls until the full manual surfaces are re-rendered from the reconciled state.

## Audit performed

The reconciliation compared the 25 August manual baseline against current `main` and checked the relevant live Supabase state.

### Repository delta since the 25 August manual update

`main` is **46 commits ahead** of the last manual-update commit, but the material delta is concentrated in **21 changed files**. The principal changes are:

- Smartlead campaign/contact import infrastructure.
- Smartlead connection diagnostics and per-campaign webhook discovery.
- Smartlead controlled-activation/readiness logic.
- Smartlead import idempotency support and tests.
- Business source-manifest / source-fidelity controls.
- Small Founder Manual/User Manual additions.

The September reconciliation therefore does **not** replace the August whole-platform audit. It reconciles the changed architecture since that audit plus current live outbound/data state.

## Current Liftor operating model

Liftor remains the central portfolio operating brain. The architectural separation is:

- **Portfolio CRM** = canonical operational person/contact truth.
- **Business contact relationships** = business-specific relationship/status truth; one person may relate to multiple businesses without duplicate contact rows.
- **Relationship Intelligence** = research/evidence layer, not the operational CRM.
- **Apollo** = external prospect-data/discovery/enrichment provider.
- **Liftor Apollo staging/quality layer** = candidate staging, dedupe, qualification and credit-control boundary.
- **Smartlead** = cold-scale outbound delivery provider.
- **Native/IONOS lane** = low-volume, founder-controlled/high-trust email lane, not the cold-scale engine.
- **Sending domains/inboxes** = provider infrastructure which must be independently healthy and warm before scale.

No data-provider or outbound-provider connection is itself permission to send.

## Live database snapshot — 10 September 2026

The following counts were read directly from the current Liftor database during this reconciliation:

| Area | Live state |
|---|---:|
| Central `contacts` | 81 |
| Active/non-archived contacts | 81 |
| `business_contact_relationships` | 68 |
| Apollo staged leads (`apollo_leads`) | 400 |
| Apollo raw leads (`apollo_raw_leads`) | 400 |
| Sending domains | 8 |
| Inboxes | 2 |
| Active inboxes | 1 |
| Smartlead provider rows | 1 |
| Smartlead provider rows connected | 1 |
| Smartlead campaign mappings | 0 |
| Smartlead lead mappings | 0 |
| Smartlead provider events | 0 |
| Smartlead activation-checklist rows | 0 |

The existing Apollo lead/raw-lead pool and the two inbox rows are legacy/Neon Candy-era operational material and must not be treated as the new education outbound estate.

## Apollo — current implemented capability

The Apollo integration is materially implemented and must be retained. Relevant code paths include:

- `supabase/functions/apollo-sync-search/index.ts`
- `supabase/functions/apollo-sync-enrich/index.ts`
- `supabase/functions/apollo-unlock-shortlist/index.ts`
- `supabase/functions/apollo-unlock-selected/index.ts`
- `supabase/functions/apollo-qualify/index.ts`
- `supabase/functions/apollo-pull-verified/index.ts`
- `supabase/functions/apollo-education-recovery/index.ts`
- `supabase/functions/apollo-daily-runner/index.ts`
- `supabase/functions/apollo-test-connection/index.ts`
- `supabase/functions/_shared/apolloRelationshipUpsert.ts`

### Working now

- Apollo **People Search** through `POST /api/v1/mixed_people/api_search`.
- Credit-free candidate discovery/search.
- Search criteria including title, exclusions, seniority, geography, keywords, verified-email availability and saved-list label IDs where configured.
- Staging into Apollo-specific Liftor tables before CRM promotion.
- Tracking already-seen Apollo person IDs and resumable pagination.
- Deterministic/AI-assisted lead-quality and qualification paths.
- Selective enrichment/reveal through `people/match` and `people/bulk_match`.
- Selection by `selected_apollo_person_ids` rather than compulsory blanket enrichment.
- Founder confirmation / dry-run cost-preview paths for selected unlocks.
- CRM/suppression checks and duplicate handling around reveal/import.

### Important current limitations

The current Apollo implementation is **not yet safe to use as the final generic education automation** without a build pass because:

1. Several search/quality paths still contain **Neon Candy/music-specific defaults and taxonomy**.
2. The current generic sync caps are per run, not per supplied company/organisation.
3. There is no portfolio-wide hard Apollo credit ledger/ceiling enforced across every paid enrichment path.
4. `apollo-daily-runner` is capable of invoking enrichment when a segment is configured with `auto_enrich=true`; paid automatic enrichment must remain disabled until the global credit firewall exists.
5. Bulk enrichment can fall back to individual `people/match` requests; the future credit firewall must guard the combined operation, not just the first call.
6. There is no production orchestrator yet that takes a supplied company universe, finds/ranks the best decision-makers per organisation, then selectively reveals only the chosen contacts.

**Current operating rule:** automated/free Apollo search is acceptable only through an approved generic/education-safe search configuration; automatic paid enrichment remains OFF until the credit firewall and company-universe orchestration are implemented and tested.

## Education universe — historical evidence versus live truth

The August recovery document records a successfully reconstructed education research universe of:

- 2,520 education rows;
- 2,441 distinct Apollo person IDs;
- 266 distinct organisations;
- 110 rows with verified email data;
- 1,424 reveal-required candidates;
- 986 Apollo profiles with no email on file at that time.

That recovery was documented as using Apollo free People Search only, with no blanket enrichment and all recovered rows held from outreach.

**However, the current live database check on 10 September 2026 found zero rows with `relationship_type = 'school_education_contact'` in `relationship_intelligence_contacts`.**

This is a material data-state discrepancy. The September manual must therefore **not** state that the 2,520-row education universe is currently live in Relationship Intelligence. The historical recovery artefacts remain useful evidence and recovery input, but the live education universe must be reconciled/restored/merged deliberately in the later education-data stage.

No education data was recreated, deleted, enriched or moved during this manual reconciliation.

## Central CRM versus research pools

The central CRM currently contains 81 contacts and 68 business-contact relationship rows. This is separate from the historical education research universe. The following rule is reaffirmed:

- Research candidates may exist without becoming operational CRM contacts.
- A person should be promoted into the canonical `contacts` spine only when the operational workflow requires it and identity/dedupe checks pass.
- A single canonical person can then have multiple business relationships/campaign relationships.
- Historic/legacy outreach datasets must not be merged into the education campaign merely because they use the same provider tables.

This separation is important for both data integrity and Apollo-credit control.

## Smartlead — current implemented capability

Liftor's Smartlead scale lane has progressed materially since the 25 August manual sync.

### Implemented in code

- A founder/admin-only **read-only connection test** that reads Smartlead campaigns, email accounts and overall analytics.
- Whitelisted mailbox health fields including SMTP/IMAP success, warm-up status and messages/day.
- Bounded per-campaign webhook discovery using `GET /campaigns/{campaign_id}/webhooks`.
- A controlled-activation/readiness function with a defined Smartlead checklist.
- Provider campaign mapping tables and lead-mapping tables.
- A **Smartlead → Liftor contact import** path for leads that already exist inside a mapped Smartlead campaign.
- Paginated/resumable import, business-ownership resolution, duplicate recovery and relationship creation/update.
- Tests and an idempotency migration pack for the import path.

### Live/configured state

- Smartlead provider: **connected**.
- Smartlead campaign mappings: **0**.
- Smartlead lead mappings: **0**.
- Smartlead provider events captured: **0**.
- Smartlead activation-checklist rows: **0**.

Therefore the correct current statement is:

> **Smartlead API connectivity and significant supporting code are implemented, but the production closed loop is not yet activated.** Campaign mapping, lead mapping, mailbox/warm-up state, webhook receiver proof/capture, event return and controlled first push still have to be completed.

### Safety posture

The controlled-activation code deliberately fails closed. It checks, among other things:

- API key presence.
- mailbox connection state.
- warm-up state.
- campaign existence.
- campaign mapping.
- sequence verification.
- webhook secret/receiver evidence.
- webhook capture test.
- lead-push preview.
- external action gates.
- campaign paused/draft state.
- explicit founder authorisation.
- `auto_send` remaining disabled.

The readiness function itself performs no Smartlead POST, no email send and no Apollo call.

## Smartlead import direction — clarify the architecture

The newly implemented `smartlead-campaign-lead-import` function is a **Smartlead → Liftor recovery/synchronisation path**. It imports leads already present in a mapped Smartlead campaign into canonical Liftor contact/relationship/mapping structures using Smartlead GET operations only.

It is **not** the future main acquisition flow for the education programme.

The intended education operating flow remains:

`Apollo/search data -> Liftor staging/quality/dedupe -> canonical contact + business/campaign eligibility -> Smartlead scale lane -> events/replies back to Liftor`

No manual should imply that Smartlead is the source of prospect data for the education programme.

## Smartlead closed-loop gaps still to complete

Before scale outreach is considered production-ready, Liftor still needs live proof of:

1. Campaign discovery/creation policy and explicit Liftor campaign ↔ Smartlead campaign mapping.
2. Liftor contact ↔ Smartlead lead mapping for outbound pushes.
3. Production webhook receiver deployment/secret/readiness.
4. At least one captured and correctly normalised Smartlead event.
5. Reply/bounce/unsubscribe/event mutation back into the correct Liftor contact/campaign state.
6. Mailbox inventory synchronisation and warm-up/health state.
7. Controlled test push while the Smartlead campaign remains paused/draft.
8. Separate founder send authorisation before any live campaign start.

## Sending domains and inboxes

Liftor currently has 8 sending-domain records and 2 inbox records, of which 1 inbox is active. These are not evidence that the planned education sending estate exists.

The planned scale estate (initial target around 50 mailboxes, then expansion) must be treated as a new controlled infrastructure programme:

- mailbox/domain ownership recorded;
- provider IDs recorded;
- SMTP/IMAP and warm-up state visible;
- daily/hourly send limits governed;
- health/bounce/reply metrics returned;
- no fresh mailbox treated as scale-ready merely because it exists.

Legacy Neon Candy inbox/domain records remain segregated and may be retained for regression/testing history.

## Source manifest / fidelity controls — new since August manual baseline

A new business source-manifest/fidelity layer has been added since the last manual reconciliation. Relevant additions include:

- `src/components/founder/knowledge/BusinessSourceManifestBlock.tsx`
- `supabase/functions/_shared/sourceManifest.ts`
- `supabase/functions/business-source-manifest-register/index.ts`
- `supabase/functions/business-source-fidelity-check/index.ts`
- associated source-fidelity tests and activation wiring.

This layer records/validates the source material used to establish business knowledge and helps ensure later automation is operating from the intended business inputs rather than inferred or stale material.

The source manifest is an internal knowledge/data-integrity control; it does not itself authorise any external action.

## Statements superseded or tightened by this reconciliation

1. **Education live counts:** the August 2,520-row recovery is historical evidence, not a verified current live count.
2. **Smartlead:** provider connectivity is verified, but production campaign/lead/event mappings are currently empty; do not call Smartlead “fully connected end-to-end”.
3. **Apollo:** the integration is real and valuable, but current Neon Candy-specific search/quality defaults must not be reused unchanged for Education.
4. **Apollo automation:** free discovery and paid reveal are separate control planes. Free discovery does not imply permission for automatic enrichment.
5. **Mailboxes:** existing inbox/domain rows are legacy infrastructure; the planned education sending estate has not yet been built.
6. **CRM:** current operational CRM contacts are not the same thing as the education research universe.
7. **Smartlead data:** Smartlead is the scale delivery provider for the planned education outbound flow, not the preferred education prospect-data source.

## Build discipline adopted for the next phase

To reduce unnecessary Lovable AI credit use and prevent architectural drift:

- **GitHub `main` is the code source of truth.**
- Reconciliation, code search, diff review, documentation, branch creation and ordinary source changes should be performed through GitHub-first workflows wherever practical.
- Lovable AI should be reserved for work where it adds material value: complex application-aware edits, Lovable/Supabase integration work, UI/preview validation and deployment-specific tasks.
- Changes should be built in discrete branches/units, reviewed, tested and merged rather than through long mixed-purpose Lovable conversations.
- Every material architecture change must include its corresponding manual/current-state update in the same build unit or immediately before merge.
- Database live state remains distinct from repository implementation state; manuals must label both.

## Stage-1 reconciliation verdict

### Retain

- Liftor architecture and central CRM model.
- Apollo provider integration and staging/quality components.
- Smartlead provider and scale-lane architecture.
- two-lane outbound model.
- Relationship Intelligence research layer.
- source-manifest/fidelity controls.
- legacy Neon Candy material as segregated test/history data.

### Correct before production scale

- Genericise Apollo away from Neon Candy-specific defaults.
- add a portfolio-wide Apollo credit firewall.
- add company-universe/per-company decision-maker orchestration.
- reconcile/restore the education universe into the intended current data layer.
- complete Smartlead campaign/lead/event/webhook closed loop.
- build and synchronise the planned sending mailbox estate.

### Current external-action posture

No change. This reconciliation does not authorise sending, Smartlead campaign start, Apollo paid enrichment, mailbox activation, provider mutation or any other external action.

## Non-destructive confirmation

This reconciliation intentionally changes documentation only. No application code, database row, Apollo record, Smartlead object, campaign, mailbox, webhook, queue or external action was created, deleted or modified as part of Stage 1.
