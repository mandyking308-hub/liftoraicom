CREATE OR REPLACE FUNCTION public.get_proposal_by_token(_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE p public.internal_proposals;
BEGIN
  IF _token IS NULL OR length(_token) < 16 THEN RETURN NULL; END IF;
  SELECT * INTO p FROM public.internal_proposals
   WHERE (view_token = _token OR accept_token = _token)
     AND status IN ('sent','viewed','accepted')
   LIMIT 1;
  IF NOT FOUND THEN RETURN NULL; END IF;

  IF p.status = 'sent' AND p.viewed_at IS NULL THEN
    UPDATE public.internal_proposals
       SET viewed_at = now(), status = 'viewed', updated_at = now()
     WHERE id = p.id;
    p.viewed_at := now();
    p.status := 'viewed';
  END IF;

  RETURN jsonb_build_object(
    'id', p.id, 'title', p.title, 'business_name', p.business_name,
    'suggested_solution', p.suggested_solution, 'estimated_scope', p.estimated_scope,
    'estimated_timeline', p.estimated_timeline, 'estimated_cost_range', p.estimated_cost_range,
    'estimated_cost_breakdown', p.estimated_cost_breakdown,
    'architecture_components', p.architecture_components,
    'estimated_roi_summary', p.estimated_roi_summary,
    'estimated_annual_savings', p.estimated_annual_savings,
    'estimated_roi_period', p.estimated_roi_period,
    'estimated_productivity_gain', p.estimated_productivity_gain,
    'status', p.status, 'accepted_at', p.accepted_at, 'viewed_at', p.viewed_at,
    'accept_token', p.accept_token, 'include_demo', p.include_demo
  );
END;
$function$;