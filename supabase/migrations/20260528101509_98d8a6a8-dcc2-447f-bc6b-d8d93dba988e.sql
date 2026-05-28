CREATE TABLE public.business_autopsies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID NOT NULL,
  company_name TEXT NOT NULL,
  website TEXT,
  funding_source TEXT,
  sector TEXT,
  country TEXT,
  competitor_notes TEXT,
  uploaded_research TEXT,
  reason_for_analysis TEXT,
  related_cluster_id UUID,
  related_watchlist_id UUID,
  related_shortlist_id UUID,
  related_build_candidate_id UUID,
  source_kind TEXT NOT NULL DEFAULT 'manual' CHECK (source_kind IN ('manual','watchlist','shortlist','quarterly_candidate','category')),
  business_model JSONB NOT NULL DEFAULT '{}'::jsonb,
  customer_pain JSONB NOT NULL DEFAULT '{}'::jsonb,
  operational_heaviness JSONB NOT NULL DEFAULT '{}'::jsonb,
  weakness_signals JSONB NOT NULL DEFAULT '{}'::jsonb,
  market_position JSONB NOT NULL DEFAULT '{}'::jsonb,
  liftor_advantage JSONB NOT NULL DEFAULT '{}'::jsonb,
  legal_warnings TEXT[] NOT NULL DEFAULT '{}',
  recommendation TEXT NOT NULL DEFAULT 'review' CHECK (recommendation IN ('build','watch','park','kill','review')),
  recommendation_reason TEXT,
  better_build_pack JSONB,
  lovable_prompt_pack JSONB,
  approval_status TEXT NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending','approved','rejected','superseded')),
  founder_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_autopsies TO authenticated;
GRANT ALL ON public.business_autopsies TO service_role;

ALTER TABLE public.business_autopsies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders can view business autopsies"
  ON public.business_autopsies FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Founders can create business autopsies"
  ON public.business_autopsies FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND created_by = auth.uid());

CREATE POLICY "Founders can update business autopsies"
  ON public.business_autopsies FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Founders can delete business autopsies"
  ON public.business_autopsies FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_business_autopsies_updated_at
  BEFORE UPDATE ON public.business_autopsies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_business_autopsies_created_by ON public.business_autopsies(created_by);
CREATE INDEX idx_business_autopsies_recommendation ON public.business_autopsies(recommendation);
CREATE INDEX idx_business_autopsies_related_cluster ON public.business_autopsies(related_cluster_id);
CREATE INDEX idx_business_autopsies_related_build ON public.business_autopsies(related_build_candidate_id);