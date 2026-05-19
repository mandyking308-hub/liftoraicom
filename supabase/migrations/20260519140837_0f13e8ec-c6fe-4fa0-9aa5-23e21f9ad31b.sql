
-- ============ NEW TABLES ============

CREATE TABLE IF NOT EXISTS public.social_performance_import_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  import_name text NOT NULL,
  import_type text DEFAULT 'manual',
  import_source text,
  platform text,
  date_range_start date,
  date_range_end date,
  import_status text DEFAULT 'draft',
  row_count integer DEFAULT 0,
  imported_count integer DEFAULT 0,
  duplicate_count integer DEFAULT 0,
  blocked_count integer DEFAULT 0,
  validation_errors text[] DEFAULT '{}',
  validation_warnings text[] DEFAULT '{}',
  source_notes text,
  is_test_data boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============ EXTEND EXISTING social_performance_metrics ============
ALTER TABLE public.social_performance_metrics ADD COLUMN IF NOT EXISTS import_batch_id uuid REFERENCES public.social_performance_import_batches(id) ON DELETE SET NULL;
ALTER TABLE public.social_performance_metrics ADD COLUMN IF NOT EXISTS platform text;
ALTER TABLE public.social_performance_metrics ADD COLUMN IF NOT EXISTS provider text;
ALTER TABLE public.social_performance_metrics ADD COLUMN IF NOT EXISTS metric_period_start date;
ALTER TABLE public.social_performance_metrics ADD COLUMN IF NOT EXISTS metric_period_end date;
ALTER TABLE public.social_performance_metrics ADD COLUMN IF NOT EXISTS post_url text;
ALTER TABLE public.social_performance_metrics ADD COLUMN IF NOT EXISTS content_item_id uuid;
ALTER TABLE public.social_performance_metrics ADD COLUMN IF NOT EXISTS content_variant_id uuid;
ALTER TABLE public.social_performance_metrics ADD COLUMN IF NOT EXISTS calendar_item_id uuid;
ALTER TABLE public.social_performance_metrics ADD COLUMN IF NOT EXISTS campaign_plan_id uuid;
ALTER TABLE public.social_performance_metrics ADD COLUMN IF NOT EXISTS asset_id uuid;
ALTER TABLE public.social_performance_metrics ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE public.social_performance_metrics ADD COLUMN IF NOT EXISTS caption_snippet text;
ALTER TABLE public.social_performance_metrics ADD COLUMN IF NOT EXISTS content_type text;
ALTER TABLE public.social_performance_metrics ADD COLUMN IF NOT EXISTS profile_visits integer DEFAULT 0;
ALTER TABLE public.social_performance_metrics ADD COLUMN IF NOT EXISTS unsubscribes integer DEFAULT 0;
ALTER TABLE public.social_performance_metrics ADD COLUMN IF NOT EXISTS average_watch_seconds numeric;
ALTER TABLE public.social_performance_metrics ADD COLUMN IF NOT EXISTS click_through_rate numeric;
ALTER TABLE public.social_performance_metrics ADD COLUMN IF NOT EXISTS conversion_count integer DEFAULT 0;
ALTER TABLE public.social_performance_metrics ADD COLUMN IF NOT EXISTS lead_count integer DEFAULT 0;
ALTER TABLE public.social_performance_metrics ADD COLUMN IF NOT EXISTS revenue_attributed numeric;
ALTER TABLE public.social_performance_metrics ADD COLUMN IF NOT EXISTS currency text DEFAULT 'GBP';
ALTER TABLE public.social_performance_metrics ADD COLUMN IF NOT EXISTS attribution_status text DEFAULT 'unverified';
ALTER TABLE public.social_performance_metrics ADD COLUMN IF NOT EXISTS metric_confidence text DEFAULT 'manual_unverified';
ALTER TABLE public.social_performance_metrics ADD COLUMN IF NOT EXISTS is_test_data boolean DEFAULT false;
ALTER TABLE public.social_performance_metrics ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

