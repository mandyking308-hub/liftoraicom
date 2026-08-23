# Planned database migration

The GitHub branch introduces the UI/model first. The live database migration should be applied only after schema inspection and verification.

Planned additions:

- `crm_organisations` — one organisation record reused across the portfolio.
- `crm_organisation_people` — organisation/person membership.
- `crm_buyer_pools` — reusable portfolio buyer universes.
- `crm_organisation_buyer_pools` — many-to-many organisation/data-pool classification.
- `crm_contact_buyer_pools` — optional person-level pool classification.
- Extend `business_contact_relationships` with explicit relevance scoring and buyer-pool linkage without removing existing fields.
- Add a controlled Relationship Intelligence -> CRM promotion function that deduplicates by email/Apollo identity and never queues outreach.

Security rules:

- RLS on every public table.
- Founder/admin-only management.
- No service-role secrets in client code.
- Global suppression remains authoritative.
- No import path may automatically send or enqueue outreach.
