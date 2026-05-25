
CREATE TABLE public.resource_allocation_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  allocation_period_start DATE NOT NULL DEFAULT CURRENT_DATE,
  allocation_period_end DATE NOT NULL DEFAULT CURRENT_DATE,
  allocation_type TEXT NOT NULL,
  total_available NUMERIC NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'units',
  plan_status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.resource_allocation_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID NOT NULL REFERENCES public.resource_allocation_plans(id) ON DELETE CASCADE,
  business_id UUID NOT NULL,
  allocated_amount NUMERIC NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'units',
  priority TEXT NOT NULL DEFAULT 'normal',
  reason TEXT,
  expected_return TEXT,
  risk_notes TEXT,
  status TEXT NOT NULL DEFAULT 'recommended',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.resource_usage_actuals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL,
  allocation_type TEXT NOT NULL,
  period_start DATE NOT NULL DEFAULT CURRENT_DATE,
  period_end DATE NOT NULL DEFAULT CURRENT_DATE,
  actual_used NUMERIC NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'units',
  output_summary TEXT,
  roi_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  audit_metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX idx_rap_type ON public.resource_allocation_plans(allocation_type);
CREATE INDEX idx_rap_status ON public.resource_allocation_plans(plan_status);
CREATE INDEX idx_rai_plan ON public.resource_allocation_items(plan_id);
CREATE INDEX idx_rai_business ON public.resource_allocation_items(business_id);
CREATE INDEX idx_rua_business ON public.resource_usage_actuals(business_id);
CREATE INDEX idx_rua_type ON public.resource_usage_actuals(allocation_type);

ALTER TABLE public.resource_allocation_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_allocation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_usage_actuals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders/admins manage allocation plans" ON public.resource_allocation_plans
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "Founders/admins manage allocation items" ON public.resource_allocation_items
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "Founders/admins manage usage actuals" ON public.resource_usage_actuals
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_rap_updated_at BEFORE UPDATE ON public.resource_allocation_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_rai_updated_at BEFORE UPDATE ON public.resource_allocation_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
