
CREATE TABLE public.vendors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_name TEXT NOT NULL,
  vendor_type TEXT NOT NULL DEFAULT 'other',
  website TEXT,
  contact_name TEXT,
  contact_email TEXT,
  risk_level TEXT DEFAULT 'low',
  data_processor BOOLEAN NOT NULL DEFAULT false,
  dpa_required BOOLEAN NOT NULL DEFAULT false,
  contract_required BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.vendor_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  business_id UUID,
  subscription_name TEXT NOT NULL,
  subscription_status TEXT NOT NULL DEFAULT 'pending_approval',
  monthly_cost NUMERIC(14,2),
  annual_cost NUMERIC(14,2),
  currency TEXT DEFAULT 'GBP',
  renewal_date DATE,
  cancellation_deadline DATE,
  owner TEXT,
  login_method_summary TEXT,
  contract_id UUID,
  payment_method_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  audit_metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE public.vendor_access_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  business_id UUID,
  user_or_agent TEXT NOT NULL,
  access_level TEXT,
  access_status TEXT NOT NULL DEFAULT 'requested',
  granted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.vendor_risk_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  business_id UUID,
  risk_summary TEXT,
  data_accessed TEXT,
  security_notes TEXT,
  dpa_status TEXT,
  review_status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_access_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_risk_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders manage vendors" ON public.vendors
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'founder') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'founder') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Founders manage vendor subscriptions" ON public.vendor_subscriptions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'founder') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'founder') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Founders manage vendor access records" ON public.vendor_access_records
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'founder') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'founder') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Founders manage vendor risk reviews" ON public.vendor_risk_reviews
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'founder') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'founder') OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_vendors_updated BEFORE UPDATE ON public.vendors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_vendor_subscriptions_updated BEFORE UPDATE ON public.vendor_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_vendor_access_records_updated BEFORE UPDATE ON public.vendor_access_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_vendor_risk_reviews_updated BEFORE UPDATE ON public.vendor_risk_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_vendor_subscriptions_vendor ON public.vendor_subscriptions(vendor_id);
CREATE INDEX idx_vendor_subscriptions_status ON public.vendor_subscriptions(subscription_status);
CREATE INDEX idx_vendor_subscriptions_renewal ON public.vendor_subscriptions(renewal_date);
CREATE INDEX idx_vendor_access_vendor ON public.vendor_access_records(vendor_id);
CREATE INDEX idx_vendor_risk_vendor ON public.vendor_risk_reviews(vendor_id);
