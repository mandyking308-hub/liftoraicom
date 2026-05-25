
CREATE TABLE public.human_operators (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  role_type TEXT NOT NULL DEFAULT 'va',
  organisation TEXT,
  status TEXT NOT NULL DEFAULT 'proposed',
  nda_status TEXT NOT NULL DEFAULT 'not_required',
  contract_status TEXT NOT NULL DEFAULT 'not_required',
  timezone TEXT,
  working_hours TEXT,
  primary_responsibilities TEXT,
  escalation_rules TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.human_operator_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  operator_id UUID REFERENCES public.human_operators(id) ON DELETE SET NULL,
  business_id UUID,
  task_title TEXT NOT NULL,
  task_description TEXT,
  task_status TEXT NOT NULL DEFAULT 'drafted',
  priority TEXT NOT NULL DEFAULT 'normal',
  due_at TIMESTAMPTZ,
  source_agent TEXT,
  approval_required BOOLEAN NOT NULL DEFAULT true,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.human_operator_access (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  operator_id UUID NOT NULL REFERENCES public.human_operators(id) ON DELETE CASCADE,
  system_name TEXT NOT NULL,
  access_level TEXT,
  access_status TEXT NOT NULL DEFAULT 'not_requested',
  granted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.human_operator_quality_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  operator_id UUID NOT NULL REFERENCES public.human_operators(id) ON DELETE CASCADE,
  business_id UUID,
  review_period_start DATE,
  review_period_end DATE,
  quality_score NUMERIC,
  timeliness_score NUMERIC,
  accuracy_score NUMERIC,
  notes TEXT,
  recommended_action TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.human_operators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.human_operator_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.human_operator_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.human_operator_quality_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders manage human_operators" ON public.human_operators FOR ALL
  USING (public.has_role(auth.uid(), 'founder') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'founder') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Founders manage human_operator_tasks" ON public.human_operator_tasks FOR ALL
  USING (public.has_role(auth.uid(), 'founder') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'founder') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Founders manage human_operator_access" ON public.human_operator_access FOR ALL
  USING (public.has_role(auth.uid(), 'founder') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'founder') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Founders manage human_operator_quality_reviews" ON public.human_operator_quality_reviews FOR ALL
  USING (public.has_role(auth.uid(), 'founder') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'founder') OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_human_operators_updated BEFORE UPDATE ON public.human_operators
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_human_operator_tasks_updated BEFORE UPDATE ON public.human_operator_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_human_operator_access_updated BEFORE UPDATE ON public.human_operator_access
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_hop_tasks_operator ON public.human_operator_tasks(operator_id);
CREATE INDEX idx_hop_tasks_status ON public.human_operator_tasks(task_status);
CREATE INDEX idx_hop_access_operator ON public.human_operator_access(operator_id);
CREATE INDEX idx_hop_quality_operator ON public.human_operator_quality_reviews(operator_id);
