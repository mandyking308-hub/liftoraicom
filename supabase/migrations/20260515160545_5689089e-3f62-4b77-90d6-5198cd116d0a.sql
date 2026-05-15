-- Social scheduling queue
CREATE TABLE IF NOT EXISTS public.social_scheduling_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  post_draft_id uuid NOT NULL REFERENCES public.social_post_drafts(id) ON DELETE CASCADE,
  platform_key text NOT NULL,
  scheduled_date date,
  scheduled_time time,
  timezone text NOT NULL DEFAULT 'Europe/London',
  scheduler_provider text NOT NULL DEFAULT 'metricool',
  scheduler_status text NOT NULL DEFAULT 'ready_for_export',
  external_scheduler_id text,
  publish_allowed boolean NOT NULL DEFAULT false,
  exported_at timestamptz,
  scheduled_externally_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.social_scheduling_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders/admins read social_scheduling_queue" ON public.social_scheduling_queue
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'founder'::app_role));
CREATE POLICY "Founders/admins write social_scheduling_queue" ON public.social_scheduling_queue
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'founder'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'founder'::app_role));
CREATE INDEX IF NOT EXISTS idx_ssq_business ON public.social_scheduling_queue(business_id);
CREATE INDEX IF NOT EXISTS idx_ssq_draft ON public.social_scheduling_queue(post_draft_id);
CREATE INDEX IF NOT EXISTS idx_ssq_status ON public.social_scheduling_queue(scheduler_status);
CREATE TRIGGER trg_ssq_updated_at BEFORE UPDATE ON public.social_scheduling_queue
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Metricool export batches
CREATE TABLE IF NOT EXISTS public.metricool_export_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  batch_name text NOT NULL,
  batch_status text NOT NULL DEFAULT 'draft',
  post_count integer NOT NULL DEFAULT 0,
  platforms jsonb NOT NULL DEFAULT '[]'::jsonb,
  export_format text NOT NULL DEFAULT 'csv',
  export_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  exported_at timestamptz,
  founder_review_required boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.metricool_export_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders/admins read metricool_export_batches" ON public.metricool_export_batches
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'founder'::app_role));
CREATE POLICY "Founders/admins write metricool_export_batches" ON public.metricool_export_batches
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'founder'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'founder'::app_role));
CREATE INDEX IF NOT EXISTS idx_meb_business ON public.metricool_export_batches(business_id);
CREATE INDEX IF NOT EXISTS idx_meb_status ON public.metricool_export_batches(batch_status);
CREATE TRIGGER trg_meb_updated_at BEFORE UPDATE ON public.metricool_export_batches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- External action gate (disabled by default)
INSERT INTO public.external_action_gates
  (gate_key, gate_label, action_type, provider_type, enabled, requires_founder_confirmation, confirmation_phrase, risk_level, max_batch_size)
VALUES
  ('metricool_schedule_post_gate', 'Metricool Schedule Post', 'social_schedule_post', 'metricool', false, true, 'SCHEDULE METRICOOL POSTS', 'high', 5)
ON CONFLICT (gate_key) DO NOTHING;