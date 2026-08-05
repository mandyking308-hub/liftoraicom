-- =========================================================
-- Liftor Viral Opportunity Radar / Viral Conversion Intelligence
-- Provider-neutral. No secrets stored in rows.
-- =========================================================

-- 1) PROVIDER CONNECTIONS -------------------------------------------------
CREATE TABLE public.social_viral_provider_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  provider_slug TEXT NOT NULL CHECK (provider_slug ~ '^[a-z0-9_]{2,40}$'),
  display_name TEXT NOT NULL,
  connection_status TEXT NOT NULL DEFAULT 'not_configured'
    CHECK (connection_status IN ('not_configured','manual_mode','connected','degraded','paused','revoked')),
  capabilities JSONB NOT NULL DEFAULT '{}'::jsonb,
  capability_verification TEXT NOT NULL DEFAULT 'unverified'
    CHECK (capability_verification IN ('unverified','declared','verified')),
  secret_ref_name TEXT,
  config_notes TEXT,
  last_tested_at TIMESTAMPTZ,
  last_test_result TEXT,
  last_successful_sync_at TIMESTAMPTZ,
  consecutive_failures INTEGER NOT NULL DEFAULT 0 CHECK (consecutive_failures >= 0),
  is_test_data BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (business_id, provider_slug)
);

-- 2) WATCHLISTS -----------------------------------------------------------
CREATE TABLE public.social_viral_watchlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  watchlist_name TEXT NOT NULL,
  niche TEXT,
  audience_description TEXT,
  business_objective TEXT NOT NULL DEFAULT 'awareness'
    CHECK (business_objective IN ('awareness','clicks','leads','enquiries','donations','sales','recruitment','other')),
  geographies TEXT[] NOT NULL DEFAULT '{}',
  languages TEXT[] NOT NULL DEFAULT '{}',
  platforms TEXT[] NOT NULL DEFAULT '{}',
  keywords TEXT[] NOT NULL DEFAULT '{}',
  competitor_handles TEXT[] NOT NULL DEFAULT '{}',
  excluded_topics TEXT[] NOT NULL DEFAULT '{}',
  conversion_route TEXT,
  watchlist_status TEXT NOT NULL DEFAULT 'active'
    CHECK (watchlist_status IN ('active','paused','archived')),
  is_test_data BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (business_id, watchlist_name)
);
CREATE INDEX idx_svr_watchlists_business ON public.social_viral_watchlists (business_id, watchlist_status);

-- 3) SYNC RUNS ------------------------------------------------------------
CREATE TABLE public.social_viral_sync_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  watchlist_id UUID REFERENCES public.social_viral_watchlists(id) ON DELETE SET NULL,
  provider_slug TEXT NOT NULL,
  run_mode TEXT NOT NULL DEFAULT 'manual_import'
    CHECK (run_mode IN ('manual_import','provider_sync','dry_run')),
  run_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (run_status IN ('pending','running','completed','failed','blocked')),
  requested_count INTEGER NOT NULL DEFAULT 0 CHECK (requested_count >= 0),
  accepted_count INTEGER NOT NULL DEFAULT 0 CHECK (accepted_count >= 0),
  duplicate_count INTEGER NOT NULL DEFAULT 0 CHECK (duplicate_count >= 0),
  rejected_count INTEGER NOT NULL DEFAULT 0 CHECK (rejected_count >= 0),
  provider_calls INTEGER NOT NULL DEFAULT 0 CHECK (provider_calls >= 0),
  error_summary TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  is_test_data BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_svr_runs_business_date ON public.social_viral_sync_runs (business_id, started_at DESC);

