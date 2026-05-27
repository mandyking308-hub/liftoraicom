
CREATE TABLE public.winddown_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'pause',
  reason TEXT,
  target_date DATE,
  status TEXT NOT NULL DEFAULT 'draft',
  requires_external_actions BOOLEAN NOT NULL DEFAULT true,
  approval_status TEXT NOT NULL DEFAULT 'pending',
  founder_decision TEXT,
  risk_notes TEXT,
  is_test_data BOOLEAN NOT NULL DEFAULT false,
  trace_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.winddown_plans TO authenticated;
GRANT ALL ON public.winddown_plans TO service_role;
ALTER TABLE public.winddown_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "founder_all_winddown_plans" ON public.winddown_plans FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.winddown_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES public.winddown_plans(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  task TEXT NOT NULL,
  detail TEXT,
  owner TEXT,
  requires_approval BOOLEAN NOT NULL DEFAULT true,
  status TEXT NOT NULL DEFAULT 'pending',
  risk_level TEXT NOT NULL DEFAULT 'low',
  is_test_data BOOLEAN NOT NULL DEFAULT false,
  trace_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.winddown_checklist_items TO authenticated;
GRANT ALL ON public.winddown_checklist_items TO service_role;
ALTER TABLE public.winddown_checklist_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "founder_all_winddown_checklist" ON public.winddown_checklist_items FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.winddown_customer_offboarding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES public.winddown_plans(id) ON DELETE CASCADE,
  customer_label TEXT NOT NULL,
  obligation_type TEXT NOT NULL,
  refund_due NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'GBP',
  notice_required BOOLEAN NOT NULL DEFAULT true,
  notice_status TEXT NOT NULL DEFAULT 'pending_approval',
  data_export_required BOOLEAN NOT NULL DEFAULT true,
  data_export_status TEXT NOT NULL DEFAULT 'pending_approval',
  founder_decision TEXT,
  is_test_data BOOLEAN NOT NULL DEFAULT false,
  trace_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.winddown_customer_offboarding TO authenticated;
GRANT ALL ON public.winddown_customer_offboarding TO service_role;
ALTER TABLE public.winddown_customer_offboarding ENABLE ROW LEVEL SECURITY;
CREATE POLICY "founder_all_winddown_customer_offboarding" ON public.winddown_customer_offboarding FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.winddown_vendor_cancellations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES public.winddown_plans(id) ON DELETE CASCADE,
  vendor_name TEXT NOT NULL,
  service TEXT,
  monthly_cost NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'GBP',
  notice_period_days INTEGER NOT NULL DEFAULT 30,
  earliest_cancel_date DATE,
  cancellation_status TEXT NOT NULL DEFAULT 'pending_approval',
  founder_decision TEXT,
  is_test_data BOOLEAN NOT NULL DEFAULT false,
  trace_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.winddown_vendor_cancellations TO authenticated;
GRANT ALL ON public.winddown_vendor_cancellations TO service_role;
ALTER TABLE public.winddown_vendor_cancellations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "founder_all_winddown_vendor_cancellations" ON public.winddown_vendor_cancellations FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.winddown_contract_terminations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES public.winddown_plans(id) ON DELETE CASCADE,
  counterparty TEXT NOT NULL,
  contract_type TEXT NOT NULL,
  termination_clause_summary TEXT,
  notice_period_days INTEGER NOT NULL DEFAULT 30,
  penalty_amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'GBP',
  termination_status TEXT NOT NULL DEFAULT 'pending_legal_review',
  legal_reviewed BOOLEAN NOT NULL DEFAULT false,
  founder_decision TEXT,
  is_test_data BOOLEAN NOT NULL DEFAULT false,
  trace_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.winddown_contract_terminations TO authenticated;
GRANT ALL ON public.winddown_contract_terminations TO service_role;
ALTER TABLE public.winddown_contract_terminations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "founder_all_winddown_contract_terminations" ON public.winddown_contract_terminations FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.winddown_data_retention (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES public.winddown_plans(id) ON DELETE CASCADE,
  dataset TEXT NOT NULL,
  policy TEXT NOT NULL,
  retain_until DATE,
  archive_location TEXT,
  action TEXT NOT NULL DEFAULT 'archive',
  status TEXT NOT NULL DEFAULT 'pending_approval',
  audit_trail_preserved BOOLEAN NOT NULL DEFAULT true,
  founder_decision TEXT,
  is_test_data BOOLEAN NOT NULL DEFAULT false,
  trace_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.winddown_data_retention TO authenticated;
GRANT ALL ON public.winddown_data_retention TO service_role;
ALTER TABLE public.winddown_data_retention ENABLE ROW LEVEL SECURITY;
CREATE POLICY "founder_all_winddown_data_retention" ON public.winddown_data_retention FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.winddown_legal_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES public.winddown_plans(id) ON DELETE CASCADE,
  review_type TEXT NOT NULL,
  topic TEXT NOT NULL,
  adviser TEXT,
  question TEXT,
  recommendation TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  feeds_decision_register BOOLEAN NOT NULL DEFAULT true,
  is_test_data BOOLEAN NOT NULL DEFAULT false,
  trace_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.winddown_legal_reviews TO authenticated;
GRANT ALL ON public.winddown_legal_reviews TO service_role;
ALTER TABLE public.winddown_legal_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "founder_all_winddown_legal_reviews" ON public.winddown_legal_reviews FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
