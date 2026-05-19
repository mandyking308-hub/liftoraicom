-- ============================================================
-- Social Asset Library — Prompt 4
-- ============================================================

-- 1) Extend social_assets safely
ALTER TABLE public.social_assets
  ADD COLUMN IF NOT EXISTS asset_category text NULL,
  ADD COLUMN IF NOT EXISTS asset_subtype text NULL,
  ADD COLUMN IF NOT EXISTS owner_name text NULL,
  ADD COLUMN IF NOT EXISTS licence_reference text NULL,
  ADD COLUMN IF NOT EXISTS licence_document_url text NULL,
  ADD COLUMN IF NOT EXISTS consent_required boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS consent_status text NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS public_use_allowed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS commercial_use_allowed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS paid_ads_allowed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS derivative_use_allowed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS territory_limitations text NULL,
  ADD COLUMN IF NOT EXISTS platform_limitations text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS expiry_review_required boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS founder_review_required boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS legal_review_required boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS usage_notes text NULL,
  ADD COLUMN IF NOT EXISTS alt_text text NULL,
  ADD COLUMN IF NOT EXISTS transcript text NULL,
  ADD COLUMN IF NOT EXISTS searchable_text text NULL;

-- 2) New tables

CREATE TABLE IF NOT EXISTS public.social_asset_usage_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  asset_id uuid NOT NULL REFERENCES public.social_assets(id) ON DELETE CASCADE,
  content_item_id uuid NULL REFERENCES public.social_content_items(id) ON DELETE SET NULL,
  publish_job_id uuid NULL REFERENCES public.social_publish_jobs(id) ON DELETE SET NULL,
  usage_context text NOT NULL,
  platform text NULL,
  campaign_id uuid NULL,
  used_at timestamptz NOT NULL DEFAULT now(),
  usage_status text NOT NULL DEFAULT 'planned',
  notes text NULL,
  is_test_data boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT saul_ctx_chk CHECK (usage_context IN
    ('content_draft','calendar_plan','publish_job','ad_draft','proposal','landing_page','lead_magnet','email_newsletter','support_article','other')),
  CONSTRAINT saul_status_chk CHECK (usage_status IN
    ('planned','used','cancelled','blocked','retired'))
);
CREATE INDEX IF NOT EXISTS saul_business_idx ON public.social_asset_usage_log(business_id);
CREATE INDEX IF NOT EXISTS saul_asset_idx ON public.social_asset_usage_log(asset_id);

CREATE TABLE IF NOT EXISTS public.social_asset_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  requirement_name text NOT NULL,
  asset_type text NOT NULL,
  platform text NULL,
  campaign_id uuid NULL,
  required_for text NOT NULL,
  priority text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'missing',
  matched_asset_id uuid NULL REFERENCES public.social_assets(id) ON DELETE SET NULL,
  due_date date NULL,
  notes text NULL,
  is_test_data boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sar_for_chk CHECK (required_for IN
    ('profile_setup','content_pack','calendar','campaign','lead_magnet','proposal','landing_page','ads','onboarding','support','proof','other')),
  CONSTRAINT sar_pri_chk CHECK (priority IN ('low','medium','high','critical')),
  CONSTRAINT sar_status_chk CHECK (status IN ('missing','partially_met','met','blocked','not_required','archived'))
);
CREATE INDEX IF NOT EXISTS sar_business_idx ON public.social_asset_requirements(business_id);

