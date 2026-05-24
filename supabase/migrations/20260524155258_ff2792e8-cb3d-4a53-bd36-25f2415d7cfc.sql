
-- preparation runs
CREATE TABLE IF NOT EXISTS public.business_micro_batch_preparation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  readiness_run_id uuid,
  activation_plan_id uuid,
  channel_key text NOT NULL,
  run_status text NOT NULL DEFAULT 'draft',
  preparation_mode text NOT NULL DEFAULT 'dry_run_only',
  provider_status text NOT NULL DEFAULT 'unknown',
  channel_status text NOT NULL DEFAULT 'blocked',
  gate_key text,
  gate_exists boolean NOT NULL DEFAULT false,
  gate_enabled boolean NOT NULL DEFAULT false,
  gate_locked boolean NOT NULL DEFAULT true,
  candidate_count integer NOT NULL DEFAULT 0,
  eligible_count integer NOT NULL DEFAULT 0,
  blocked_count integer NOT NULL DEFAULT 0,
  warning_count integer NOT NULL DEFAULT 0,
  prepared_batch_size integer NOT NULL DEFAULT 0,
  max_allowed_batch_size integer NOT NULL DEFAULT 0,
  founder_approval_packet_created boolean NOT NULL DEFAULT false,
  founder_approval_id uuid,
  execution_allowed boolean NOT NULL DEFAULT false,
  external_action_blocked boolean NOT NULL DEFAULT true,
  recommended_next_step text,
  is_test_data boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  no_forbidden_action_audit jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT mbpr_exec_locked CHECK (execution_allowed = false),
  CONSTRAINT mbpr_ext_blocked CHECK (external_action_blocked = true),
  CONSTRAINT mbpr_gate_locked CHECK (gate_locked = true),
  CONSTRAINT mbpr_status CHECK (run_status IN ('draft','previewed','prepared','partial','blocked','failed','archived')),
  CONSTRAINT mbpr_mode CHECK (preparation_mode IN ('dry_run_only','founder_review_packet','execution_locked'))
);
CREATE INDEX IF NOT EXISTS idx_mbpr_business ON public.business_micro_batch_preparation_runs(business_id);
CREATE INDEX IF NOT EXISTS idx_mbpr_readiness ON public.business_micro_batch_preparation_runs(readiness_run_id);
CREATE INDEX IF NOT EXISTS idx_mbpr_channel ON public.business_micro_batch_preparation_runs(channel_key);
CREATE INDEX IF NOT EXISTS idx_mbpr_status ON public.business_micro_batch_preparation_runs(run_status);
CREATE INDEX IF NOT EXISTS idx_mbpr_created ON public.business_micro_batch_preparation_runs(created_at);
ALTER TABLE public.business_micro_batch_preparation_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "founder_admin_all_mbpr" ON public.business_micro_batch_preparation_runs
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));

-- candidates
CREATE TABLE IF NOT EXISTS public.business_micro_batch_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  preparation_run_id uuid,
  channel_key text NOT NULL,
  source_module text,
  source_record_id uuid,
  candidate_type text NOT NULL,
  candidate_status text NOT NULL DEFAULT 'pending_review',
  recipient_or_target text,
  subject_or_title text,
  preview_body text,
  structured_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  compliance_status text NOT NULL DEFAULT 'unknown',
  crm_status text NOT NULL DEFAULT 'unknown',
  provider_status text NOT NULL DEFAULT 'unknown',
  gate_status text NOT NULL DEFAULT 'locked',
  unsubscribe_ready boolean NOT NULL DEFAULT false,
  tracking_disclosure_ready boolean NOT NULL DEFAULT false,
  consent_or_lawful_basis_ready boolean NOT NULL DEFAULT false,
  founder_review_required boolean NOT NULL DEFAULT true,
  external_action_blocked boolean NOT NULL DEFAULT true,
  execution_allowed boolean NOT NULL DEFAULT false,
  blocker_reasons jsonb NOT NULL DEFAULT '[]'::jsonb,
  warnings jsonb NOT NULL DEFAULT '[]'::jsonb,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_test_data boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT mbc_exec_locked CHECK (execution_allowed = false),
  CONSTRAINT mbc_ext_blocked CHECK (external_action_blocked = true),
  CONSTRAINT mbc_type CHECK (candidate_type IN ('smartlead_lead_candidate','native_email_candidate','apollo_candidate_pull','apollo_reveal_candidate','social_schedule_candidate','manychat_dm_candidate','proposal_send_candidate','invoice_send_candidate','onboarding_share_candidate','customer_report_candidate','survey_send_candidate','portal_invite_candidate','support_reply_candidate','winback_message_candidate','other')),
  CONSTRAINT mbc_status CHECK (candidate_status IN ('eligible_for_founder_review','warning','blocked','pending_review','skipped_duplicate','not_applicable'))
);
CREATE INDEX IF NOT EXISTS idx_mbc_business ON public.business_micro_batch_candidates(business_id);
CREATE INDEX IF NOT EXISTS idx_mbc_run ON public.business_micro_batch_candidates(preparation_run_id);
CREATE INDEX IF NOT EXISTS idx_mbc_channel ON public.business_micro_batch_candidates(channel_key);
CREATE INDEX IF NOT EXISTS idx_mbc_ctype ON public.business_micro_batch_candidates(candidate_type);
CREATE INDEX IF NOT EXISTS idx_mbc_cstatus ON public.business_micro_batch_candidates(candidate_status);
CREATE INDEX IF NOT EXISTS idx_mbc_created ON public.business_micro_batch_candidates(created_at);
ALTER TABLE public.business_micro_batch_candidates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "founder_admin_all_mbc" ON public.business_micro_batch_candidates
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));

