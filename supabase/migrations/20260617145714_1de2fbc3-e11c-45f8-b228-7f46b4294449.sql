
-- business_sales_targets ------------------------------------------------------
CREATE TABLE public.business_sales_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  draft_business_name text,
  target_monthly_revenue numeric NOT NULL DEFAULT 0,
  target_annual_revenue numeric NOT NULL DEFAULT 0,
  target_mrr numeric NOT NULL DEFAULT 0,
  target_arr numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'GBP',
  average_order_value numeric NOT NULL DEFAULT 0,
  subscription_price numeric NOT NULL DEFAULT 0,
  conversion_rate numeric NOT NULL DEFAULT 0,
  lead_to_call_rate numeric NOT NULL DEFAULT 0,
  call_to_sale_rate numeric NOT NULL DEFAULT 0,
  churn_rate numeric NOT NULL DEFAULT 0,
  gross_margin numeric NOT NULL DEFAULT 0,
  sales_cycle_days integer NOT NULL DEFAULT 0,
  target_first_sale_date date,
  target_first_1k_date date,
  target_first_10k_month_date date,
  commercial_stage text NOT NULL DEFAULT 'setup',
  max_safe_outreach_per_day integer NOT NULL DEFAULT 0,
  founder_approval_required boolean NOT NULL DEFAULT true,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_bst_business ON public.business_sales_targets(business_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_sales_targets TO authenticated;
GRANT ALL ON public.business_sales_targets TO service_role;
ALTER TABLE public.business_sales_targets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders manage business_sales_targets" ON public.business_sales_targets
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'founder'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'founder'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER trg_bst_updated BEFORE UPDATE ON public.business_sales_targets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- business_sales_pace_calculations -------------------------------------------
CREATE TABLE public.business_sales_pace_calculations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  sales_target_id uuid REFERENCES public.business_sales_targets(id) ON DELETE CASCADE,
  draft_business_name text,
  sales_needed_month numeric NOT NULL DEFAULT 0,
  sales_needed_week numeric NOT NULL DEFAULT 0,
  sales_needed_day numeric NOT NULL DEFAULT 0,
  leads_needed_month numeric NOT NULL DEFAULT 0,
  leads_needed_week numeric NOT NULL DEFAULT 0,
  leads_needed_day numeric NOT NULL DEFAULT 0,
  revenue_gap numeric NOT NULL DEFAULT 0,
  projected_mrr numeric NOT NULL DEFAULT 0,
  projected_arr numeric NOT NULL DEFAULT 0,
  current_month_revenue numeric NOT NULL DEFAULT 0,
  current_mrr numeric NOT NULL DEFAULT 0,
  current_arr numeric NOT NULL DEFAULT 0,
  pace_status text NOT NULL DEFAULT 'not_ready',
  recommended_daily_action text,
  calculated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_bspc_business ON public.business_sales_pace_calculations(business_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_sales_pace_calculations TO authenticated;
GRANT ALL ON public.business_sales_pace_calculations TO service_role;
ALTER TABLE public.business_sales_pace_calculations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders manage business_sales_pace_calculations" ON public.business_sales_pace_calculations
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'founder'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'founder'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER trg_bspc_updated BEFORE UPDATE ON public.business_sales_pace_calculations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- business_revenue_events ----------------------------------------------------
CREATE TABLE public.business_revenue_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  source text NOT NULL DEFAULT 'manual',
  event_type text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'GBP',
  customer_reference text,
  subscription_reference text,
  external_event_id text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  raw_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_bre_business_occurred ON public.business_revenue_events(business_id, occurred_at DESC);
CREATE INDEX idx_bre_event_type ON public.business_revenue_events(event_type, occurred_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_revenue_events TO authenticated;
GRANT ALL ON public.business_revenue_events TO service_role;
ALTER TABLE public.business_revenue_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders manage business_revenue_events" ON public.business_revenue_events
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'founder'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'founder'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- business_commercial_daily_snapshots ----------------------------------------
CREATE TABLE public.business_commercial_daily_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  snapshot_date date NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')::date,
  revenue_today numeric NOT NULL DEFAULT 0,
  revenue_yesterday numeric NOT NULL DEFAULT 0,
  revenue_month_to_date numeric NOT NULL DEFAULT 0,
  mrr numeric NOT NULL DEFAULT 0,
  arr numeric NOT NULL DEFAULT 0,
  new_subscriptions integer NOT NULL DEFAULT 0,
  renewed_subscriptions integer NOT NULL DEFAULT 0,
  failed_payments integer NOT NULL DEFAULT 0,
  churned_subscriptions integer NOT NULL DEFAULT 0,
  refunds integer NOT NULL DEFAULT 0,
  active_customers integer NOT NULL DEFAULT 0,
  leads_created integer NOT NULL DEFAULT 0,
  sales_closed integer NOT NULL DEFAULT 0,
  pace_status text NOT NULL DEFAULT 'not_ready',
  recommended_focus text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, snapshot_date)
);
CREATE INDEX idx_bcds_business_date ON public.business_commercial_daily_snapshots(business_id, snapshot_date DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_commercial_daily_snapshots TO authenticated;
GRANT ALL ON public.business_commercial_daily_snapshots TO service_role;
ALTER TABLE public.business_commercial_daily_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders manage business_commercial_daily_snapshots" ON public.business_commercial_daily_snapshots
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'founder'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'founder'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
