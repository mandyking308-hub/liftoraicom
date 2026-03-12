ALTER TABLE public.proposals 
ADD COLUMN IF NOT EXISTS ai_estimated_cost_range text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS ai_estimated_cost_breakdown jsonb DEFAULT NULL;