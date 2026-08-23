# Portfolio CRM database deployment plan

The GitHub branch introduces the shared-data CRM behaviour against the existing schema first. The live database migration must be applied only when Supabase write permission is available and after schema/advisor checks.

## Important domain boundary

Liftor already has an `organisations` / `organisation_members` layer, but inspection of its usage shows that it is a **client/tenant delivery layer**: it owns members, monitored systems, documents and operational access.

Do **not** load prospect school groups, healthcare groups, family offices, suppliers or other commercial targets into that tenant table merely to avoid another table. That would mix prospects with actual Liftor client tenants.

The CRM therefore needs a separate canonical commercial account layer, proposed as `crm_accounts`. When an account becomes a Liftor client/tenant, it may link to `organisations` through a nullable `tenant_organisation_id` rather than duplicating identity.

## Planned additive schema

### `crm_accounts`
One commercial/prospect organisation record across the portfolio.

Suggested fields:
- `id uuid primary key`
- `name text not null`
- `normalised_name text`
- `domain text`
- `apollo_organisation_id text`
- `account_type text` — school group, healthcare group, family office, enterprise, foundation, government, etc.
- `industry text`
- `country text`
- `website text`
- `tenant_organisation_id uuid null references organisations(id)`
- `source text`
- `data_confidence text`
- `status text`
- timestamps

Identity indexes should favour stable identifiers in this order: Apollo organisation ID, normalised domain, then reviewed normalised name. Name-only auto-merges should be held for review.

### `crm_account_contacts`
Many-to-many account/person membership so the same person can be associated with an account without copying their CRM identity.

Suggested fields:
- `account_id -> crm_accounts(id)`
- `contact_id -> contacts(id)`
- `job_title`
- `seniority`
- `role_function`
- `is_primary`
- `source`
- `confidence`
- timestamps
- unique `(account_id, contact_id)`

### `crm_buyer_pools`
Reusable portfolio buyer/data universes such as Education, Healthcare, Procurement, Finance/Treasury, HNW/Family Office and Marketing/Comms.

### `crm_account_buyer_pools`
Many-to-many account ↔ pool classification. This is what allows an education group to be reused for education products, Procitron, Nexara, Velocity, Kinetiva and other propositions without duplicating the account.

### `crm_contact_buyer_pools`
Optional person-level pool/role classification, with source and confidence. Use this for role-specific routing such as procurement, CIO/IT, HR/L&D or marketing within the same school group.

### `business_contact_relationships`
Retain the existing table as the source of truth for contact ↔ Liftor business relevance. Add only if absent after live schema inspection:
- `relevance_score`
- `relevance_confidence`
- `fit_evidence`
- optional buyer-pool attribution

Do not remove the current qualification, stage, business-specific DNC or campaign-eligibility fields.

### `contacts`
Retain one person record. Add a direct primary-account pointer only if it proves useful after `crm_account_contacts` is deployed. Do not remove `company` or `assigned_business` during the transition; they remain compatibility fields for older workflows.

## Relationship Intelligence → CRM bridge

Deploy `supabase/functions/ri-promote-to-crm/index.ts` from this branch.

The bridge now:
- defaults to dry-run
- deduplicates by email before contact creation
- evaluates business-specific role/evidence rules
- creates only role/evidence-matched business relationships by default
- keeps unmatched research records in Relationship Intelligence for later reuse
- sets new business relationships to `campaign_eligible=false`
- respects global suppression and hard bounces
- never inserts email queue rows
- never sends outreach

For Education Wave 1 the founder panel preloads The Aurelia World, Kingsbridge Global, Kindnesss and Squishy D, but a contact is not automatically attached to all four. Role/evidence fit controls each relationship.

## Education account migration sequence

1. Create/dedupe school groups as `crm_accounts` once.
2. Link existing Relationship Intelligence people to those accounts.
3. Classify the account into the Education sector pool.
4. Classify people into functional pools/roles where evidence supports it.
5. Preview business-fit relationships for Wave 1.
6. Promote only matched/approved relationships to operational CRM.
7. Leave all campaign eligibility off until campaign review.
8. Reuse the same school groups later for Procitron procurement, Nexara IT, Velocity marketing, Wise Wise HR/L&D, Kinetiva estates/sustainability and other genuine fits.

## Security/deployment rules

- RLS on every new public table.
- Explicit founder/admin management policies with both `USING` and `WITH CHECK` where updates are permitted.
- Review Data API grants separately from RLS.
- Do not use user-editable metadata for authorization.
- No service-role secrets in client code.
- Global suppression remains authoritative.
- Business-specific DNC remains scoped to the business relationship.
- No import or promotion path may automatically send or enqueue outreach.
- Run Supabase security/performance advisors before committing the live migration.
- Verify with test queries after deployment.

## Current status

GitHub implementation is ready on branch `portfolio-crm-shared-data`. Live Supabase deployment has **not** been performed because the current connector session does not have the required project permissions. This is intentional: no production schema has been guessed or partially modified.
