
CREATE TABLE IF NOT EXISTS public.master_work_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid,
  source_module text NOT NULL,
  source_table text,
  source_record_id text,
  work_type text NOT NULL CHECK (work_type IN ('approval','sales','follow_up','delivery','onboarding','support','complaint','finance','contract','vendor','privacy','incident','data_quality','knowledge','capacity','marketplace','portfolio','reporting','manual')),
  title text NOT NULL,
  description text,
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent','critical')),
  value_score numeric DEFAULT 0,
  risk_score numeric DEFAULT 0,
  estimated_value_amount numeric,
  estimated_value_currency text DEFAULT 'USD',
  due_at timestamptz,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','active','waiting_approval','blocked','completed','cancelled','parked')),
  owner_type text NOT NULL DEFAULT 'unassigned' CHECK (owner_type IN ('founder','ai_agent','human_operator','external_adviser','unassigned')),
  owner_id uuid,
  assigned_agent text,
  approval_required boolean NOT NULL DEFAULT false,
  approval_item_id uuid,
  blocker_reason text,
  recommended_action text,
  action_url text,
  is_test_data boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  audit_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (source_module, source_table, source_record_id)
);

CREATE INDEX IF NOT EXISTS idx_mwi_status_priority ON public.master_work_items (status, priority);
CREATE INDEX IF NOT EXISTS idx_mwi_business ON public.master_work_items (business_id);
CREATE INDEX IF NOT EXISTS idx_mwi_due ON public.master_work_items (due_at);
CREATE INDEX IF NOT EXISTS idx_mwi_test ON public.master_work_items (is_test_data);

CREATE TABLE IF NOT EXISTS public.master_work_item_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_item_id uuid NOT NULL REFERENCES public.master_work_items(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('created','updated','assigned','escalated','blocked','unblocked','approval_requested','completed','cancelled','parked','reopened')),
  event_summary text,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  audit_metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_mwie_item ON public.master_work_item_events (work_item_id);

CREATE TABLE IF NOT EXISTS public.master_work_queue_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name text NOT NULL,
  source_module text NOT NULL,
  condition_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  priority_boost integer NOT NULL DEFAULT 0,
  value_weight numeric NOT NULL DEFAULT 1,
  risk_weight numeric NOT NULL DEFAULT 1,
  default_owner_type text DEFAULT 'unassigned',
  default_agent text,
  due_in_hours integer,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.master_work_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_work_item_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_work_queue_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "founders_admins_all_mwi" ON public.master_work_items
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'founder'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'founder'::app_role));

CREATE POLICY "founders_admins_all_mwie" ON public.master_work_item_events
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'founder'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'founder'::app_role));

CREATE POLICY "founders_admins_all_mwqr" ON public.master_work_queue_rules
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'founder'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'founder'::app_role));

CREATE OR REPLACE FUNCTION public.tg_mwi_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_mwi_touch ON public.master_work_items;
CREATE TRIGGER trg_mwi_touch BEFORE UPDATE ON public.master_work_items
  FOR EACH ROW EXECUTE FUNCTION public.tg_mwi_touch_updated_at();

DROP TRIGGER IF EXISTS trg_mwqr_touch ON public.master_work_queue_rules;
CREATE TRIGGER trg_mwqr_touch BEFORE UPDATE ON public.master_work_queue_rules
  FOR EACH ROW EXECUTE FUNCTION public.tg_mwi_touch_updated_at();
