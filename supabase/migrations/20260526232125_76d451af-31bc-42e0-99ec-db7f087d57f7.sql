
CREATE TABLE public.platform_performance_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID,
  source_module TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('slow_page','slow_query','edge_function_error','api_error','rate_limit','large_table','bundle_warning','memory_warning','timeout','other')),
  severity TEXT NOT NULL DEFAULT 'low' CHECK (severity IN ('low','medium','high','critical')),
  event_summary TEXT,
  metric_value NUMERIC,
  threshold_value NUMERIC,
  recommended_action TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','acknowledged','resolved','ignored')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  audit_metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.platform_performance_events TO authenticated;
GRANT ALL ON public.platform_performance_events TO service_role;
ALTER TABLE public.platform_performance_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "founders read perf events" ON public.platform_performance_events FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'founder'));
CREATE POLICY "founders write perf events" ON public.platform_performance_events FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'founder'));
CREATE POLICY "founders update perf events" ON public.platform_performance_events FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'founder'));
CREATE POLICY "founders delete perf events" ON public.platform_performance_events FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'founder'));
CREATE INDEX idx_perf_events_status ON public.platform_performance_events(status, created_at DESC);
CREATE INDEX idx_perf_events_type ON public.platform_performance_events(event_type, severity);

CREATE TABLE public.platform_cost_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cost_source TEXT NOT NULL CHECK (cost_source IN ('ai','supabase','provider_api','email','voice','payment','storage','hosting','other')),
  business_id UUID,
  cost_period_start TIMESTAMPTZ NOT NULL,
  cost_period_end TIMESTAMPTZ NOT NULL,
  estimated_cost NUMERIC,
  confirmed_cost NUMERIC,
  currency TEXT NOT NULL DEFAULT 'USD',
  cost_basis TEXT NOT NULL DEFAULT 'estimated' CHECK (cost_basis IN ('estimated','provider_reported','invoice','manual','unknown')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  audit_metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.platform_cost_records TO authenticated;
GRANT ALL ON public.platform_cost_records TO service_role;
ALTER TABLE public.platform_cost_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "founders read cost records" ON public.platform_cost_records FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'founder'));
CREATE POLICY "founders write cost records" ON public.platform_cost_records FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'founder'));
CREATE POLICY "founders update cost records" ON public.platform_cost_records FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'founder'));
CREATE POLICY "founders delete cost records" ON public.platform_cost_records FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'founder'));
CREATE INDEX idx_cost_records_source ON public.platform_cost_records(cost_source, cost_period_end DESC);

CREATE TABLE public.platform_scalability_recommendations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recommendation_type TEXT NOT NULL CHECK (recommendation_type IN ('index_needed','pagination_needed','code_split','cache_needed','archive_old_data','provider_plan_review','rate_limit_adjustment','query_refactor','other')),
  source_module TEXT NOT NULL,
  recommendation_summary TEXT,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  expected_impact TEXT,
  action_status TEXT NOT NULL DEFAULT 'recommended' CHECK (action_status IN ('recommended','approval_required','approved','implemented','rejected','parked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.platform_scalability_recommendations TO authenticated;
GRANT ALL ON public.platform_scalability_recommendations TO service_role;
ALTER TABLE public.platform_scalability_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "founders read scale recs" ON public.platform_scalability_recommendations FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'founder'));
CREATE POLICY "founders write scale recs" ON public.platform_scalability_recommendations FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'founder'));
CREATE POLICY "founders update scale recs" ON public.platform_scalability_recommendations FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'founder'));
CREATE POLICY "founders delete scale recs" ON public.platform_scalability_recommendations FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'founder'));
CREATE INDEX idx_scale_recs_status ON public.platform_scalability_recommendations(action_status, priority, created_at DESC);

CREATE TRIGGER trg_perf_events_updated BEFORE UPDATE ON public.platform_performance_events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_cost_records_updated BEFORE UPDATE ON public.platform_cost_records FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_scale_recs_updated BEFORE UPDATE ON public.platform_scalability_recommendations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
