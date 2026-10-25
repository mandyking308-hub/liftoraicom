CREATE OR REPLACE FUNCTION public.kindnesss_apollo_retention_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF TG_OP='DELETE' THEN
  IF OLD.business_name='Kindnesss' THEN RAISE EXCEPTION 'Retained Kindnesss Apollo records cannot be deleted through run cleanup'; END IF;
  RETURN OLD;
 END IF;
 IF OLD.business_name='Kindnesss' AND nullif(OLD.email,'') IS NOT NULL AND (nullif(NEW.email,'') IS NULL OR (NEW.email IS DISTINCT FROM OLD.email AND lower(coalesce(NEW.enrichment_payload->>'email_status',NEW.enrichment_payload->>'email_true_status','')) <> 'verified')) THEN
  NEW.email:=OLD.email; NEW.enrichment_payload:=OLD.enrichment_payload;
 END IF;
 IF OLD.business_name='Kindnesss' AND OLD.search_payload ? 'retention_history' THEN
  NEW.search_payload:=NEW.search_payload || jsonb_build_object('retention_history',coalesce(NEW.search_payload->'retention_history',OLD.search_payload->'retention_history'));
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER kindnesss_apollo_retention_guard BEFORE UPDATE OR DELETE ON public.apollo_leads FOR EACH ROW EXECUTE FUNCTION public.kindnesss_apollo_retention_guard();

CREATE OR REPLACE FUNCTION public.kindnesss_apollo_csv_import(p_rows jsonb,p_sha256 text,p_preview boolean DEFAULT true) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r jsonb; l public.apollo_leads%ROWTYPE; seg uuid; run uuid; matched integer:=0; added integer:=0; conflicts integer:=0; emails integer:=0; n integer; pid text; em text; prior jsonb; outcome text;
BEGIN
 IF auth.uid() IS NULL OR NOT public._is_founder_or_admin() THEN RAISE EXCEPTION 'Founder/admin required' USING ERRCODE='42501'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.businesses WHERE id='640de582-a112-4d16-a221-03c27f00c6ec' AND name='Kindnesss' AND archived_at IS NULL) THEN RAISE EXCEPTION 'Active business mismatch'; END IF;
 IF p_rows IS NULL OR jsonb_typeof(p_rows)<>'array' OR jsonb_array_length(p_rows) NOT BETWEEN 1 AND 10000 OR octet_length(p_rows::text)>10000000 OR p_sha256 !~ '^[a-f0-9]{64}$' OR p_sha256 IS NULL THEN RAISE EXCEPTION 'Invalid batch'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_rows) x WHERE jsonb_typeof(x)<>'object' OR coalesce(x->>'apollo_person_id','') !~ '^[a-zA-Z0-9_-]{1,128}$' OR EXISTS(SELECT 1 FROM jsonb_each(x) kv WHERE kv.key NOT IN ('apollo_person_id','first_name','last_name','title','company','email','email_status','enriched_at') OR jsonb_typeof(kv.value)<>'string' OR length(kv.value::text)>2000)) THEN RAISE EXCEPTION 'Invalid row fields'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_rows) x GROUP BY x->>'apollo_person_id' HAVING count(*)>1) THEN RAISE EXCEPTION 'Duplicate person IDs in batch'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('kindnesss-apollo-retention',0));
 SELECT description::jsonb INTO prior FROM public.activity_log WHERE business_name='Kindnesss' AND event_type='apollo_retention_import' AND description::jsonb->>'sha256'=p_sha256 LIMIT 1;
 IF prior IS NOT NULL THEN RETURN prior || jsonb_build_object('replayed',true); END IF;
 SELECT id INTO seg FROM public.apollo_sync_segments WHERE business_name='Kindnesss' ORDER BY created_at,id LIMIT 1;
 IF seg IS NULL THEN RAISE EXCEPTION 'Existing Kindnesss segment required'; END IF;
 IF NOT p_preview THEN INSERT INTO public.apollo_sync_runs(segment_id,business_name,status,triggered_by,apollo_credits_used) VALUES(seg,'Kindnesss','importing',auth.uid(),0) RETURNING id INTO run; END IF;
 FOR r IN SELECT value FROM jsonb_array_elements(p_rows) LOOP
  pid:=r->>'apollo_person_id'; em:=lower(btrim(coalesce(r->>'email','')));
  IF em<>'' AND em !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN RAISE EXCEPTION 'Invalid email'; END IF;
  IF coalesce(r->>'enriched_at','')<>'' THEN
   IF r->>'enriched_at' !~ '^\d{4}-\d{2}-\d{2}T.*(Z|[+-]\d{2}:\d{2})$' THEN RAISE EXCEPTION 'Explicit timestamp required'; END IF;
   PERFORM (r->>'enriched_at')::timestamptz;
  END IF;
  SELECT count(*) INTO n FROM public.apollo_leads WHERE business_name='Kindnesss' AND apollo_person_id=pid;
  IF n>1 THEN RAISE EXCEPTION 'Ambiguous existing Apollo ID; founder review required'; END IF;
  SELECT * INTO l FROM public.apollo_leads WHERE business_name='Kindnesss' AND apollo_person_id=pid FOR UPDATE;
  outcome:='inserted';
  IF l.id IS NOT NULL THEN
   matched:=matched+1; outcome:='matched';
   IF nullif(l.email,'') IS NOT NULL AND em<>'' AND lower(l.email)<>em THEN conflicts:=conflicts+1; outcome:='email_conflict_preserved'; END IF;
  ELSE added:=added+1; END IF;
  IF em<>'' THEN emails:=emails+1; END IF;
  IF NOT p_preview THEN
   IF l.id IS NULL THEN
    INSERT INTO public.apollo_leads(run_id,segment_id,business_name,apollo_person_id,first_name,last_name,title,company,email,has_email_flag,search_payload,enrichment_payload,status)
    VALUES(run,seg,'Kindnesss',pid,nullif(r->>'first_name',''),nullif(r->>'last_name',''),nullif(r->>'title',''),nullif(r->>'company',''),nullif(em,''),em<>'',jsonb_build_object('source','apollo_export_csv','retention_history',jsonb_build_array(jsonb_build_object('run_id',run,'source','apollo_export_csv','sha256',p_sha256,'imported_at',now(),'row',r,'outcome',outcome))),jsonb_build_object('source','apollo_export_csv','email_status',r->>'email_status','verification','supplied_claim_not_independently_verified','enriched_at',nullif(r->>'enriched_at','')), 'found');
   ELSE
    UPDATE public.apollo_leads SET
     first_name=coalesce(nullif(first_name,''),nullif(r->>'first_name','')),last_name=coalesce(nullif(last_name,''),nullif(r->>'last_name','')),title=coalesce(nullif(title,''),nullif(r->>'title','')),company=coalesce(nullif(company,''),nullif(r->>'company','')),
     email=coalesce(nullif(email,''),nullif(em,'')),
     enrichment_payload=CASE WHEN nullif(email,'') IS NULL AND em<>'' THEN coalesce(enrichment_payload,'{}') || jsonb_build_object('source','apollo_export_csv','email_status',r->>'email_status','verification','supplied_claim_not_independently_verified','enriched_at',nullif(r->>'enriched_at','')) ELSE enrichment_payload END,
     search_payload=search_payload || jsonb_build_object('retention_history',coalesce(search_payload->'retention_history','[]') || jsonb_build_array(jsonb_build_object('run_id',run,'source','apollo_export_csv','sha256',p_sha256,'imported_at',now(),'row',r,'outcome',outcome)))
    WHERE id=l.id AND business_name='Kindnesss';
   END IF;
  END IF;
 END LOOP;
 prior:=jsonb_build_object('sha256',p_sha256,'run_id',run,'rows',jsonb_array_length(p_rows),'matched',matched,'inserted',added,'email_conflicts',conflicts,'emails_supplied',emails,'preview',p_preview,'actor',auth.uid(),'credits_spent',0);
 IF NOT p_preview THEN
  UPDATE public.apollo_sync_runs SET status='completed',people_found=jsonb_array_length(p_rows),contacts_new=added,contacts_updated=matched,emails_returned=emails,completed_at=now() WHERE id=run;
  INSERT INTO public.activity_log(business_name,event_type,entity_type,entity_id,description) VALUES('Kindnesss','apollo_retention_import','apollo_sync_runs',run,prior::text);
 END IF;
 RETURN prior;
