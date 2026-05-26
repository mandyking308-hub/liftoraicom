
CREATE TABLE public.product_margin_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL,
  product_id UUID,
  offer_id UUID,
  price_amount NUMERIC,
  currency TEXT NOT NULL DEFAULT 'USD',
  direct_cost_estimate NUMERIC DEFAULT 0,
  ai_cost_estimate NUMERIC DEFAULT 0,
  human_cost_estimate NUMERIC DEFAULT 0,
  payment_fee_estimate NUMERIC DEFAULT 0,
  support_cost_estimate NUMERIC DEFAULT 0,
  delivery_cost_estimate NUMERIC DEFAULT 0,
  refund_risk_estimate NUMERIC DEFAULT 0,
  gross_margin_amount NUMERIC,
  gross_margin_percent NUMERIC,
  margin_status TEXT NOT NULL DEFAULT 'unknown' CHECK (margin_status IN ('healthy','watch','poor','loss_making','unknown')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.discount_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL,
  product_id UUID,
  offer_id UUID,
  discount_name TEXT NOT NULL,
  max_discount_percent NUMERIC NOT NULL DEFAULT 0,
  discount_requires_approval BOOLEAN NOT NULL DEFAULT true,
  allowed_conditions TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.breakeven_models (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL,
  product_id UUID,
  fixed_costs NUMERIC NOT NULL DEFAULT 0,
  variable_cost_per_sale NUMERIC NOT NULL DEFAULT 0,
  price_per_sale NUMERIC NOT NULL DEFAULT 0,
  breakeven_units NUMERIC,
  breakeven_revenue NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.product_margin_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discount_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.breakeven_models ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage margin profiles" ON public.product_margin_profiles
  FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage discount rules" ON public.discount_rules
  FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage breakeven models" ON public.breakeven_models
  FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_margin_profiles_updated BEFORE UPDATE ON public.product_margin_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_discount_rules_updated BEFORE UPDATE ON public.discount_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_breakeven_models_updated BEFORE UPDATE ON public.breakeven_models
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_margin_profiles_business ON public.product_margin_profiles(business_id);
CREATE INDEX idx_discount_rules_business ON public.discount_rules(business_id);
CREATE INDEX idx_breakeven_business ON public.breakeven_models(business_id);
