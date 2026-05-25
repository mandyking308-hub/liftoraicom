
CREATE TABLE public.complaint_cases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID,
  customer_id UUID,
  contact_id UUID,
  related_ticket_id UUID,
  related_order_id UUID,
  related_invoice_id UUID,
  complaint_type TEXT NOT NULL DEFAULT 'other',
  complaint_status TEXT NOT NULL DEFAULT 'new',
  severity TEXT NOT NULL DEFAULT 'medium',
  customer_sentiment TEXT,
  complaint_summary TEXT,
  requested_resolution TEXT,
  proposed_resolution TEXT,
  founder_approval_required BOOLEAN NOT NULL DEFAULT true,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  audit_metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE public.refund_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID,
  complaint_case_id UUID REFERENCES public.complaint_cases(id) ON DELETE CASCADE,
  customer_id UUID,
  payment_id UUID,
  invoice_id UUID,
  amount_requested NUMERIC(14,2),
  amount_approved NUMERIC(14,2),
  currency TEXT DEFAULT 'GBP',
  refund_status TEXT NOT NULL DEFAULT 'requested',
  refund_reason TEXT,
  policy_match TEXT,
  founder_approved_at TIMESTAMPTZ,
  processed_at TIMESTAMPTZ,
  audit_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.dispute_evidence (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID,
  complaint_case_id UUID REFERENCES public.complaint_cases(id) ON DELETE CASCADE,
  evidence_type TEXT NOT NULL DEFAULT 'note',
  evidence_summary TEXT,
  evidence_url TEXT,
  uploaded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  audit_metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE public.complaint_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refund_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispute_evidence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders manage complaints" ON public.complaint_cases
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'founder') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'founder') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Founders manage refund requests" ON public.refund_requests
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'founder') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'founder') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Founders manage dispute evidence" ON public.dispute_evidence
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'founder') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'founder') OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_complaint_cases_updated BEFORE UPDATE ON public.complaint_cases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_refund_requests_updated BEFORE UPDATE ON public.refund_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_complaint_cases_status ON public.complaint_cases(complaint_status);
CREATE INDEX idx_complaint_cases_severity ON public.complaint_cases(severity);
CREATE INDEX idx_refund_requests_status ON public.refund_requests(refund_status);
CREATE INDEX idx_dispute_evidence_case ON public.dispute_evidence(complaint_case_id);
