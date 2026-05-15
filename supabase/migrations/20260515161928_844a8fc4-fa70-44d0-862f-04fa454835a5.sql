
-- =========================================================
-- Command Centre Module Registry
-- =========================================================

CREATE TABLE IF NOT EXISTS public.command_centre_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_key text NOT NULL UNIQUE,
  module_name text NOT NULL,
  module_category text NOT NULL,
  section_number integer,
  command_centre_section text,
  primary_route text,
  related_routes jsonb NOT NULL DEFAULT '[]'::jsonb,
  business_scoped boolean NOT NULL DEFAULT true,
  global_module boolean NOT NULL DEFAULT false,
  status_source text,
  readiness_function text,
  component_name text,
  enabled boolean NOT NULL DEFAULT true,
  required_for_core boolean NOT NULL DEFAULT false,
  required_for_25_business_scale boolean NOT NULL DEFAULT false,
  required_for_global_brain boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.command_centre_modules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Founder/admin manage modules" ON public.command_centre_modules;
CREATE POLICY "Founder/admin manage modules"
  ON public.command_centre_modules
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'));

DROP TRIGGER IF EXISTS trg_command_centre_modules_updated_at ON public.command_centre_modules;
CREATE TRIGGER trg_command_centre_modules_updated_at
  BEFORE UPDATE ON public.command_centre_modules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_ccm_category ON public.command_centre_modules(module_category);
CREATE INDEX IF NOT EXISTS idx_ccm_enabled ON public.command_centre_modules(enabled);

-- =========================================================
-- Per-business module status
-- =========================================================

CREATE TABLE IF NOT EXISTS public.business_module_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  module_key text NOT NULL,
  status text NOT NULL DEFAULT 'not_checked',
  readiness_score numeric,
  enabled boolean NOT NULL DEFAULT false,
  configured boolean NOT NULL DEFAULT false,
  live_internal boolean NOT NULL DEFAULT false,
  external_actions_enabled boolean NOT NULL DEFAULT false,
  blockers jsonb NOT NULL DEFAULT '[]'::jsonb,
  next_action text,
  last_checked_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, module_key)
);

ALTER TABLE public.business_module_status ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Founder/admin manage business module status" ON public.business_module_status;
CREATE POLICY "Founder/admin manage business module status"
  ON public.business_module_status
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'));

DROP TRIGGER IF EXISTS trg_bms_updated_at ON public.business_module_status;
CREATE TRIGGER trg_bms_updated_at
  BEFORE UPDATE ON public.business_module_status
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_bms_business ON public.business_module_status(business_id);
CREATE INDEX IF NOT EXISTS idx_bms_module ON public.business_module_status(module_key);
CREATE INDEX IF NOT EXISTS idx_bms_status ON public.business_module_status(status);
