
-- Optimisation insights table for storing generated recommendations
CREATE TABLE public.optimisation_insights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  system_id UUID REFERENCES public.monitored_systems(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL DEFAULT 'workflow',
  entity_id UUID,
  entity_name TEXT NOT NULL DEFAULT '',
  insight_type TEXT NOT NULL DEFAULT 'performance',
  title TEXT NOT NULL,
  description TEXT,
  recommended_action TEXT,
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.optimisation_insights ENABLE ROW LEVEL SECURITY;

-- Founders can manage all insights
CREATE POLICY "Founders can manage optimisation insights"
  ON public.optimisation_insights FOR ALL
  TO public
  USING (public.has_role(auth.uid(), 'founder'));

-- Clients can view insights for their systems
CREATE POLICY "Clients can view own optimisation insights"
  ON public.optimisation_insights FOR SELECT
  TO public
  USING (system_id IN (
    SELECT id FROM public.monitored_systems
    WHERE client_id IN (
      SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
  ));

-- Updated_at trigger
CREATE TRIGGER update_optimisation_insights_updated_at
  BEFORE UPDATE ON public.optimisation_insights
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
