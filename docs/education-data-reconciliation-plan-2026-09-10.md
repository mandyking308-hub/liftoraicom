# Education Data Reconciliation & Recovery Plan — 10 September 2026

**Stage:** 3 — data reconciliation plan only  
**Status:** no production data mutation authorised by this document  
**Primary account source:** `Apollo_Education_All_152_Company_Review_2026-09-08.csv`  
**Historical evidence:** August 2026 global education data/recovery artefacts in `data/**` and `docs/apollo-education-universe-recovery-2026-08-24.md`

## 1. Objective

Rebuild the education prospect/research universe as a clean portfolio data asset without repeating the previous Apollo credit waste and without mixing research candidates into the operational CRM or Smartlead before they are ready.

The goal is **broad buyer coverage, selective paid reveal**:

`152-group account spine -> broad free Apollo discovery -> Liftor qualification/ranking -> preserve all useful candidates -> selective paid email reveal -> canonical CRM promotion when operationally needed -> Smartlead only for approved campaign execution`

A three-person limit must **not** be imposed on the research universe. Per-company caps belong to paid reveal/outreach waves, not discovery.

## 2. September 152-company account spine

The reviewed September CSV contains exactly **152 unique company/account rows**, with no duplicate Account Name values, no duplicate website/domain values and no missing domains in the supplied file.

Qualification breakdown:

| Qualification | Companies |
|---|---:|
| International operator | 60 |
| Review needed | 17 |
| Network route | 21 |
| Domestic reserve | 54 |
| **Total** | **152** |

Each row already carries a stable `EDU-###` Group ID, domain, footprint, review note and primary source. These Group IDs should become the canonical account identifiers for the first production education programme.

### Authority rule

The September 152-company file controls **company/account identity and grouping** for the new programme.

Historical Apollo/recovery data may contribute people, Apollo person IDs, verified emails and research evidence, but must be mapped underneath a September `EDU-###` account wherever possible. Historical account labels must not create duplicate parent companies.

Examples of known historical-name normalisation:

- `International Schools Partnership Limited` -> `International Schools Partnership`
- `Taaleem UAE` -> `Taaleem`
- `Beaconhouse School System` -> `Beaconhouse Group`
- `Dulwich College International / Education in Motion` -> `Education in Motion` where the September review has consolidated Dulwich under that parent.

## 3. Historical education assets — what exists

### 22 August checkpoint

The saved checkpoint records:

- 22 groups seeded;
- 146 researched/enriched contacts;
- 109 verified work emails;
- 37 held for no unique email/validation;
- 148 Apollo credits consumed at that historic checkpoint;
- 2,352 Apollo credits remaining at that dated check.

Those 22 groups include the major operator set that now maps into the September account spine. Their person/email data should be recovered first because it is the highest-confidence pre-existing paid asset.

### Pre-enrichment queue

A separate saved queue preserves **50 Apollo candidate IDs** across several education groups specifically in `SEARCHED_NOT_YET_ENRICHED` state. This is valuable because person IDs/roles were retained before paid enrichment. These candidates should be mapped to the September account spine and re-evaluated before any paid call.

### 24 August recovery evidence

The later recovery document/status records a historical production state of approximately:

- 2,519/2,520 education rows;
- 266 organisations;
- 2,441 distinct Apollo person IDs;
- 109/110 verified work-email rows;
- 1,424 reveal-required candidates;
- 986 no-email-on-file candidates.

The recovery used Apollo **free People Search only** for reconstruction and was deliberately held from outreach.

### Critical live-state discrepancy

On 10 September 2026, live `relationship_intelligence_contacts` contains **0** rows with `relationship_type='school_education_contact'`.

Therefore the August counts are historical/provenance evidence, not current live holdings. They must not be presented as live until a controlled restoration/reconciliation has occurred.

## 4. Do not replay the old recovery job unchanged

`apollo-education-recovery` currently has a hard-coded `DEFAULT_ORGS` list of 92 mixed targets. That list contains a mixture of parent operators, individual schools and historical/alias forms.

