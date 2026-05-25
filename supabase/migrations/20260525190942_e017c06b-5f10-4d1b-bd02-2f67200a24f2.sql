CREATE TABLE public.qtc_quotes (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  contact_id uuid,
  deal_id uuid,
  product_id uuid,
  offer_id uuid,
  quote_number text,
  quote_status text not null default 'draft' check (quote_status in ('draft','approval_required','approved','sent','accepted','rejected','expired','cancelled')),
  quote_amount numeric default 0,
  currency text default 'USD',
  tax_amount numeric default 0,
  discount_amount numeric default 0,
  total_amount numeric default 0,
  validity_until timestamptz,
  terms_summary text,
  founder_approval_required boolean default true,
  founder_approved_at timestamptz,
  sent_at timestamptz,
  accepted_at timestamptz,
  audit_metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
CREATE INDEX idx_qtc_quotes_business ON public.qtc_quotes(business_id, quote_status, created_at desc);

CREATE TABLE public.qtc_proposals (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  contact_id uuid,
  deal_id uuid,
  quote_id uuid,
  proposal_title text not null,
  proposal_status text not null default 'draft' check (proposal_status in ('draft','approval_required','approved','sent','accepted','rejected','expired','cancelled')),
  proposal_summary text,
  proposal_body text,
  pricing_summary jsonb default '{}'::jsonb,
  risk_flags jsonb default '[]'::jsonb,
  founder_approval_required boolean default true,
  founder_approved_at timestamptz,
  sent_at timestamptz,
  accepted_at timestamptz,
  audit_metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
CREATE INDEX idx_qtc_proposals_business ON public.qtc_proposals(business_id, proposal_status, created_at desc);

CREATE TABLE public.qtc_invoices (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  contact_id uuid,
  deal_id uuid,
  quote_id uuid,
  invoice_number text,
  invoice_status text not null default 'draft' check (invoice_status in ('draft','approval_required','approved','sent','paid','overdue','void','cancelled')),
  invoice_amount numeric default 0,
  currency text default 'USD',
  due_date date,
  payment_provider text,
  provider_invoice_id text,
  payment_link_url text,
  founder_approval_required boolean default true,
  founder_approved_at timestamptz,
  sent_at timestamptz,
  paid_at timestamptz,
  audit_metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
CREATE INDEX idx_qtc_invoices_business ON public.qtc_invoices(business_id, invoice_status, due_date);

CREATE TABLE public.qtc_payments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  contact_id uuid,
  deal_id uuid,
  invoice_id uuid,
  payment_status text not null default 'pending' check (payment_status in ('pending','succeeded','failed','refunded','disputed','cancelled')),
  amount numeric default 0,
  currency text default 'USD',
  provider_name text,
  provider_payment_id text,
  payment_method text,
  received_at timestamptz,
  confirmed_revenue boolean default false,
  audit_metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
CREATE INDEX idx_qtc_payments_business ON public.qtc_payments(business_id, payment_status, received_at desc);

CREATE TABLE public.qtc_revenue_confirmations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  contact_id uuid,
  deal_id uuid,
  invoice_id uuid,
  payment_id uuid,
  revenue_amount numeric default 0,
  currency text default 'USD',
  revenue_type text not null check (revenue_type in ('one_time','recurring','subscription','deposit','balance','refund')),
  confirmation_source text not null check (confirmation_source in ('payment_provider','manual','invoice_paid','contract_signed')),
  confirmed_at timestamptz not null default now(),
  confirmed_by uuid,
  audit_metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);
CREATE INDEX idx_qtc_revconf_business ON public.qtc_revenue_confirmations(business_id, confirmed_at desc);

ALTER TABLE public.qtc_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qtc_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qtc_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qtc_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qtc_revenue_confirmations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "founders manage qtc_quotes" ON public.qtc_quotes FOR ALL
    USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'))
    WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "founders manage qtc_proposals" ON public.qtc_proposals FOR ALL
    USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'))
    WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "founders manage qtc_invoices" ON public.qtc_invoices FOR ALL
    USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'))
    WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "founders manage qtc_payments" ON public.qtc_payments FOR ALL
    USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'))
    WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "founders manage qtc_revconf" ON public.qtc_revenue_confirmations FOR ALL
    USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'))
    WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TRIGGER trg_qtc_quotes_upd BEFORE UPDATE ON public.qtc_quotes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_qtc_proposals_upd BEFORE UPDATE ON public.qtc_proposals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_qtc_invoices_upd BEFORE UPDATE ON public.qtc_invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_qtc_payments_upd BEFORE UPDATE ON public.qtc_payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- When a quote is accepted, auto-create an invoice draft (internal preparation only; no external send)
CREATE OR REPLACE FUNCTION public.qtc_on_quote_accepted()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.quote_status = 'accepted' AND (OLD.quote_status IS DISTINCT FROM 'accepted') THEN
    INSERT INTO public.qtc_invoices (business_id, contact_id, deal_id, quote_id, invoice_amount, currency, invoice_status, founder_approval_required, audit_metadata)
    VALUES (NEW.business_id, NEW.contact_id, NEW.deal_id, NEW.id, NEW.total_amount, NEW.currency, 'draft', true, jsonb_build_object('source','quote_accepted'));
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_qtc_quote_accepted AFTER UPDATE ON public.qtc_quotes FOR EACH ROW EXECUTE FUNCTION public.qtc_on_quote_accepted();

-- When a payment succeeds, create a revenue_confirmation and mark invoice paid
CREATE OR REPLACE FUNCTION public.qtc_on_payment_succeeded()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  test_flag boolean := COALESCE((NEW.audit_metadata->>'test_label') = 'LIVE_INTERNAL_TEST', false);
BEGIN
  IF NEW.payment_status = 'succeeded' AND (OLD.payment_status IS DISTINCT FROM 'succeeded') AND test_flag = false THEN
    INSERT INTO public.qtc_revenue_confirmations (business_id, contact_id, deal_id, invoice_id, payment_id, revenue_amount, currency, revenue_type, confirmation_source)
    VALUES (NEW.business_id, NEW.contact_id, NEW.deal_id, NEW.invoice_id, NEW.id, NEW.amount, NEW.currency, 'one_time', 'payment_provider');
    NEW.confirmed_revenue := true;
    IF NEW.invoice_id IS NOT NULL THEN
      UPDATE public.qtc_invoices SET invoice_status = 'paid', paid_at = now() WHERE id = NEW.invoice_id;
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_qtc_payment_succeeded BEFORE UPDATE ON public.qtc_payments FOR EACH ROW EXECUTE FUNCTION public.qtc_on_payment_succeeded();