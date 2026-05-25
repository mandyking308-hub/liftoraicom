
CREATE TABLE public.contracts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID,
  contact_id UUID,
  customer_id UUID,
  vendor_id UUID,
  contract_type TEXT NOT NULL DEFAULT 'other',
  contract_title TEXT NOT NULL,
  contract_status TEXT NOT NULL DEFAULT 'draft',
  start_date DATE,
  end_date DATE,
  renewal_date DATE,
  value_amount NUMERIC(14,2),
  currency TEXT DEFAULT 'GBP',
  legal_review_required BOOLEAN NOT NULL DEFAULT true,
  founder_approval_required BOOLEAN NOT NULL DEFAULT true,
  signed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  audit_metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE public.contract_obligations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID,
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  obligation_summary TEXT NOT NULL,
  obligation_owner TEXT,
  due_date DATE,
  obligation_status TEXT NOT NULL DEFAULT 'pending',
  risk_level TEXT DEFAULT 'low',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.contract_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID,
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  audit_metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE public.contract_provider_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID,
  provider_type TEXT NOT NULL DEFAULT 'manual',
  provider_status TEXT NOT NULL DEFAULT 'not_connected',
  api_secret_configured BOOLEAN NOT NULL DEFAULT false,
  default_template_id TEXT,
  webhook_url TEXT,
  active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_obligations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_provider_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders manage contracts" ON public.contracts
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'founder') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'founder') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Founders manage contract obligations" ON public.contract_obligations
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'founder') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'founder') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Founders manage contract events" ON public.contract_events
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'founder') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'founder') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Founders manage contract provider settings" ON public.contract_provider_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'founder') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'founder') OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_contracts_updated BEFORE UPDATE ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_contract_obligations_updated BEFORE UPDATE ON public.contract_obligations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_contract_provider_settings_updated BEFORE UPDATE ON public.contract_provider_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_contracts_status ON public.contracts(contract_status);
CREATE INDEX idx_contracts_renewal ON public.contracts(renewal_date);
CREATE INDEX idx_contracts_end ON public.contracts(end_date);
CREATE INDEX idx_obligations_contract ON public.contract_obligations(contract_id);
CREATE INDEX idx_obligations_due ON public.contract_obligations(due_date);
CREATE INDEX idx_contract_events_contract ON public.contract_events(contract_id);
