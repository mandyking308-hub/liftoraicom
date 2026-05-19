
-- Helper: founder/admin check assumed via has_role()

-- 1. Extend existing support_knowledge_articles (additive)
ALTER TABLE public.support_knowledge_articles
  ADD COLUMN IF NOT EXISTS source_id uuid,
  ADD COLUMN IF NOT EXISTS article_title text,
  ADD COLUMN IF NOT EXISTS article_status text DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS customer_question text,
  ADD COLUMN IF NOT EXISTS short_answer text,
  ADD COLUMN IF NOT EXISTS full_answer text,
  ADD COLUMN IF NOT EXISTS step_by_step jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS related_faq_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS source_references text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS missing_source_flags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS compliance_warnings text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS risk_flags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS founder_approval_review_id uuid,
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS publish_status text NOT NULL DEFAULT 'not_published',
  ADD COLUMN IF NOT EXISTS is_test_data boolean NOT NULL DEFAULT false;

-- 2. support_knowledge_sources
CREATE TABLE IF NOT EXISTS public.support_knowledge_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  source_name text NOT NULL,
  source_type text NOT NULL,
  source_status text NOT NULL DEFAULT 'draft',
  source_url text,
  source_text text,
  source_summary text,
  source_category text,
  reliability_level text NOT NULL DEFAULT 'unreviewed',
  freshness_status text NOT NULL DEFAULT 'unknown',
  approved_for_support boolean NOT NULL DEFAULT false,
  approved_by text,
  approved_at timestamptz,
  review_notes text,
  risk_flags text[] NOT NULL DEFAULT '{}',
  is_test_data boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. support_faq_items
CREATE TABLE IF NOT EXISTS public.support_faq_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  source_id uuid REFERENCES public.support_knowledge_sources(id) ON DELETE SET NULL,
  question text NOT NULL,
  answer text,
  faq_category text,
  faq_status text NOT NULL DEFAULT 'draft',
  source_references text[] NOT NULL DEFAULT '{}',
  missing_source_flags text[] NOT NULL DEFAULT '{}',
  risk_flags text[] NOT NULL DEFAULT '{}',
  compliance_warnings text[] NOT NULL DEFAULT '{}',
  founder_review_required boolean NOT NULL DEFAULT true,
  approval_status text NOT NULL DEFAULT 'draft',
  display_order integer NOT NULL DEFAULT 0,
  is_test_data boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4. support_question_intake
