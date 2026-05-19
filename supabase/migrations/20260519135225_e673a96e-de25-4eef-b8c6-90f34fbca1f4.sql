
-- Extend social_engagement_events
ALTER TABLE public.social_engagement_events
  ADD COLUMN IF NOT EXISTS platform text,
  ADD COLUMN IF NOT EXISTS provider text,
  ADD COLUMN IF NOT EXISTS event_status text NOT NULL DEFAULT 'captured',
  ADD COLUMN IF NOT EXISTS source_type text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS external_thread_id text,
  ADD COLUMN IF NOT EXISTS external_user_id text,
  ADD COLUMN IF NOT EXISTS social_handle text,
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS message_url text,
  ADD COLUMN IF NOT EXISTS media_url text,
  ADD COLUMN IF NOT EXISTS parent_post_id text,
  ADD COLUMN IF NOT EXISTS parent_post_url text,
  ADD COLUMN IF NOT EXISTS content_item_id uuid REFERENCES public.social_content_items(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS calendar_item_id uuid REFERENCES public.social_calendar_items(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS campaign_plan_id uuid REFERENCES public.social_campaign_plans(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS keyword_rule_id uuid REFERENCES public.social_keyword_trigger_rules(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS dm_flow_id uuid REFERENCES public.social_dm_flow_blueprints(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS detected_keyword text,
  ADD COLUMN IF NOT EXISTS intent text,
  ADD COLUMN IF NOT EXISTS urgency text NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS risk_level text NOT NULL DEFAULT 'low',
  ADD COLUMN IF NOT EXISTS crm_match_status text NOT NULL DEFAULT 'unmatched',
  ADD COLUMN IF NOT EXISTS ai_reply_allowed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS external_reply_allowed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS handled_by_agent text,
  ADD COLUMN IF NOT EXISTS handled_at timestamptz,
  ADD COLUMN IF NOT EXISTS is_test_data boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Backfill platform from platform_key when missing
UPDATE public.social_engagement_events SET platform = platform_key WHERE platform IS NULL;

-- Classifications
CREATE TABLE IF NOT EXISTS public.social_engagement_classifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  engagement_event_id uuid NOT NULL REFERENCES public.social_engagement_events(id) ON DELETE CASCADE,
  classification_status text NOT NULL DEFAULT 'draft',
  detected_intent text,
  detected_sentiment text,
  detected_language text,
  detected_keyword text,
  detected_customer_stage text,
  detected_value_signal text,
  detected_risk_flags text[] NOT NULL DEFAULT '{}',
  detected_opportunities text[] NOT NULL DEFAULT '{}',
  recommended_agent text,
  recommended_next_action text,
  confidence_score integer NOT NULL DEFAULT 0,
  founder_review_required boolean NOT NULL DEFAULT true,
  compliance_review_required boolean NOT NULL DEFAULT false,
  support_review_required boolean NOT NULL DEFAULT false,
  customer_success_review_required boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_test_data boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.social_engagement_crm_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  engagement_event_id uuid NOT NULL REFERENCES public.social_engagement_events(id) ON DELETE CASCADE,
  crm_contact_id uuid,
  match_status text NOT NULL DEFAULT 'unmatched',
  match_confidence integer NOT NULL DEFAULT 0,
  match_reason text,
  matched_fields text[] NOT NULL DEFAULT '{}',
  founder_review_required boolean NOT NULL DEFAULT true,
  applied_to_crm boolean NOT NULL DEFAULT false,
  applied_at timestamptz,
  is_test_data boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.social_engagement_reply_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  engagement_event_id uuid NOT NULL REFERENCES public.social_engagement_events(id) ON DELETE CASCADE,
  classification_id uuid REFERENCES public.social_engagement_classifications(id) ON DELETE SET NULL,
  draft_type text NOT NULL,
  draft_status text NOT NULL DEFAULT 'draft',
  platform text NOT NULL,
  reply_channel text NOT NULL,
  draft_text text NOT NULL,
  suggested_tone text,
  linked_flow_id uuid REFERENCES public.social_dm_flow_blueprints(id) ON DELETE SET NULL,
  linked_keyword_rule_id uuid REFERENCES public.social_keyword_trigger_rules(id) ON DELETE SET NULL,
  risk_flags text[] NOT NULL DEFAULT '{}',
  compliance_warnings text[] NOT NULL DEFAULT '{}',
  founder_approval_review_id uuid,
  founder_review_required boolean NOT NULL DEFAULT true,
  external_send_allowed boolean NOT NULL DEFAULT false,
  is_test_data boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.social_engagement_escalations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  engagement_event_id uuid NOT NULL REFERENCES public.social_engagement_events(id) ON DELETE CASCADE,
  escalation_type text NOT NULL,
  escalation_status text NOT NULL DEFAULT 'open',
  assigned_agent text,
  assigned_to text,
  priority text NOT NULL DEFAULT 'normal',
  reason text,
  recommended_action text,
  linked_customer_success_item_id uuid,
  linked_support_item_id uuid,
  linked_complaint_id uuid,
  linked_winback_item_id uuid,
  founder_review_required boolean NOT NULL DEFAULT true,
  resolved_at timestamptz,
  resolution_notes text,
  is_test_data boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.social_engagement_import_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  import_name text NOT NULL,
  import_type text NOT NULL DEFAULT 'manual',
  import_status text NOT NULL DEFAULT 'draft',
  platform text,
  row_count integer NOT NULL DEFAULT 0,
  imported_count integer NOT NULL DEFAULT 0,
  blocked_count integer NOT NULL DEFAULT 0,
  duplicate_count integer NOT NULL DEFAULT 0,
  validation_errors text[] NOT NULL DEFAULT '{}',
  validation_warnings text[] NOT NULL DEFAULT '{}',
  source_notes text,
  is_test_data boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.social_engagement_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  engagement_event_id uuid REFERENCES public.social_engagement_events(id) ON DELETE SET NULL,
  import_batch_id uuid REFERENCES public.social_engagement_import_batches(id) ON DELETE SET NULL,
  action text NOT NULL,
  action_status text NOT NULL DEFAULT 'recorded',
  before_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  after_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  result_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  provider_calls integer NOT NULL DEFAULT 0,
  dms_sent integer NOT NULL DEFAULT 0,
  comments_sent integer NOT NULL DEFAULT 0,
  crm_records_created integer NOT NULL DEFAULT 0,
  external_actions integer NOT NULL DEFAULT 0,
  error_message text,
  created_by text,
  is_test_data boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Extend related tables with engagement counters
ALTER TABLE public.social_keyword_trigger_rules
  ADD COLUMN IF NOT EXISTS engagement_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_engagement_at timestamptz;
ALTER TABLE public.social_dm_flow_blueprints
  ADD COLUMN IF NOT EXISTS engagement_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_engagement_at timestamptz;
ALTER TABLE public.social_content_items
  ADD COLUMN IF NOT EXISTS social_engagement_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_social_engagement_at timestamptz;
ALTER TABLE public.social_calendar_items
  ADD COLUMN IF NOT EXISTS social_engagement_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_social_engagement_at timestamptz;

-- Enable RLS and policies
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'social_engagement_classifications',
    'social_engagement_crm_matches',
    'social_engagement_reply_drafts',
    'social_engagement_escalations',
    'social_engagement_import_batches',
    'social_engagement_audit'
  ]) LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format($p$
      DROP POLICY IF EXISTS "founder_admin_read_%1$s" ON public.%1$I;
      CREATE POLICY "founder_admin_read_%1$s" ON public.%1$I FOR SELECT TO authenticated
        USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'founder'::app_role));
      DROP POLICY IF EXISTS "founder_admin_write_%1$s" ON public.%1$I;
      CREATE POLICY "founder_admin_write_%1$s" ON public.%1$I FOR ALL TO authenticated
        USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'founder'::app_role))
        WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'founder'::app_role));
    $p$, t);
  END LOOP;
