
-- Brain insights table
CREATE TABLE public.brain_insights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  insight_type TEXT NOT NULL DEFAULT 'performance',
  system_affected TEXT DEFAULT '',
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'new',
  source_module TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.brain_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders can manage brain insights"
  ON public.brain_insights FOR ALL
  TO public
  USING (has_role(auth.uid(), 'founder'::app_role));

-- Brain learning records table
CREATE TABLE public.brain_learning_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pattern_description TEXT NOT NULL,
  source_system TEXT DEFAULT '',
  confidence_level TEXT NOT NULL DEFAULT 'medium',
  category TEXT NOT NULL DEFAULT 'automation',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.brain_learning_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders can manage brain learning records"
  ON public.brain_learning_records FOR ALL
  TO public
  USING (has_role(auth.uid(), 'founder'::app_role));

-- Brain recommendations table
CREATE TABLE public.brain_recommendations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  affected_system TEXT DEFAULT '',
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.brain_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders can manage brain recommendations"
  ON public.brain_recommendations FOR ALL
  TO public
  USING (has_role(auth.uid(), 'founder'::app_role));
