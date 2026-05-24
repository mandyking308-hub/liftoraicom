
-- business_internal_activation_records
CREATE TABLE IF NOT EXISTS public.business_internal_activation_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  activation_status text NOT NULL DEFAULT 'draft',
  activation_mode text NOT NULL DEFAULT 'internal_only',
  activation_source text NOT NULL DEFAULT 'business_onboarding_factory',
  factory_run_id uuid,
  onboarding_run_id uuid,
  starter_pack_id uuid,
  materialisation_run_id uuid,
  readiness_score integer NOT NULL DEFAULT 0,
  internal_ready boolean NOT NULL DEFAULT false,
  external_ready boolean NOT NULL DEFAULT false,
  missing_context_count integer NOT NULL DEFAULT 0,
  risk_warning_count integer NOT NULL DEFAULT 0,
  blocker_count integer NOT NULL DEFAULT 0,
  founder_review_required boolean NOT NULL DEFAULT true,
  founder_review_status text NOT NULL DEFAULT 'pending',
  external_actions_locked boolean NOT NULL DEFAULT true,
  auto_send_enabled boolean NOT NULL DEFAULT false,
  cron_enabled boolean NOT NULL DEFAULT false,
  operating_start_date date,
  operating_end_date date,
  is_test_data boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT biar_status_chk CHECK (activation_status IN ('draft','previewed','internally_active','paused','blocked','archived')),
  CONSTRAINT biar_mode_chk CHECK (activation_mode IN ('sandbox','internal_only','founder_review','limited_external_locked','paused')),
  CONSTRAINT biar_external_locked CHECK (external_ready = false),
  CONSTRAINT biar_external_actions_locked CHECK (external_actions_locked = true),
  CONSTRAINT biar_no_auto_send CHECK (auto_send_enabled = false),
  CONSTRAINT biar_no_cron CHECK (cron_enabled = false)
);

CREATE INDEX IF NOT EXISTS biar_business_idx ON public.business_internal_activation_records(business_id);
CREATE INDEX IF NOT EXISTS biar_status_idx ON public.business_internal_activation_records(activation_status);
CREATE INDEX IF NOT EXISTS biar_mode_idx ON public.business_internal_activation_records(activation_mode);
CREATE INDEX IF NOT EXISTS biar_internal_ready_idx ON public.business_internal_activation_records(internal_ready);
CREATE INDEX IF NOT EXISTS biar_external_ready_idx ON public.business_internal_activation_records(external_ready);
CREATE INDEX IF NOT EXISTS biar_created_idx ON public.business_internal_activation_records(created_at DESC);

ALTER TABLE public.business_internal_activation_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "biar_founder_admin_all" ON public.business_internal_activation_records;
CREATE POLICY "biar_founder_admin_all" ON public.business_internal_activation_records
FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'))
WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));

DROP TRIGGER IF EXISTS biar_updated_at ON public.business_internal_activation_records;
CREATE TRIGGER biar_updated_at
BEFORE UPDATE ON public.business_internal_activation_records
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- business_operating_runbook_items
CREATE TABLE IF NOT EXISTS public.business_operating_runbook_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  activation_record_id uuid,
  item_type text NOT NULL,
  cadence text NOT NULL DEFAULT 'one_time',
  title text NOT NULL,
  description text,
  owner_agent text,
  owner_role text,
  priority text NOT NULL DEFAULT 'normal',
  status text NOT NULL DEFAULT 'draft',
  due_at timestamptz,
  route_hint text,
  source_module text,
  source_record_id uuid,
  requires_founder_review boolean NOT NULL DEFAULT true,
  external_action_required boolean NOT NULL DEFAULT false,
  external_action_blocked boolean NOT NULL DEFAULT true,
  completion_notes text,
  is_test_data boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bori_item_type_chk CHECK (item_type IN ('daily_check','weekly_check','knowledge_gap','founder_review','draft_review','social_review','support_review','customer_success_review','revenue_review','supplier_review','compliance_review','system_check','other')),
  CONSTRAINT bori_cadence_chk CHECK (cadence IN ('one_time','daily','weekly','monthly','event_based')),
  CONSTRAINT bori_status_chk CHECK (status IN ('draft','ready','in_progress','done','blocked','parked','archived')),
  CONSTRAINT bori_priority_chk CHECK (priority IN ('low','normal','high','urgent','critical')),
  CONSTRAINT bori_external_blocked CHECK (external_action_blocked = true)
);

