
-- social_calendars
CREATE TABLE IF NOT EXISTS public.social_calendars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  calendar_name text NOT NULL,
  calendar_type text NOT NULL,
  calendar_status text DEFAULT 'draft',
  start_date date NOT NULL,
  end_date date NOT NULL,
  timezone text DEFAULT 'Europe/London',
  platforms text[] DEFAULT '{}',
  campaign_plan_id uuid,
  content_pack_id uuid REFERENCES public.social_content_packs(id) ON DELETE SET NULL,
  revenue_strategy_id uuid,
  calendar_goal text,
  calendar_summary text,
  posting_cadence jsonb DEFAULT '{}'::jsonb,
  approval_status text DEFAULT 'draft',
  readiness_score integer DEFAULT 0,
  missing_assets text[] DEFAULT '{}',
  blocked_reasons text[] DEFAULT '{}',
  compliance_warnings text[] DEFAULT '{}',
  founder_notes text,
  is_test_data boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.social_calendars ENABLE ROW LEVEL SECURITY;

-- social_calendar_items
CREATE TABLE IF NOT EXISTS public.social_calendar_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  calendar_id uuid NOT NULL REFERENCES public.social_calendars(id) ON DELETE CASCADE,
  content_item_id uuid REFERENCES public.social_content_items(id) ON DELETE SET NULL,
  content_variant_id uuid REFERENCES public.social_content_variants(id) ON DELETE SET NULL,
  asset_id uuid REFERENCES public.social_assets(id) ON DELETE SET NULL,
  campaign_plan_id uuid,
  content_pack_id uuid,
  platform text NOT NULL,
  provider text,
  planned_date date NOT NULL,
  planned_time time,
  timezone text DEFAULT 'Europe/London',
  day_number integer,
  week_number integer,
  slot_label text,
  content_goal text,
  funnel_stage text,
  customer_journey_stage text,
  offer_mapping_id uuid,
  status text DEFAULT 'planned',
  approval_status text DEFAULT 'draft',
  asset_status text DEFAULT 'unknown',
  compliance_status text DEFAULT 'not_reviewed',
  queue_readiness text DEFAULT 'not_ready',
  block_reason text,
  notes text,
  is_test_data boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.social_calendar_items ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_sci_calendar ON public.social_calendar_items(calendar_id);
CREATE INDEX IF NOT EXISTS idx_sci_business_date ON public.social_calendar_items(business_id, planned_date);

-- social_calendar_generation_runs
CREATE TABLE IF NOT EXISTS public.social_calendar_generation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  run_type text NOT NULL,
  run_status text DEFAULT 'preview',
  requested_start_date date,
  requested_end_date date,
  requested_days integer,
  requested_platforms text[] DEFAULT '{}',
  source_pack_id uuid,
  source_campaign_id uuid,
  source_revenue_strategy_id uuid,
  generated_calendar_id uuid,
  proposed_items_count integer DEFAULT 0,
  saved_items_count integer DEFAULT 0,
  blocked_items_count integer DEFAULT 0,
  missing_assets text[] DEFAULT '{}',
  compliance_warnings text[] DEFAULT '{}',
  model_notes text,
  confidence_score integer DEFAULT 0,
  is_test_data boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.social_calendar_generation_runs ENABLE ROW LEVEL SECURITY;

-- social_calendar_cadence_rules
CREATE TABLE IF NOT EXISTS public.social_calendar_cadence_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  platform text NOT NULL,
  rule_name text NOT NULL,
  rule_status text DEFAULT 'active',
  posts_per_day integer,
  posts_per_week integer,
  preferred_times time[] DEFAULT '{}',
  preferred_days text[] DEFAULT '{}',
  avoid_days text[] DEFAULT '{}',
  timezone text DEFAULT 'Europe/London',
  min_gap_minutes integer,
  max_posts_per_day integer,
  notes text,
  source text DEFAULT 'generated',
  is_test_data boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.social_calendar_cadence_rules ENABLE ROW LEVEL SECURITY;

-- social_calendar_gap_reviews
CREATE TABLE IF NOT EXISTS public.social_calendar_gap_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  calendar_id uuid REFERENCES public.social_calendars(id) ON DELETE CASCADE,
  gap_type text NOT NULL,
  gap_description text NOT NULL,
  affected_date date,
  affected_platform text,
  severity text DEFAULT 'medium',
  recommended_fix text,
  status text DEFAULT 'open',
  is_test_data boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.social_calendar_gap_reviews ENABLE ROW LEVEL SECURITY;

-- Extend social_content_items
ALTER TABLE public.social_content_items
  ADD COLUMN IF NOT EXISTS calendar_id uuid,
  ADD COLUMN IF NOT EXISTS calendar_item_id uuid,
  ADD COLUMN IF NOT EXISTS planned_at timestamptz,
  ADD COLUMN IF NOT EXISTS calendar_status text DEFAULT 'not_scheduled';

-- Extend social_content_packs
ALTER TABLE public.social_content_packs
  ADD COLUMN IF NOT EXISTS calendar_id uuid,
  ADD COLUMN IF NOT EXISTS calendar_generation_status text DEFAULT 'not_generated';

-- RLS policies (founder/admin via has_role)
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'social_calendars',
    'social_calendar_items',
    'social_calendar_generation_runs',
    'social_calendar_cadence_rules',
    'social_calendar_gap_reviews'
  ]) LOOP
    EXECUTE format('DROP POLICY IF EXISTS "founder_admin_all_%s" ON public.%I;', t, t);
    EXECUTE format($p$
      CREATE POLICY "founder_admin_all_%s" ON public.%I
      FOR ALL TO authenticated
      USING (public.has_role(auth.uid(), 'founder'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role))
      WITH CHECK (public.has_role(auth.uid(), 'founder'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));
    $p$, t, t);
  END LOOP;
END $$;

-- updated_at triggers
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'social_calendars',
    'social_calendar_items',
    'social_calendar_generation_runs',
    'social_calendar_cadence_rules',
    'social_calendar_gap_reviews'
  ]) LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS set_updated_at_%s ON public.%I;', t, t);
    EXECUTE format('CREATE TRIGGER set_updated_at_%s BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();', t, t);
  END LOOP;
END $$;