CREATE TABLE IF NOT EXISTS public.support_question_intake (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  source_channel text NOT NULL DEFAULT 'manual',
  source_event_id uuid,
  crm_contact_id uuid,
  conversation_id uuid,
  customer_name text,
  customer_email text,
  customer_handle text,
  question_text text NOT NULL,
  question_status text NOT NULL DEFAULT 'captured',
  detected_language text NOT NULL DEFAULT 'en',
  detected_intent text,
  detected_category text,
  sentiment text NOT NULL DEFAULT 'unknown',
  urgency text NOT NULL DEFAULT 'normal',
  risk_level text NOT NULL DEFAULT 'low',
  crm_match_status text NOT NULL DEFAULT 'unmatched',
  source_truth_status text NOT NULL DEFAULT 'not_checked',
  answerable_from_kb boolean NOT NULL DEFAULT false,
  founder_review_required boolean NOT NULL DEFAULT true,
  is_test_data boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 5. support_reply_drafts
CREATE TABLE IF NOT EXISTS public.support_reply_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  question_intake_id uuid REFERENCES public.support_question_intake(id) ON DELETE CASCADE,
  crm_contact_id uuid,
  conversation_id uuid,
  reply_type text NOT NULL,
  reply_status text NOT NULL DEFAULT 'draft',
  reply_channel text NOT NULL DEFAULT 'manual',
  subject_line text,
  reply_body text NOT NULL,
  source_references text[] NOT NULL DEFAULT '{}',
  missing_source_flags text[] NOT NULL DEFAULT '{}',
  compliance_warnings text[] NOT NULL DEFAULT '{}',
  risk_flags text[] NOT NULL DEFAULT '{}',
  tone_notes text,
  founder_approval_review_id uuid,
  founder_review_required boolean NOT NULL DEFAULT true,
  external_send_allowed boolean NOT NULL DEFAULT false,
  is_test_data boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 6. support_triage_reviews
CREATE TABLE IF NOT EXISTS public.support_triage_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  question_intake_id uuid NOT NULL REFERENCES public.support_question_intake(id) ON DELETE CASCADE,
  triage_status text NOT NULL DEFAULT 'draft',
  category text,
  intent text,
  urgency text NOT NULL DEFAULT 'normal',
  risk_level text NOT NULL DEFAULT 'low',
  recommended_agent text,
  recommended_next_action text,
  kb_match_article_id uuid REFERENCES public.support_knowledge_articles(id) ON DELETE SET NULL,
  kb_match_faq_id uuid REFERENCES public.support_faq_items(id) ON DELETE SET NULL,
  source_truth_status text NOT NULL DEFAULT 'not_checked',
  confidence_score integer NOT NULL DEFAULT 0,
  founder_review_required boolean NOT NULL DEFAULT true,
  compliance_review_required boolean NOT NULL DEFAULT false,
  legal_review_required boolean NOT NULL DEFAULT false,
  customer_success_review_required boolean NOT NULL DEFAULT false,
  is_test_data boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 7. support_escalations
CREATE TABLE IF NOT EXISTS public.support_escalations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  question_intake_id uuid REFERENCES public.support_question_intake(id) ON DELETE CASCADE,
  escalation_type text NOT NULL,
  escalation_status text NOT NULL DEFAULT 'open',
  assigned_agent text,
  assigned_to text,
  priority text NOT NULL DEFAULT 'normal',
  reason text,
  recommended_action text,
  due_at timestamptz,
  resolved_at timestamptz,
  resolution_notes text,
  founder_review_required boolean NOT NULL DEFAULT true,
  is_test_data boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 8. support_quality_reviews
CREATE TABLE IF NOT EXISTS public.support_quality_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  reply_draft_id uuid REFERENCES public.support_reply_drafts(id) ON DELETE CASCADE,
  article_id uuid REFERENCES public.support_knowledge_articles(id) ON DELETE CASCADE,
  faq_id uuid REFERENCES public.support_faq_items(id) ON DELETE CASCADE,
  review_status text NOT NULL DEFAULT 'draft',
  grounding_score integer NOT NULL DEFAULT 0,
  tone_score integer NOT NULL DEFAULT 0,
  clarity_score integer NOT NULL DEFAULT 0,
  compliance_score integer NOT NULL DEFAULT 0,
  source_truth_score integer NOT NULL DEFAULT 0,
  unsupported_claims text[] NOT NULL DEFAULT '{}',
  missing_sources text[] NOT NULL DEFAULT '{}',
  compliance_warnings text[] NOT NULL DEFAULT '{}',
  recommended_edits text[] NOT NULL DEFAULT '{}',
  passed_internal boolean NOT NULL DEFAULT false,
  founder_review_required boolean NOT NULL DEFAULT true,
  is_test_data boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 9. support_manual_export_packs
CREATE TABLE IF NOT EXISTS public.support_manual_export_packs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  export_name text NOT NULL,
  export_type text NOT NULL,
  export_status text NOT NULL DEFAULT 'draft',
  article_ids uuid[] NOT NULL DEFAULT '{}',
  faq_ids uuid[] NOT NULL DEFAULT '{}',
  export_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  operator_instructions text,
  helpcentre_instructions text,
  validation_status text NOT NULL DEFAULT 'not_checked',
  validation_errors text[] NOT NULL DEFAULT '{}',
  validation_warnings text[] NOT NULL DEFAULT '{}',
  confirmed_external_at timestamptz,
  confirmed_external_by text,
  is_test_data boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 10. support_audit
CREATE TABLE IF NOT EXISTS public.support_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  source_id uuid REFERENCES public.support_knowledge_sources(id) ON DELETE SET NULL,
  article_id uuid REFERENCES public.support_knowledge_articles(id) ON DELETE SET NULL,
  faq_id uuid REFERENCES public.support_faq_items(id) ON DELETE SET NULL,
  question_intake_id uuid REFERENCES public.support_question_intake(id) ON DELETE SET NULL,
  reply_draft_id uuid REFERENCES public.support_reply_drafts(id) ON DELETE SET NULL,
  escalation_id uuid REFERENCES public.support_escalations(id) ON DELETE SET NULL,
  export_pack_id uuid REFERENCES public.support_manual_export_packs(id) ON DELETE SET NULL,
  action text NOT NULL,
  action_status text NOT NULL DEFAULT 'recorded',
  before_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  after_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  result_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  external_api_calls integer NOT NULL DEFAULT 0,
  customer_replies_sent integer NOT NULL DEFAULT 0,
  live_chats_started integer NOT NULL DEFAULT 0,
  tickets_created_externally integer NOT NULL DEFAULT 0,
  fake_tickets_created integer NOT NULL DEFAULT 0,
  error_message text,
  created_by text,
  is_test_data boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Extend related tables (additive only, guarded with table existence)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='business_knowledge_sources') THEN
    ALTER TABLE public.business_knowledge_sources
      ADD COLUMN IF NOT EXISTS approved_for_support boolean NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS support_source_id uuid;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='social_engagement_events') THEN
    ALTER TABLE public.social_engagement_events
      ADD COLUMN IF NOT EXISTS support_question_intake_id uuid,
      ADD COLUMN IF NOT EXISTS support_triage_status text NOT NULL DEFAULT 'not_triaged';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='crm_interaction_ledger') THEN
    ALTER TABLE public.crm_interaction_ledger
      ADD COLUMN IF NOT EXISTS support_question_intake_id uuid,
      ADD COLUMN IF NOT EXISTS support_reply_draft_id uuid;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='customer_retention_scores') THEN
    ALTER TABLE public.customer_retention_scores
      ADD COLUMN IF NOT EXISTS support_risk_status text NOT NULL DEFAULT 'not_reviewed',
      ADD COLUMN IF NOT EXISTS open_support_escalations integer NOT NULL DEFAULT 0;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='longform_content_drafts') THEN
    ALTER TABLE public.longform_content_drafts
      ADD COLUMN IF NOT EXISTS support_article_id uuid,
      ADD COLUMN IF NOT EXISTS support_content_status text NOT NULL DEFAULT 'not_configured';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='website_funnel_strategies') THEN
    ALTER TABLE public.website_funnel_strategies
      ADD COLUMN IF NOT EXISTS support_path_status text NOT NULL DEFAULT 'not_reviewed';
  END IF;
