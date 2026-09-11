-- Chat 2 Smartlead closeout: persistent evidence for zero-provider-mutation send dry runs.
-- Additive and idempotent. No provider calls, sends, campaign activation, Apollo activity,
-- mailbox credentials, or secret material are introduced by this migration.

CREATE TABLE IF NOT EXISTS public.smartlead_send_dry_run_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid,
  liftor_campaign_id uuid,
  provider_campaign_id text,
  contact_id uuid,
  contact_email text,
  sendable boolean NOT NULL DEFAULT false,
  blockers jsonb NOT NULL DEFAULT '[]'::jsonb,
  allocated_mailbox_id uuid,
  allocated_mailbox_email text,
  provider_payload jsonb,
  would_send boolean NOT NULL DEFAULT false,
  dry_run_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_smartlead_send_dry_run_business
  ON public.smartlead_send_dry_run_audit (business_id, dry_run_at DESC);

CREATE INDEX IF NOT EXISTS idx_smartlead_send_dry_run_campaign
  ON public.smartlead_send_dry_run_audit (liftor_campaign_id, dry_run_at DESC);

CREATE INDEX IF NOT EXISTS idx_smartlead_send_dry_run_contact
  ON public.smartlead_send_dry_run_audit (contact_id, dry_run_at DESC);

ALTER TABLE public.smartlead_send_dry_run_audit ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'smartlead_send_dry_run_audit'
      AND policyname = 'Founders read smartlead send dry run audit'
  ) THEN
    CREATE POLICY "Founders read smartlead send dry run audit"
      ON public.smartlead_send_dry_run_audit
      FOR SELECT TO authenticated
      USING (
        has_role(auth.uid(), 'founder'::app_role)
        OR has_role(auth.uid(), 'admin'::app_role)
      );
  END IF;
END $$;

GRANT SELECT ON public.smartlead_send_dry_run_audit TO authenticated;
GRANT ALL ON public.smartlead_send_dry_run_audit TO service_role;
