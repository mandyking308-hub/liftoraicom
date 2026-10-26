CREATE OR REPLACE FUNCTION public.apollo_intel_promotion_dry_run() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE r jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT public._is_founder_or_admin() THEN RAISE EXCEPTION 'Founder/admin required' USING ERRCODE='42501'; END IF;
 WITH a AS (
  SELECT ci.*, lower(ci.primary_email) em,
   (coalesce(ci.raw_row->>'Industry','')||' '||coalesce(ci.raw_row->>'Keywords','')||' '||coalesce(ci.company,'')) ~* '(educat|school|academ|college|e-learning|primary|secondary)' sector_match,
   EXISTS(SELECT 1 FROM contacts c WHERE lower(c.email)=lower(ci.primary_email)) crm_email,
   EXISTS(SELECT 1 FROM contacts c WHERE lower(c.email)=lower(ci.primary_email) AND (c.is_globally_suppressed OR c.hard_bounced OR c.unsubscribed_at IS NOT NULL OR c.do_not_contact_at IS NOT NULL)) crm_suppressed,
   (SELECT count(*) FROM apollo_contact_intelligence x WHERE lower(x.primary_email)=lower(ci.primary_email)) dup_n
  FROM apollo_contact_intelligence ci WHERE ci.business_id='640de582-a112-4d16-a221-03c27f00c6ec')
 SELECT jsonb_build_object(
  'archive_total',count(*),'primary_email',count(em),'no_primary_email',count(*)-count(em),
  'verified',count(*) FILTER (WHERE em IS NOT NULL AND primary_email_status ~* '^verified$'),
  'catch_all',count(*) FILTER (WHERE 'catch_all'=ANY(readiness_reasons)),
  'not_verified',count(*) FILTER (WHERE 'email_not_verified'=ANY(readiness_reasons)),
  'neoncandy_lists',count(*) FILTER (WHERE 'neoncandy_list_membership'=ANY(readiness_reasons)),
  'apollo_bounced_or_dnc',count(*) FILTER (WHERE readiness_reasons && ARRAY['apollo_bounced','apollo_do_not_call']),
  'prior_sequence_activity',count(*) FILTER (WHERE 'prior_sequence_activity'=ANY(readiness_reasons)),
  'crm_suppressed',count(*) FILTER (WHERE crm_suppressed),
  'already_in_crm_linked',count(contact_id),
  'already_in_crm_by_email',count(*) FILTER (WHERE em IS NOT NULL AND crm_email),
  'duplicate_email_rows',count(*) FILTER (WHERE em IS NOT NULL AND dup_n>1),
  'education_sector_match',count(*) FILTER (WHERE em IS NOT NULL AND sector_match),
  'founder_excluded',count(*) FILTER (WHERE founder_mark='excluded'),
  'eligible_for_review',count(*) FILTER (WHERE readiness_status='eligible_for_review'),
  'promotion_candidates_new_contacts',count(*) FILTER (WHERE readiness_status='eligible_for_review' AND sector_match AND NOT crm_email AND dup_n=1 AND founder_mark IS DISTINCT FROM 'excluded'),
  'promotion_candidates_link_existing',count(*) FILTER (WHERE readiness_status='eligible_for_review' AND crm_email AND NOT crm_suppressed AND contact_id IS NULL),
  'writes_performed',0,'generated_at',now()) INTO r FROM a;
 RETURN r;
END $$;
REVOKE ALL ON FUNCTION public.apollo_intel_promotion_dry_run() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.apollo_intel_promotion_dry_run() TO authenticated;