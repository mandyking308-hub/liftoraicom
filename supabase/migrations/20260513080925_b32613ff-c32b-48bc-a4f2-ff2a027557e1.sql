
ALTER TABLE public.apollo_credit_ledger
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id);

UPDATE public.apollo_credit_ledger acl
SET business_id = b.id
FROM public.businesses b
WHERE acl.business_id IS NULL AND b.name = acl.business_name;

CREATE INDEX IF NOT EXISTS idx_acl_business_id_date ON public.apollo_credit_ledger (business_id, created_at);

DROP TABLE IF EXISTS public.autopilot_run_log;
DROP TABLE IF EXISTS public.founder_decision_queue;
