DROP POLICY IF EXISTS "Anyone can submit a proposal" ON public.proposals;

CREATE OR REPLACE FUNCTION public.submit_public_proposal(p_payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v record;
  v_id uuid;
BEGIN
  IF p_payload IS NULL OR jsonb_typeof(p_payload) <> 'object' THEN
    RAISE EXCEPTION 'invalid_proposal_payload';
  END IF;

  SELECT * INTO v
  FROM jsonb_to_record(p_payload) AS x(
    company_name text,
    industry text,
    company_size text,
    website_url text,
    contact_name text,
    contact_email text,
    project_types jsonb,
    business_problem text,
    processes_to_automate jsonb,
    project_scale text,
    timeline text,
    ai_suggested_solution text,
    ai_estimated_scope text,
    ai_estimated_timeline text,
    ai_estimated_cost_range text,
    ai_estimated_cost_breakdown jsonb,
    ai_estimated_roi_summary text,
    ai_estimated_annual_savings text,
    ai_estimated_roi_period text,
    ai_estimated_productivity_gain text
  );

  IF length(btrim(v.company_name)) NOT BETWEEN 1 AND 200
     OR length(btrim(v.industry)) NOT BETWEEN 1 AND 120
     OR length(btrim(v.company_size)) NOT BETWEEN 1 AND 80
     OR length(btrim(v.business_problem)) NOT BETWEEN 1 AND 10000
     OR length(btrim(v.project_scale)) NOT BETWEEN 1 AND 120
     OR length(btrim(v.timeline)) NOT BETWEEN 1 AND 120
     OR v.project_types IS NULL
     OR jsonb_typeof(v.project_types) <> 'array'
     OR jsonb_array_length(v.project_types) NOT BETWEEN 1 AND 20
     OR v.processes_to_automate IS NULL
     OR jsonb_typeof(v.processes_to_automate) <> 'array'
     OR jsonb_array_length(v.processes_to_automate) NOT BETWEEN 1 AND 50
     OR (v.contact_email IS NOT NULL AND v.contact_email !~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$')
     OR (v.website_url IS NOT NULL AND v.website_url !~* '^https?://') THEN
    RAISE EXCEPTION 'invalid_proposal_submission';
  END IF;

  INSERT INTO public.proposals (
    company_name, industry, company_size, website_url, contact_name, contact_email,
    project_types, business_problem, processes_to_automate, project_scale, timeline,
    ai_suggested_solution, ai_estimated_scope, ai_estimated_timeline,
    ai_estimated_cost_range, ai_estimated_cost_breakdown, ai_estimated_roi_summary,
    ai_estimated_annual_savings, ai_estimated_roi_period, ai_estimated_productivity_gain,
    status, lead_status, crm_reconciliation_status
  ) VALUES (
    v.company_name, v.industry, v.company_size, v.website_url, v.contact_name, v.contact_email,
    ARRAY(SELECT jsonb_array_elements_text(v.project_types)),
    v.business_problem,
    ARRAY(SELECT jsonb_array_elements_text(v.processes_to_automate)),
    v.project_scale, v.timeline,
    v.ai_suggested_solution, v.ai_estimated_scope, v.ai_estimated_timeline,
    v.ai_estimated_cost_range, v.ai_estimated_cost_breakdown, v.ai_estimated_roi_summary,
    v.ai_estimated_annual_savings, v.ai_estimated_roi_period, v.ai_estimated_productivity_gain,
    'submitted', 'new_inquiry', 'pending'
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.submit_public_proposal(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_public_proposal(jsonb) TO anon, authenticated, service_role;
COMMENT ON FUNCTION public.submit_public_proposal(jsonb) IS 'Validated public proposal enquiry entry point. Forces safe internal states; existing trigger performs CRM reconciliation.';