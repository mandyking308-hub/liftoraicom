CREATE TABLE public.revenue_autopilot_tasks (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  task_type text not null check (task_type in (
    'qualify_lead','draft_reply','prepare_call','prepare_follow_up','prepare_proposal',
    'prepare_close_action','prepare_upgrade_pitch','review_approval','update_crm',
    'review_lost_deal','improve_script','set_missing_revenue_target','verify_pricing'
  )),
  title text not null,
  detail text,
  priority text default 'medium' check (priority in ('low','medium','high','critical')),
  estimated_value numeric default 0,
  currency text default 'USD',
  due_at timestamptz,
  assigned_agent text,
  approval_required boolean default false,
  status text default 'open' check (status in ('open','in_progress','blocked','done','dismissed')),
  linked_contact_id uuid,
  linked_conversation_id uuid,
  linked_product_id uuid,
  linked_offer_id uuid,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
CREATE INDEX idx_rat_business_status ON public.revenue_autopilot_tasks(business_id, status, priority, due_at);

CREATE TABLE public.revenue_autopilot_snapshots (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  snapshot_date date not null default current_date,
  revenue_target numeric default 0,
  actual_revenue numeric default 0,
  pipeline_estimated numeric default 0,
  gap numeric default 0,
  required_activity jsonb default '{}'::jsonb,
  overdue_follow_ups integer default 0,
  hot_leads integer default 0,
  upgrade_opportunities integer default 0,
  proposals_needed integer default 0,
  calls_to_prepare integer default 0,
  approvals_blocking integer default 0,
  top_actions jsonb default '[]'::jsonb,
  agent_recommended_action text,
  created_at timestamptz not null default now()
);
CREATE UNIQUE INDEX idx_ras_business_date ON public.revenue_autopilot_snapshots(business_id, snapshot_date);

CREATE TABLE public.revenue_autopilot_recommendations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  category text not null,
  title text not null,
  detail text,
  priority text default 'medium' check (priority in ('low','medium','high','critical')),
  is_blocking boolean default false,
  target_agent text,
  status text default 'open' check (status in ('open','in_review','applied','dismissed')),
  evidence jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
CREATE INDEX idx_rar_business ON public.revenue_autopilot_recommendations(business_id, status, priority);

ALTER TABLE public.revenue_autopilot_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revenue_autopilot_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revenue_autopilot_recommendations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "founders manage rat" ON public.revenue_autopilot_tasks FOR ALL
    USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'))
    WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "founders manage ras" ON public.revenue_autopilot_snapshots FOR ALL
    USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'))
    WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "founders manage rar" ON public.revenue_autopilot_recommendations FOR ALL
    USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'))
    WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TRIGGER trg_rat_updated BEFORE UPDATE ON public.revenue_autopilot_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_rar_updated BEFORE UPDATE ON public.revenue_autopilot_recommendations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();