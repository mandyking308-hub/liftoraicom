CREATE TABLE IF NOT EXISTS public.ai_go_live_readiness (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  current_status text NOT NULL DEFAULT 'ready_for_simulation_only'
    CHECK (current_status IN (
      'not_ready',
      'ready_for_simulation_only',
      'ready_for_controlled_internal_use',
      'ready_for_limited_live_use',
      'ready_for_scale'
    )),
  evaluated_at timestamptz,
  evaluation_results jsonb NOT NULL DEFAULT '[]'::jsonb,
  founder_confirmations jsonb NOT NULL DEFAULT '{}'::jsonb,
  confirmed_by uuid,
  confirmed_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_go_live_readiness ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_ai_go_live_readiness"
  ON public.ai_go_live_readiness
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_ai_go_live_readiness_updated_at
  BEFORE UPDATE ON public.ai_go_live_readiness
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.ai_go_live_readiness (current_status)
SELECT 'ready_for_simulation_only'
WHERE NOT EXISTS (SELECT 1 FROM public.ai_go_live_readiness);