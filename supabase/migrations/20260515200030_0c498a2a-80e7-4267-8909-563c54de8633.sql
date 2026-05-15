
CREATE TABLE public.partnership_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  program_name text NOT NULL,
  program_type text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  target_partners text,
  offer_summary text,
  commission_notes text,
  founder_review_required boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.partner_referral_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid,
  partner_id uuid,
  referred_contact_id uuid,
  referred_organisation_name text,
  referral_status text NOT NULL DEFAULT 'new',
  estimated_value numeric,
  commission_due numeric,
  commission_status text NOT NULL DEFAULT 'not_due',
  founder_review_required boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.partnership_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_referral_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "programs_admin_founder_all" ON public.partnership_programs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));
CREATE POLICY "referral_records_admin_founder_all" ON public.partner_referral_records FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));

CREATE TRIGGER update_partnership_programs_updated_at BEFORE UPDATE ON public.partnership_programs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_partner_referral_records_updated_at BEFORE UPDATE ON public.partner_referral_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_programs_business ON public.partnership_programs(business_id);
CREATE INDEX idx_referral_records_business ON public.partner_referral_records(business_id);
CREATE INDEX idx_referral_records_partner ON public.partner_referral_records(partner_id);
