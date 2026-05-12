ALTER TABLE public.lead_quality_profiles
  ADD COLUMN IF NOT EXISTS unlock_shortlist_rank integer,
  ADD COLUMN IF NOT EXISTS unlock_recommendation text;

CREATE INDEX IF NOT EXISTS idx_lqp_unlock_rank
  ON public.lead_quality_profiles (unlock_shortlist_rank)
  WHERE unlock_shortlist_rank IS NOT NULL;