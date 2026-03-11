
-- Deployments table
CREATE TABLE public.deployments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  system_name TEXT NOT NULL,
  client_organisation TEXT NOT NULL DEFAULT '',
  architecture_id UUID REFERENCES public.architectures(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'preparation',
  expected_launch_date DATE DEFAULT NULL,
  launched_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.deployments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders can manage deployments" ON public.deployments FOR ALL USING (has_role(auth.uid(), 'founder'::app_role));

-- Deployment stages
CREATE TABLE public.deployment_stages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deployment_id UUID NOT NULL REFERENCES public.deployments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'not_started',
  order_index INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.deployment_stages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders can manage deployment stages" ON public.deployment_stages FOR ALL USING (has_role(auth.uid(), 'founder'::app_role));

-- Deployment checklist
CREATE TABLE public.deployment_checklist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deployment_id UUID NOT NULL REFERENCES public.deployments(id) ON DELETE CASCADE,
  item TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.deployment_checklist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders can manage deployment checklist" ON public.deployment_checklist FOR ALL USING (has_role(auth.uid(), 'founder'::app_role));

-- Deployment logs
CREATE TABLE public.deployment_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deployment_id UUID NOT NULL REFERENCES public.deployments(id) ON DELETE CASCADE,
  event TEXT NOT NULL,
  details TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.deployment_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders can manage deployment logs" ON public.deployment_logs FOR ALL USING (has_role(auth.uid(), 'founder'::app_role));

CREATE TRIGGER update_deployments_updated_at BEFORE UPDATE ON public.deployments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
