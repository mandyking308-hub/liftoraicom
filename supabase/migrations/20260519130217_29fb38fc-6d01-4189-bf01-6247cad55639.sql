
CREATE TABLE IF NOT EXISTS public.social_approval_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  review_type text NOT NULL,
  review_status text DEFAULT 'pending',
  priority text DEFAULT 'normal',
  title text,
  summary text,
  content_item_id uuid REFERENCES public.social_content_items(id) ON DELETE SET NULL,
  content_variant_id uuid REFERENCES public.social_content_variants(id) ON DELETE SET NULL,
  content_pack_id uuid REFERENCES public.social_content_packs(id) ON DELETE SET NULL,
  calendar_id uuid REFERENCES public.social_calendars(id) ON DELETE SET NULL,
  calendar_item_id uuid REFERENCES public.social_calendar_items(id) ON DELETE SET NULL,
  campaign_plan_id uuid REFERENCES public.social_campaign_plans(id) ON DELETE SET NULL,
  reply_job_id uuid REFERENCES public.social_reply_jobs(id) ON DELETE SET NULL,
  asset_id uuid REFERENCES public.social_assets(id) ON DELETE SET NULL,
  founder_approval_item_id uuid REFERENCES public.founder_approval_items(id) ON DELETE SET NULL,
  risk_level text DEFAULT 'low',
  asset_status text DEFAULT 'unknown',
  compliance_status text DEFAULT 'not_reviewed',
  rights_status text DEFAULT 'unknown',
  approval_blockers text[] DEFAULT '{}',
  recommended_decision text,
  founder_notes text,
  edit_request text,
  decision_by text,
  decided_at timestamptz,
  is_test_data boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.social_approval_reviews ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_sar_business_status ON public.social_approval_reviews(business_id, review_status);

CREATE TABLE IF NOT EXISTS public.social_approval_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  review_id uuid NOT NULL REFERENCES public.social_approval_reviews(id) ON DELETE CASCADE,
  decision text NOT NULL,
  decision_reason text,
  founder_notes text,
  before_json jsonb DEFAULT '{}'::jsonb,
  after_json jsonb DEFAULT '{}'::jsonb,
  decided_by text,
  decided_at timestamptz NOT NULL DEFAULT now(),
  is_test_data boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.social_approval_decisions ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.social_approval_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  batch_name text NOT NULL,
  batch_type text NOT NULL,
  batch_status text DEFAULT 'draft',
  item_count integer DEFAULT 0,
  approved_count integer DEFAULT 0,
  rejected_count integer DEFAULT 0,
  blocked_count integer DEFAULT 0,
  high_risk_count integer DEFAULT 0,
  critical_risk_count integer DEFAULT 0,
  confirmation_required boolean DEFAULT true,
  batch_notes text,
  is_test_data boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.social_approval_batches ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.social_approval_batch_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  batch_id uuid NOT NULL REFERENCES public.social_approval_batches(id) ON DELETE CASCADE,
  review_id uuid NOT NULL REFERENCES public.social_approval_reviews(id) ON DELETE CASCADE,
  sort_order integer DEFAULT 0,
  item_status text DEFAULT 'pending',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (batch_id, review_id)
);
ALTER TABLE public.social_approval_batch_items ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.social_approval_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  rule_name text NOT NULL,
  rule_type text NOT NULL,
  rule_status text DEFAULT 'active',
  applies_to text[] DEFAULT '{}',
  risk_threshold text DEFAULT 'medium',
  founder_approval_required boolean DEFAULT true,
  legal_review_required boolean DEFAULT false,
  auto_block_if_rights_unknown boolean DEFAULT true,
  auto_block_if_compliance_blocked boolean DEFAULT true,
  auto_block_if_asset_blocked boolean DEFAULT true,
  auto_block_if_claim_unverified boolean DEFAULT true,
  notes text,
  is_test_data boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.social_approval_rules ENABLE ROW LEVEL SECURITY;

-- extensions
ALTER TABLE public.social_content_items
  ADD COLUMN IF NOT EXISTS founder_approval_review_id uuid,
  ADD COLUMN IF NOT EXISTS approval_decision_at timestamptz,
  ADD COLUMN IF NOT EXISTS approval_decision_by text,
  ADD COLUMN IF NOT EXISTS approval_blockers text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS ready_for_queue_at timestamptz;

ALTER TABLE public.social_content_variants
  ADD COLUMN IF NOT EXISTS founder_approval_review_id uuid,
  ADD COLUMN IF NOT EXISTS approval_decision_at timestamptz,
  ADD COLUMN IF NOT EXISTS approval_blockers text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS ready_for_queue_at timestamptz;

ALTER TABLE public.social_content_packs
  ADD COLUMN IF NOT EXISTS founder_approval_review_id uuid,
  ADD COLUMN IF NOT EXISTS approval_decision_at timestamptz,
  ADD COLUMN IF NOT EXISTS approval_blockers text[] DEFAULT '{}';

ALTER TABLE public.social_calendar_items
  ADD COLUMN IF NOT EXISTS founder_approval_review_id uuid,
  ADD COLUMN IF NOT EXISTS approval_decision_at timestamptz,
  ADD COLUMN IF NOT EXISTS approval_blockers text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS ready_for_queue_at timestamptz;

ALTER TABLE public.social_calendars
  ADD COLUMN IF NOT EXISTS founder_approval_review_id uuid,
  ADD COLUMN IF NOT EXISTS approval_decision_at timestamptz,
  ADD COLUMN IF NOT EXISTS approval_blockers text[] DEFAULT '{}';

-- RLS policies + triggers
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'social_approval_reviews','social_approval_decisions',
    'social_approval_batches','social_approval_batch_items','social_approval_rules'
  ]) LOOP
    EXECUTE format('DROP POLICY IF EXISTS "founder_admin_all_%s" ON public.%I;', t, t);
    EXECUTE format($p$
      CREATE POLICY "founder_admin_all_%s" ON public.%I
      FOR ALL TO authenticated
      USING (public.has_role(auth.uid(), 'founder'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role))
      WITH CHECK (public.has_role(auth.uid(), 'founder'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));
    $p$, t, t);
  END LOOP;
  FOR t IN SELECT unnest(ARRAY[
    'social_approval_reviews','social_approval_batches','social_approval_rules'
  ]) LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS set_updated_at_%s ON public.%I;', t, t);
    EXECUTE format('CREATE TRIGGER set_updated_at_%s BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();', t, t);
  END LOOP;
END $$;
