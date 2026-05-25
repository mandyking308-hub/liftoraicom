
CREATE TABLE public.business_compliance_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL UNIQUE,
  compliance_risk_level TEXT NOT NULL DEFAULT 'low' CHECK (compliance_risk_level IN ('low','medium','high','critical')),
  regulated_activity_possible BOOLEAN NOT NULL DEFAULT false,
  handles_children_data BOOLEAN NOT NULL DEFAULT false,
  handles_health_data BOOLEAN NOT NULL DEFAULT false,
  handles_financial_data BOOLEAN NOT NULL DEFAULT false,
  handles_legal_sensitive_data BOOLEAN NOT NULL DEFAULT false,
  marketplace_liability BOOLEAN NOT NULL DEFAULT false,
  requires_disclaimers BOOLEAN NOT NULL DEFAULT false,
  founder_confirmed BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.business_compliance_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL,
  rule_name TEXT NOT NULL,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('claim','channel','customer_type','jurisdiction','product','pricing','refund','privacy','recording','marketing','other')),
  rule_summary TEXT,
  allowed_behavior TEXT,
  prohibited_behavior TEXT,
  approval_required BOOLEAN NOT NULL DEFAULT true,
  adviser_review_required BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_bcr_business ON public.business_compliance_rules(business_id);
CREATE INDEX idx_bcr_type ON public.business_compliance_rules(rule_type);

CREATE TABLE public.compliance_approval_triggers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL,
  trigger_name TEXT NOT NULL,
  trigger_condition TEXT NOT NULL,
  action_required TEXT NOT NULL CHECK (action_required IN ('founder_approval','legal_review','tax_review','compliance_review','block','warning')),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_cat_business ON public.compliance_approval_triggers(business_id);

ALTER TABLE public.business_compliance_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_compliance_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_approval_triggers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders manage compliance profiles" ON public.business_compliance_profiles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "Founders manage compliance rules" ON public.business_compliance_rules
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "Founders manage compliance triggers" ON public.compliance_approval_triggers
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_bcp_updated BEFORE UPDATE ON public.business_compliance_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_bcr_updated BEFORE UPDATE ON public.business_compliance_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_cat_updated BEFORE UPDATE ON public.compliance_approval_triggers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
