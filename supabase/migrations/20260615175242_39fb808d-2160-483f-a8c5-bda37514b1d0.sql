CREATE UNIQUE INDEX IF NOT EXISTS quarterly_pr_campaigns_business_quarter_year_uniq
  ON public.quarterly_pr_campaigns (business_id, quarter, year);

CREATE UNIQUE INDEX IF NOT EXISTS media_opportunity_matches_opp_business_uniq
  ON public.media_opportunity_matches (opportunity_id, business_id);