The new 152-company CSV is a better canonical account definition and must replace the hard-coded organisation list as the input spine for future discovery/recovery.

The old recovery function is still useful for its proven properties:

- free People Search;
- paged/resumable operation;
- Apollo-person-ID based identity;
- masked/null values never overwrite verified emails;
- held/not-send state;
- reusable `apolloRelationshipUpsert` logic.

Those properties should be retained in the new company-universe engine.

## 5. Four data layers — never conflate them

### A. Education account master

One row per canonical September account (`EDU-###`).

Minimum fields:

- `education_group_id`
- canonical account name
- domain
- qualification category
- operating footprint
- review note
- source/provenance
- account status
- alias names
- account priority
- last account review date

### B. Education research candidate pool

Broad, inexpensive/zero-credit candidate universe. A candidate may remain here indefinitely without becoming a CRM contact.

Minimum fields:

- canonical `education_group_id`
- Apollo person ID
- source name/title/company
- masked or full name as actually returned
- role/title
- seniority
- geography
- LinkedIn URL if available
- Apollo `has_email` / email-status signal
- verified email only if legitimately already known
- research role tags
- score/rank
- discovery source/date
- reveal status
- hold/suppression state

### C. Canonical portfolio CRM

Operational people only. Store a person once in `contacts`; business relevance belongs in business/campaign relationship tables. Promotion from the research pool is controlled and deduplicated.

### D. Smartlead campaign membership

Delivery/execution state only. A Smartlead lead is not the master prospect record and Smartlead campaign membership is not consent/send readiness.

## 6. Coverage strategy — maximise useful contacts without wasting credits

Do not cap free discovery at three contacts per company.

Recommended research-retention targets by account type:

| Account type | Research candidates to retain | First paid-reveal wave |
|---|---:|---:|
| 60 International operators | typically 10–15 useful HQ/regional buyers | up to 4 initially |
| 17 Review-needed | typically 6–10 while account qualification is resolved | 0 until account passes review |
| 21 Network routes | typically 4–8 central influence/introduction contacts | 1–3 only where buying/influence remit is credible |
| 54 Domestic reserves | typically 6–10 useful group buyers | 2–3 when activated |

These are targeting guidelines, not destructive caps. Very large groups may legitimately retain more candidates where roles are distinct and relevant.

A reasonable first complete research pool is roughly **1,400–1,800 useful people** across the 152 companies, while free search may inspect more candidates before Liftor filters them.

## 7. Role coverage model

The candidate pool should deliberately seek different buying routes rather than ten near-identical executives.

Core role families:

1. Group executive sponsor — CEO / MD / COO where relevant.
2. Education/academic leadership — Chief Education/Academic/Learning Officer, Education Director.
3. Curriculum / teaching & learning.
4. Innovation / digital learning / technology.
5. SEN / inclusion / wellbeing / pastoral / safeguarding.
6. Procurement / commercial / partnerships where central buying remit exists.
7. Marketing / admissions / parent experience where relevant to the proposition.
8. Regional leadership for large multi-country groups where group HQ is not the sole buying centre.

The company-level candidate set should maximise **role diversity + buying authority + relevance**, not simply seniority.

## 8. Historical-person recovery order

Before any new Apollo search or paid reveal:

1. Recover the 22 August verified-contact source files into a reconciliation workspace, not directly into Smartlead.
2. Recover the 50 `SEARCHED_NOT_YET_ENRICHED` candidate IDs.
3. Extract every reusable Apollo person ID / verified email / LinkedIn URL from other historical education JSONL files.
4. Map historical organisation labels to the canonical 152 `EDU-###` groups using domain first, explicit alias second, reviewed name match third.
5. Hold unmatched historical people under an `education_legacy_unmapped` state for review; never force them into a company.
6. Dedupe by Apollo person ID, then verified email, then strong identity match.
7. Preserve verified emails; never overwrite them with masked/null free-search results.
8. Only after this recovery baseline is known should new Apollo free-search discovery fill account/role gaps.

