# Prepared migration — Smartlead import idempotency (NOT APPLIED)

Deployment requirement for `smartlead-campaign-lead-import`. This SQL is
**deliberately not placed in `supabase/migrations/`** and has **not** been run
against any database. Apply it (as a normal migration) before the first live
import run.

## Why it is needed

| Guarantee | Current schema | Gap |
| --- | --- | --- |
| Lead provenance row is unique per campaign+contact | `outbound_provider_lead_mappings_uniq (provider_type, provider_campaign_id, lower(contact_email))` | OK — used as the conflict key |
| Provenance row unique per provider lead id | none | Two Smartlead leads with different ids but the same email collapse silently |
| `push_status = 'imported_from_provider'` | CHECK allows only `not_pushed, previewed, pushing, pushed, failed, skipped` | **Every import insert fails with 23514 until this is widened** |
| Contact email uniqueness | `contacts.email UNIQUE` (case sensitive) | `A@x.com` and `a@x.com` can both exist; imports match case-insensitively but cannot rely on the DB |
| Business association unique | `business_contact_relationships UNIQUE(contact_id, business_name)` | OK — used for conflict-safe insert |

Until this migration is applied, the importer fails closed and reports
`lead_mapping_insert_failed_check_constraint_violation` with an actionable message.

```sql
-- 1) Allow the import push_status value.
ALTER TABLE public.outbound_provider_lead_mappings
  DROP CONSTRAINT IF EXISTS outbound_provider_lead_mappings_push_status_check;
ALTER TABLE public.outbound_provider_lead_mappings
  ADD CONSTRAINT outbound_provider_lead_mappings_push_status_check
  CHECK (push_status IN (
    'not_pushed','previewed','pushing','pushed','failed','skipped','imported_from_provider'
  ));

-- 2) Idempotency on the provider lead id (concurrent imports / retried pages).
CREATE UNIQUE INDEX IF NOT EXISTS outbound_provider_lead_mappings_provider_lead_uniq
  ON public.outbound_provider_lead_mappings (provider_type, provider_campaign_id, provider_lead_id)
  WHERE provider_campaign_id IS NOT NULL AND provider_lead_id IS NOT NULL;

-- 3) Case-insensitive contact identity.
--    Run the SELECT first; resolve any duplicates before creating the index.
-- SELECT lower(email), count(*) FROM public.contacts GROUP BY 1 HAVING count(*) > 1;
CREATE UNIQUE INDEX IF NOT EXISTS contacts_email_lower_uniq
  ON public.contacts (lower(email));
```

## Concurrency strategy once applied

- Contact insert: unique `lower(email)` → on `23505` the importer re-reads and
  adopts the existing row (no duplicate, no fabricated error).
- Provenance insert: unique `(provider_type, provider_campaign_id, contact_email)`
  and `(…, provider_lead_id)` → on `23505` the importer updates the existing row.
- Relationship insert: unique `(contact_id, business_name)` → conflict is a no-op.
- The campaign `last_synced_at` checkpoint is only stamped when a page resolved
  every row, so a competing partial run can never advance the resume offset.
