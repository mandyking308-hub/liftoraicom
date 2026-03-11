
CREATE TABLE public.strategy_insights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  category TEXT NOT NULL DEFAULT 'market_signal',
  confidence_level TEXT NOT NULL DEFAULT 'medium',
  target_industry TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.strategy_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders can manage strategy insights"
  ON public.strategy_insights FOR ALL
  TO public
  USING (has_role(auth.uid(), 'founder'::app_role));
