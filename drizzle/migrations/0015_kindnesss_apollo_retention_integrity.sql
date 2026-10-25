CREATE OR REPLACE FUNCTION public.kindnesss_apollo_retention_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE h jsonb;
BEGIN
 IF TG_OP='DELETE' THEN
  IF OLD.business_name='Kindnesss' THEN RAISE EXCEPTION 'Retained Kindnesss Apollo records cannot be deleted through run cleanup'; END IF;
  RETURN OLD;
 END IF;
 IF OLD.business_name='Kindnesss' THEN
  IF NEW.business_name IS DISTINCT FROM OLD.business_name OR NEW.apollo_person_id IS DISTINCT FROM OLD.apollo_person_id THEN RAISE EXCEPTION 'Retained identity is immutable'; END IF;
  IF nullif(OLD.email,'') IS NOT NULL THEN
   NEW.email:=OLD.email;
   NEW.enrichment_payload:=coalesce(NEW.enrichment_payload,'{}') || coalesce(OLD.enrichment_payload,'{}');
  END IF;
  IF OLD.search_payload ? 'retention_history' THEN
   h:=coalesce(NEW.search_payload->'retention_history',OLD.search_payload->'retention_history');
   IF jsonb_typeof(h)<>'array' OR NOT h @> (OLD.search_payload->'retention_history') THEN RAISE EXCEPTION 'Retention history is append-only'; END IF;
   NEW.search_payload:=NEW.search_payload || jsonb_build_object('retention_history',h);
  END IF;
 END IF;
 RETURN NEW;
END $$;
DO $m$
DECLARE def text;
BEGIN
 SELECT pg_get_functiondef('public.kindnesss_apollo_csv_import(jsonb,text,boolean)'::regprocedure) INTO def;
 def:=replace(def,'outcome text;', 'outcome text; content_sha text;');
 def:=replace(def,'IF p_rows IS NULL OR', 'IF p_preview IS NULL THEN RAISE EXCEPTION ''Explicit preview/commit required''; END IF; IF p_rows IS NULL OR');
 def:=replace(def,'PERFORM pg_advisory_xact_lock', 'content_sha:=encode(extensions.digest(p_rows::text,''sha256''),''hex''); PERFORM pg_advisory_xact_lock');
 def:=replace(def,'description::jsonb->>''sha256''=p_sha256','description::jsonb->>''content_sha256''=content_sha');
 def:=replace(def,'prior:=jsonb_build_object(''sha256'',p_sha256','prior:=jsonb_build_object(''content_sha256'',content_sha,''sha256'',p_sha256');
 EXECUTE def;
END $m$;
CREATE OR REPLACE FUNCTION public.kindnesss_apollo_retention_export() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE rows jsonb; audit uuid; result jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT public._is_founder_or_admin() THEN RAISE EXCEPTION 'Founder/admin required' USING ERRCODE='42501'; END IF;
 SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.apollo_person_id,x.lead_id),'[]') INTO rows FROM (
 SELECT al.id lead_id,al.apollo_person_id,al.apollo_org_id,al.business_name,al.run_id,al.segment_id,al.first_name,al.last_name,al.title,al.company,al.email,
 coalesce(al.enrichment_payload->>'email_status',al.enrichment_payload->>'email_true_status') email_status,
 al.enrichment_payload->>'verification' verification,al.enrichment_payload->>'enriched_at' enriched_at,
 coalesce(al.enrichment_payload->>'source',al.search_payload->>'source') source,al.enrichment_payload->>'mirrored_at' source_mirrored_at,
 al.search_payload->'retention_history' import_history,al.status,al.qualification,al.contact_id,al.created_at,al.updated_at,
 c.is_globally_suppressed,c.hard_bounced,c.sendable_status,c.email_verified_status,c.lawful_basis,c.retention_until,
 bcr.do_not_contact business_do_not_contact,bcr.campaign_eligible,bcr.qualification business_qualification
 FROM public.apollo_leads al
 LEFT JOIN public.contacts c ON c.id=al.contact_id
 LEFT JOIN public.business_contact_relationships bcr ON bcr.contact_id=al.contact_id AND bcr.business_id='640de582-a112-4d16-a221-03c27f00c6ec'
 WHERE al.business_name='Kindnesss'
 ) x;
 result:=jsonb_build_object('count',jsonb_array_length(rows),'emails',(SELECT count(*) FROM public.apollo_leads WHERE business_name='Kindnesss' AND nullif(email,'') IS NOT NULL),'sha256',encode(extensions.digest(rows::text,'sha256'),'hex'),'exported_at',now(),'actor',auth.uid());
 INSERT INTO public.activity_log(business_name,event_type,entity_type,description) VALUES('Kindnesss','apollo_retention_export','apollo_leads',result::text) RETURNING id INTO audit;
 RETURN result || jsonb_build_object('audit_id',audit,'rows',rows);
END $$;