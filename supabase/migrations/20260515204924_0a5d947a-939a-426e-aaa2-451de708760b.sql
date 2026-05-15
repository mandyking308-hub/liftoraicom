
CREATE TABLE IF NOT EXISTS public.business_revenue_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  target_name text NOT NULL,
  target_type text NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  target_amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'GBP',
  target_unit text,
  target_count integer,
  status text NOT NULL DEFAULT 'active',
  owner_agent_key text NOT NULL DEFAULT 'revenue_goal_agent',
  founder_review_required boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.revenue_target_activity_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  revenue_target_id uuid REFERENCES public.business_revenue_targets(id) ON DELETE CASCADE,
  plan_status text NOT NULL DEFAULT 'draft',
  target_gap numeric,
  required_customers integer,
  assumed_conversion_rate numeric,
  required_prospects integer,
  required_outreach_actions integer,
  required_social_actions integer,
  required_followups integer,
  required_proposals integer,
  required_demos integer,
  required_upsells integer,
  assumptions jsonb NOT NULL DEFAULT '{}'::jsonb,
  recommended_agent_actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  recommended_founder_actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  risk_flags jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.revenue_goal_progress_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  revenue_target_id uuid REFERENCES public.business_revenue_targets(id) ON DELETE CASCADE,
  snapshot_date date NOT NULL DEFAULT current_date,
  target_amount numeric,
  actual_amount numeric NOT NULL DEFAULT 0,
  target_count integer,
  actual_count integer NOT NULL DEFAULT 0,
  percentage_complete numeric,
  days_elapsed integer,
  days_remaining integer,
  pace_status text,
  forecast_amount numeric,
  shortfall_amount numeric,
  recommended_adjustment text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.business_revenue_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revenue_target_activity_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revenue_goal_progress_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders manage business revenue targets"
  ON public.business_revenue_targets FOR ALL
  USING (public.has_role(auth.uid(), 'founder'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'founder'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Founders manage revenue target activity plans"
  ON public.revenue_target_activity_plans FOR ALL
  USING (public.has_role(auth.uid(), 'founder'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'founder'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Founders manage revenue goal progress snapshots"
  ON public.revenue_goal_progress_snapshots FOR ALL
  USING (public.has_role(auth.uid(), 'founder'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'founder'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE INDEX IF NOT EXISTS idx_brt_business ON public.business_revenue_targets(business_id, status);
CREATE INDEX IF NOT EXISTS idx_rtap_target ON public.revenue_target_activity_plans(revenue_target_id);
CREATE INDEX IF NOT EXISTS idx_rgps_target ON public.revenue_goal_progress_snapshots(revenue_target_id, snapshot_date DESC);

CREATE TRIGGER update_brt_updated_at BEFORE UPDATE ON public.business_revenue_targets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_rtap_updated_at BEFORE UPDATE ON public.revenue_target_activity_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
