# Apollo + Education Infrastructure Build Spec — 10 September 2026

**Stage:** 4  
**Goal:** make Liftor safe and structurally ready for education-data restoration/discovery without spending Apollo credits or starting outbound.

## A. Reuse existing architecture

Do not create a second CRM or duplicate candidate system.

- `strategic_account_lists` + `strategic_target_accounts` = canonical 152-company account universe.
- `relationship_intelligence_contacts` = broad education research/candidate pool.
- `contacts` = canonical operational CRM only after controlled promotion.
- `business_contact_relationships` = business-specific relevance/status.
- `apollo_credit_ledger` = existing append-only paid-usage ledger; strengthen it, do not replace it.
- `business_autopilot_settings` = existing per-business Apollo daily/monthly budgets and quality exclusions; retain them as lower-level controls.

## B. Portfolio-wide Apollo Credit Firewall

Add a shared, atomic portfolio control around **every paid Apollo endpoint**.

### Required policy state

Create an additive portfolio policy table (name may follow existing conventions) with at least:

- provider = Apollo;
- `paid_enrichment_enabled` default **false**;
- `hard_credit_limit` default 0 until founder deliberately configures it;
- `safety_reserve` default 0;
- `per_run_cap` default 25;
- `allow_phone_reveal` default false;
- `allow_personal_email_reveal` default false;
- `allow_waterfall` default false;
- timestamps / founder update provenance.

### Required reservation/idempotency state

Create an additive reservation/attempt mechanism that:

- reserves estimated credits before a paid request;
- uses a deterministic unique operation key so retries cannot reserve/spend twice;
- serialises/atomically protects the portfolio-wide limit against concurrent jobs;
- supports `reserved`, `settled`, `released` states;
- records business/function/run/person IDs;
- settles actual/estimated paid usage into existing `apollo_credit_ledger` exactly once;
- records no-email paid attempts so the same Apollo person ID is not paid for again by default;
- fails closed when the policy is disabled/unconfigured or the hard limit would be exceeded.

A PostgreSQL RPC + shared edge-function helper is preferred so every paid function uses the same enforcement logic.

### Paid code paths that must be guarded

At minimum audit and wrap all current paid `/people/match` / `/people/bulk_match` paths:

- `apollo-sync-enrich`
- `apollo-unlock-selected`
- `autopilot-orchestrator`

No paid path may bypass the shared firewall.

### Bulk fallback rule

Do not allow a failed/ambiguous bulk enrichment request to automatically fall through to individual paid requests in a way that may double-charge. Fail closed or make the retry a separately accounted/idempotent operation.

### Current Stage-4 configuration

After deployment, `paid_enrichment_enabled` remains **false** and `hard_credit_limit=0`. Stage 4 proves the firewall exists; it does not enable spending.

## C. Canonical 152-company universe using existing strategic-account tables

Create an internal import/upsert path that accepts the reviewed CSV rows (or parsed JSON rows) and maps them into existing strategic account infrastructure.

### Master list

Create/find one portfolio-level list:

- list name: `Education 152 — Master Groups`
- list type: `education_account_universe`
- no business ownership required
- internal/research only
- cannot trigger outreach.

### Target-account representation

One `strategic_target_accounts` row per `EDU-###` group.

Use a stable idempotency key such as:

`source_key = education_152_master:EDU-001`

Persist:

- Group ID
- account name
- account domain
- qualification category
- operating footprint
- review note
- primary source
- source version/date

Add a safe uniqueness constraint for the education source keys without breaking existing 2,754 strategic-target rows.

### Import behaviour

- default dry-run;
- explicit confirmation required for writes;
- validate unique Group IDs, account names and domains;
- allowed categories: International operator / Review needed / Network route / Domestic reserve;
- return control totals: received, valid, create, update, unchanged, errors;
- no contacts created;
- no RI candidates created;
- no Apollo calls;
- no Smartlead calls;
- no outreach/queue side effects.

## D. Education research candidate mapping

Extend `relationship_intelligence_contacts` only as needed to durably map a candidate to the canonical account universe. Prefer nullable additive fields such as:

