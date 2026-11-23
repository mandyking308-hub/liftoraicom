ALTER VIEW public.proposal_crm_reconciliation SET (security_invoker = true);
REVOKE ALL ON public.proposal_crm_reconciliation FROM anon;