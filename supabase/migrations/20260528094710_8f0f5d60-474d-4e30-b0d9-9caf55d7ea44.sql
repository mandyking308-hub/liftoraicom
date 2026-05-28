
CREATE TABLE public.funding_market_maps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cluster_id UUID REFERENCES public.funding_problem_clusters(id) ON DELETE SET NULL,
  market_name TEXT NOT NULL,
  market_description TEXT,
  sector TEXT,
  geography TEXT,
  customer_segment TEXT,
  number_of_known_competitors INTEGER DEFAULT 0,
  number_of_funded_companies INTEGER DEFAULT 0,
  total_visible_funding NUMERIC,
  dominant_players JSONB DEFAULT '[]'::jsonb,
  emerging_players JSONB DEFAULT '[]'::jsonb,
  incumbent_players JSONB DEFAULT '[]'::jsonb,
  niche_players JSONB DEFAULT '[]'::jsonb,
  market_stage TEXT CHECK (market_stage IN ('emerging','growing','mature','saturated','declining','fragmented','consolidating')),
  crowding_level TEXT CHECK (crowding_level IN ('low','moderate','high','extreme')),
  saturation_risk TEXT CHECK (saturation_risk IN ('low','moderate','high','extreme')),
  white_space_score INTEGER CHECK (white_space_score BETWEEN 0 AND 100),
  fragmentation_score INTEGER CHECK (fragmentation_score BETWEEN 0 AND 100),
  buyer_education_score INTEGER CHECK (buyer_education_score BETWEEN 0 AND 100),
  switching_difficulty_score INTEGER CHECK (switching_difficulty_score BETWEEN 0 AND 100),
  distribution_difficulty_score INTEGER CHECK (distribution_difficulty_score BETWEEN 0 AND 100),
  pricing_pressure_score INTEGER CHECK (pricing_pressure_score BETWEEN 0 AND 100),
  ai_disruption_potential_score INTEGER CHECK (ai_disruption_potential_score BETWEEN 0 AND 100),
  liftor_entry_score INTEGER CHECK (liftor_entry_score BETWEEN 0 AND 100),
  recommended_entry_strategy TEXT CHECK (recommended_entry_strategy IN (
    'AVOID_TOO_SATURATED','AVOID_WINNER_TAKES_MOST','WATCH_TOO_EARLY','WATCH_CROWDED_BUT_INTERESTING',
    'BUILD_NICHE_WEDGE','BUILD_VERTICAL_VERSION','BUILD_GEOGRAPHIC_VERSION','BUILD_MANAGED_SERVICE_FIRST',
    'PARTNER_OR_ACQUIRE_LATER'
  )),
  avoid_reason TEXT,
  founder_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.funding_market_maps TO authenticated;
GRANT ALL ON public.funding_market_maps TO service_role;

ALTER TABLE public.funding_market_maps ENABLE ROW LEVEL SECURITY;

CREATE POLICY founder_select_funding_market_maps ON public.funding_market_maps FOR SELECT TO authenticated USING (has_role(auth.uid(), 'founder'::app_role));
CREATE POLICY founder_insert_funding_market_maps ON public.funding_market_maps FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'founder'::app_role));
CREATE POLICY founder_update_funding_market_maps ON public.funding_market_maps FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'founder'::app_role));
CREATE POLICY founder_delete_funding_market_maps ON public.funding_market_maps FOR DELETE TO authenticated USING (has_role(auth.uid(), 'founder'::app_role));

CREATE INDEX idx_funding_market_maps_cluster ON public.funding_market_maps(cluster_id);

CREATE TRIGGER trg_funding_market_maps_updated
BEFORE UPDATE ON public.funding_market_maps
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


CREATE TABLE public.funding_white_space_opportunities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  market_map_id UUID REFERENCES public.funding_market_maps(id) ON DELETE CASCADE,
  cluster_id UUID REFERENCES public.funding_problem_clusters(id) ON DELETE SET NULL,
  opportunity_name TEXT NOT NULL,
  underserved_customer_segment TEXT,
  underserved_geography TEXT,
  underserved_vertical TEXT,
  customer_pain_gap TEXT,
  incumbent_weakness TEXT,
  why_existing_players_are_not_solving_it TEXT,
  liftor_legally_distinct_angle TEXT,
  ai_advantage TEXT,
  low_capex_entry_route TEXT,
  recurring_revenue_logic TEXT,
  distribution_route TEXT,
  marketplace_consideration TEXT,
  legal_ip_risk TEXT,
  compliance_risk TEXT,
  recommended_status TEXT CHECK (recommended_status IN ('build','watch','avoid','partner','managed_service_first')),
  founder_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.funding_white_space_opportunities TO authenticated;
GRANT ALL ON public.funding_white_space_opportunities TO service_role;

ALTER TABLE public.funding_white_space_opportunities ENABLE ROW LEVEL SECURITY;

CREATE POLICY founder_select_funding_white_space ON public.funding_white_space_opportunities FOR SELECT TO authenticated USING (has_role(auth.uid(), 'founder'::app_role));
CREATE POLICY founder_insert_funding_white_space ON public.funding_white_space_opportunities FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'founder'::app_role));
CREATE POLICY founder_update_funding_white_space ON public.funding_white_space_opportunities FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'founder'::app_role));
CREATE POLICY founder_delete_funding_white_space ON public.funding_white_space_opportunities FOR DELETE TO authenticated USING (has_role(auth.uid(), 'founder'::app_role));

CREATE INDEX idx_funding_white_space_market_map ON public.funding_white_space_opportunities(market_map_id);
CREATE INDEX idx_funding_white_space_cluster ON public.funding_white_space_opportunities(cluster_id);

CREATE TRIGGER trg_funding_white_space_updated
BEFORE UPDATE ON public.funding_white_space_opportunities
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
