
CREATE TABLE IF NOT EXISTS public.sales_revenue_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid,
  target_name text NOT NULL,
  target_period text NOT NULL DEFAULT 'monthly',
  target_revenue_amount numeric NOT NULL DEFAULT 0,
  target_currency text NOT NULL DEFAULT 'GBP',
  target_start_date date NOT NULL,
  target_end_date date NOT NULL,
  target_type text NOT NULL DEFAULT 'revenue',
  active boolean NOT NULL DEFAULT true,
  notes text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sales_activity_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid,
  revenue_target_id uuid REFERENCES public.sales_revenue_targets(id) ON DELETE CASCADE,
  required_leads integer NOT NULL DEFAULT 0,
  required_conversations integer NOT NULL DEFAULT 0,
  required_calls integer NOT NULL DEFAULT 0,
  required_proposals integer NOT NULL DEFAULT 0,
  required_followups integer NOT NULL DEFAULT 0,
  required_closes integer NOT NULL DEFAULT 0,
  required_upgrades integer NOT NULL DEFAULT 0,
  assumed_lead_to_call_rate numeric NOT NULL DEFAULT 0.3,
  assumed_call_to_proposal_rate numeric NOT NULL DEFAULT 0.4,
  assumed_proposal_to_close_rate numeric NOT NULL DEFAULT 0.2,
  assumed_average_order_value numeric NOT NULL DEFAULT 500,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sales_target_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid,
  revenue_target_id uuid REFERENCES public.sales_revenue_targets(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  actual_leads integer NOT NULL DEFAULT 0,
  actual_conversations integer NOT NULL DEFAULT 0,
  actual_calls integer NOT NULL DEFAULT 0,
  actual_proposals integer NOT NULL DEFAULT 0,
  actual_followups integer NOT NULL DEFAULT 0,
  actual_closed_won integer NOT NULL DEFAULT 0,
  actual_revenue numeric NOT NULL DEFAULT 0,
  actual_pipeline numeric NOT NULL DEFAULT 0,
  target_gap_amount numeric NOT NULL DEFAULT 0,
  target_gap_percent numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'on_track',
  recommended_action text,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_srt_business ON public.sales_revenue_targets(business_id, active);
CREATE INDEX IF NOT EXISTS idx_sat_target ON public.sales_activity_targets(revenue_target_id);
CREATE INDEX IF NOT EXISTS idx_stp_target ON public.sales_target_progress(revenue_target_id, period_start DESC);

ALTER TABLE public.sales_revenue_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_activity_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_target_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders manage sales_revenue_targets" ON public.sales_revenue_targets
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'founder'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'founder'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Founders manage sales_activity_targets" ON public.sales_activity_targets
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'founder'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'founder'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Founders manage sales_target_progress" ON public.sales_target_progress
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'founder'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'founder'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_srt_updated BEFORE UPDATE ON public.sales_revenue_targets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_sat_updated BEFORE UPDATE ON public.sales_activity_targets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_stp_updated BEFORE UPDATE ON public.sales_target_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
