# Planned database migration

The GitHub branch introduces the shared-data CRM behaviour using the existing schema first. Live database migration should only be applied after schema inspection and verification.

## Important existing capability

Liftor already has an `organisations` / `organisation_members` layer. Do **not** create a second CRM organisation table. Extend and reuse the existing organisation record so one school group, company, foundation, family office or other entity can become the canonical portfolio organisation.

## Planned additive changes

- Extend/reuse `organisations` as the canonical portfolio organisation record, with non-destructive fields for organisation type, domain/Apollo organisation identity, data confidence and portfolio classification where needed.
- Add a CRM contact-to-organisation link while retaining `contacts.company` for backward compatibility during migration.
- Add reusable buyer/data pools and many-to-many organisation/pool and contact/pool relationships when database access is available.
- Extend `business_contact_relationships` with explicit relevance score / buyer-pool attribution if the existing schema inspection confirms those fields are absent.
- Deploy the controlled `ri-promote-to-crm` bridge. It deduplicates Relationship Intelligence records into the master contact registry, creates business relationships with `campaign_eligible=false`, and never queues or sends outreach.

## Current GitHub-first implementation

Until Supabase write permission is available, Liftor infers reusable pools from the portfolio commercial map and existing `business_contact_relationships`. This gives the founder the correct many-to-many CRM view immediately without destructive schema work.

## Security rules

- RLS on every public table added or extended.
- Founder/admin-only management for portfolio CRM data.
- No service-role secrets in client code.
- Global suppression remains authoritative.
- Business-specific DNC remains scoped to the business relationship.
- No import or promotion path may automatically send or enqueue outreach.
