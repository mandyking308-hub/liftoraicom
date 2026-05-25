
CREATE TABLE public.privacy_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID,
  requester_contact_id UUID,
  request_type TEXT NOT NULL DEFAULT 'access',
  request_status TEXT NOT NULL DEFAULT 'received',
  due_date DATE,
  identity_verified BOOLEAN NOT NULL DEFAULT false,
  response_summary TEXT,
  founder_approval_required BOOLEAN NOT NULL DEFAULT true,
  completed_at TIMESTAMPTZ,
  audit_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.data_retention_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID,
  data_category TEXT NOT NULL,
  retention_period_days INTEGER NOT NULL DEFAULT 365,
  deletion_action TEXT NOT NULL DEFAULT 'soft_delete',
  legal_basis TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.consent_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID,
  contact_id UUID,
  consent_type TEXT NOT NULL DEFAULT 'marketing',
  consent_status TEXT NOT NULL DEFAULT 'unknown',
  consent_source TEXT,
  consent_text TEXT,
  consented_at TIMESTAMPTZ,
  withdrawn_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.processor_register (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id UUID,
  business_id UUID,
  processor_name TEXT NOT NULL,
  data_processed TEXT,
  dpa_status TEXT NOT NULL DEFAULT 'missing',
  risk_level TEXT NOT NULL DEFAULT 'medium',
  review_status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.privacy_breach_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID,
  event_summary TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium',
  data_affected TEXT,
  people_affected_count INTEGER,
  breach_status TEXT NOT NULL DEFAULT 'suspected',
  discovered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  contained_at TIMESTAMPTZ,
  reported_at TIMESTAMPTZ,
  founder_approval_required BOOLEAN NOT NULL DEFAULT true,
  audit_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.privacy_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_retention_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consent_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processor_register ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.privacy_breach_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders manage privacy_requests" ON public.privacy_requests FOR ALL
  USING (public.has_role(auth.uid(), 'founder') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'founder') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Founders manage data_retention_rules" ON public.data_retention_rules FOR ALL
  USING (public.has_role(auth.uid(), 'founder') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'founder') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Founders manage consent_records" ON public.consent_records FOR ALL
  USING (public.has_role(auth.uid(), 'founder') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'founder') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Founders manage processor_register" ON public.processor_register FOR ALL
  USING (public.has_role(auth.uid(), 'founder') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'founder') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Founders manage privacy_breach_events" ON public.privacy_breach_events FOR ALL
  USING (public.has_role(auth.uid(), 'founder') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'founder') OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_privacy_requests_updated BEFORE UPDATE ON public.privacy_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_data_retention_rules_updated BEFORE UPDATE ON public.data_retention_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_consent_records_updated BEFORE UPDATE ON public.consent_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_processor_register_updated BEFORE UPDATE ON public.processor_register
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_privacy_breach_events_updated BEFORE UPDATE ON public.privacy_breach_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_privacy_requests_status ON public.privacy_requests(request_status);
CREATE INDEX idx_privacy_requests_due ON public.privacy_requests(due_date);
CREATE INDEX idx_consent_records_contact ON public.consent_records(contact_id);
CREATE INDEX idx_consent_records_type ON public.consent_records(consent_type);
CREATE INDEX idx_processor_register_vendor ON public.processor_register(vendor_id);
CREATE INDEX idx_privacy_breach_events_status ON public.privacy_breach_events(breach_status);
