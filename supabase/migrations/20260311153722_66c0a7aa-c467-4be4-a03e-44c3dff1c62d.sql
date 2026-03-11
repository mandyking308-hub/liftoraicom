
-- Decision recommendations
CREATE TABLE public.decision_recommendations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  category TEXT NOT NULL DEFAULT 'operational',
  affected_system TEXT DEFAULT '',
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'pending',
  decision_maker TEXT DEFAULT '',
  decided_at TIMESTAMP WITH TIME ZONE,
  potential_benefits TEXT DEFAULT '',
  potential_risks TEXT DEFAULT '',
  target_module TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.decision_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders can manage decision recommendations"
  ON public.decision_recommendations FOR ALL
  TO public
  USING (has_role(auth.uid(), 'founder'::app_role));
