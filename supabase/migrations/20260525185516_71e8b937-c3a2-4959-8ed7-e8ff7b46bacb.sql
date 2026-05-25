
CREATE TABLE IF NOT EXISTS public.product_upgrade_ladders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid,
  base_product_id uuid,
  upgrade_product_id uuid,
  upgrade_name text NOT NULL,
  upgrade_reason text,
  upgrade_trigger text,
  price_difference numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'GBP',
  recommended_timing text,
  approved_pitch text,
  prohibited_claims text[] NOT NULL DEFAULT '{}',
  requires_founder_approval boolean NOT NULL DEFAULT true,
  ladder_tier text,
  active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.customer_upgrade_opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid,
  contact_id uuid,
  customer_id uuid,
  current_product_id uuid,
  recommended_upgrade_product_id uuid,
  opportunity_type text NOT NULL DEFAULT 'upsell',
  trigger_reason text,
  customer_signal text,
  estimated_value numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'GBP',
  probability_score numeric NOT NULL DEFAULT 0.3,
  urgency_score numeric NOT NULL DEFAULT 0.3,
  recommended_pitch text,
  next_best_action text,
  approval_required boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'new',
  detected_at timestamptz NOT NULL DEFAULT now(),
  due_at timestamptz,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.customer_upgrade_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid,
  rule_name text NOT NULL,
  trigger_type text NOT NULL DEFAULT 'manual',
  condition_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  recommended_action text,
  requires_founder_approval boolean NOT NULL DEFAULT true,
  priority integer NOT NULL DEFAULT 100,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pul_business ON public.product_upgrade_ladders(business_id, active);
CREATE INDEX IF NOT EXISTS idx_cuo_contact ON public.customer_upgrade_opportunities(contact_id, status);
CREATE INDEX IF NOT EXISTS idx_cuo_status ON public.customer_upgrade_opportunities(status, urgency_score DESC);
CREATE INDEX IF NOT EXISTS idx_cur_business ON public.customer_upgrade_rules(business_id, active);

ALTER TABLE public.product_upgrade_ladders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_upgrade_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_upgrade_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders manage product_upgrade_ladders" ON public.product_upgrade_ladders
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'founder'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'founder'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Founders manage customer_upgrade_opportunities" ON public.customer_upgrade_opportunities
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'founder'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'founder'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Founders manage customer_upgrade_rules" ON public.customer_upgrade_rules
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'founder'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'founder'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_pul_updated BEFORE UPDATE ON public.product_upgrade_ladders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_cuo_updated BEFORE UPDATE ON public.customer_upgrade_opportunities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_cur_updated BEFORE UPDATE ON public.customer_upgrade_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
