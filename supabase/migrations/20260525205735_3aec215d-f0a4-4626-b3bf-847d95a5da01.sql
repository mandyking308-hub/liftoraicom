
CREATE TABLE public.legal_entities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_name TEXT NOT NULL,
  entity_type TEXT,
  jurisdiction TEXT,
  registration_number_summary TEXT,
  owner_summary TEXT,
  tax_residency_summary TEXT,
  financial_year_end TEXT,
  accountant_contact TEXT,
  legal_contact TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  audit_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.business_entity_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL,
  legal_entity_id UUID NOT NULL REFERENCES public.legal_entities(id) ON DELETE CASCADE,
  assignment_type TEXT NOT NULL CHECK (assignment_type IN ('owner','operator','billing_entity','brand_owner','ip_owner','marketplace_operator','service_provider')),
  effective_from DATE,
  effective_to DATE,
  founder_confirmed BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_bea_business ON public.business_entity_assignments(business_id);
CREATE INDEX idx_bea_entity ON public.business_entity_assignments(legal_entity_id);

CREATE TABLE public.revenue_routing_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL,
  legal_entity_id UUID REFERENCES public.legal_entities(id) ON DELETE SET NULL,
  revenue_type TEXT NOT NULL CHECK (revenue_type IN ('product','service','subscription','marketplace_fee','commission','licence','consulting','other')),
  route_to_entity TEXT,
  route_to_bank_summary TEXT,
  tax_notes TEXT,
  adviser_review_required BOOLEAN NOT NULL DEFAULT true,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_rrr_business ON public.revenue_routing_rules(business_id);

CREATE TABLE public.entity_policy_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL,
  legal_entity_id UUID REFERENCES public.legal_entities(id) ON DELETE SET NULL,
  policy_type TEXT NOT NULL CHECK (policy_type IN ('terms','privacy','refund','marketplace_terms','seller_terms','subscription_terms','cookie_policy','disclaimer')),
  policy_url TEXT,
  policy_status TEXT NOT NULL DEFAULT 'missing' CHECK (policy_status IN ('missing','draft','review_required','approved','published')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_epa_business ON public.entity_policy_assignments(business_id);

CREATE TABLE public.tax_sensitive_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID,
  legal_entity_id UUID REFERENCES public.legal_entities(id) ON DELETE SET NULL,
  question TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('vat','sales_tax','corporation_tax','us_tax','uae_tax','transfer_pricing','withholding','payroll','other')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','adviser_review','answered','closed')),
  priority TEXT NOT NULL DEFAULT 'normal',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_tsq_business ON public.tax_sensitive_questions(business_id);

ALTER TABLE public.legal_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_entity_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revenue_routing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entity_policy_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_sensitive_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "founder_admin_all_legal_entities" ON public.legal_entities
  FOR ALL USING (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "founder_admin_all_bea" ON public.business_entity_assignments
  FOR ALL USING (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "founder_admin_all_rrr" ON public.revenue_routing_rules
  FOR ALL USING (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "founder_admin_all_epa" ON public.entity_policy_assignments
  FOR ALL USING (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "founder_admin_all_tsq" ON public.tax_sensitive_questions
  FOR ALL USING (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_le_updated BEFORE UPDATE ON public.legal_entities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_bea_updated BEFORE UPDATE ON public.business_entity_assignments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_rrr_updated BEFORE UPDATE ON public.revenue_routing_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_epa_updated BEFORE UPDATE ON public.entity_policy_assignments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_tsq_updated BEFORE UPDATE ON public.tax_sensitive_questions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.legal_entities (entity_name, entity_type, jurisdiction, tax_residency_summary, owner_summary, financial_year_end, active, audit_metadata) VALUES
('Global Solutions Management LLC','LLC','US-DE','Delaware, USA','Sole member: founder','12-31',true,'{"seeded":true,"role":"primary_us_operator"}'),
('Liftor AI Ltd (UK)','Private Limited Company','UK','UK','Founder','03-31',true,'{"seeded":true,"role":"uk_operator_placeholder"}'),
('Liftor FZ-LLC (UAE)','Free Zone LLC','AE-DUBAI','UAE','Founder','12-31',true,'{"seeded":true,"role":"uae_operator_placeholder"}');
