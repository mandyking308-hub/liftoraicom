
-- Settings (singleton)
CREATE TABLE public.portfolio_exit_target_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gbp_usd_rate numeric NOT NULL DEFAULT 1.27,
  default_target_arr_usd numeric NOT NULL DEFAULT 5000000,
  default_target_arr_gbp numeric NOT NULL DEFAULT 5000000,
  notes text,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.portfolio_exit_target_settings TO authenticated;
GRANT ALL ON public.portfolio_exit_target_settings TO service_role;
ALTER TABLE public.portfolio_exit_target_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "founder_admin_all_settings" ON public.portfolio_exit_target_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'));

-- Targets per business
CREATE TABLE public.portfolio_exit_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid,
  business_name text NOT NULL,
  business_status text NOT NULL DEFAULT 'idea',
  revenue_model text NOT NULL DEFAULT 'recurring_subscription',
  monthly_price_per_customer numeric NOT NULL DEFAULT 0,
  current_active_customers integer NOT NULL DEFAULT 0,
  target_arr_usd numeric,
  target_arr_gbp numeric,
  gross_margin_percent numeric,
  monthly_ai_cost numeric NOT NULL DEFAULT 0,
  monthly_human_delivery_cost numeric NOT NULL DEFAULT 0,
  monthly_other_operating_cost numeric NOT NULL DEFAULT 0,
  churn_percent numeric,
  customer_acquisition_cost numeric,
  founder_dependency_score integer,
  ai_operated_score integer,
  repeatability_score integer,
  compliance_readiness_score integer,
  evidence_pack_status text DEFAULT 'missing',
  buyer_fit_category text,
  likely_exit_route text DEFAULT 'not_ready',
  exit_stage text DEFAULT 'built_no_revenue',
  next_action text,
  founder_approved boolean NOT NULL DEFAULT false,
  founder_override_notes text,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_pet_business_id ON public.portfolio_exit_targets(business_id);
CREATE INDEX idx_pet_status ON public.portfolio_exit_targets(business_status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.portfolio_exit_targets TO authenticated;
GRANT ALL ON public.portfolio_exit_targets TO service_role;
ALTER TABLE public.portfolio_exit_targets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "founder_admin_all_targets" ON public.portfolio_exit_targets
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'));

-- Alerts log
CREATE TABLE public.portfolio_exit_target_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_id uuid NOT NULL REFERENCES public.portfolio_exit_targets(id) ON DELETE CASCADE,
  business_name text NOT NULL,
  alert_code text NOT NULL,
  alert_message text NOT NULL,
  metric_value numeric,
  triggered_at timestamptz NOT NULL DEFAULT now(),
  acknowledged_at timestamptz,
  acknowledged_by uuid,
  notes text,
  UNIQUE (target_id, alert_code)
);
CREATE INDEX idx_peta_target ON public.portfolio_exit_target_alerts(target_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.portfolio_exit_target_alerts TO authenticated;
GRANT ALL ON public.portfolio_exit_target_alerts TO service_role;
ALTER TABLE public.portfolio_exit_target_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "founder_admin_all_alerts" ON public.portfolio_exit_target_alerts
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'));

-- updated_at trigger
CREATE TRIGGER trg_pet_updated_at BEFORE UPDATE ON public.portfolio_exit_targets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_pet_settings_updated_at BEFORE UPDATE ON public.portfolio_exit_target_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed one settings row
INSERT INTO public.portfolio_exit_target_settings (gbp_usd_rate) VALUES (1.27);
