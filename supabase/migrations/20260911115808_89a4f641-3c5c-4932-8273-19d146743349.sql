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

GRANT SELECT ON public.smartlead_send_dry_run_audit TO authenticated;
GRANT ALL ON public.smartlead_send_dry_run_audit TO service_role;

ALTER TABLE public.smartlead_send_dry_run_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders and admins can view dry run audit"
ON public.smartlead_send_dry_run_audit
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'founder'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_sl_dry_run_audit_business ON public.smartlead_send_dry_run_audit (business_id, dry_run_at DESC);
CREATE INDEX IF NOT EXISTS idx_sl_dry_run_audit_contact ON public.smartlead_send_dry_run_audit (contact_id);