ALTER TABLE public.ai_go_live_readiness
  DROP CONSTRAINT IF EXISTS ai_go_live_readiness_current_status_check;

UPDATE public.ai_go_live_readiness
  SET current_status = 'live_healthy'
  WHERE current_status IN (
    'not_ready',
    'ready_for_simulation_only',
    'ready_for_controlled_internal_use',
    'ready_for_limited_live_use',
    'ready_for_scale'
  );

ALTER TABLE public.ai_go_live_readiness
  ALTER COLUMN current_status SET DEFAULT 'live_healthy';

ALTER TABLE public.ai_go_live_readiness
  ADD CONSTRAINT ai_go_live_readiness_current_status_check
  CHECK (current_status IN (
    'live_healthy',
    'live_watch',
    'live_budget_warning',
    'live_approval_required',
    'live_cost_alert',
    'live_risk_alert',
    'live_paused_by_founder',
    'live_paused_by_stop_loss'
  ));

INSERT INTO public.ai_go_live_readiness (current_status)
SELECT 'live_healthy'
WHERE NOT EXISTS (SELECT 1 FROM public.ai_go_live_readiness);