ALTER TABLE public.proposals 
ADD COLUMN IF NOT EXISTS ai_estimated_roi_summary text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS ai_estimated_annual_savings text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS ai_estimated_roi_period text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS ai_estimated_productivity_gain text DEFAULT NULL;