-- 4) RAW SIGNALS ----------------------------------------------------------
CREATE TABLE public.social_viral_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  watchlist_id UUID REFERENCES public.social_viral_watchlists(id) ON DELETE SET NULL,
  sync_run_id UUID REFERENCES public.social_viral_sync_runs(id) ON DELETE SET NULL,
  provider_slug TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'manual'
    CHECK (source_type IN ('manual','provider','import_file','internal_analytics')),
  platform TEXT NOT NULL,
  external_id TEXT NOT NULL,
  canonical_url TEXT,
  title TEXT,
  topic TEXT,
  creator_handle TEXT,
  language TEXT,
  geography TEXT,
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  observed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at TIMESTAMPTZ,
  freshness_deadline TIMESTAMPTZ,
  signal_status TEXT NOT NULL DEFAULT 'new'
    CHECK (signal_status IN ('new','normalised','scored','rejected','expired')),
  sanitised_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  evidence_level TEXT NOT NULL DEFAULT 'manual_unverified'
    CHECK (evidence_level IN ('manual_unverified','founder_verified','provider_reported')),
  is_test_data BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (business_id, provider_slug, platform, external_id)
);
CREATE INDEX idx_svr_signals_business_status ON public.social_viral_signals (business_id, signal_status, observed_at DESC);
CREATE INDEX idx_svr_signals_fresh ON public.social_viral_signals (business_id, freshness_deadline);

-- 5) OPPORTUNITIES --------------------------------------------------------
CREATE TABLE public.social_viral_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  signal_id UUID REFERENCES public.social_viral_signals(id) ON DELETE SET NULL,
  watchlist_id UUID REFERENCES public.social_viral_watchlists(id) ON DELETE SET NULL,
  opportunity_title TEXT NOT NULL,
  opportunity_summary TEXT,
  platform TEXT,
  target_audience TEXT,
  business_objective TEXT NOT NULL DEFAULT 'awareness'
    CHECK (business_objective IN ('awareness','clicks','leads','enquiries','donations','sales','recruitment','other')),
  conversion_route TEXT,
  viral_reach_score NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (viral_reach_score BETWEEN 0 AND 100),
  trend_velocity_score NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (trend_velocity_score BETWEEN 0 AND 100),
  audience_fit_score NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (audience_fit_score BETWEEN 0 AND 100),
  conversion_potential_score NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (conversion_potential_score BETWEEN 0 AND 100),
  timing_saturation_score NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (timing_saturation_score BETWEEN 0 AND 100),
  safety_score NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (safety_score BETWEEN 0 AND 100),
  overall_score NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (overall_score BETWEEN 0 AND 100),
  confidence_level TEXT NOT NULL DEFAULT 'low'
    CHECK (confidence_level IN ('low','medium','high')),
  confidence_score NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (confidence_score BETWEEN 0 AND 100),
  blockers TEXT[] NOT NULL DEFAULT '{}',
  risk_flags TEXT[] NOT NULL DEFAULT '{}',
  requires_compliance_review BOOLEAN NOT NULL DEFAULT false,
  provenance JSONB NOT NULL DEFAULT '{}'::jsonb,
  freshness_deadline TIMESTAMPTZ,
  opportunity_status TEXT NOT NULL DEFAULT 'scored'
    CHECK (opportunity_status IN ('scored','needs_review','approved','rejected','expired','converted')),
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  is_test_data BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_svr_opps_business_rank ON public.social_viral_opportunities (business_id, opportunity_status, overall_score DESC);
CREATE INDEX idx_svr_opps_fresh ON public.social_viral_opportunities (business_id, freshness_deadline);
CREATE UNIQUE INDEX idx_svr_opps_signal_unique ON public.social_viral_opportunities (business_id, signal_id) WHERE signal_id IS NOT NULL;

-- 6) SCORE SNAPSHOTS ------------------------------------------------------
CREATE TABLE public.social_viral_score_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  opportunity_id UUID NOT NULL REFERENCES public.social_viral_opportunities(id) ON DELETE CASCADE,
  scored_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  formula_version TEXT NOT NULL DEFAULT 'v1',
  component_scores JSONB NOT NULL DEFAULT '{}'::jsonb,
  weights JSONB NOT NULL DEFAULT '{}'::jsonb,
  overall_score NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (overall_score BETWEEN 0 AND 100),
  confidence_score NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (confidence_score BETWEEN 0 AND 100),
  blockers TEXT[] NOT NULL DEFAULT '{}',
  inputs_digest TEXT,
  is_test_data BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_svr_snapshots_opp ON public.social_viral_score_snapshots (business_id, opportunity_id, scored_at DESC);

