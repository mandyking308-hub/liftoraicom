
CREATE TABLE public.context_guard_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID,
  source_module TEXT NOT NULL,
  source_record_id TEXT,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'missing_business_id','conflicting_business_context','wrong_brand_voice',
    'wrong_legal_entity','wrong_product','wrong_customer','wrong_policy',
    'cross_contamination_prevented','warning'
  )),
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
  event_summary TEXT NOT NULL,
  action_taken TEXT NOT NULL DEFAULT 'warned' CHECK (action_taken IN ('allowed','warned','blocked','approval_required')),
  audit_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_cge_business ON public.context_guard_events(business_id);
CREATE INDEX idx_cge_type ON public.context_guard_events(event_type);
CREATE INDEX idx_cge_created ON public.context_guard_events(created_at DESC);

CREATE TABLE public.business_context_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL UNIQUE,
  brand_voice_summary TEXT,
  legal_entity_id UUID,
  primary_domain TEXT,
  support_email TEXT,
  sales_email TEXT,
  default_currency TEXT,
  default_market TEXT,
  compliance_profile_id UUID,
  approved_context_source_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.context_guard_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_context_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders manage context guard events" ON public.context_guard_events
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "Founders manage business context profiles" ON public.business_context_profiles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_bcp_ctx_updated BEFORE UPDATE ON public.business_context_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
