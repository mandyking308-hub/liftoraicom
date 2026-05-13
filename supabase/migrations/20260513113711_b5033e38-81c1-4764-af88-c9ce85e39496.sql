UPDATE public.apollo_credit_ledger
SET credits_used = 0,
    metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
      'voided', true,
      'void_reason', 'apollo_api_never_called_inner_function_rejected_on_auth',
      'voided_at', now()::text,
      'original_credits_used', 10
    )
WHERE id = 'a5ffcbf8-0361-4b23-b9a3-9fe2f5998a77'
  AND credits_used = 10;

CREATE UNIQUE INDEX IF NOT EXISTS apollo_credit_ledger_run_unique
ON public.apollo_credit_ledger (
  business_id,
  function_source,
  ((metadata->>'run_id'))
)
WHERE (metadata->>'run_id') IS NOT NULL;

INSERT INTO public.system_events (event_type, severity, message, business_name, metadata)
VALUES (
  'apollo.reveal.reconciled',
  'medium',
  'Voided ledger row a5ffcbf8 — Apollo never called (inner function 401). credits_used 10 → 0.',
  'Neon Candy',
  jsonb_build_object(
    'ledger_id', 'a5ffcbf8-0361-4b23-b9a3-9fe2f5998a77',
    'run_id', 'b3cdd5d0-6ad9-4b8e-9451-b323c0f90cf7',
    'apollo_called', false,
    'apollo_credits_actually_spent', 0,
    'orchestrator_recorded', 10,
    'reason', 'orchestrator_passed_service_key_to_apollo-unlock-selected_which_requires_user_jwt'
  )
);
