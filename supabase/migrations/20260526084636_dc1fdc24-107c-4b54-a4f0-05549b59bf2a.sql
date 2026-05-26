CREATE TABLE IF NOT EXISTS public.partner_prospects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID,
  partner_name TEXT NOT NULL,
  partner_type TEXT NOT NULL DEFAULT 'referral',
  website TEXT,
  email TEXT,
  category TEXT,
  fit_score NUMERIC,
  expected_value NUMERIC,
  risk_flags TEXT[] DEFAULT '{}'::text[],
  outreach_status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.referral_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID,
  referrer_contact_id UUID,
  referred_contact_id UUID,
  referral_status TEXT NOT NULL DEFAULT 'new',
  value_amount NUMERIC,
  currency TEXT DEFAULT 'GBP',
  commission_due NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.partner_commission_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID,
  partner_id UUID,
  commission_type TEXT NOT NULL DEFAULT 'percent',
  commission_value NUMERIC,
  currency TEXT DEFAULT 'GBP',
  approval_required BOOLEAN NOT NULL DEFAULT true,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.partner_performance_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID,
  partner_id UUID,
  period_start DATE,
  period_end DATE,
  leads_generated INTEGER DEFAULT 0,
  revenue_generated NUMERIC DEFAULT 0,
  commission_due NUMERIC DEFAULT 0,
  quality_score NUMERIC,
  recommended_action TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.partner_prospects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_commission_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_performance_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Founders manage partner_prospects" ON public.partner_prospects;
CREATE POLICY "Founders manage partner_prospects" ON public.partner_prospects
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'));

DROP POLICY IF EXISTS "Founders manage referral_records" ON public.referral_records;
CREATE POLICY "Founders manage referral_records" ON public.referral_records
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'));

DROP POLICY IF EXISTS "Founders manage partner_commission_rules" ON public.partner_commission_rules;
CREATE POLICY "Founders manage partner_commission_rules" ON public.partner_commission_rules
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'));

DROP POLICY IF EXISTS "Founders manage partner_performance_snapshots" ON public.partner_performance_snapshots;
CREATE POLICY "Founders manage partner_performance_snapshots" ON public.partner_performance_snapshots
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'));

DROP TRIGGER IF EXISTS trg_partner_prospects_updated ON public.partner_prospects;
CREATE TRIGGER trg_partner_prospects_updated BEFORE UPDATE ON public.partner_prospects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_referral_records_updated ON public.referral_records;
CREATE TRIGGER trg_referral_records_updated BEFORE UPDATE ON public.referral_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_partner_commission_rules_updated ON public.partner_commission_rules;
CREATE TRIGGER trg_partner_commission_rules_updated BEFORE UPDATE ON public.partner_commission_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_partner_prospects_business ON public.partner_prospects(business_id);
CREATE INDEX IF NOT EXISTS idx_referral_records_business ON public.referral_records(business_id);
CREATE INDEX IF NOT EXISTS idx_partner_commission_rules_partner ON public.partner_commission_rules(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_perf_partner ON public.partner_performance_snapshots(partner_id);