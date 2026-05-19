
-- Extend social_publish_jobs
ALTER TABLE public.social_publish_jobs
  ADD COLUMN IF NOT EXISTS calendar_item_id uuid,
  ADD COLUMN IF NOT EXISTS content_variant_id uuid,
  ADD COLUMN IF NOT EXISTS campaign_plan_id uuid,
  ADD COLUMN IF NOT EXISTS content_pack_id uuid,
  ADD COLUMN IF NOT EXISTS provider_adapter_id uuid,
  ADD COLUMN IF NOT EXISTS provider_connection_id uuid,
  ADD COLUMN IF NOT EXISTS queue_batch_id uuid,
  ADD COLUMN IF NOT EXISTS approval_review_id uuid,
  ADD COLUMN IF NOT EXISTS publish_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS provider_capability_required text,
  ADD COLUMN IF NOT EXISTS execution_gate_status text NOT NULL DEFAULT 'locked',
  ADD COLUMN IF NOT EXISTS execution_attempt_allowed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS external_execution_attempted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS external_execution_at timestamptz,
  ADD COLUMN IF NOT EXISTS manual_export_status text NOT NULL DEFAULT 'not_exported',
  ADD COLUMN IF NOT EXISTS exported_at timestamptz,
  ADD COLUMN IF NOT EXISTS exported_by text,
  ADD COLUMN IF NOT EXISTS founder_final_approval_required boolean NOT NULL DEFAULT true;

-- social_provider_connections
CREATE TABLE IF NOT EXISTS public.social_provider_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  provider text NOT NULL,
  connection_name text NOT NULL,
  connection_status text NOT NULL DEFAULT 'not_connected',
  token_reference text,
  account_reference text,
  connected_account_id uuid REFERENCES public.social_accounts(id) ON DELETE SET NULL,
  capabilities_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_checked_at timestamptz,
  last_error text,
  notes text,
  is_test_data boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.social_provider_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "spc_founder_all" ON public.social_provider_connections FOR ALL
  USING (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'));

-- social_provider_execution_gates
CREATE TABLE IF NOT EXISTS public.social_provider_execution_gates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  provider text NOT NULL,
  gate_name text NOT NULL,
  gate_status text NOT NULL DEFAULT 'locked',
  action_type text NOT NULL,
  max_batch_size integer NOT NULL DEFAULT 1,
  requires_founder_phrase boolean NOT NULL DEFAULT true,
  confirmation_phrase text,
  provider_connection_required boolean NOT NULL DEFAULT true,
  approval_required boolean NOT NULL DEFAULT true,
  rehearsal_runs_required integer NOT NULL DEFAULT 3,
  successful_rehearsal_runs integer NOT NULL DEFAULT 0,
  last_checked_at timestamptz,
  last_enabled_at timestamptz,
  enabled_by text,
  notes text,
  is_test_data boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.social_provider_execution_gates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "speg_founder_all" ON public.social_provider_execution_gates FOR ALL
  USING (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'));

-- social_publish_queue_batches
CREATE TABLE IF NOT EXISTS public.social_publish_queue_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  batch_name text NOT NULL,
  batch_type text NOT NULL,
  batch_status text NOT NULL DEFAULT 'draft',
  provider text,
  platform text,
  scheduled_for timestamptz,
  job_count integer NOT NULL DEFAULT 0,
  blocked_count integer NOT NULL DEFAULT 0,
  ready_count integer NOT NULL DEFAULT 0,
  exported_count integer NOT NULL DEFAULT 0,
  high_risk_count integer NOT NULL DEFAULT 0,
  confirmation_required boolean NOT NULL DEFAULT true,
  founder_notes text,
  is_test_data boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.social_publish_queue_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "spqb_founder_all" ON public.social_publish_queue_batches FOR ALL
  USING (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'));

-- social_publish_queue_audit
CREATE TABLE IF NOT EXISTS public.social_publish_queue_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  publish_job_id uuid REFERENCES public.social_publish_jobs(id) ON DELETE SET NULL,
  queue_batch_id uuid REFERENCES public.social_publish_queue_batches(id) ON DELETE SET NULL,
  action text NOT NULL,
  action_status text NOT NULL DEFAULT 'recorded',
  provider text,
  platform text,
  before_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  after_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  result_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  provider_calls integer NOT NULL DEFAULT 0,
  posts_published integer NOT NULL DEFAULT 0,
  posts_scheduled integer NOT NULL DEFAULT 0,
  dms_sent integer NOT NULL DEFAULT 0,
  comments_sent integer NOT NULL DEFAULT 0,
  error_message text,
  created_by text,
  is_test_data boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.social_publish_queue_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "spqa_founder_all" ON public.social_publish_queue_audit FOR ALL
  USING (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'));

-- social_manual_export_batches
CREATE TABLE IF NOT EXISTS public.social_manual_export_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  export_name text NOT NULL,
  export_type text NOT NULL,
  export_status text NOT NULL DEFAULT 'draft',
  provider text,
  platform text,
  queue_batch_id uuid REFERENCES public.social_publish_queue_batches(id) ON DELETE SET NULL,
  file_url text,
  storage_path text,
  exported_rows integer NOT NULL DEFAULT 0,
  export_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by text,
  exported_at timestamptz,
  is_test_data boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.social_manual_export_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "smeb_founder_all" ON public.social_manual_export_batches FOR ALL
  USING (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'));

-- Triggers for updated_at
CREATE TRIGGER trg_spc_updated BEFORE UPDATE ON public.social_provider_connections FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_speg_updated BEFORE UPDATE ON public.social_provider_execution_gates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_spqb_updated BEFORE UPDATE ON public.social_publish_queue_batches FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_smeb_updated BEFORE UPDATE ON public.social_manual_export_batches FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_spc_business ON public.social_provider_connections(business_id);
CREATE INDEX IF NOT EXISTS idx_speg_business ON public.social_provider_execution_gates(business_id);
CREATE INDEX IF NOT EXISTS idx_spqb_business ON public.social_publish_queue_batches(business_id);
CREATE INDEX IF NOT EXISTS idx_spqa_business ON public.social_publish_queue_audit(business_id);
CREATE INDEX IF NOT EXISTS idx_smeb_business ON public.social_manual_export_batches(business_id);
CREATE INDEX IF NOT EXISTS idx_spj_queue_batch ON public.social_publish_jobs(queue_batch_id);
