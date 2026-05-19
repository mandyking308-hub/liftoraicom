
-- Extend social_manual_export_batches
ALTER TABLE public.social_manual_export_batches
  ADD COLUMN IF NOT EXISTS date_range_start date,
  ADD COLUMN IF NOT EXISTS date_range_end date,
  ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'Europe/London',
  ADD COLUMN IF NOT EXISTS validation_status text DEFAULT 'not_checked',
  ADD COLUMN IF NOT EXISTS validation_errors text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS validation_warnings text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS manual_scheduling_status text DEFAULT 'not_scheduled',
  ADD COLUMN IF NOT EXISTS operator_notes text,
  ADD COLUMN IF NOT EXISTS founder_notes text,
  ADD COLUMN IF NOT EXISTS download_ready boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS csv_text text,
  ADD COLUMN IF NOT EXISTS row_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS blocked_rows integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS confirmed_scheduled_at timestamptz,
  ADD COLUMN IF NOT EXISTS confirmed_scheduled_by text,
  ADD COLUMN IF NOT EXISTS provider text,
  ADD COLUMN IF NOT EXISTS platform text,
  ADD COLUMN IF NOT EXISTS file_url text,
  ADD COLUMN IF NOT EXISTS storage_path text,
  ADD COLUMN IF NOT EXISTS created_by text,
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- social_scheduler_export_rows
CREATE TABLE IF NOT EXISTS public.social_scheduler_export_rows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  export_batch_id uuid NOT NULL REFERENCES public.social_manual_export_batches(id) ON DELETE CASCADE,
  publish_job_id uuid REFERENCES public.social_publish_jobs(id) ON DELETE SET NULL,
  calendar_item_id uuid,
  content_item_id uuid,
  content_variant_id uuid,
  platform text NOT NULL,
  provider text,
  scheduled_date date,
  scheduled_time time,
  timezone text DEFAULT 'Europe/London',
  caption text,
  title text,
  link_url text,
  hashtags text,
  media_url text,
  thumbnail_url text,
  asset_id uuid,
  row_status text DEFAULT 'draft',
  validation_status text DEFAULT 'not_checked',
  validation_errors text[] DEFAULT '{}',
  validation_warnings text[] DEFAULT '{}',
  csv_row_json jsonb DEFAULT '{}'::jsonb,
  sort_order integer DEFAULT 0,
  is_test_data boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.social_scheduler_export_rows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "founder_admin_all_export_rows" ON public.social_scheduler_export_rows
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'));

-- social_scheduler_export_templates
CREATE TABLE IF NOT EXISTS public.social_scheduler_export_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid,
  template_name text NOT NULL,
  export_type text NOT NULL,
  provider text,
  platform text,
  template_status text DEFAULT 'active',
  column_mapping jsonb NOT NULL DEFAULT '{}'::jsonb,
  required_fields text[] DEFAULT '{}',
  optional_fields text[] DEFAULT '{}',
  date_format text,
  time_format text,
  timezone_handling text DEFAULT 'business_timezone',
  notes text,
  is_global boolean DEFAULT false,
  is_test_data boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.social_scheduler_export_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "founder_admin_all_export_templates" ON public.social_scheduler_export_templates
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'));

-- social_operator_scheduling_tasks
CREATE TABLE IF NOT EXISTS public.social_operator_scheduling_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  export_batch_id uuid REFERENCES public.social_manual_export_batches(id) ON DELETE SET NULL,
  task_title text NOT NULL,
  task_status text DEFAULT 'open',
  platform text,
  provider text,
  scheduled_for timestamptz,
  assigned_to text,
  instructions text,
  checklist jsonb DEFAULT '[]'::jsonb,
  completion_notes text,
  completed_at timestamptz,
  completed_by text,
  is_test_data boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.social_operator_scheduling_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "founder_admin_all_operator_tasks" ON public.social_operator_scheduling_tasks
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'));

-- social_scheduler_export_audit
CREATE TABLE IF NOT EXISTS public.social_scheduler_export_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  export_batch_id uuid REFERENCES public.social_manual_export_batches(id) ON DELETE SET NULL,
  export_row_id uuid REFERENCES public.social_scheduler_export_rows(id) ON DELETE SET NULL,
  publish_job_id uuid REFERENCES public.social_publish_jobs(id) ON DELETE SET NULL,
  action text NOT NULL,
  action_status text DEFAULT 'recorded',
  before_json jsonb DEFAULT '{}'::jsonb,
  after_json jsonb DEFAULT '{}'::jsonb,
  result_json jsonb DEFAULT '{}'::jsonb,
  provider_calls integer DEFAULT 0,
  posts_published integer DEFAULT 0,
  posts_scheduled_externally integer DEFAULT 0,
  error_message text,
  created_by text,
  is_test_data boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.social_scheduler_export_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "founder_admin_all_export_audit" ON public.social_scheduler_export_audit
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'));

-- Seed global templates
INSERT INTO public.social_scheduler_export_templates (template_name, export_type, is_global, column_mapping, required_fields, optional_fields, notes)
SELECT 'Metricool CSV','metricool_csv',true,
  '{"columns":["platform","date","time","timezone","text","media_url","link_url","title","notes","content_id","publish_job_id"]}'::jsonb,
  ARRAY['platform','date','time','text'],
  ARRAY['media_url','link_url','title','notes'],
  'Metricool-ready export — operator must verify import columns before upload.'
WHERE NOT EXISTS (SELECT 1 FROM public.social_scheduler_export_templates WHERE template_name='Metricool CSV' AND is_global=true);

INSERT INTO public.social_scheduler_export_templates (template_name, export_type, is_global, column_mapping, required_fields, optional_fields)
SELECT 'Generic CSV','generic_csv',true,
  '{"columns":["platform","scheduled_at","caption","hashtags","cta","link_url","media_url","asset_reference","campaign","status","notes"]}'::jsonb,
  ARRAY['platform','caption'],
  ARRAY['scheduled_at','hashtags','cta','link_url','media_url']
WHERE NOT EXISTS (SELECT 1 FROM public.social_scheduler_export_templates WHERE template_name='Generic CSV' AND is_global=true);

INSERT INTO public.social_scheduler_export_templates (template_name, export_type, is_global, column_mapping)
SELECT 'Operator Pack','operator_pack',true,
  '{"grouping":["date","platform"],"fields":["caption","asset_reference","cta","checklist","warnings"]}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.social_scheduler_export_templates WHERE template_name='Operator Pack' AND is_global=true);

INSERT INTO public.social_scheduler_export_templates (template_name, export_type, is_global, column_mapping)
SELECT 'Manual Copy Pack','manual_copy_pack',true,
  '{"blocks":["platform_date_header","caption","hashtags","link","asset_reference"]}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.social_scheduler_export_templates WHERE template_name='Manual Copy Pack' AND is_global=true);

CREATE INDEX IF NOT EXISTS idx_sser_business ON public.social_scheduler_export_rows(business_id);
CREATE INDEX IF NOT EXISTS idx_sser_batch ON public.social_scheduler_export_rows(export_batch_id);
CREATE INDEX IF NOT EXISTS idx_sset_business ON public.social_scheduler_export_templates(business_id);
CREATE INDEX IF NOT EXISTS idx_sost_business ON public.social_operator_scheduling_tasks(business_id);
CREATE INDEX IF NOT EXISTS idx_ssea_business ON public.social_scheduler_export_audit(business_id);
