
-- Create proposals table to store AI proposal generator submissions
CREATE TABLE public.proposals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name TEXT NOT NULL,
  industry TEXT NOT NULL,
  company_size TEXT NOT NULL,
  website_url TEXT,
  contact_name TEXT,
  contact_email TEXT,
  project_types TEXT[] NOT NULL,
  business_problem TEXT NOT NULL,
  processes_to_automate TEXT[] NOT NULL,
  project_scale TEXT NOT NULL,
  timeline TEXT NOT NULL,
  ai_suggested_solution TEXT,
  ai_estimated_scope TEXT,
  ai_estimated_timeline TEXT,
  status TEXT NOT NULL DEFAULT 'submitted',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (public form, no auth required)
CREATE POLICY "Anyone can submit a proposal" ON public.proposals
  FOR INSERT WITH CHECK (true);

-- No select/update/delete for anonymous users (admin access later)
CREATE POLICY "Service role can read proposals" ON public.proposals
  FOR SELECT USING (false);

-- Timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_proposals_updated_at
  BEFORE UPDATE ON public.proposals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
