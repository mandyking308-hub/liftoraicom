
CREATE TABLE public.partnership_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  partner_name text NOT NULL,
  partner_type text NOT NULL DEFAULT 'referral',
  partner_tier text DEFAULT 'standard',
  status text NOT NULL DEFAULT 'prospect',
  contact_email text,
  contact_person text,
  agreement_summary text,
  commission_rate numeric,
  owner_agent_key text,
  founder_review_required boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.referral_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  partnership_id uuid REFERENCES public.partnership_accounts(id) ON DELETE SET NULL,
  link_code text NOT NULL UNIQUE,
  destination_url text NOT NULL,
  channel text,
  clicks_count integer NOT NULL DEFAULT 0,
  conversions_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  owner_agent_key text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.affiliate_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  partnership_id uuid REFERENCES public.partnership_accounts(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  status text NOT NULL DEFAULT 'pending',
  founder_approved_at timestamptz,
  paid_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.partnership_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "partnerships_admin_founder_all" ON public.partnership_accounts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));
CREATE POLICY "referrals_admin_founder_all" ON public.referral_links FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));
CREATE POLICY "payouts_admin_founder_all" ON public.affiliate_payouts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));

CREATE TRIGGER update_partnership_accounts_updated_at BEFORE UPDATE ON public.partnership_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_referral_links_updated_at BEFORE UPDATE ON public.referral_links
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_affiliate_payouts_updated_at BEFORE UPDATE ON public.affiliate_payouts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_partnerships_business ON public.partnership_accounts(business_id);
CREATE INDEX idx_referrals_business ON public.referral_links(business_id);
CREATE INDEX idx_payouts_business ON public.affiliate_payouts(business_id);
