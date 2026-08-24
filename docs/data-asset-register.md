# Liftor Master Data Asset Register

Last reviewed: 23 August 2026

## Purpose

This register is the durable map of strategic data built across the portfolio. A dataset may live in Liftor Supabase, the Liftor repository, or another portfolio application. The register exists so that data is not lost simply because it is not currently actionable or because it sits outside Liftor's primary database.

## Source-of-truth and parallel-work rule

`main` in `mandyking308-hub/liftoraicom` is the authoritative integrated product line. Parallel chats may work on dedicated GitHub branches, but their work must be reconciled back to `main`; a parallel branch must not become a second master inventory.

The shared Portfolio CRM architecture is now part of the same model:

**Data Asset → Buyer Pool → Organisation → Person → Business Relevance → Campaign Eligibility → Conversation → Proposal → Deal → Customer → Revenue**

People and organisations are stored once and reused through many-to-many business relationships. Dataset ownership and provenance remain attached to the source asset rather than being copied into separate business silos.

## Operating rule

Every material dataset must record:

- dataset name and category;
- source of truth;
- physical storage locations;
- what one record represents;
- reusable buyer pools it can feed;
- current counts/completeness where available;
- intended workflow or commercial/funding use;
- provenance/source status;
- last review date;
- retention rule.

Useful data is retained. Records may be held, archived, marked stale, expired, unverified, mismatched or inactive; those states are preferable to silently deleting research.

## Current strategic assets

### 1. Billionaire Intelligence

- **Category:** Wealth intelligence
- **System:** Liftor Supabase
- **Repository:** `mandyking308-hub/liftoraicom`
- **Source of truth:** `billionaire_coverage` + `billionaire_wealth_snapshots`
- **Supporting tables:** `billionaire_enrichment_queue`, `billionaire_candidate_routes`, philanthropy-network evidence mappings
- **UI:** `/founder/billionaire-intelligence`
- **Record model:** person → wealth snapshot → foundation/family office/company routes → evidence → verification → readiness
- **Reusable pools:** `hnw-family-office`, `founders-investors`, `philanthropy-funders`
- **Use:** GHAT fundraising intelligence, relationship mapping and controlled outreach readiness
- **Retention:** preserve historical wealth, unmatched names, stale records and unverified candidate routes.

### 2. Rich Kids / Next-Gen Wealth Networks

- **Category:** Relationship intelligence
- **System:** Liftor Supabase
- **Repository:** `mandyking308-hub/liftoraicom`
- **Source of truth:** `philanthropy_network_registry` + `philanthropy_network_contacts`
- **Research note:** `docs/next-gen-wealth-networks.md`
- **Migration:** `supabase/migrations/20260822093600_philanthropy_network_intelligence.sql`
- **Record model:** network → focus/audience → access mode → public contact route → source evidence → verification state
- **Reusable pools:** `hnw-family-office`, `philanthropy-funders`, `founders-investors`
- **Use:** next-gen relationship intelligence, GHAT routes, community/network mapping and future partnerships
- **Retention:** keep historic and currently inaccessible networks; update verification/freshness instead of deleting them.

### 3. Global Education Sales Data

- **Category:** Commercial intelligence
- **System:** Liftor production database (recovered 24 August 2026)
- **Repository:** `mandyking308-hub/liftoraicom`
- **Source of truth:** `public.relationship_intelligence_contacts`, tag `education_customer_universe` (read live)
- **Current live state (verified 24 Aug 2026):** 2,519 contacts; 266 distinct organisations; 109 verified work emails; 1,424 email reveal required; 986 no email currently on file (109 + 1,424 + 986 = 2,519)
- **Original targets:** 2,500 contacts (exceeded); 120 groups (historical target, not a current actual)
- **Provenance (current status file):** `data/global-education-program-status-2026-08-24.json`
- **Historical checkpoint (unchanged):** `data/global-education-program-status-2026-08-22.json` plus its listed JSONL files — 22 groups seeded, 146 contacts, 109 verified emails, 37 held. These are the original saved checkpoint only and must not be shown as current holdings.
- **Recovery note:** `docs/apollo-education-universe-recovery-2026-08-24.md`
- **Import route:** `supabase/functions/ri-upsert-import/index.ts`
- **Portfolio CRM architecture:** `docs/portfolio-crm-architecture-2026-08-23.md`
- **Pool overlays:** `src/data/portfolioCrmPoolOverrides.ts`
- **Record model:** education group/account → buyer role → named contact → current employer → email state (verified / reveal required / none on file) → business relevance → hold/readiness state
- **Reusable pools:** `education-leadership`, `enterprise-operations`, `supply-chain-procurement`, `finance-treasury`, `governance-risk`, `hr-people-benefits`, `marketing-comms`, `professional-learning`
- **Use:** high-value education account-based sales and reusable cross-portfolio targeting. The same education organisation can supply different functional buyers to different Liftor businesses instead of being bought again for each project.
- **Retention:** preserve missing, stale, mismatched and unverified records in a held state rather than discarding them. Reveal-required records are not verified emails. Historical snapshot counts must never overwrite live counts.


### 4. GHAT Grants & Funding Database

- **Category:** Funding intelligence
- **System:** GHAT Supabase
- **Repository:** `mandyking308-hub/globalhealthaccesstrust`
- **Source of truth:** GHAT `funding_*` tables
- **Core tables:** `funding_funders`, `funding_opportunities`, `funding_projects`, `funding_applications`, `funding_awards`, `funding_reporting_obligations`, `funding_readiness_items`, `funding_radar_events`
- **GHAT admin UI:** `src/pages/admin/AdminFundingPage.tsx`
- **Record model:** funder → opportunity → eligibility/deadline → project fit → application → award → reporting obligation
- **Reusable pool:** `philanthropy-funders`
- **Use:** GHAT grant pipeline, funding relationships and post-award reporting
- **Retention:** keep closed, expired and currently ineligible opportunities as historical intelligence; change status rather than deleting them.

## Portfolio CRM rules that protect the data estate

- `contacts` remains the master person registry.
- `business_contact_relationships` carries many-to-many business relevance.
- Relationship Intelligence remains the research/evidence layer; approved records can be promoted into CRM without destroying provenance.
- `contacts.assigned_business` is legacy compatibility only, not the source of truth.
- Global suppression overrides every business relationship; business-specific DNC remains scoped to that relationship.
- Importing or promoting data never triggers outreach automatically.
- A person or organisation is not duplicated merely because several Liftor businesses can use the relationship.

## Adding new data

When a new dataset is provided or built, add it to `src/lib/dataAssetRegistry.ts` and this document in the same change. Map it to every relevant reusable buyer pool rather than assigning it to only one product. The Founder Command Centre reads the code registry and displays the asset map, including live counts for Liftor-hosted datasets where available.
