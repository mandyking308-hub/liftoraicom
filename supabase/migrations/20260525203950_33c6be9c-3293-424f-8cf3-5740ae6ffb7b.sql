-- Marketplace liquidity scores
CREATE TABLE IF NOT EXISTS public.marketplace_liquidity_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID,
  marketplace_id UUID,
  category TEXT,
  location TEXT,
  active_supply INTEGER NOT NULL DEFAULT 0,
  active_demand INTEGER NOT NULL DEFAULT 0,
  matched_transactions INTEGER NOT NULL DEFAULT 0,
  failed_matches INTEGER NOT NULL DEFAULT 0,
  average_time_to_match NUMERIC,
  supply_gap_score NUMERIC NOT NULL DEFAULT 0,
  demand_gap_score NUMERIC NOT NULL DEFAULT 0,
  liquidity_status TEXT NOT NULL DEFAULT 'cold_start',
  recommended_action TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  audit_metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE public.marketplace_liquidity_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders manage liquidity scores"
  ON public.marketplace_liquidity_scores
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'));

CREATE INDEX IF NOT EXISTS idx_liquidity_scores_category ON public.marketplace_liquidity_scores(category);
CREATE INDEX IF NOT EXISTS idx_liquidity_scores_location ON public.marketplace_liquidity_scores(location);

-- Marketplace growth actions
CREATE TABLE IF NOT EXISTS public.marketplace_growth_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID,
  marketplace_id UUID,
  action_type TEXT NOT NULL,
  category TEXT,
  location TEXT,
  reason TEXT,
  expected_impact TEXT,
  priority TEXT NOT NULL DEFAULT 'medium',
  assigned_agent TEXT,
  approval_required BOOLEAN NOT NULL DEFAULT true,
  action_status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  audit_metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE public.marketplace_growth_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders manage growth actions"
  ON public.marketplace_growth_actions
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'));

CREATE TRIGGER trg_growth_actions_updated
  BEFORE UPDATE ON public.marketplace_growth_actions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Marketplace match attempts
CREATE TABLE IF NOT EXISTS public.marketplace_match_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID,
  marketplace_id UUID,
  buyer_contact_id UUID,
  seller_id UUID,
  category TEXT,
  location TEXT,
  match_status TEXT NOT NULL DEFAULT 'pending',
  failure_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  audit_metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE public.marketplace_match_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders manage match attempts"
  ON public.marketplace_match_attempts
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'));

CREATE INDEX IF NOT EXISTS idx_match_attempts_status ON public.marketplace_match_attempts(match_status);
CREATE INDEX IF NOT EXISTS idx_match_attempts_category ON public.marketplace_match_attempts(category);