# Education CRM-Native Correction — 10 September 2026

**Status:** authoritative correction to Stage 4 education data placement.  
**Scope:** CRM/account/contact architecture only. Apollo Credit Firewall remains unchanged and locked. Smartlead remains unchanged.

## 1. Founder decision

Education is a CRM programme in Liftor.

The canonical company/account record for every reviewed education group is `public.organisations`.
The canonical person record for every useful education decision-maker is `public.contacts`.
A person is stored once and linked to the correct education organisation. Relevance to Mandy's own portfolio businesses/campaigns is then represented separately through `business_contact_relationships` and campaign mappings.

This supersedes Stage 4 wording that made `strategic_target_accounts` the canonical education company store and `relationship_intelligence_contacts` the canonical broad candidate store.

Relationship Intelligence may retain historical/provenance evidence, but it is not the current education CRM source of truth.

## 2. Required data model

### CRM organisations

Extend `organisations` additively and non-destructively with nullable/compatible fields needed to identify the education account universe:

- `education_group_id text`
- `website_domain text`
- `qualification text`
- `operating_footprint text`
- `source_key text`
- `source_notes text`
- `primary_source text`
- `is_education_target boolean default false`
- `education_priority_tier text` (nullable; do not infer a final tier where not explicitly set)

Create safe indexes/partial uniqueness so `education_152_master:EDU-###` cannot duplicate. Do not impose a global uniqueness rule that could break non-education organisations.

### CRM contacts

Add a nullable FK:

- `organisation_id uuid references organisations(id)`

Add the minimum education/Apollo metadata required for CRM-native discovery and later reveal:

- `education_group_id text`
- `strategic_target_account_id uuid` (nullable reference where safe)
- `education_role_family text`
- `education_role_score numeric`
- `research_program_key text`
- `reveal_status text`

Keep legacy `company` text populated for compatibility/display, but `organisation_id` is authoritative company linkage for new education contacts.

Existing unique `contacts.apollo_person_id` remains the primary free-search identity guard.

## 3. Strategic account layer becomes prioritisation, not CRM truth

Retain `strategic_account_lists` and `strategic_target_accounts` because they are useful for ranking/planning.

For each education account, `strategic_target_accounts.existing_organisation_id` must point to the canonical CRM `organisations.id`.

The stable source key remains:

`education_152_master:EDU-###`

Strategic account rows may mirror domain/qualification/footprint for planning, but if account identity conflicts, the CRM organisation mapping must be reconciled rather than creating another company.

## 4. 152-company import behaviour

Correct `apollo-education-account-import` so confirmed writes upsert the company into CRM `organisations` first, then upsert/update the strategic-account mirror with `existing_organisation_id`.

Requirements:

- dry-run remains default;
- explicit `confirm:true` required for writes;
- validate all 152 source rows exactly as Stage 4 already does;
- stable group/source keys;
- idempotent rerun;
- match in this order: existing education `source_key` / `education_group_id`, then exact normalized domain where appropriate, then safe normalized name; ambiguous matches fail closed for review;
- never overwrite unrelated organisation records blindly;
- return CRM organisation creates/updates/matches plus strategic mirror creates/updates;
- no Apollo call, Smartlead call, contact creation or outbound side effect during company import.

All 152 reviewed company rows may live in CRM with their qualification category. Contact discovery will initially focus on the 60 `International operator` accounts; the other 92 remain visible CRM targets but held/reserve according to their classification.

## 5. Apollo free discovery must be CRM-native

Correct `apollo-education-discovery`.

It still uses ONLY:

`POST https://api.apollo.io/api/v1/mixed_people/api_search`

No paid endpoint may appear in this function.

Account source:
- read the 152 education strategic targets joined via `existing_organisation_id`, or query the canonical CRM organisations directly;
- require a canonical organisation id before writing a candidate.

Candidate destination:
- create/update `contacts` directly as CRM education candidate records;
- do not make Relationship Intelligence the required destination;
- optional RI provenance is allowed only if it cannot become a second identity truth.

For a newly discovered free-search candidate:
- `organisation_id` = correct CRM organisation;
- `company` = current CRM organisation name;
- `education_group_id` = EDU group;
- `apollo_person_id` = Apollo ID;
- `apollo_organization_id` where available;
- `first_name`, masked/returned `last_name`, `name`, `role`, LinkedIn, country where returned;
- `source='apollo_free_search'` and provenance fields set;
- `email` remains null unless Apollo free search legitimately returned a real address; never invent one;
- `email_verified_status='unknown'` unless provider evidence says otherwise;
- `apollo_enrichment_status='pending'`;
- `sendable_status='needs_review'`;
- `compliance_status='pending_review'`;
- `reveal_status='not_revealed'`;
- tags include education programme markers;
- `assigned_business` remains blank until portfolio-business relevance is intentionally mapped.

Dedupe/update order:
1. `apollo_person_id`;
2. if a genuine email exists, case-insensitive email;
3. otherwise fail closed rather than creating uncertain identity duplicates.

