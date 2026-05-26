
-- Insurance / Liability Matrix

CREATE TABLE public.insurance_policy_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID,
  entity_id UUID,
  policy_type TEXT NOT NULL CHECK (policy_type IN (
    'public_liability','professional_indemnity','cyber','product_liability',
    'employer_liability','media_ip','marketplace_liability','event','other'
  )),
  insurer_name TEXT,
  policy_summary TEXT,
  cover_amount NUMERIC,
  currency TEXT DEFAULT 'GBP',
  renewal_date DATE,
  policy_status TEXT NOT NULL DEFAULT 'missing' CHECK (policy_status IN (
    'missing','quote_needed','active','expired','cancelled','review_required'
  )),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.insurance_gap_assessments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID,
  risk_type TEXT NOT NULL,
  gap_summary TEXT,
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
  recommended_cover TEXT,
  adviser_review_required BOOLEAN NOT NULL DEFAULT true,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','review_required','resolved','accepted')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.liability_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'complaint','claim','incident','dispute','customer_harm','ip_issue','data_issue','other'
  )),
  event_summary TEXT,
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
  insurance_relevant BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.insurance_policy_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurance_gap_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.liability_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage insurance_policy_records" ON public.insurance_policy_records
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage insurance_gap_assessments" ON public.insurance_gap_assessments
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage liability_events" ON public.liability_events
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_insurance_policy_records_updated_at
  BEFORE UPDATE ON public.insurance_policy_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_insurance_gap_assessments_updated_at
  BEFORE UPDATE ON public.insurance_gap_assessments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_liability_events_updated_at
  BEFORE UPDATE ON public.liability_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_insurance_policy_business ON public.insurance_policy_records(business_id);
CREATE INDEX idx_insurance_policy_renewal ON public.insurance_policy_records(renewal_date);
CREATE INDEX idx_insurance_gap_business ON public.insurance_gap_assessments(business_id);
CREATE INDEX idx_liability_events_business ON public.liability_events(business_id);