## 9. Apollo search strategy after recovery

For each active canonical company:

1. use the company's canonical name/domain/aliases to construct an Apollo People Search;
2. use education-safe role families, not Neon Candy/music taxonomy;
3. search for senior/group/regional people and relevant functional roles;
4. stage candidates with Apollo person ID and `has_email` signal;
5. compare against historical recovered IDs + CRM + suppression data;
6. score and retain useful distinct-role candidates;
7. do **not** reveal emails during discovery.

The discovery process should be resumable at account + search-page level so repeated runs do not start again from page 1 or rediscover the same person unnecessarily.

## 10. Paid reveal rule

No paid reveal starts until the Apollo Credit Firewall exists.

When it does:

- chargeable operations are allowed only for selected candidate IDs;
- account/wave budgets are separate from the research-pool size;
- no phone reveal by default;
- no personal-email waterfall by default;
- already-verified contacts are skipped;
- previously attempted/no-email Apollo IDs are skipped unless explicitly overridden for a justified reason;
- a portfolio reserve remains untouched;
- actual provider-reported credit consumption is written to an auditable ledger where available;
- every paid operation has an idempotency key / attempt record so retries cannot silently double-spend.

## 11. Proposed prioritisation of the 152 companies

### Wave A — first commercial focus

Start with the **60 International operators** because they offer the greatest opportunity for group-level distribution and multi-school leverage.

Within these, prioritise by:

- group scale;
- central decision-making capability;
- relevance to the education propositions;
- quality of available buyer routes;
- existing verified historical contacts;
- geography and ability to run a group pilot.

### Wave B — Review-needed

The 17 review-needed accounts stay in research mode until parent/ownership/purchasing remit is resolved. Free research may continue; paid reveal should not.

### Wave C — Network routes

The 21 network routes are relationship/distribution channels, not automatically central procurement buyers. Rank by ability to influence or introduce member schools rather than by school count alone.

### Wave D — Domestic reserve

The 54 domestic-reserve groups remain valuable, especially large consolidated operators, but follow the strongest international/group opportunities unless a product/geography makes them unusually attractive.

## 12. Stage-3 output schema for the later implementation

The implementation should create or expose a durable account/candidate model equivalent to:

### `education_accounts`
- canonical account row / `EDU-###`

### `education_account_aliases`
- historical/Apollo/provider names and domains mapped to the canonical group

### `education_candidates`
- broad research candidate pool keyed by Apollo person ID where available

### `education_candidate_scores`
- role/fit/rank evidence, separated from identity

### `apollo_credit_ledger`
- created in Stage 4; every paid attempt/reservation/actual spend

Names may be adapted to existing Liftor schema if equivalent tables already exist; do not create duplicate concepts merely to match these names.

## 13. Acceptance gate before any data restore

Before writing recovered education data into production, Stage 4 infrastructure must prove:

- the canonical 152-account mapping model exists;
- education-specific candidate scoring is independent from Neon Candy taxonomy;
- Apollo free search and paid reveal are separate operations;
- portfolio-wide credit firewall blocks spend beyond configured budget;
- paid enrichment cron is disabled for the education programme;
- dedupe/idempotency protects Apollo person IDs and verified emails;
- restoration has a dry-run/control-total report;
- restoring research candidates cannot queue Smartlead outreach.

## 14. Stage-3 verdict

The September 152-company CSV should be the **canonical company universe** for the first production education programme.

The August 2,519/2,520-row recovery should be treated as a **historical person-level recovery source**, not thrown away and not blindly replayed.

The goal is to recover as much legitimately useful person intelligence as possible, then use free Apollo discovery to fill gaps. Paid credits are reserved for candidates that Liftor has already ranked for an active outreach wave.

**No production data mutation, Apollo paid request, Smartlead mutation or send is authorised by this plan.**