- `education_group_id`
- `strategic_target_account_id`
- `apollo_org_id` if not already available
- `education_role_family`
- `education_role_score`
- `research_program_key`
- `reveal_status`

Do not duplicate identity data already present.

Historical verified emails must never be overwritten by masked/null free-search values.

## E. Education role scoring — no Neon Candy taxonomy

Add a deterministic shared education scorer, independent from music/Neon Candy rules.

Core role families:

- executive sponsor
- education/academic leadership
- curriculum / teaching & learning
- innovation / digital / technology
- SEN / inclusion / wellbeing / pastoral / safeguarding
- procurement / commercial / partnerships
- marketing / admissions / parent experience
- regional/group leadership

Score for role relevance + buying authority + group scope, and penalise clearly irrelevant/early-years-only/tertiary/classroom-only matches where appropriate.

Return at least:

- role family
- score
- reasons
- group/regional indicator

This is campaign-neutral education scoring. Product-specific fit can be layered later.

## F. Education Apollo free-discovery orchestrator

Create a portfolio research function that operates from `Education 152 — Master Groups` rather than the old hard-coded `DEFAULT_ORGS` array.

Requirements:

- Apollo **People Search only** (`/mixed_people/api_search`);
- never call `people/match`, `bulk_match`, phone reveal or paid waterfall;
- default dry-run / plan mode where practical;
- account-by-account resumability and page cursor/state;
- use canonical account name/domain/aliases where available;
- education role titles/seniorities, not Neon Candy music taxonomy;
- upsert into `relationship_intelligence_contacts` using existing Apollo identity-preservation logic;
- attach canonical `EDU-###` / target-account mapping;
- rank candidates with the education role scorer;
- preserve broad useful candidate coverage, not three-only discovery;
- CRM/suppression cross-check may annotate candidates but must not promote them automatically;
- no Smartlead queue/push/send side effects.

The function must expose a dry-run that can show planned accounts/search criteria without making Apollo calls.

## G. Historical recovery compatibility

The new path must be compatible with the August assets:

- 22-group enriched checkpoint;
- 50 searched-not-enriched Apollo candidate IDs;
- historical 2,519/2,520-row recovery evidence.

Do not automatically replay the old 92-entry `DEFAULT_ORGS` list. Historical aliases should map into canonical `EDU-###` accounts.

## H. Operator visibility

Add a concise founder-facing status/control surface in the existing Apollo/outreach area, not a new app silo, showing:

- portfolio firewall: enabled/disabled;
- hard limit / used / reserved / remaining;
- phone/personal/waterfall flags;
- education master-list count;
- candidate count;
- accounts searched/completed/held;
- paid enrichment remains locked.

No button in Stage 4 should spend Apollo credits or send email.

## I. Tests / acceptance

Required automated tests or equivalent verification:

1. firewall blocks when disabled;
2. firewall blocks when hard limit is 0;
3. concurrent/repeated operation key cannot double-reserve/settle;
4. no-email attempt is marked to prevent silent repeat spend;
5. all three current paid Apollo paths route through shared firewall;
6. no automatic bulk→single double-spend fallback;
7. 152-account importer dry-run is idempotent and validates duplicate IDs/domains;
8. account upsert cannot create duplicate `EDU-###` groups;
9. education scorer ranks relevant education/SEN/curriculum/group roles above irrelevant roles;
10. education discovery contains no paid Apollo endpoint references;
11. discovery cannot create CRM contacts or outbound queue rows;
12. existing test suite/type-check/build remain green.

## J. Deployment safety

Stage 4 may deploy additive schema and new/changed edge functions only after tests pass, but must leave:

- Apollo paid enrichment disabled;
- hard portfolio limit at 0;
- phone reveal false;
- personal email reveal false;
- waterfall false;
- Smartlead sending unchanged/off;
- education data restoration unexecuted.

Update Full/User/Slim manuals in the same build unit to reflect the new **implemented** firewall and universe engine, while clearly stating that paid enrichment remains disabled and the 152 data has not yet been imported into production.
