CREATE TABLE public.data_privacy_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid,
  contact_id uuid,
  request_type text NOT NULL,
  request_status text NOT NULL DEFAULT 'received',
  request_source text,
  request_summary text,
  due_date date,
  founder_review_required boolean NOT NULL DEFAULT true,
  legal_review_recommended boolean NOT NULL DEFAULT true,
  completed_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.data_privacy_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage privacy requests"
ON public.data_privacy_requests
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'));

CREATE TRIGGER trg_data_privacy_requests_updated_at
BEFORE UPDATE ON public.data_privacy_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.customer_data_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid,
  contact_id uuid,
  data_area text NOT NULL,
  source_table text NOT NULL,
  record_count integer NOT NULL DEFAULT 0,
  contains_sensitive_data boolean NOT NULL DEFAULT false,
  retention_until date,
  lawful_basis text,
  last_scanned_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE public.customer_data_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage data inventory"
ON public.customer_data_inventory
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'));

CREATE INDEX idx_dpr_status ON public.data_privacy_requests(request_status);
CREATE INDEX idx_dpr_due ON public.data_privacy_requests(due_date);
CREATE INDEX idx_cdi_business ON public.customer_data_inventory(business_id);
CREATE INDEX idx_cdi_contact ON public.customer_data_inventory(contact_id);