END $$;

-- updated_at trigger
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname='update_updated_at_column') THEN
    CREATE FUNCTION public.update_updated_at_column() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $f$
    BEGIN NEW.updated_at = now(); RETURN NEW; END; $f$;
  END IF;
END $$;

DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'social_engagement_classifications',
    'social_engagement_crm_matches',
    'social_engagement_reply_drafts',
    'social_engagement_escalations',
    'social_engagement_import_batches'
  ]) LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%1$s_updated_at ON public.%1$I;', t);
    EXECUTE format('CREATE TRIGGER trg_%1$s_updated_at BEFORE UPDATE ON public.%1$I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();', t);
  END LOOP;
END $$;

CREATE INDEX IF NOT EXISTS idx_see_business_status ON public.social_engagement_events(business_id, event_status);
CREATE INDEX IF NOT EXISTS idx_sec_business ON public.social_engagement_classifications(business_id, engagement_event_id);
CREATE INDEX IF NOT EXISTS idx_secrm_business ON public.social_engagement_crm_matches(business_id, engagement_event_id);
CREATE INDEX IF NOT EXISTS idx_serd_business ON public.social_engagement_reply_drafts(business_id, engagement_event_id);
CREATE INDEX IF NOT EXISTS idx_sees_business ON public.social_engagement_escalations(business_id, engagement_event_id);
CREATE INDEX IF NOT EXISTS idx_seib_business ON public.social_engagement_import_batches(business_id);
CREATE INDEX IF NOT EXISTS idx_sea_business ON public.social_engagement_audit(business_id, created_at DESC);
