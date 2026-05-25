
CREATE TABLE public.seller_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  marketplace_id uuid REFERENCES public.marketplace_profiles(id) ON DELETE SET NULL,
  seller_prospect_id uuid REFERENCES public.seller_prospects(id) ON DELETE SET NULL,
  seller_name text NOT NULL,
  seller_status text NOT NULL DEFAULT 'draft',
  seller_category text,
  seller_location text,
  seller_rating numeric DEFAULT 0,
  fulfilment_score numeric DEFAULT 0,
  response_time_score numeric DEFAULT 0,
  dispute_rate numeric DEFAULT 0,
  payout_status text DEFAULT 'not_started',
  terms_status text DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  audit_metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE public.seller_payout_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  marketplace_id uuid REFERENCES public.marketplace_profiles(id) ON DELETE SET NULL,
  seller_id uuid REFERENCES public.seller_accounts(id) ON DELETE CASCADE,
  payout_provider text NOT NULL DEFAULT 'manual',
  payout_status text NOT NULL DEFAULT 'not_started',
  currency text DEFAULT 'GBP',
  payout_schedule text DEFAULT 'monthly',
  commission_rate numeric DEFAULT 0,
  platform_fee numeric DEFAULT 0,
  tax_form_status text DEFAULT 'pending',
  payout_risk_flags text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  audit_metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE public.seller_terms_acceptance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  marketplace_id uuid REFERENCES public.marketplace_profiles(id) ON DELETE SET NULL,
  seller_id uuid REFERENCES public.seller_accounts(id) ON DELETE CASCADE,
  terms_version text NOT NULL,
  accepted boolean NOT NULL DEFAULT false,
  accepted_at timestamptz,
  acceptance_source text,
  ip_address_summary text,
  created_at timestamptz NOT NULL DEFAULT now(),
  audit_metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE public.seller_performance_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  marketplace_id uuid REFERENCES public.marketplace_profiles(id) ON DELETE SET NULL,
  seller_id uuid REFERENCES public.seller_accounts(id) ON DELETE CASCADE,
  period_start timestamptz,
  period_end timestamptz,
  orders_completed integer DEFAULT 0,
  orders_cancelled integer DEFAULT 0,
  average_response_time_minutes numeric DEFAULT 0,
  customer_rating numeric DEFAULT 0,
  dispute_count integer DEFAULT 0,
  refund_count integer DEFAULT 0,
  revenue_generated numeric DEFAULT 0,
  commission_generated numeric DEFAULT 0,
  performance_status text DEFAULT 'healthy',
  recommended_action text,
  created_at timestamptz NOT NULL DEFAULT now(),
  audit_metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE public.seller_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_payout_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_terms_acceptance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_performance_metrics ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'seller_accounts','seller_payout_profiles','seller_terms_acceptance','seller_performance_metrics'
  ]) LOOP
    EXECUTE format('CREATE POLICY "founder_admin_all_%I" ON public.%I FOR ALL TO authenticated USING (public.has_role(auth.uid(), ''founder''::app_role) OR public.has_role(auth.uid(), ''admin''::app_role)) WITH CHECK (public.has_role(auth.uid(), ''founder''::app_role) OR public.has_role(auth.uid(), ''admin''::app_role));', t, t);
  END LOOP;
END $$;

CREATE TRIGGER trg_seller_accounts_updated BEFORE UPDATE ON public.seller_accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_seller_payout_profiles_updated BEFORE UPDATE ON public.seller_payout_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_seller_accounts_status ON public.seller_accounts(business_id, seller_status);
CREATE INDEX idx_seller_payout_status ON public.seller_payout_profiles(business_id, payout_status);
CREATE INDEX idx_seller_perf_status ON public.seller_performance_metrics(business_id, performance_status);