CREATE TABLE IF NOT EXISTS public.social_content_performance_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  summary_type text NOT NULL,
  summary_status text DEFAULT 'draft',
  platform text,
  content_item_id uuid,
  content_variant_id uuid,
  content_pack_id uuid,
  campaign_plan_id uuid,
  asset_id uuid,
  period_start date,
  period_end date,
  total_posts integer DEFAULT 0,
  total_views integer DEFAULT 0,
  total_impressions integer DEFAULT 0,
  total_reach integer DEFAULT 0,
  total_engagement integer DEFAULT 0,
  total_clicks integer DEFAULT 0,
  total_leads integer DEFAULT 0,
  total_conversions integer DEFAULT 0,
  total_revenue_attributed numeric,
  avg_engagement_rate numeric,
  avg_click_through_rate numeric,
  top_performing_metric text,
  performance_rating text DEFAULT 'unknown',
  key_findings text[] DEFAULT '{}',
  caveats text[] DEFAULT '{}',
  confidence_score integer DEFAULT 0,
  is_test_data boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.social_learning_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  signal_type text NOT NULL,
  signal_status text DEFAULT 'draft',
  source_metric_id uuid REFERENCES public.social_performance_metrics(id) ON DELETE SET NULL,
  source_summary_id uuid REFERENCES public.social_content_performance_summaries(id) ON DELETE SET NULL,
  platform text,
  content_item_id uuid,
  campaign_plan_id uuid,
  asset_id uuid,
  signal_title text NOT NULL,
  signal_description text,
  evidence_summary text,
  recommendation text,
  confidence_score integer DEFAULT 0,
  impact_area text,
  founder_review_required boolean DEFAULT true,
  approved_for_strategy boolean DEFAULT false,
  approved_at timestamptz,
  approved_by text,
  is_test_data boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.social_strategy_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  recommendation_type text NOT NULL,
  recommendation_status text DEFAULT 'draft',
  priority text DEFAULT 'normal',
  title text NOT NULL,
  description text,
  rationale text,
  linked_learning_signal_id uuid REFERENCES public.social_learning_signals(id) ON DELETE SET NULL,
  linked_campaign_plan_id uuid,
  linked_revenue_target_id uuid,
  recommended_action text,
  expected_impact text,
  evidence_level text DEFAULT 'low',
  confidence_score integer DEFAULT 0,
  founder_approval_required boolean DEFAULT true,
  approval_status text DEFAULT 'draft',
  is_test_data boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.social_analytics_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  import_batch_id uuid REFERENCES public.social_performance_import_batches(id) ON DELETE SET NULL,
  metric_id uuid REFERENCES public.social_performance_metrics(id) ON DELETE SET NULL,
  summary_id uuid REFERENCES public.social_content_performance_summaries(id) ON DELETE SET NULL,
  learning_signal_id uuid REFERENCES public.social_learning_signals(id) ON DELETE SET NULL,
  recommendation_id uuid REFERENCES public.social_strategy_recommendations(id) ON DELETE SET NULL,
  action text NOT NULL,
  action_status text DEFAULT 'recorded',
  before_json jsonb DEFAULT '{}'::jsonb,
  after_json jsonb DEFAULT '{}'::jsonb,
  result_json jsonb DEFAULT '{}'::jsonb,
  provider_calls integer DEFAULT 0,
  scraped_pages integer DEFAULT 0,
  fake_metrics_created integer DEFAULT 0,
  error_message text,
  created_by text,
  is_test_data boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- ============ EXTEND OTHER SOCIAL TABLES ============
ALTER TABLE public.social_content_items ADD COLUMN IF NOT EXISTS performance_summary_id uuid;
ALTER TABLE public.social_content_items ADD COLUMN IF NOT EXISTS total_views integer DEFAULT 0;
ALTER TABLE public.social_content_items ADD COLUMN IF NOT EXISTS total_engagement integer DEFAULT 0;
ALTER TABLE public.social_content_items ADD COLUMN IF NOT EXISTS performance_rating text DEFAULT 'unknown';
ALTER TABLE public.social_content_items ADD COLUMN IF NOT EXISTS learning_status text DEFAULT 'not_reviewed';
ALTER TABLE public.social_content_items ADD COLUMN IF NOT EXISTS last_performance_import_at timestamptz;

ALTER TABLE public.social_content_variants ADD COLUMN IF NOT EXISTS total_views integer DEFAULT 0;
ALTER TABLE public.social_content_variants ADD COLUMN IF NOT EXISTS total_engagement integer DEFAULT 0;
ALTER TABLE public.social_content_variants ADD COLUMN IF NOT EXISTS performance_rating text DEFAULT 'unknown';
ALTER TABLE public.social_content_variants ADD COLUMN IF NOT EXISTS learning_status text DEFAULT 'not_reviewed';

ALTER TABLE public.social_campaign_plans ADD COLUMN IF NOT EXISTS performance_summary_id uuid;
ALTER TABLE public.social_campaign_plans ADD COLUMN IF NOT EXISTS performance_rating text DEFAULT 'unknown';
ALTER TABLE public.social_campaign_plans ADD COLUMN IF NOT EXISTS learning_status text DEFAULT 'not_reviewed';

ALTER TABLE public.social_assets ADD COLUMN IF NOT EXISTS performance_summary_id uuid;
ALTER TABLE public.social_assets ADD COLUMN IF NOT EXISTS performance_rating text DEFAULT 'unknown';
ALTER TABLE public.social_assets ADD COLUMN IF NOT EXISTS usage_performance_notes text;

-- ============ INDEXES ============
CREATE INDEX IF NOT EXISTS idx_spm_batch ON public.social_performance_metrics(import_batch_id);
CREATE INDEX IF NOT EXISTS idx_spm_content ON public.social_performance_metrics(content_item_id);
CREATE INDEX IF NOT EXISTS idx_spm_campaign ON public.social_performance_metrics(campaign_plan_id);
CREATE INDEX IF NOT EXISTS idx_scps_business ON public.social_content_performance_summaries(business_id, summary_type);
CREATE INDEX IF NOT EXISTS idx_sls_business ON public.social_learning_signals(business_id, signal_status);
CREATE INDEX IF NOT EXISTS idx_ssr_business ON public.social_strategy_recommendations(business_id, recommendation_status);
CREATE INDEX IF NOT EXISTS idx_saa_business ON public.social_analytics_audit(business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_spib_business ON public.social_performance_import_batches(business_id, created_at DESC);

-- ============ RLS ============
ALTER TABLE public.social_performance_import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_content_performance_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_learning_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_strategy_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_analytics_audit ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'social_performance_import_batches',
    'social_content_performance_summaries','social_learning_signals',
    'social_strategy_recommendations','social_analytics_audit'
  ]) LOOP
    EXECUTE format('DROP POLICY IF EXISTS "founder_admin_all" ON public.%I', t);
    EXECUTE format($p$CREATE POLICY "founder_admin_all" ON public.%I
      FOR ALL TO authenticated
      USING (public.has_role(auth.uid(), 'founder'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role))
      WITH CHECK (public.has_role(auth.uid(), 'founder'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role))$p$, t);
  END LOOP;
END $$;