Never overwrite an existing verified email, suppression state, bounce state, do-not-contact state, or stronger identity/provenance with masked/null free-search data.

## 6. Broad contact coverage, selective reveal

The current Stage-4 limit of 3 candidates/account is too restrictive for discovery.

Change to:
- default candidates/account: 10;
- configurable maximum: 25;
- keep only candidates classified relevant by the education role scorer;
- preserve score, family, reasons/rank;
- no paid reveal in discovery.

For large education operators this allows a broad buying committee to live in CRM while paid reveal remains selective later.

## 7. Complete the Apollo chain structurally

Implement a founder-controlled education reveal path (new function or safe adaptation of an existing paid function) that operates on selected CRM education contact IDs and completes:

CRM candidate → Apollo person ID → shared portfolio Credit Firewall → `people/match` business-email reveal only → update the SAME CRM contact.

Rules:
- founder/admin only;
- explicit confirm required;
- firewall reservation required before every paid call;
- no phone reveal;
- no personal email reveal;
- no waterfall;
- no hidden bulk→single double-spend fallback;
- skip/mark previously paid no-email attempts;
- do not call unless contact has canonical `organisation_id` and Apollo person ID;
- on success update email/enrichment/reveal status and preserve organisation linkage;
- if revealed email matches another CRM contact, fail closed to identity-resolution/review rather than creating/overwriting a duplicate;
- successful reveal does not automatically send or automatically assign to a portfolio business.

Paid enrichment remains globally disabled/hard limit 0 after this correction unless Mandy separately authorises a later configuration change.

## 8. Portfolio-business relevance

Education company ownership and Mandy's portfolio-business relevance are separate relationships.

After a CRM education contact exists:
- the contact remains one canonical person;
- `business_contact_relationships` may link that contact to Billy and the Wild Forest, Aurelia, Kindnesss, Kingsbridge Global, or other relevant businesses when those businesses are ready;
- campaign-specific qualification/messages live on those relationships/campaigns;
- never duplicate the CRM person once per brand.

Do not create missing education business rows in this correction unless separately requested.

## 9. UI/current-state correction

Update the existing Apollo Credit Firewall/status surface so education counts come from CRM:
- education CRM organisations count;
- international-operator CRM organisations count;
- education CRM candidate contacts count;
- revealed-email count;
- paid enrichment lock state and credit firewall values.

The Stage-4 UI must no longer label RI-only candidate counts as the education master contact truth.

## 10. Manuals / GitHub / Lovable parity

GitHub is canonical. Update Full Technical, User and Slim Mandy manuals in the same build unit.

The manuals must say:
- `organisations` = canonical education company/account spine;
- `contacts` = canonical education person spine;
- strategic targets = planning/prioritisation mirror linked back to CRM;
- RI = provenance/research history, not canonical current education CRM;
- free Apollo discovery creates non-sendable CRM candidate contacts;
- selective paid reveal updates those same contacts;
- business relationships later assign contacts to relevant portfolio businesses;
- Smartlead receives approved/sendable campaign contacts later; it is not the CRM or prospect-data source.

Preserve Stage-4 historical text but mark conflicting placement language superseded by this correction.

## 11. Acceptance tests

At minimum prove:
1. migration is additive and existing 81 contacts/other CRM data are untouched;
2. education account import dry-run creates no rows;
3. confirmed account import upserts CRM organisation then links strategic target via `existing_organisation_id`;
4. rerunning import is idempotent;
5. duplicate EDU source keys cannot create duplicate CRM education organisations;
6. free discovery code references no paid Apollo endpoints;
7. discovery writes/updates `contacts`, not RI as canonical destination;
8. free candidate gets correct `organisation_id`/EDU group and stays non-sendable;
9. discovery defaults to 10 candidates/account and supports up to 25;
10. free-search update cannot erase verified email/suppression/bounce/do-not-contact data;
11. selected education reveal is blocked while portfolio firewall is disabled/hard limit 0;
12. reveal path uses shared firewall and business-email-only Apollo paid call;
13. revealed candidate remains linked to same organisation;
14. revealed duplicate email fails closed to review;
15. no function in this correction sends, pushes to Smartlead or starts a campaign;
16. type-check, full test suite and build pass.

## 12. Immediate production action after green deployment

After the correction is deployed and verified, import the supplied reviewed 152-company CSV into CRM organisations using the corrected importer. This company import spends zero Apollo credits.

Expected outcome:
- 152 canonical education CRM organisations, subject only to safe reconciliation with any pre-existing exact CRM organisations;
- strategic-account mirrors linked to those CRM organisation IDs;
- qualification preserved (60 International operator / 17 Review needed / 21 Network route / 54 Domestic reserve);
- zero Apollo provider calls;
- zero new people until the next discovery stage;
- zero Smartlead changes and zero outbound.

Then stop. Contact discovery on the 60 International operators is the next explicit execution stage.
