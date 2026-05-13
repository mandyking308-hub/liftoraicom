ALTER TABLE public.business_autopilot_settings
  ADD COLUMN IF NOT EXISTS founder_reveal_amount_next_run integer NULL;

COMMENT ON COLUMN public.business_autopilot_settings.founder_reveal_amount_next_run IS
  'Founder-defined number of Apollo emails to reveal on the next live run. NULL means founder has not approved a reveal amount yet — live reveal is blocked. Cleared automatically after a successful live reveal so the founder must re-approve each batch.';