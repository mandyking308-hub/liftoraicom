
CREATE TABLE IF NOT EXISTS public.ai_provider_pricing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_name text NOT NULL,
  model_name text NOT NULL,
  model_tier text CHECK (model_tier IN ('cheap','standard','premium')),
  input_cost_per_1m_tokens numeric NOT NULL DEFAULT 0,
  output_cost_per_1m_tokens numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  effective_to date,
  active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_pricing_provider_model
  ON public.ai_provider_pricing (provider_name, model_name);
CREATE INDEX IF NOT EXISTS idx_ai_pricing_active
  ON public.ai_provider_pricing (active, effective_from);
CREATE INDEX IF NOT EXISTS idx_ai_pricing_tier
  ON public.ai_provider_pricing (model_tier);

ALTER TABLE public.ai_provider_pricing ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admin_all_ai_pricing ON public.ai_provider_pricing;
CREATE POLICY admin_all_ai_pricing
  ON public.ai_provider_pricing
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_ai_pricing_updated_at
  BEFORE UPDATE ON public.ai_provider_pricing
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
