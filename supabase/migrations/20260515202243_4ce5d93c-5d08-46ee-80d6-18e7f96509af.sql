
CREATE TABLE public.business_knowledge_uploads (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete cascade,
  upload_type text not null,
  upload_title text not null,
  source_kind text not null,
  source_url text,
  storage_url text,
  upload_status text not null default 'uploaded',
  processing_status text not null default 'not_started',
  privacy_level text not null default 'internal',
  customer_visible_allowed boolean not null default false,
  founder_review_required boolean not null default true,
  processed_at timestamptz,
  summary text,
  extracted_topics jsonb not null default '[]'::jsonb,
  extracted_actions jsonb not null default '[]'::jsonb,
  extracted_templates jsonb not null default '[]'::jsonb,
  extracted_offers jsonb not null default '[]'::jsonb,
  extracted_customer_rules jsonb not null default '[]'::jsonb,
  extracted_risks jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
CREATE INDEX idx_bku_business ON public.business_knowledge_uploads(business_id);
ALTER TABLE public.business_knowledge_uploads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "founder/admin all bku" ON public.business_knowledge_uploads FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));
CREATE TRIGGER trg_bku_updated BEFORE UPDATE ON public.business_knowledge_uploads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.business_training_runs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete cascade,
  training_name text not null,
  training_status text not null default 'draft',
  included_upload_ids jsonb not null default '[]'::jsonb,
  business_summary text,
  brand_voice_summary text,
  customer_summary text,
  offer_summary text,
  operating_rules_summary text,
  marketing_summary text,
  support_summary text,
  risk_summary text,
  templates_created jsonb not null default '[]'::jsonb,
  agents_trained jsonb not null default '[]'::jsonb,
  readiness_score numeric,
  founder_review_required boolean not null default true,
  approved_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
CREATE INDEX idx_btr_business ON public.business_training_runs(business_id);
ALTER TABLE public.business_training_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "founder/admin all btr" ON public.business_training_runs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));
CREATE TRIGGER trg_btr_updated BEFORE UPDATE ON public.business_training_runs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.business_execution_starter_packs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete cascade,
  training_run_id uuid references public.business_training_runs(id) on delete set null,
  pack_status text not null default 'draft',
  business_summary text,
  icp_summary text,
  offers jsonb not null default '[]'::jsonb,
  approved_tone text,
  email_templates jsonb not null default '[]'::jsonb,
  social_content_plan jsonb not null default '[]'::jsonb,
  marketing_assets_needed jsonb not null default '[]'::jsonb,
  proposal_outline text,
  onboarding_flow jsonb not null default '[]'::jsonb,
  survey_plan jsonb not null default '[]'::jsonb,
  support_faqs jsonb not null default '[]'::jsonb,
  complaints_flow jsonb not null default '[]'::jsonb,
  prospecting_targets jsonb not null default '[]'::jsonb,
  automation_recommendations jsonb not null default '[]'::jsonb,
  go_live_blockers jsonb not null default '[]'::jsonb,
  founder_review_required boolean not null default true,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
CREATE INDEX idx_besp_business ON public.business_execution_starter_packs(business_id);
ALTER TABLE public.business_execution_starter_packs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "founder/admin all besp" ON public.business_execution_starter_packs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));
CREATE TRIGGER trg_besp_updated BEFORE UPDATE ON public.business_execution_starter_packs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