END $$;

-- Enable RLS + founder/admin policies on all new tables
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'support_knowledge_sources','support_faq_items','support_question_intake',
    'support_reply_drafts','support_triage_reviews','support_escalations',
    'support_quality_reviews','support_manual_export_packs','support_audit'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format($p$DROP POLICY IF EXISTS "founders manage %1$s" ON public.%1$I$p$, t);
    EXECUTE format($p$CREATE POLICY "founders manage %1$s" ON public.%1$I FOR ALL TO authenticated USING (has_role(auth.uid(),'founder'::app_role) OR has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'founder'::app_role) OR has_role(auth.uid(),'admin'::app_role))$p$, t);
  END LOOP;
END $$;

-- updated_at triggers
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'support_knowledge_sources','support_faq_items','support_question_intake',
    'support_reply_drafts','support_triage_reviews','support_escalations',
    'support_quality_reviews','support_manual_export_packs'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%1$s_updated ON public.%1$I', t);
    EXECUTE format('CREATE TRIGGER trg_%1$s_updated BEFORE UPDATE ON public.%1$I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()', t);
  END LOOP;
END $$;

CREATE INDEX IF NOT EXISTS idx_sks_business ON public.support_knowledge_sources(business_id);
CREATE INDEX IF NOT EXISTS idx_sfi_business ON public.support_faq_items(business_id);
CREATE INDEX IF NOT EXISTS idx_sqi_business ON public.support_question_intake(business_id);
CREATE INDEX IF NOT EXISTS idx_srd_business ON public.support_reply_drafts(business_id);
CREATE INDEX IF NOT EXISTS idx_str_business ON public.support_triage_reviews(business_id);
CREATE INDEX IF NOT EXISTS idx_sesc_business ON public.support_escalations(business_id);
CREATE INDEX IF NOT EXISTS idx_sqr_business ON public.support_quality_reviews(business_id);
CREATE INDEX IF NOT EXISTS idx_smep_business ON public.support_manual_export_packs(business_id);
CREATE INDEX IF NOT EXISTS idx_saud_business ON public.support_audit(business_id);
