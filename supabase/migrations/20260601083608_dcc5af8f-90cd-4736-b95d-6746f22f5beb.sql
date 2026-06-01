
-- 1. activity_log: tighten INSERT policy to authenticated users only
DROP POLICY IF EXISTS "System can insert activity" ON public.activity_log;
CREATE POLICY "Authenticated users can insert activity"
ON public.activity_log
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 2. customer_quarterly_reports: remove anon SELECT; expose via token RPC
DROP POLICY IF EXISTS "Public can read approved shared reports by token" ON public.customer_quarterly_reports;

CREATE OR REPLACE FUNCTION public.get_customer_quarterly_report_by_token(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.customer_quarterly_reports%ROWTYPE;
BEGIN
  IF p_token IS NULL OR length(p_token) < 16 THEN
    RETURN NULL;
  END IF;
  SELECT * INTO r FROM public.customer_quarterly_reports
   WHERE report_token = p_token
     AND customer_share_allowed = true
     AND approved_at IS NOT NULL
   LIMIT 1;
  IF NOT FOUND THEN RETURN NULL; END IF;
  RETURN jsonb_build_object(
    'id', r.id,
    'report_quarter', r.report_quarter,
    'report_year', r.report_year,
    'reporting_period_start', r.reporting_period_start,
    'reporting_period_end', r.reporting_period_end,
    'customer_facing_summary', r.customer_facing_summary,
    'usage_summary', r.usage_summary,
    'engagement_summary', r.engagement_summary,
    'value_summary', r.value_summary,
    'support_summary', r.support_summary,
    'feedback_summary', r.feedback_summary,
    'satisfaction_summary', r.satisfaction_summary,
    'completed_actions', r.completed_actions,
    'recommendations', r.recommendations,
    'next_quarter_plan', r.next_quarter_plan,
    'customer_share_allowed', r.customer_share_allowed,
    'approved_at', r.approved_at,
    'shared_at', r.shared_at
  );
END;
$$;
REVOKE ALL ON FUNCTION public.get_customer_quarterly_report_by_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_customer_quarterly_report_by_token(text) TO anon, authenticated;

-- 3. customer_survey_requests: remove anon SELECT; expose via token RPC
DROP POLICY IF EXISTS "Public can read by token" ON public.customer_survey_requests;

CREATE OR REPLACE FUNCTION public.get_customer_survey_request_by_token(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.customer_survey_requests%ROWTYPE;
BEGIN
  IF p_token IS NULL OR length(p_token) < 16 THEN
    RETURN NULL;
  END IF;
  SELECT * INTO r FROM public.customer_survey_requests
   WHERE survey_token = p_token
     AND request_status = ANY (ARRAY['sent','approved','draft'])
     AND (expires_at IS NULL OR expires_at > now())
   LIMIT 1;
  IF NOT FOUND THEN RETURN NULL; END IF;
  RETURN jsonb_build_object(
    'id', r.id,
    'business_id', r.business_id,
    'template_id', r.template_id,
    'expires_at', r.expires_at,
    'completed_at', r.completed_at,
    'request_status', r.request_status,
    'survey_token', r.survey_token
  );
END;
$$;
REVOKE ALL ON FUNCTION public.get_customer_survey_request_by_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_customer_survey_request_by_token(text) TO anon, authenticated;

-- 4. partner-documents bucket: ownership-scoped policies (partner_id → profiles.id → profiles.user_id)
DROP POLICY IF EXISTS "Partners can view partner-documents" ON storage.objects;
DROP POLICY IF EXISTS "Partners can upload to partner-documents" ON storage.objects;

CREATE POLICY "Partners can view own partner-documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'partner-documents'
  AND (
    has_role(auth.uid(), 'founder'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1
      FROM public.partner_documents pd
      JOIN public.partner_opportunities po ON po.id = pd.opportunity_id
      JOIN public.profiles pf ON pf.id = po.partner_id
      WHERE pd.file_path = storage.objects.name
        AND pf.user_id = auth.uid()
    )
  )
);

CREATE POLICY "Partners can upload own partner-documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'partner-documents'
  AND (
    has_role(auth.uid(), 'founder'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
    OR (
      (storage.foldername(name))[1] = auth.uid()::text
      AND EXISTS (SELECT 1 FROM public.profiles pf WHERE pf.user_id = auth.uid())
    )
  )
);

-- 5. project-documents bucket: ownership-scoped SELECT (projects.client_id → profiles.id → profiles.user_id)
DROP POLICY IF EXISTS "Clients can view own project documents" ON storage.objects;

CREATE POLICY "Clients can view own project documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'project-documents'
  AND (
    has_role(auth.uid(), 'founder'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1
      FROM public.project_documents pd
      JOIN public.projects pr ON pr.id = pd.project_id
      JOIN public.profiles pf ON pf.id = pr.client_id
      WHERE pd.file_path = storage.objects.name
        AND pf.user_id = auth.uid()
    )
  )
);