CREATE TABLE IF NOT EXISTS public.social_asset_rights_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  asset_id uuid NOT NULL REFERENCES public.social_assets(id) ON DELETE CASCADE,
  review_status text NOT NULL DEFAULT 'pending',
  rights_status_before text NULL,
  rights_status_after text NULL,
  public_use_allowed boolean NULL,
  commercial_use_allowed boolean NULL,
  paid_ads_allowed boolean NULL,
  derivative_use_allowed boolean NULL,
  consent_status text NULL,
  review_notes text NULL,
  reviewed_by text NULL,
  reviewed_at timestamptz NULL,
  legal_review_required boolean NOT NULL DEFAULT false,
  founder_review_required boolean NOT NULL DEFAULT true,
  is_test_data boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sarr_status_chk CHECK (review_status IN
    ('pending','approved','approved_limited','rejected','legal_review','expired','archived'))
);
CREATE INDEX IF NOT EXISTS sarr_business_idx ON public.social_asset_rights_reviews(business_id);
CREATE INDEX IF NOT EXISTS sarr_asset_idx ON public.social_asset_rights_reviews(asset_id);

CREATE TABLE IF NOT EXISTS public.social_asset_collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  collection_name text NOT NULL,
  collection_type text NOT NULL DEFAULT 'general',
  description text NULL,
  platform text NULL,
  campaign_id uuid NULL,
  approval_status text NOT NULL DEFAULT 'draft',
  is_test_data boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sac_type_chk CHECK (collection_type IN
    ('brand_kit','campaign_pack','social_pack','content_pillar_pack','product_pack','music_release_pack','founder_pack','proof_pack','lead_magnet_pack','general','other')),
  CONSTRAINT sac_appr_chk CHECK (approval_status IN ('draft','needs_review','approved','rejected','archived'))
);
CREATE INDEX IF NOT EXISTS sac_business_idx ON public.social_asset_collections(business_id);

CREATE TABLE IF NOT EXISTS public.social_asset_collection_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  collection_id uuid NOT NULL REFERENCES public.social_asset_collections(id) ON DELETE CASCADE,
  asset_id uuid NOT NULL REFERENCES public.social_assets(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  notes text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS saci_uniq ON public.social_asset_collection_items(collection_id, asset_id);
CREATE INDEX IF NOT EXISTS saci_business_idx ON public.social_asset_collection_items(business_id);

CREATE TABLE IF NOT EXISTS public.social_hook_caption_bank (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  bank_type text NOT NULL,
  text_value text NOT NULL,
  platform text NULL,
  content_pillar_id uuid NULL,
  offer_mapping_id uuid NULL,
  tone text NULL,
  approval_status text NOT NULL DEFAULT 'draft',
  performance_score numeric NULL,
  usage_count integer NOT NULL DEFAULT 0,
  last_used_at timestamptz NULL,
  notes text NULL,
  is_test_data boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT shcb_type_chk CHECK (bank_type IN
    ('hook','caption','cta','hashtag_set','opening_line','closing_line','comment_reply','dm_reply','headline','other')),
  CONSTRAINT shcb_appr_chk CHECK (approval_status IN ('draft','needs_review','approved','rejected','retired'))
);
CREATE INDEX IF NOT EXISTS shcb_business_idx ON public.social_hook_caption_bank(business_id);

-- updated_at triggers
CREATE TRIGGER saul_updated BEFORE UPDATE ON public.social_asset_usage_log
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER sar_updated BEFORE UPDATE ON public.social_asset_requirements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER sarr_updated BEFORE UPDATE ON public.social_asset_rights_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER sac_updated BEFORE UPDATE ON public.social_asset_collections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER shcb_updated BEFORE UPDATE ON public.social_hook_caption_bank
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.social_asset_usage_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_asset_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_asset_rights_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_asset_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_asset_collection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_hook_caption_bank ENABLE ROW LEVEL SECURITY;

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY[
    'social_asset_usage_log',
    'social_asset_requirements',
    'social_asset_rights_reviews',
    'social_asset_collections',
    'social_asset_collection_items',
    'social_hook_caption_bank'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "%1$s_founder_all" ON public.%1$s', t);
    EXECUTE format($p$CREATE POLICY "%1$s_founder_all" ON public.%1$s
      FOR ALL TO authenticated
      USING (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'))
      WITH CHECK (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'))$p$, t);
  END LOOP;
END $$;