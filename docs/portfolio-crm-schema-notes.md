# Portfolio CRM schema notes

Live Supabase schema inspection was attempted from the connected Supabase project but the connector currently denies SQL execution. GitHub remains the implementation source of truth for this change.

Important discovery: Liftor already has `organisations` and `organisation_members`, so the portfolio CRM must extend/reuse that organisation layer rather than create a duplicate `crm_organisations` system.

The migration should therefore be additive and non-destructive:

- reuse `organisations` as the canonical organisation record;
- link CRM `contacts` to organisations without removing the existing `company` text field;
- add reusable buyer/data pools and many-to-many pool links;
- keep `business_contact_relationships` as the business-specific commercial relationship truth;
- keep Relationship Intelligence as research/evidence and add a controlled promotion bridge;
- do not change automatic sending behaviour and do not enqueue imports.
