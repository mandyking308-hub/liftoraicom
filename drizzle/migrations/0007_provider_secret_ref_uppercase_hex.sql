-- Runtime resolver expects uppercase UUID hex in secret refs; the old check required lowercase,
-- so no real connection (UUID containing a-f) could ever satisfy both. No rows exist yet.
DO $$
DECLARE c record;
BEGIN
  FOR c IN SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.outbound_provider_connections'::regclass AND contype = 'c'
      AND (pg_get_constraintdef(oid) LIKE '%_CREDENTIAL%' OR pg_get_constraintdef(oid) LIKE '%_WEBHOOK_SECRET%')
  LOOP
    EXECUTE format('ALTER TABLE public.outbound_provider_connections DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;

ALTER TABLE public.outbound_provider_connections
  ADD CONSTRAINT outbound_provider_connections_credential_ref_format CHECK (
    credential_secret_ref IS NULL OR credential_secret_ref =
      'LIFTOR_OUTREACH_' || upper(provider_type) || '_' || upper(replace(id::text, '-', '')) || '_CREDENTIAL'),
  ADD CONSTRAINT outbound_provider_connections_webhook_ref_format CHECK (
    webhook_secret_ref IS NULL OR webhook_secret_ref =
      'LIFTOR_OUTREACH_' || upper(provider_type) || '_' || upper(replace(id::text, '-', '')) || '_WEBHOOK_SECRET');