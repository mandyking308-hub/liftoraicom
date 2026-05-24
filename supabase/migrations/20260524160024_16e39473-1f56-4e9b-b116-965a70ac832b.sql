
CREATE TABLE IF NOT EXISTS public.liftor_build_phase_closeout_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  closeout_name text NOT NULL,
  closeout_phase text NOT NULL,
  closeout_status text NOT NULL DEFAULT 'draft',
  classification text,
  build_start_reference text,
  build_end_reference text,
  command_centre_status text,
  brain_status text,
  business_factory_status text,
  external_go_live_status text,
  provider_status text,
  safety_status text,
  manual_status text,
  next_phase text,
  next_actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  locked_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  open_warnings jsonb NOT NULL DEFAULT '[]'::jsonb,
  handover_summary text,
  is_test_data boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  no_forbidden_action_audit jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.liftor_build_phase_closeout_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders/admins read closeouts"
  ON public.liftor_build_phase_closeout_records FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'));

CREATE POLICY "Founders/admins insert closeouts"
  ON public.liftor_build_phase_closeout_records FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'));

CREATE POLICY "Founders/admins update closeouts"
  ON public.liftor_build_phase_closeout_records FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'));

CREATE TRIGGER update_liftor_build_phase_closeout_records_updated_at
  BEFORE UPDATE ON public.liftor_build_phase_closeout_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