-- approval packets
CREATE TABLE IF NOT EXISTS public.business_micro_batch_approval_packets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  preparation_run_id uuid,
  channel_key text NOT NULL,
  packet_status text NOT NULL DEFAULT 'draft',
  packet_title text NOT NULL,
  packet_summary text,
  candidate_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  eligible_candidate_count integer NOT NULL DEFAULT 0,
  blocked_candidate_count integer NOT NULL DEFAULT 0,
  warning_count integer NOT NULL DEFAULT 0,
  proposed_batch_size integer NOT NULL DEFAULT 0,
  max_batch_size integer NOT NULL DEFAULT 0,
  required_confirmation_phrase text,
  required_gate_key text,
  required_founder_decisions jsonb NOT NULL DEFAULT '[]'::jsonb,
  required_fixes_before_execution jsonb NOT NULL DEFAULT '[]'::jsonb,
  stop_conditions jsonb NOT NULL DEFAULT '[]'::jsonb,
  rollback_plan jsonb NOT NULL DEFAULT '[]'::jsonb,
  success_metrics jsonb NOT NULL DEFAULT '[]'::jsonb,
  execution_allowed boolean NOT NULL DEFAULT false,
  external_action_blocked boolean NOT NULL DEFAULT true,
  founder_review_required boolean NOT NULL DEFAULT true,
  founder_approval_id uuid,
  is_test_data boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT mbap_exec_locked CHECK (execution_allowed = false),
  CONSTRAINT mbap_ext_blocked CHECK (external_action_blocked = true),
  CONSTRAINT mbap_status CHECK (packet_status IN ('draft','needs_founder_review','internally_approved_for_future_execution','blocked','archived'))
);
CREATE INDEX IF NOT EXISTS idx_mbap_business ON public.business_micro_batch_approval_packets(business_id);
CREATE INDEX IF NOT EXISTS idx_mbap_run ON public.business_micro_batch_approval_packets(preparation_run_id);
CREATE INDEX IF NOT EXISTS idx_mbap_channel ON public.business_micro_batch_approval_packets(channel_key);
CREATE INDEX IF NOT EXISTS idx_mbap_status ON public.business_micro_batch_approval_packets(packet_status);
CREATE INDEX IF NOT EXISTS idx_mbap_created ON public.business_micro_batch_approval_packets(created_at);
ALTER TABLE public.business_micro_batch_approval_packets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "founder_admin_all_mbap" ON public.business_micro_batch_approval_packets
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));

-- updated_at triggers
CREATE TRIGGER trg_mbpr_updated BEFORE UPDATE ON public.business_micro_batch_preparation_runs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_mbc_updated BEFORE UPDATE ON public.business_micro_batch_candidates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_mbap_updated BEFORE UPDATE ON public.business_micro_batch_approval_packets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- register approval type
INSERT INTO public.founder_approval_types (type_key, label, description, execution_enabled, default_priority)
VALUES ('controlled_micro_batch_packet_review','Controlled Micro-Batch Packet Review','Review a controlled micro-batch preparation packet. Execution remains locked.', false, 'normal')
ON CONFLICT (type_key) DO NOTHING;
