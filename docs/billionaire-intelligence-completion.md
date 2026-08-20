
## Part A/B/C completion (2026 wealth layer + evidence mapping)

**Provenance.** Forbes World's Billionaires 2026, published 10 Mar 2026, valuations as of 1 Mar 2026,
3,428 billionaires / $20.1T. Ingested from a **third-party machine-readable derivative CSV**
(`raw.githubusercontent.com/AhoyLemon/kinda.fun/.../forbes-2026.csv`) — not an official Forbes-hosted file.
Both the official source and the derivative URL are stored per row. Row count (3,428) and the official top-10
names/values were validated before the import was accepted. Jan-2025 Forbes values are untouched historical data.

**Reconciliation (production):**
- Jan-2025 universe 2,754 / coverage records 2,754 (0 missing)
- 2026 snapshot rows 3,428 / 3,428
- high-confidence 2025→2026 matches 2,274 · ambiguous 4 · new 2026 names 1,150
- 2026-match-missing (dropoff *candidates*, not confirmed) 480 → all in manual review queue
- current wealth (1 Mar 2026) 2,274 · stale (Jan-2025 only) 480
- rising 1,246 · stable 698 · falling 330
- Giving Pledge / philanthropy-network matched 126 billionaires (125 members matched, 136 members have no
  match in the 2,754 universe and are surfaced for manual linking)
- foundations (unique billionaires) 10 · family offices 0 — the affiliation table genuinely contains
  3,152 wealth_source_company, 9 foundation, 1 philanthropic_initiative and **zero** family_office rows;
  the low coverage numbers are correct data, not a counting bug
- verified public institutional 0 · verified warm intermediary 0 · researched/candidate only 2,751 · no route 3
- candidate routes 3,162 · researched access pathways 137 · enrichment queue open 2,754 · outreach-ready 0

**Honest gaps.** No route in the system is currently *verified*: the 137 pre-existing pathways are now graded
`researched_candidate` until a human reviews public/institutional evidence. `outreach_allowed` remains a separate
manual gate and nothing has been sent. No private addresses, phones or personal emails are stored or derived.
