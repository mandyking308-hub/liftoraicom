CREATE TABLE IF NOT EXISTS public.business_setup_tunnel_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NULL REFERENCES public.businesses(id) ON DELETE SET NULL,
  draft_business_name text NOT NULL,
  is_draft boolean NOT NULL DEFAULT true,
  setup_status text NOT NULL DEFAULT 'in_progress',
  current_step text NULL,
  overall_completeness integer NOT NULL DEFAULT 0,
  steps_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  missing_context_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  safety_warnings_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS business_setup_tunnel_runs_business_id_idx
  ON public.business_setup_tunnel_runs(business_id);
CREATE INDEX IF NOT EXISTS business_setup_tunnel_runs_updated_at_idx
  ON public.business_setup_tunnel_runs(updated_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_setup_tunnel_runs TO authenticated;
GRANT ALL ON public.business_setup_tunnel_runs TO service_role;

ALTER TABLE public.business_setup_tunnel_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders manage setup tunnel runs"
  ON public.business_setup_tunnel_runs
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_business_setup_tunnel_runs_updated_at
  BEFORE UPDATE ON public.business_setup_tunnel_runs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
