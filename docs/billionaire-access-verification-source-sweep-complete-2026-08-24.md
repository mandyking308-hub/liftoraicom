# Billionaire Access Verification — Source Sweep Complete

**Completed:** 2026-08-24

## Completion state

The external public-source access-route research sweep is complete for the full Forbes World's Billionaires 2026 source universe used by Liftor:

- **3,428 / 3,428 source rows researched**
- **35 batch files** covering rows 1–3428
- batches were worked in 100-person units wherever possible, with the final batch covering rows 3401–3428
- every source row has a documented route/status outcome in the GitHub research layer
- no guessed private personal emails, private phone numbers or residential addresses were used
- `outreach_allowed` remains false; route verification and campaign approval remain separate
- restrictions, invitation-only channels, stale/historical asset routes, public-official/PEP flags and sanctions blocks are preserved rather than discarded

## Batch coverage

- Batch 001: rows 1–100
- Batch 002: rows 101–200
- Batch 003: rows 201–300
- Batch 004: rows 301–400
- Batch 005: rows 401–500
- Batch 006: rows 501–600
- Batch 007: rows 601–700
- Batch 008: rows 701–800
- Batch 009: rows 801–900
- Batch 010: rows 901–1000
- Batch 011: rows 1001–1100
- Batch 012: rows 1101–1200
- Batch 013: rows 1201–1300
- Batch 014: rows 1301–1400
- Batch 015: rows 1401–1500
- Batch 016: rows 1501–1600
- Batch 017: rows 1601–1700
- Batch 018: rows 1701–1800
- Batch 019: rows 1801–1900
- Batch 020: rows 1901–2000
- Batch 021: rows 2001–2100
- Batch 022: rows 2101–2200
- Batch 023: rows 2201–2300
- Batch 024: rows 2301–2400
- Batch 025: rows 2401–2500
- Batch 026: rows 2501–2600
- Batch 027: rows 2601–2700
- Batch 028: rows 2701–2800
- Batch 029: rows 2801–2900
- Batch 030: rows 2901–3000
- Batch 031: rows 3001–3100
- Batch 032: rows 3101–3200
- Batch 033: rows 3201–3300
- Batch 034: rows 3301–3400
- Batch 035 FINAL: rows 3401–3428

## What this completes

This completes the human/public-source **research layer** for the 2026 billionaire universe: the task of finding a legitimate institutional route or recording the reason a route is restricted, stale, compliance-gated or blocked.

## Production reconciliation still required

The production `billionaire_intelligence` universe is an older Jan-2025 set of **2,754 IDs** and must not be treated as identical to the 2026 source universe.

The existing Liftor matching layer records:

- Jan-2025 production universe: **2,754**
- 2026 snapshot: **3,428**
- high-confidence 2025→2026 matches: **2,274**
- ambiguous matches: **4**
- new 2026 names not in the older universe: **1,150**
- older-universe 2026-match-missing/dropoff candidates: **480**

Therefore the source research is complete, but the final database operation is to map the researched 2026 rows back onto the 2,754 production `billionaire_id` records and manually resolve the ambiguous/dropoff population. This session does not currently have query/write permission to the production Supabase project, so those IDs cannot be safely guessed or fabricated from GitHub.

## Import rule

When production database access is restored:

1. match each researched 2026 source row to its existing `billionaire_id` using the stored snapshot/matching layer;
2. import the evidence-backed institutional route/status and restriction notes without overwriting stronger existing evidence;
3. resolve the 4 ambiguous matches manually;
4. review the 480 older-universe dropoff candidates against their Jan-2025 names and existing affiliations, preserving them even if they are no longer on the 2026 Forbes list;
5. keep sanctions, PEP/public-official, deceased, historical-route and restricted-route controls attached at person level;
6. keep `outreach_allowed=false` until a separate campaign-specific approval step.

The research files are the evidence layer; the production-ID reconciliation is the remaining database operation, not missing 2026 research.