-- 7) CONTENT BRIEFS -------------------------------------------------------
CREATE TABLE public.social_viral_content_briefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  opportunity_id UUID NOT NULL REFERENCES public.social_viral_opportunities(id) ON DELETE CASCADE,
  score_snapshot_id UUID REFERENCES public.social_viral_score_snapshots(id) ON DELETE SET NULL,
  brief_title TEXT NOT NULL,
  why_rising TEXT,
  target_audience TEXT,
  intended_outcome TEXT,
  source_links TEXT[] NOT NULL DEFAULT '{}',
  original_angle TEXT,
  hook_directions TEXT[] NOT NULL DEFAULT '{}',
  suggested_formats TEXT[] NOT NULL DEFAULT '{}',
  suggested_platforms TEXT[] NOT NULL DEFAULT '{}',
  retention_structure TEXT,
  cta TEXT,
  conversion_route TEXT,
  landing_page_mapping TEXT,
  risk_notes TEXT[] NOT NULL DEFAULT '{}',
  publish_by TIMESTAMPTZ,
  brief_status TEXT NOT NULL DEFAULT 'draft'
    CHECK (brief_status IN ('draft','awaiting_founder_approval','approved','linked_to_content','rejected','expired')),
  content_pack_id UUID,
  content_item_id UUID,
  correlation_key TEXT,
  performance_status TEXT NOT NULL DEFAULT 'awaiting_performance_data'
    CHECK (performance_status IN ('awaiting_performance_data','partial','complete')),
  is_test_data BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (business_id, opportunity_id, brief_title)
);
CREATE INDEX idx_svr_briefs_business ON public.social_viral_content_briefs (business_id, brief_status, created_at DESC);
CREATE INDEX idx_svr_briefs_correlation ON public.social_viral_content_briefs (business_id, correlation_key);

-- 8) AUDIT ----------------------------------------------------------------
CREATE TABLE public.social_viral_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  actor_user_id UUID,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  provider_calls INTEGER NOT NULL DEFAULT 0 CHECK (provider_calls >= 0),
  scraped_pages INTEGER NOT NULL DEFAULT 0 CHECK (scraped_pages >= 0),
  before_json JSONB,
  after_json JSONB,
  notes TEXT,
  is_test_data BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_svr_audit_business ON public.social_viral_audit (business_id, created_at DESC);

-- GRANTS ------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON public.social_viral_provider_connections TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.social_viral_watchlists TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.social_viral_sync_runs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.social_viral_signals TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.social_viral_opportunities TO authenticated;
GRANT SELECT, INSERT ON public.social_viral_score_snapshots TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.social_viral_content_briefs TO authenticated;
GRANT SELECT ON public.social_viral_audit TO authenticated;
GRANT ALL ON public.social_viral_provider_connections TO service_role;
GRANT ALL ON public.social_viral_watchlists TO service_role;
GRANT ALL ON public.social_viral_sync_runs TO service_role;
GRANT ALL ON public.social_viral_signals TO service_role;
GRANT ALL ON public.social_viral_opportunities TO service_role;
GRANT ALL ON public.social_viral_score_snapshots TO service_role;
GRANT ALL ON public.social_viral_content_briefs TO service_role;
GRANT ALL ON public.social_viral_audit TO service_role;

-- RLS ---------------------------------------------------------------------
ALTER TABLE public.social_viral_provider_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_viral_watchlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_viral_sync_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_viral_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_viral_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_viral_score_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_viral_content_briefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_viral_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "svr_conn_founder_all" ON public.social_viral_provider_connections
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "svr_watchlists_founder_all" ON public.social_viral_watchlists
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "svr_runs_founder_all" ON public.social_viral_sync_runs
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "svr_signals_founder_all" ON public.social_viral_signals
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "svr_opps_founder_all" ON public.social_viral_opportunities
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "svr_snapshots_founder_read" ON public.social_viral_score_snapshots
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "svr_snapshots_founder_insert" ON public.social_viral_score_snapshots
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "svr_briefs_founder_all" ON public.social_viral_content_briefs
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "svr_audit_founder_read" ON public.social_viral_audit
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'));

-- updated_at triggers ------------------------------------------------------
CREATE TRIGGER trg_svr_conn_updated BEFORE UPDATE ON public.social_viral_provider_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_svr_watchlists_updated BEFORE UPDATE ON public.social_viral_watchlists
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_svr_signals_updated BEFORE UPDATE ON public.social_viral_signals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_svr_opps_updated BEFORE UPDATE ON public.social_viral_opportunities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_svr_briefs_updated BEFORE UPDATE ON public.social_viral_content_briefs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();