END $$;

CREATE OR REPLACE FUNCTION public.kindnesss_apollo_retention_export() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE rows jsonb; audit uuid; result jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT public._is_founder_or_admin() THEN RAISE EXCEPTION 'Founder/admin required' USING ERRCODE='42501'; END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object('lead_id',id,'apollo_person_id',apollo_person_id,'apollo_org_id',apollo_org_id,'business_name',business_name,'run_id',run_id,'segment_id',segment_id,'first_name',first_name,'last_name',last_name,'title',title,'company',company,'email',email,'email_status',coalesce(enrichment_payload->>'email_status',enrichment_payload->>'email_true_status'),'verification',enrichment_payload->>'verification','enriched_at',enrichment_payload->>'enriched_at','source',coalesce(enrichment_payload->>'source',search_payload->>'source'),'status',status,'qualification',qualification,'contact_id',contact_id,'created_at',created_at,'updated_at',updated_at,'search_payload',search_payload,'enrichment_payload',enrichment_payload) ORDER BY apollo_person_id,id),'[]') INTO rows FROM public.apollo_leads WHERE business_name='Kindnesss';
 result:=jsonb_build_object('count',jsonb_array_length(rows),'emails',(SELECT count(*) FROM public.apollo_leads WHERE business_name='Kindnesss' AND nullif(email,'') IS NOT NULL),'sha256',encode(extensions.digest(rows::text,'sha256'),'hex'),'exported_at',now(),'actor',auth.uid());
 INSERT INTO public.activity_log(business_name,event_type,entity_type,description) VALUES('Kindnesss','apollo_retention_export','apollo_leads',result::text) RETURNING id INTO audit;
 RETURN result || jsonb_build_object('audit_id',audit,'rows',rows);
END $$;
REVOKE ALL ON FUNCTION public.kindnesss_apollo_csv_import(jsonb,text,boolean) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.kindnesss_apollo_retention_export() FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.kindnesss_apollo_retention_guard() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.kindnesss_apollo_csv_import(jsonb,text,boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.kindnesss_apollo_retention_export() TO authenticated;