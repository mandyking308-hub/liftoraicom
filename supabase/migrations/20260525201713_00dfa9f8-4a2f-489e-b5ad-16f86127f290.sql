
CREATE TABLE public.capacity_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID,
  capacity_period_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  capacity_period_end TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '30 days'),
  max_customers INTEGER NOT NULL DEFAULT 0,
  max_orders INTEGER NOT NULL DEFAULT 0,
  max_projects INTEGER NOT NULL DEFAULT 0,
  max_human_hours NUMERIC NOT NULL DEFAULT 0,
  max_ai_actions INTEGER NOT NULL DEFAULT 0,
  max_support_tickets INTEGER NOT NULL DEFAULT 0,
  current_customers INTEGER NOT NULL DEFAULT 0,
  current_orders INTEGER NOT NULL DEFAULT 0,
  current_projects INTEGER NOT NULL DEFAULT 0,
  current_human_hours NUMERIC NOT NULL DEFAULT 0,
  current_ai_actions INTEGER NOT NULL DEFAULT 0,
  current_support_tickets INTEGER NOT NULL DEFAULT 0,
  capacity_status TEXT NOT NULL DEFAULT 'available' CHECK (capacity_status IN ('available','watch','full','over_capacity')),
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.workload_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID,
  source_type TEXT NOT NULL CHECK (source_type IN ('delivery','support','sales','onboarding','finance','manual','agent')),
  source_record_id UUID,
  workload_name TEXT NOT NULL,
  estimated_hours NUMERIC NOT NULL DEFAULT 0,
  due_at TIMESTAMPTZ,
  assigned_to_type TEXT NOT NULL DEFAULT 'ai_agent' CHECK (assigned_to_type IN ('ai_agent','human','founder','vendor')),
  assigned_to TEXT,
  workload_status TEXT NOT NULL DEFAULT 'pending' CHECK (workload_status IN ('pending','active','blocked','completed','cancelled')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','critical')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.bottleneck_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID,
  bottleneck_type TEXT NOT NULL CHECK (bottleneck_type IN ('human_capacity','delivery_capacity','support_load','ai_cost','approvals','vendor','knowledge_gap','technical')),
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
  bottleneck_summary TEXT NOT NULL,
  recommended_action TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','acknowledged','resolved')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

ALTER TABLE public.capacity_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workload_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bottleneck_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders/admins manage capacity_plans" ON public.capacity_plans FOR ALL
  USING (has_role(auth.uid(),'founder') OR has_role(auth.uid(),'admin'))
  WITH CHECK (has_role(auth.uid(),'founder') OR has_role(auth.uid(),'admin'));

CREATE POLICY "Founders/admins manage workload_items" ON public.workload_items FOR ALL
  USING (has_role(auth.uid(),'founder') OR has_role(auth.uid(),'admin'))
  WITH CHECK (has_role(auth.uid(),'founder') OR has_role(auth.uid(),'admin'));

CREATE POLICY "Founders/admins manage bottleneck_alerts" ON public.bottleneck_alerts FOR ALL
  USING (has_role(auth.uid(),'founder') OR has_role(auth.uid(),'admin'))
  WITH CHECK (has_role(auth.uid(),'founder') OR has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_capacity_plans_updated BEFORE UPDATE ON public.capacity_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_workload_items_updated BEFORE UPDATE ON public.workload_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_workload_status ON public.workload_items(workload_status);
CREATE INDEX idx_workload_assigned ON public.workload_items(assigned_to_type, assigned_to);
CREATE INDEX idx_bottleneck_status ON public.bottleneck_alerts(status);
CREATE INDEX idx_capacity_status ON public.capacity_plans(capacity_status);
