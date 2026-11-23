ALTER VIEW public.crm_universal_interaction_log SET (security_invoker = true);
ALTER VIEW public.high_intent_review_queue SET (security_invoker = true);
ALTER VIEW public.crm_spine_summary SET (security_invoker = true);
ALTER VIEW public.lead_lifecycle_summary SET (security_invoker = true);
REVOKE ALL ON public.crm_universal_interaction_log, public.high_intent_review_queue, public.crm_spine_summary, public.lead_lifecycle_summary FROM anon;