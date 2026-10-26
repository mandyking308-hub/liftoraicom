CREATE OR REPLACE FUNCTION public.kindnesss_email_candidate_pool(p_include_rows boolean DEFAULT false) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r jsonb; rows jsonb:='[]'; audit uuid;
BEGIN
 IF auth.uid() IS NULL OR NOT public._is_founder_or_admin() THEN RAISE EXCEPTION 'Founder/admin required' USING ERRCODE='42501'; END IF;
 CREATE TEMP TABLE _pool ON COMMIT DROP AS
 WITH e AS (
  SELECT ci.*, lower(trim(ci.primary_email)) em,
   row_number() OVER (PARTITION BY lower(trim(ci.primary_email)) ORDER BY ci.source_row_number, ci.id) rk,
   count(*) OVER (PARTITION BY lower(trim(ci.primary_email))) dup_n,
   coalesce(ci.raw_row->>'Industry','')||' '||coalesce(ci.raw_row->>'Keywords','')||' '||coalesce(ci.company,'') sect
  FROM apollo_contact_intelligence ci
  WHERE ci.business_id='640de582-a112-4d16-a221-03c27f00c6ec' AND nullif(trim(ci.primary_email),'') IS NOT NULL)
 SELECT e.*,
  bool_or(coalesce(x.lists,'') ~* 'neon') OVER (PARTITION BY e.em) neon_any,
  EXISTS(SELECT 1 FROM contacts c WHERE lower(c.email)=e.em AND (c.is_globally_suppressed OR c.hard_bounced OR c.unsubscribed_at IS NOT NULL OR c.do_not_contact_at IS NOT NULL)) crm_suppressed,
  EXISTS(SELECT 1 FROM contacts c JOIN business_contact_relationships b ON b.contact_id=c.id WHERE lower(c.email)=e.em AND b.do_not_contact AND b.business_id='640de582-a112-4d16-a221-03c27f00c6ec') biz_dnc,
  EXISTS(SELECT 1 FROM contacts c WHERE lower(c.email)=e.em) in_crm,
  EXISTS(SELECT 1 FROM contacts c WHERE lower(c.email)=e.em AND (c.last_contacted_at IS NOT NULL OR c.last_replied_at IS NOT NULL)) prior_interaction,
  CASE WHEN e.sect ~* 'foundation|philanthrop' THEN 'foundation'
       WHEN e.sect ~* 'charit|non-?profit|ngo|civic' THEN 'charity'
       WHEN e.sect ~* 'educat|school|academ|college|universit|e-?learning' THEN 'education'
       WHEN e.sect ~* 'care|health|hospital|nursing|medical' THEN 'care_other_undecided'
       WHEN nullif(trim(e.raw_row->>'Industry'),'') IS NOT NULL THEN 'employer'
       ELSE 'care_other_undecided' END segment
 FROM e LEFT JOIN apollo_contact_intelligence x ON x.id=e.id;
 r:=jsonb_build_object(
  'archive_total',(SELECT count(*) FROM apollo_contact_intelligence WHERE business_id='640de582-a112-4d16-a221-03c27f00c6ec'),
  'email_bearing_rows',(SELECT count(*) FROM _pool),
  'unique_emails',(SELECT count(*) FROM _pool WHERE rk=1),
  'duplicate_rows',(SELECT count(*) FROM _pool WHERE rk>1),
  'neoncandy_excluded',(SELECT count(*) FROM _pool WHERE rk=1 AND neon_any),
  'hard_suppressed',(SELECT count(*) FROM _pool WHERE rk=1 AND (crm_suppressed OR biz_dnc OR coalesce(raw_row->>'Email Bounced','') ~* '^(true|yes|1)$' OR founder_mark='excluded')),
  'hard_suppressed_also_neoncandy',(SELECT count(*) FROM _pool WHERE rk=1 AND neon_any AND (crm_suppressed OR biz_dnc)),
  'net_kindnesss_audience',(SELECT count(*) FROM _pool WHERE rk=1 AND NOT neon_any AND NOT crm_suppressed AND NOT biz_dnc AND coalesce(raw_row->>'Email Bounced','') !~* '^(true|yes|1)$' AND founder_mark IS DISTINCT FROM 'excluded'),
  'deliverability_review_catch_all',(SELECT count(*) FROM _pool WHERE rk=1 AND 'catch_all'=ANY(readiness_reasons)),
  'deliverability_review_not_verified',(SELECT count(*) FROM _pool WHERE rk=1 AND primary_email_status !~* '^verified$'),
  'apollo_email_status',(SELECT jsonb_object_agg(coalesce(nullif(primary_email_status,''),'(blank)'),n) FROM (SELECT primary_email_status,count(*) n FROM _pool GROUP BY 1) s),
  'already_in_crm',(SELECT count(*) FROM _pool WHERE rk=1 AND in_crm),
  'prior_interaction',(SELECT count(*) FROM _pool WHERE rk=1 AND prior_interaction),
  'net_by_segment',(SELECT jsonb_object_agg(segment,n) FROM (SELECT segment,count(*) n FROM _pool WHERE rk=1 AND NOT neon_any AND NOT crm_suppressed AND NOT biz_dnc AND founder_mark IS DISTINCT FROM 'excluded' GROUP BY 1) g),
  'note','Counts are live. Catch-all and non-verified addresses stay in the pool, flagged for deliverability review. Not a legal clearance; no enrolment or sending.',
  'generated_at',now());
 IF p_include_rows THEN
  SELECT coalesce(jsonb_agg(jsonb_build_object(
   'email',em,'segment',segment,'apollo_contact_id',apollo_contact_id,'apollo_account_id',apollo_account_id,'first_name',first_name,'last_name',last_name,'title',title,'company',company,
   'email_status',primary_email_status,'catch_all',raw_row->>'Primary Email Catch-all Status','seniority',raw_row->>'Seniority','departments',raw_row->>'Departments',
   'industry',raw_row->>'Industry','employees',raw_row->>'# Employees','website',raw_row->>'Website','person_linkedin',raw_row->>'Person Linkedin Url','company_linkedin',raw_row->>'Company Linkedin Url',
   'city',raw_row->>'City','country',raw_row->>'Country','company_country',raw_row->>'Company Country','lists',lists,
   'flag_neoncandy',neon_any,'flag_hard_suppressed',(crm_suppressed OR biz_dnc OR coalesce(raw_row->>'Email Bounced','') ~* '^(true|yes|1)$' OR founder_mark='excluded'),
   'flag_deliverability_review',('catch_all'=ANY(readiness_reasons) OR primary_email_status !~* '^verified$'),'in_crm',in_crm,'prior_interaction',prior_interaction,'duplicate_rows',dup_n
  ) ORDER BY segment, em),'[]') INTO rows FROM _pool WHERE rk=1;
  INSERT INTO activity_log(business_name,event_type,entity_type,description) VALUES('Kindnesss','kindnesss_email_pool_export','apollo_contact_intelligence',jsonb_build_object('rows',jsonb_array_length(rows),'actor',auth.uid())::text) RETURNING id INTO audit;
  r:=r||jsonb_build_object('rows',rows,'audit_id',audit);
 END IF;
 RETURN r;
END $$;
REVOKE ALL ON FUNCTION public.kindnesss_email_candidate_pool(boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.kindnesss_email_candidate_pool(boolean) TO authenticated;