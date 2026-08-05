CREATE TABLE IF NOT EXISTS public.social_relationship_business_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  account_id uuid NOT NULL REFERENCES public.social_relationship_accounts(id) ON DELETE CASCADE,
  active boolean NOT NULL DEFAULT true,
  is_primary boolean NOT NULL DEFAULT false,
  inbound_routing_enabled boolean NOT NULL DEFAULT false,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, account_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS social_relationship_one_primary_business_per_account
  ON public.social_relationship_business_accounts(account_id)
  WHERE active = true AND is_primary = true;
CREATE INDEX IF NOT EXISTS social_relationship_business_accounts_business_idx
  ON public.social_relationship_business_accounts(business_id, active);
CREATE INDEX IF NOT EXISTS social_relationship_business_accounts_inbound_idx
  ON public.social_relationship_business_accounts(account_id, inbound_routing_enabled)
  WHERE active = true;

ALTER TABLE public.social_relationship_business_accounts ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.social_relationship_business_accounts TO authenticated;
GRANT ALL ON public.social_relationship_business_accounts TO service_role;
DROP POLICY IF EXISTS founder_admin_all_social_relationship_business_accounts ON public.social_relationship_business_accounts;
CREATE POLICY founder_admin_all_social_relationship_business_accounts
  ON public.social_relationship_business_accounts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'));

DROP TRIGGER IF EXISTS trg_social_relationship_business_accounts_updated ON public.social_relationship_business_accounts;
CREATE TRIGGER trg_social_relationship_business_accounts_updated
  BEFORE UPDATE ON public.social_relationship_business_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
