# Montvelle Global Supplier Network

## Purpose

Montvelle needs a durable 5/6-star supplier universe before supplier outreach begins. The base is owned once in Liftor and is designed to become the operational sourcing layer behind Montvelle concierge requests.

The initial seed contains 78 organisations across 20 verticals. It deliberately prioritises **network multipliers**: organisations where one relationship can unlock many underlying hotels, clubs, destinations, properties, vehicles, yachts, advisers or local providers.

## Operating rule

Database inclusion is not evidence of endorsement, partnership or an approved supplier relationship.

Lifecycle:

`Identified → Contacted → Screened → Approved → Preferred → Contracted`

Useful research is held rather than deleted.

Outreach status is tracked separately:

`Not contacted → Queued → Sent → Replied → Follow-up → Closed`

## Public naming rule

Montvelle uses supplier **names, not logos**.

Until a relationship is confirmed, a name may only be used as a factual sourcing reference. Public copy must not describe an organisation as a partner, approved supplier, preferred supplier or endorser unless the relationship record contains evidence supporting that description.

## Supplier verticals

1. Luxury travel networks
2. Private-club networks
3. Private members' clubs
4. Hotel networks
5. Hotel and restaurant networks
6. Concierge networks
7. Hotel groups
8. Private aviation
9. Chauffeur and ground transport
10. Yachts and marine
11. Destination management
12. Villas and residences
13. Luxury retail
14. Art and collectibles
15. Property and real estate
16. Relocation
17. Private staffing
18. Security and risk
19. Medical and security assistance
20. Wellness and longevity

## Multiplier-first examples

- Virtuoso — global luxury travel network spanning preferred hotels, cruises, airlines, tour companies and destinations.
- International Associate Clubs (IAC) — reciprocal private-club network across more than 40 countries.
- Soho House — global private-members' club group.
- 67 Pall Mall — international private-club portfolio with reciprocal relationships.
- Ned's Club — global private-club access across its club locations.
- Preferred Hotels & Resorts — large independent luxury hotel portfolio across more than 80 countries.
- The Leading Hotels of the World, Small Luxury Hotels of the World, Relais & Châteaux and Design Hotels — hotel collection multipliers.
- Ten Lifestyle Group, Quintessentially and John Paul — concierge/network multipliers.
- Air Charter Service, Blacklane, Burgess and Abercrombie & Kent — operational multipliers in aviation, transport, yachts and destination management.

## Current evidence notes

Initial public verification on 24 August 2026 confirmed:

- Virtuoso describes a network of 1,200+ travel agency locations and 2,300 preferred partners.
- International Associate Clubs describes a network of 200+ private clubs in 40+ countries.
- Soho House states Every House members have access to 50 Houses in 20 countries in 2026.
- Preferred Hotels & Resorts describes a portfolio of 625+ hotels across 80 countries in its 2026 material.
- 67 Pall Mall publishes a global club portfolio and reciprocal-club access.
- Ned's Club states membership provides access to Ned's Clubs globally, with current locations including London, New York, Doha and Washington DC.

These figures are evidence fields, not permanent constants. Re-verify them as the database is enriched.

## Source of truth

- `src/data/montvelleSupplierSeed.ts`
- Liftor Portfolio CRM → Montvelle Global Supplier Network panel
- Master asset register → `src/lib/dataAssetRegistry.ts`

## Next workstream: supplier contacts

Do not mix contact enrichment with the initial supplier build. For each supplier, separately capture:

- preferred commercial / partnerships / travel-industry contact
- name and role
- verified work email
- LinkedIn / public route where useful
- country / office
- relationship owner
- first-contact date
- email version sent
- reply status
- terms / commission / net-rate notes
- vetting status
- public-name relationship status
- next action

Priority order for contact enrichment should be:

1. network multipliers
2. global hotel and travel collections
3. private-club networks and multi-location clubs
4. private aviation / chauffeur / yacht multipliers
5. global DMC and concierge networks
6. individual premium suppliers needed to fill geographic or category gaps

## Guardrail

Sending an introductory email establishes an outreach record; it does not by itself create a contractual, approved, endorsed or preferred-supplier relationship. Relationship status must be evidence-based.