CREATE INDEX IF NOT EXISTS bori_business_idx ON public.business_operating_runbook_items(business_id);
CREATE INDEX IF NOT EXISTS bori_activation_idx ON public.business_operating_runbook_items(activation_record_id);
CREATE INDEX IF NOT EXISTS bori_item_type_idx ON public.business_operating_runbook_items(item_type);
CREATE INDEX IF NOT EXISTS bori_cadence_idx ON public.business_operating_runbook_items(cadence);
CREATE INDEX IF NOT EXISTS bori_status_idx ON public.business_operating_runbook_items(status);
CREATE INDEX IF NOT EXISTS bori_priority_idx ON public.business_operating_runbook_items(priority);
CREATE INDEX IF NOT EXISTS bori_due_idx ON public.business_operating_runbook_items(due_at);

ALTER TABLE public.business_operating_runbook_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bori_founder_admin_all" ON public.business_operating_runbook_items;
CREATE POLICY "bori_founder_admin_all" ON public.business_operating_runbook_items
FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'))
WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));

DROP TRIGGER IF EXISTS bori_updated_at ON public.business_operating_runbook_items;
CREATE TRIGGER bori_updated_at
BEFORE UPDATE ON public.business_operating_runbook_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- business_internal_daily_actions
CREATE TABLE IF NOT EXISTS public.business_internal_daily_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  activation_record_id uuid,
  action_date date NOT NULL DEFAULT CURRENT_DATE,
  action_title text NOT NULL,
  action_description text,
  action_category text NOT NULL DEFAULT 'general',
  owner_agent text,
  priority text NOT NULL DEFAULT 'normal',
  status text NOT NULL DEFAULT 'open',
  route_hint text,
  source_type text,
  source_id uuid,
  founder_review_required boolean NOT NULL DEFAULT true,
  external_action_required boolean NOT NULL DEFAULT false,
  external_action_blocked boolean NOT NULL DEFAULT true,
  is_test_data boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bida_category_chk CHECK (action_category IN ('command_centre','knowledge','approvals','drafts','social','support','customer_success','revenue','supplier','compliance','diagnostics','general','other')),
  CONSTRAINT bida_status_chk CHECK (status IN ('open','in_progress','done','blocked','parked','archived')),
  CONSTRAINT bida_priority_chk CHECK (priority IN ('low','normal','high','urgent','critical')),
  CONSTRAINT bida_external_blocked CHECK (external_action_blocked = true)
);

CREATE INDEX IF NOT EXISTS bida_business_idx ON public.business_internal_daily_actions(business_id);
CREATE INDEX IF NOT EXISTS bida_activation_idx ON public.business_internal_daily_actions(activation_record_id);
CREATE INDEX IF NOT EXISTS bida_date_idx ON public.business_internal_daily_actions(action_date);
CREATE INDEX IF NOT EXISTS bida_category_idx ON public.business_internal_daily_actions(action_category);
CREATE INDEX IF NOT EXISTS bida_status_idx ON public.business_internal_daily_actions(status);
CREATE INDEX IF NOT EXISTS bida_priority_idx ON public.business_internal_daily_actions(priority);

ALTER TABLE public.business_internal_daily_actions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bida_founder_admin_all" ON public.business_internal_daily_actions;
CREATE POLICY "bida_founder_admin_all" ON public.business_internal_daily_actions
FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'))
WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));

DROP TRIGGER IF EXISTS bida_updated_at ON public.business_internal_daily_actions;
CREATE TRIGGER bida_updated_at
BEFORE UPDATE ON public.business_internal_daily_actions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Approval type
INSERT INTO public.founder_approval_types (type_key, label, description, default_priority, execution_enabled, auto_execute_allowed, active)
VALUES ('business_internal_activation_review','Business Internal Activation Review','Review the internal activation plan (runbook + daily actions) for a business. No external action permitted.','normal',false,false,true)
ON CONFLICT (type_key) DO NOTHING;
