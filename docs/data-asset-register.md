# Liftor Master Data Asset Register

Last reviewed: 23 August 2026

## Purpose

This register is the durable map of strategic data built across the portfolio. A dataset may live in Liftor Supabase, the Liftor repository, or another portfolio application. The register exists so that data is not lost simply because it is not currently actionable or because it sits outside Liftor's primary database.

## Operating rule

Every material dataset must record:

- dataset name and category;
- source of truth;
- physical storage locations;
- what one record represents;
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
- **Use:** next-gen relationship intelligence, GHAT routes, community/network mapping and future partnerships
- **Retention:** keep historic and currently inaccessible networks; update verification/freshness instead of deleting them.

### 3. Global Education Sales Data

- **Category:** Commercial intelligence
- **System:** Liftor GitHub `data/` store; import-ready for Liftor
- **Repository:** `mandyking308-hub/liftoraicom`
- **Source of truth:** `data/global-education-program-status-2026-08-22.json` plus its listed JSONL files
- **Current known state:** 22 groups seeded; 146 contacts enriched; 109 verified work emails; 37 held; target 120 groups / 2,500 contacts
- **Import route:** `supabase/functions/ri-upsert-import/index.ts`
- **Record model:** education group/account → buyer role → named contact → current employer → verified work email → hold/readiness state
- **Use:** high-value education account-based sales and outreach
- **Retention:** preserve missing, stale, mismatched and unverified records in a held state rather than discarding them.

### 4. GHAT Grants & Funding Database

- **Category:** Funding intelligence
- **System:** GHAT Supabase
- **Repository:** `mandyking308-hub/globalhealthaccesstrust`
- **Source of truth:** GHAT `funding_*` tables
- **Core tables:** `funding_funders`, `funding_opportunities`, `funding_projects`, `funding_applications`, `funding_awards`, `funding_reporting_obligations`, `funding_readiness_items`, `funding_radar_events`
- **GHAT admin UI:** `src/pages/admin/AdminFundingPage.tsx`
- **Record model:** funder → opportunity → eligibility/deadline → project fit → application → award → reporting obligation
- **Use:** GHAT grant pipeline, funding relationships and post-award reporting
- **Retention:** keep closed, expired and currently ineligible opportunities as historical intelligence; change status rather than deleting them.

## Adding new data

When a new dataset is provided or built, add it to `src/lib/dataAssetRegistry.ts` and this document in the same change. The founder Command Centre reads the code registry and displays the asset map, including live counts for Liftor-hosted datasets where available.
