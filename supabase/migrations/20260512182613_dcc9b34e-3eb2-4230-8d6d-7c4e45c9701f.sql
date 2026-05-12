
CREATE TABLE IF NOT EXISTS public.business_sourcing_briefs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  campaign_id uuid NULL,
  name text NOT NULL,
  target_audience text,
  priority_segments jsonb NOT NULL DEFAULT '{}'::jsonb,
  include_titles text[] NOT NULL DEFAULT '{}',
  exclude_titles text[] NOT NULL DEFAULT '{}',
  include_company_types text[] NOT NULL DEFAULT '{}',
  exclude_company_types text[] NOT NULL DEFAULT '{}',
  geography_preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
  email_requirements jsonb NOT NULL DEFAULT '{}'::jsonb,
  crm_exclusion_rules jsonb NOT NULL DEFAULT '{}'::jsonb,
  apollo_credit_protection jsonb NOT NULL DEFAULT '{}'::jsonb,
  apollo_search_keywords text[] NOT NULL DEFAULT '{}',
  suggested_first_search_size int,
  suggested_first_export_size int,
  suggested_unlock_strategy text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS business_sourcing_briefs_business_active_idx
  ON public.business_sourcing_briefs(business_id, name);

ALTER TABLE public.business_sourcing_briefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders can manage sourcing briefs"
  ON public.business_sourcing_briefs
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'founder'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'founder'::app_role));

CREATE TRIGGER update_business_sourcing_briefs_updated_at
  BEFORE UPDATE ON public.business_sourcing_briefs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
