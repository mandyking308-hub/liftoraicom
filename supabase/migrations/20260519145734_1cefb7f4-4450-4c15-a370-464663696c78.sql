
-- 1. longform_content_strategies
CREATE TABLE IF NOT EXISTS public.longform_content_strategies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  strategy_name text NOT NULL,
  strategy_type text NOT NULL,
  strategy_status text DEFAULT 'draft',
  target_audience text,
  primary_goal text,
  content_pillars text[] DEFAULT '{}',
  priority_topics text[] DEFAULT '{}',
  buyer_journey_stage text,
  linked_campaign_plan_id uuid REFERENCES public.social_campaign_plans(id) ON DELETE SET NULL,
  linked_funnel_strategy_id uuid REFERENCES public.website_funnel_strategies(id) ON DELETE SET NULL,
  linked_revenue_target_id uuid,
  linked_market_signal_id uuid,
  linked_learning_signal_id uuid,
  linked_engagement_signal_id uuid,
  publishing_destination text,
  cadence_recommendation text,
  proof_required text[] DEFAULT '{}',
  missing_proof text[] DEFAULT '{}',
  risk_warnings text[] DEFAULT '{}',
  founder_notes text,
  approval_status text DEFAULT 'draft',
  readiness_score integer DEFAULT 0,
  is_test_data boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.longform_content_strategies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "longform_strategies_founder_all" ON public.longform_content_strategies
  FOR ALL USING (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'));

-- 2. seo_content_briefs
CREATE TABLE IF NOT EXISTS public.seo_content_briefs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  strategy_id uuid REFERENCES public.longform_content_strategies(id) ON DELETE SET NULL,
  brief_name text NOT NULL,
  brief_status text DEFAULT 'draft',
  topic text NOT NULL,
  target_keyword text,
  secondary_keywords text[] DEFAULT '{}',
  search_intent text,
  target_audience text,
  article_type text,
  suggested_title text,
  suggested_slug text,
  meta_title text,
  meta_description text,
  outline jsonb DEFAULT '[]'::jsonb,
  internal_links_needed text[] DEFAULT '{}',
  external_sources_needed text[] DEFAULT '{}',
  proof_required text[] DEFAULT '{}',
  missing_proof text[] DEFAULT '{}',
  claims_to_verify text[] DEFAULT '{}',
  compliance_warnings text[] DEFAULT '{}',
  risk_flags text[] DEFAULT '{}',
  confidence_score integer DEFAULT 0,
  founder_approval_review_id uuid,
  approval_status text DEFAULT 'draft',
  is_test_data boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.seo_content_briefs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "seo_briefs_founder_all" ON public.seo_content_briefs
  FOR ALL USING (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'));

-- 3. longform_content_drafts
CREATE TABLE IF NOT EXISTS public.longform_content_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  strategy_id uuid REFERENCES public.longform_content_strategies(id) ON DELETE SET NULL,
  seo_brief_id uuid REFERENCES public.seo_content_briefs(id) ON DELETE SET NULL,
  campaign_plan_id uuid REFERENCES public.social_campaign_plans(id) ON DELETE SET NULL,
  funnel_strategy_id uuid REFERENCES public.website_funnel_strategies(id) ON DELETE SET NULL,
  lead_magnet_id uuid REFERENCES public.lead_magnet_assets(id) ON DELETE SET NULL,
  draft_title text NOT NULL,
  draft_type text NOT NULL,
  draft_status text DEFAULT 'draft',
  target_audience text,
  primary_goal text,
  draft_body text,
  excerpt text,
  meta_title text,
  meta_description text,
  suggested_slug text,
  suggested_cta text,
  suggested_destination_url text,
  section_json jsonb DEFAULT '[]'::jsonb,
  faq_json jsonb DEFAULT '[]'::jsonb,
  source_notes text,
  evidence_notes text,
  claims_to_verify text[] DEFAULT '{}',
  unsupported_claims text[] DEFAULT '{}',
  proof_placeholders text[] DEFAULT '{}',
  compliance_warnings text[] DEFAULT '{}',
  copy_risk_flags text[] DEFAULT '{}',
  originality_notes text,
  founder_approval_review_id uuid,
  approval_status text DEFAULT 'draft',
  manual_export_status text DEFAULT 'not_exported',
  external_publish_status text DEFAULT 'not_published',
  is_test_data boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.longform_content_drafts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "longform_drafts_founder_all" ON public.longform_content_drafts
  FOR ALL USING (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'));

-- 4. newsletter_sequence_plans
CREATE TABLE IF NOT EXISTS public.newsletter_sequence_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  strategy_id uuid REFERENCES public.longform_content_strategies(id) ON DELETE SET NULL,
  sequence_name text NOT NULL,
  sequence_type text NOT NULL,
  sequence_status text DEFAULT 'draft',
  target_audience text,
  sequence_goal text,
  linked_funnel_strategy_id uuid REFERENCES public.website_funnel_strategies(id) ON DELETE SET NULL,
  linked_lead_magnet_id uuid REFERENCES public.lead_magnet_assets(id) ON DELETE SET NULL,
  email_count integer DEFAULT 0,
  cadence_notes text,
  sequence_outline jsonb DEFAULT '[]'::jsonb,
  compliance_warnings text[] DEFAULT '{}',
  risk_flags text[] DEFAULT '{}',
  founder_notes text,
  approval_status text DEFAULT 'draft',
  is_test_data boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.newsletter_sequence_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "newsletter_sequences_founder_all" ON public.newsletter_sequence_plans
  FOR ALL USING (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'));

-- 5. longform_repurposing_maps
CREATE TABLE IF NOT EXISTS public.longform_repurposing_maps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  source_draft_id uuid REFERENCES public.longform_content_drafts(id) ON DELETE CASCADE,
  map_name text NOT NULL,
  map_status text DEFAULT 'draft',
  target_outputs text[] DEFAULT '{}',
  social_content_pack_id uuid REFERENCES public.social_content_packs(id) ON DELETE SET NULL,
  campaign_plan_id uuid REFERENCES public.social_campaign_plans(id) ON DELETE SET NULL,
  funnel_strategy_id uuid REFERENCES public.website_funnel_strategies(id) ON DELETE SET NULL,
  repurposing_plan jsonb DEFAULT '[]'::jsonb,
  generated_social_items integer DEFAULT 0,
  generated_newsletter_items integer DEFAULT 0,
  generated_funnel_items integer DEFAULT 0,
  founder_review_required boolean DEFAULT true,
  approval_status text DEFAULT 'draft',
  is_test_data boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.longform_repurposing_maps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "longform_repurposing_founder_all" ON public.longform_repurposing_maps
  FOR ALL USING (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'));

-- 6. longform_content_gap_reviews
CREATE TABLE IF NOT EXISTS public.longform_content_gap_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  strategy_id uuid REFERENCES public.longform_content_strategies(id) ON DELETE CASCADE,
  gap_type text NOT NULL,
  gap_description text NOT NULL,
  severity text DEFAULT 'medium',
  recommended_fix text,
  linked_engagement_event_id uuid REFERENCES public.social_engagement_events(id) ON DELETE SET NULL,
  linked_market_signal_id uuid REFERENCES public.social_market_learning_signals(id) ON DELETE SET NULL,
  linked_funnel_gap_id uuid REFERENCES public.website_funnel_gap_reviews(id) ON DELETE SET NULL,
  status text DEFAULT 'open',
  is_test_data boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.longform_content_gap_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "longform_gaps_founder_all" ON public.longform_content_gap_reviews
  FOR ALL USING (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'));

-- 7. longform_manual_export_packs
CREATE TABLE IF NOT EXISTS public.longform_manual_export_packs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  export_name text NOT NULL,
  export_type text NOT NULL,
  export_status text DEFAULT 'draft',
  draft_id uuid REFERENCES public.longform_content_drafts(id) ON DELETE SET NULL,
  sequence_id uuid REFERENCES public.newsletter_sequence_plans(id) ON DELETE SET NULL,
  export_payload jsonb DEFAULT '{}'::jsonb,
  copy_blocks jsonb DEFAULT '[]'::jsonb,
  operator_instructions text,
  cms_instructions text,
  newsletter_tool_instructions text,
  validation_status text DEFAULT 'not_checked',
  validation_errors text[] DEFAULT '{}',
  validation_warnings text[] DEFAULT '{}',
  confirmed_external_at timestamptz,
  confirmed_external_by text,
  is_test_data boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.longform_manual_export_packs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "longform_exports_founder_all" ON public.longform_manual_export_packs
  FOR ALL USING (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'));

-- 8. longform_content_audit
CREATE TABLE IF NOT EXISTS public.longform_content_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  strategy_id uuid REFERENCES public.longform_content_strategies(id) ON DELETE SET NULL,
  seo_brief_id uuid REFERENCES public.seo_content_briefs(id) ON DELETE SET NULL,
  draft_id uuid REFERENCES public.longform_content_drafts(id) ON DELETE SET NULL,
  sequence_id uuid REFERENCES public.newsletter_sequence_plans(id) ON DELETE SET NULL,
  repurposing_map_id uuid REFERENCES public.longform_repurposing_maps(id) ON DELETE SET NULL,
  export_pack_id uuid REFERENCES public.longform_manual_export_packs(id) ON DELETE SET NULL,
  action text NOT NULL,
  action_status text DEFAULT 'recorded',
  before_json jsonb DEFAULT '{}'::jsonb,
  after_json jsonb DEFAULT '{}'::jsonb,
  result_json jsonb DEFAULT '{}'::jsonb,
  external_api_calls integer DEFAULT 0,
  pages_published integer DEFAULT 0,
  newsletters_sent integer DEFAULT 0,
  emails_sent integer DEFAULT 0,
  scraped_pages integer DEFAULT 0,
  fake_metrics_created integer DEFAULT 0,
  error_message text,
  created_by text,
  is_test_data boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.longform_content_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "longform_audit_founder_all" ON public.longform_content_audit
  FOR ALL USING (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'));

-- Extensions
ALTER TABLE public.social_campaign_plans
  ADD COLUMN IF NOT EXISTS longform_strategy_id uuid,
  ADD COLUMN IF NOT EXISTS blog_draft_id uuid,
  ADD COLUMN IF NOT EXISTS newsletter_sequence_id uuid,
  ADD COLUMN IF NOT EXISTS longform_status text DEFAULT 'not_configured';

ALTER TABLE public.website_funnel_strategies
  ADD COLUMN IF NOT EXISTS longform_strategy_id uuid,
  ADD COLUMN IF NOT EXISTS supporting_blog_draft_id uuid,
  ADD COLUMN IF NOT EXISTS newsletter_sequence_id uuid;

ALTER TABLE public.lead_magnet_assets
  ADD COLUMN IF NOT EXISTS longform_draft_id uuid,
  ADD COLUMN IF NOT EXISTS supporting_newsletter_sequence_id uuid;

ALTER TABLE public.social_content_items
  ADD COLUMN IF NOT EXISTS source_longform_draft_id uuid,
  ADD COLUMN IF NOT EXISTS repurposed_from_longform boolean DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_longform_strategies_business ON public.longform_content_strategies(business_id);
CREATE INDEX IF NOT EXISTS idx_seo_briefs_business ON public.seo_content_briefs(business_id);
CREATE INDEX IF NOT EXISTS idx_longform_drafts_business ON public.longform_content_drafts(business_id);
CREATE INDEX IF NOT EXISTS idx_newsletter_sequences_business ON public.newsletter_sequence_plans(business_id);
CREATE INDEX IF NOT EXISTS idx_longform_repurposing_business ON public.longform_repurposing_maps(business_id);
CREATE INDEX IF NOT EXISTS idx_longform_gaps_business ON public.longform_content_gap_reviews(business_id);
CREATE INDEX IF NOT EXISTS idx_longform_exports_business ON public.longform_manual_export_packs(business_id);
CREATE INDEX IF NOT EXISTS idx_longform_audit_business ON public.longform_content_audit(business_id);
