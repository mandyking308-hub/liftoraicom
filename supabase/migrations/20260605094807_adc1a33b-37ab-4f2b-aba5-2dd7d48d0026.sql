
-- 1. Manual acknowledgement on worker profiles
ALTER TABLE public.worker_profiles
  ADD COLUMN IF NOT EXISTS manual_acknowledged_version text,
  ADD COLUMN IF NOT EXISTS manual_acknowledged_at timestamptz;

-- 2. Runbook fields
ALTER TABLE public.automation_runbooks
  ADD COLUMN IF NOT EXISTS step_by_step_process text,
  ADD COLUMN IF NOT EXISTS founder_approval_required boolean NOT NULL DEFAULT true;

-- 3. Worker manuals
CREATE TABLE IF NOT EXISTS public.worker_manuals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL,
  manual_title text NOT NULL,
  manual_version text NOT NULL,
  manual_body text,
  status text NOT NULL DEFAULT 'draft',
  founder_approved_by uuid,
  founder_approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.worker_manuals TO authenticated;
GRANT ALL ON public.worker_manuals TO service_role;
ALTER TABLE public.worker_manuals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founder manages manuals" ON public.worker_manuals FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Workers read active manual for their role" ON public.worker_manuals FOR SELECT TO authenticated
  USING (status = 'active' AND EXISTS (
    SELECT 1 FROM public.worker_profiles wp
    WHERE wp.user_id = auth.uid() AND wp.role = worker_manuals.role
  ));

-- 4. Worker manual sections
CREATE TABLE IF NOT EXISTS public.worker_manual_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manual_id uuid REFERENCES public.worker_manuals(id) ON DELETE CASCADE,
  section_key text NOT NULL,
  section_title text NOT NULL,
  section_body text,
  display_order integer NOT NULL DEFAULT 0,
  applies_to_task_types jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.worker_manual_sections TO authenticated;
GRANT ALL ON public.worker_manual_sections TO service_role;
ALTER TABLE public.worker_manual_sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founder manages manual sections" ON public.worker_manual_sections FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Workers read sections of active manuals for their role" ON public.worker_manual_sections FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.worker_manuals m
    JOIN public.worker_profiles wp ON wp.role = m.role
    WHERE m.id = worker_manual_sections.manual_id
      AND m.status = 'active'
      AND wp.user_id = auth.uid()
  ));

-- 5. Worker help requests
CREATE TABLE IF NOT EXISTS public.worker_help_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id uuid REFERENCES public.worker_profiles(id) ON DELETE CASCADE,
  task_id uuid REFERENCES public.worker_tasks(id) ON DELETE SET NULL,
  question text NOT NULL,
  answer text,
  source_manual_sections jsonb NOT NULL DEFAULT '[]'::jsonb,
  escalated_to_founder boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'answered',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.worker_help_requests TO authenticated;
GRANT ALL ON public.worker_help_requests TO service_role;
ALTER TABLE public.worker_help_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founder reads all help" ON public.worker_help_requests FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Worker inserts own help" ON public.worker_help_requests FOR INSERT TO authenticated
  WITH CHECK (worker_id = public.current_worker_id());
CREATE POLICY "Worker reads own help" ON public.worker_help_requests FOR SELECT TO authenticated
  USING (worker_id = public.current_worker_id());

-- 6. Triggers
DO $$ BEGIN
  CREATE TRIGGER trg_worker_manuals_updated BEFORE UPDATE ON public.worker_manuals
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_worker_manuals_role ON public.worker_manuals(role, status);
CREATE INDEX IF NOT EXISTS idx_worker_manual_sections_manual ON public.worker_manual_sections(manual_id, display_order);
CREATE INDEX IF NOT EXISTS idx_worker_help_worker ON public.worker_help_requests(worker_id, created_at DESC);
