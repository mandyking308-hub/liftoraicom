CREATE TABLE public.apollo_intel_import_batches(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 business_id uuid NOT NULL,
 file_sha256 text NOT NULL CHECK (file_sha256 ~ '^[0-9a-f]{64}$'),
 file_name text,
 expected_rows int NOT NULL CHECK (expected_rows BETWEEN 1 AND 10000),
 header jsonb NOT NULL,
 header_mapping jsonb NOT NULL DEFAULT '{}',
 status text NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress','reconciled','incomplete')),
 reconciliation jsonb,
 created_by uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 finalized_at timestamptz,
 UNIQUE(business_id,file_sha256));
CREATE TABLE public.apollo_contact_intelligence(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 business_id uuid NOT NULL,
 apollo_contact_id text NOT NULL,
 apollo_account_id text,
 raw_row jsonb NOT NULL,
 raw_row_sha256 text NOT NULL,
 source_row_number int NOT NULL,
 first_batch_id uuid NOT NULL REFERENCES public.apollo_intel_import_batches(id),
 last_seen_batch_id uuid NOT NULL REFERENCES public.apollo_intel_import_batches(id),
 first_name text, last_name text, title text, company text,
 primary_email text, primary_email_status text, secondary_email text, tertiary_email text,
 lists text,
 contact_id uuid, link_method text,
 readiness_status text NOT NULL DEFAULT 'archive_only' CHECK (readiness_status IN ('archive_only','blocked','eligible_for_review')),
 readiness_reasons text[] NOT NULL DEFAULT '{}',
 founder_mark text CHECK (founder_mark IN ('approved_for_compliance_review','excluded')),
 founder_marked_by uuid, founder_marked_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(business_id,apollo_contact_id));
CREATE INDEX apollo_ci_email_idx ON public.apollo_contact_intelligence(lower(primary_email));
CREATE TABLE public.apollo_intel_import_rows(
 batch_id uuid NOT NULL REFERENCES public.apollo_intel_import_batches(id),
 row_number int NOT NULL CHECK (row_number >= 1),
 apollo_contact_id text, raw_row_sha256 text NOT NULL,
 outcome text NOT NULL CHECK (outcome IN ('inserted','unchanged','conflict','quarantined')),
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(batch_id,row_number));
CREATE TABLE public.apollo_intel_quarantine(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 batch_id uuid NOT NULL REFERENCES public.apollo_intel_import_batches(id),
 row_number int NOT NULL, reason text NOT NULL, raw_row jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(batch_id,row_number));

GRANT SELECT ON public.apollo_intel_import_batches, public.apollo_contact_intelligence, public.apollo_intel_import_rows, public.apollo_intel_quarantine TO authenticated;
GRANT ALL ON public.apollo_intel_import_batches, public.apollo_contact_intelligence, public.apollo_intel_import_rows, public.apollo_intel_quarantine TO service_role;
ALTER TABLE public.apollo_intel_import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apollo_contact_intelligence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apollo_intel_import_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apollo_intel_quarantine ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founder/admin read" ON public.apollo_intel_import_batches FOR SELECT TO authenticated USING (public._is_founder_or_admin());
CREATE POLICY "Founder/admin read" ON public.apollo_contact_intelligence FOR SELECT TO authenticated USING (public._is_founder_or_admin());
CREATE POLICY "Founder/admin read" ON public.apollo_intel_import_rows FOR SELECT TO authenticated USING (public._is_founder_or_admin());
CREATE POLICY "Founder/admin read" ON public.apollo_intel_quarantine FOR SELECT TO authenticated USING (public._is_founder_or_admin());

CREATE OR REPLACE FUNCTION public.apollo_intel_readiness(r jsonb, p_contact uuid, p_mark text, OUT status text, OUT reasons text[]) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE c record; b record;
BEGIN
 reasons:='{}';
 IF nullif(trim(r->>'Email'),'') IS NULL THEN status:='archive_only'; reasons:=ARRAY['no_primary_email']; RETURN; END IF;
 IF coalesce(r->>'Email Status','') !~* '^verified$' THEN reasons:=reasons||'email_not_verified'; END IF;
 IF coalesce(r->>'Primary Email Catch-all Status','') ~* 'catch' AND coalesce(r->>'Primary Email Catch-all Status','') !~* 'not' THEN reasons:=reasons||'catch_all'; END IF;
 IF coalesce(r->>'Email Bounced','') ~* '^(true|yes|1)$' THEN reasons:=reasons||'apollo_bounced'; END IF;
 IF coalesce(r->>'Do Not Call','') ~* '^(true|yes|1)$' THEN reasons:=reasons||'apollo_do_not_call'; END IF;
 IF coalesce(r->>'Lists','') ~* 'neon' THEN reasons:=reasons||'neoncandy_list_membership'; END IF;
 IF coalesce(r->>'Email Sent','') ~* '^(true|yes|1)$' OR coalesce(r->>'Replied','') ~* '^(true|yes|1)$' THEN reasons:=reasons||'prior_sequence_activity'; END IF;
 IF p_contact IS NOT NULL THEN
  SELECT * INTO c FROM contacts WHERE id=p_contact;
  IF c.is_globally_suppressed OR c.hard_bounced OR c.unsubscribed_at IS NOT NULL OR c.do_not_contact_at IS NOT NULL THEN reasons:=reasons||'crm_suppressed'; END IF;
  IF c.lawful_basis IS NULL THEN reasons:=reasons||'lawful_basis_missing'; END IF;
  SELECT * INTO b FROM business_contact_relationships WHERE contact_id=p_contact AND business_id='640de582-a112-4d16-a221-03c27f00c6ec';
  IF b.do_not_contact THEN reasons:=reasons||'business_do_not_contact'; END IF;
 ELSE reasons:=reasons||'lawful_basis_missing'; END IF;
 IF p_mark='excluded' THEN reasons:=reasons||'founder_excluded'; END IF;
 status:=CASE WHEN reasons <@ ARRAY['lawful_basis_missing'] THEN 'eligible_for_review' ELSE 'blocked' END;
END $$;
REVOKE ALL ON FUNCTION public.apollo_intel_readiness(jsonb,uuid,text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.apollo_intel_import_chunk(p_file_sha256 text, p_file_name text, p_expected_rows int, p_header jsonb, p_rows jsonb, p_preview boolean) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE biz constant uuid:='640de582-a112-4d16-a221-03c27f00c6ec'; bid uuid; e jsonb; raw jsonb; rn int; aid text; sha text; ex record; outc text; cid uuid; lm text; rd record; reason text;
 n_ins int:=0; n_unch int:=0; n_conf int:=0; n_quar int:=0; n_skip int:=0; n_link int:=0;
BEGIN
 IF auth.uid() IS NULL OR NOT public._is_founder_or_admin() THEN RAISE EXCEPTION 'Founder/admin required' USING ERRCODE='42501'; END IF;
 IF p_preview IS NULL THEN RAISE EXCEPTION 'Explicit preview/commit required'; END IF;
 IF p_file_sha256 !~ '^[0-9a-f]{64}$' OR p_expected_rows NOT BETWEEN 1 AND 10000 OR jsonb_typeof(p_header)<>'array' OR NOT p_header ? 'Apollo Contact Id' THEN RAISE EXCEPTION 'Invalid batch header'; END IF;
 IF jsonb_typeof(p_rows)<>'array' OR jsonb_array_length(p_rows) NOT BETWEEN 1 AND 250 THEN RAISE EXCEPTION 'Chunks must contain 1-250 rows'; END IF;
 PERFORM pg_advisory_xact_lock(hashtext('apollo_intel:'||p_file_sha256));
 SELECT id INTO bid FROM apollo_intel_import_batches WHERE business_id=biz AND file_sha256=p_file_sha256;
 IF bid IS NOT NULL AND (SELECT expected_rows<>p_expected_rows OR header<>p_header FROM apollo_intel_import_batches WHERE id=bid) THEN RAISE EXCEPTION 'Batch header/row count mismatch for this file'; END IF;
 IF bid IS NULL AND NOT p_preview THEN
  INSERT INTO apollo_intel_import_batches(business_id,file_sha256,file_name,expected_rows,header,header_mapping,created_by)
  VALUES(biz,p_file_sha256,left(p_file_name,200),p_expected_rows,p_header,(SELECT jsonb_object_agg(h,h) FROM jsonb_array_elements_text(p_header) h),auth.uid()) RETURNING id INTO bid;
 END IF;
 FOR e IN SELECT * FROM jsonb_array_elements(p_rows) LOOP
  rn:=(e->>'row_number')::int; raw:=e->'raw';
  IF rn IS NULL OR rn<1 OR rn>p_expected_rows OR jsonb_typeof(raw)<>'object' THEN RAISE EXCEPTION 'Invalid row envelope'; END IF;
  IF EXISTS(SELECT 1 FROM jsonb_object_keys(raw) k WHERE NOT p_header ? k) THEN RAISE EXCEPTION 'Row % has fields outside the header', rn; END IF;
  IF bid IS NOT NULL AND EXISTS(SELECT 1 FROM apollo_intel_import_rows WHERE batch_id=bid AND row_number=rn) THEN n_skip:=n_skip+1; CONTINUE; END IF;
  aid:=nullif(trim(raw->>'Apollo Contact Id'),''); sha:=encode(extensions.digest(raw::text,'sha256'),'hex'); reason:=NULL;
  IF aid IS NULL OR aid !~ '^[A-Za-z0-9_-]{1,128}$' THEN reason:='missing_or_invalid_apollo_contact_id';
  ELSIF nullif(raw->>'Email','') IS NOT NULL AND raw->>'Email' !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' THEN reason:='malformed_primary_email'; END IF;
  SELECT * INTO ex FROM apollo_contact_intelligence WHERE business_id=biz AND apollo_contact_id=aid;
  IF reason IS NOT NULL THEN outc:='quarantined';
  ELSIF ex.id IS NULL THEN outc:='inserted';
  ELSIF ex.raw_row_sha256=sha THEN outc:='unchanged';
  ELSE outc:='conflict'; reason:=CASE WHEN ex.first_batch_id=bid THEN 'duplicate_apollo_contact_id_in_file' ELSE 'source_values_differ_from_retained_original' END; END IF;
  IF outc='inserted' THEN n_ins:=n_ins+1; ELSIF outc='unchanged' THEN n_unch:=n_unch+1; ELSIF outc='conflict' THEN n_conf:=n_conf+1; ELSE n_quar:=n_quar+1; END IF;
  CONTINUE WHEN p_preview;
  INSERT INTO apollo_intel_import_rows(batch_id,row_number,apollo_contact_id,raw_row_sha256,outcome) VALUES(bid,rn,aid,sha,outc);
  IF reason IS NOT NULL THEN INSERT INTO apollo_intel_quarantine(batch_id,row_number,reason,raw_row) VALUES(bid,rn,reason,raw); END IF;
  IF outc='unchanged' THEN UPDATE apollo_contact_intelligence SET last_seen_batch_id=bid, updated_at=now() WHERE id=ex.id; END IF;
  IF outc='inserted' THEN
   cid:=NULL; lm:=NULL;
   SELECT id INTO cid FROM contacts WHERE apollo_person_id=aid LIMIT 1; IF cid IS NOT NULL THEN lm:='apollo_contact_id'; END IF;
   IF cid IS NULL AND raw->>'Email Status' ~* '^verified$' AND nullif(raw->>'Email','') IS NOT NULL AND (SELECT count(*) FROM contacts WHERE lower(email)=lower(raw->>'Email'))=1 THEN
    SELECT id INTO cid FROM contacts WHERE lower(email)=lower(raw->>'Email'); lm:='verified_email_exact'; END IF;
   IF cid IS NOT NULL THEN n_link:=n_link+1; END IF;
   rd:=public.apollo_intel_readiness(raw,cid,NULL);
   INSERT INTO apollo_contact_intelligence(business_id,apollo_contact_id,apollo_account_id,raw_row,raw_row_sha256,source_row_number,first_batch_id,last_seen_batch_id,first_name,last_name,title,company,primary_email,primary_email_status,secondary_email,tertiary_email,lists,contact_id,link_method,readiness_status,readiness_reasons)
   VALUES(biz,aid,nullif(raw->>'Apollo Account Id',''),raw,sha,rn,bid,bid,raw->>'First Name',raw->>'Last Name',raw->>'Title',raw->>'Company Name',nullif(lower(trim(raw->>'Email')),''),raw->>'Email Status',nullif(raw->>'Secondary Email',''),nullif(raw->>'Tertiary Email',''),raw->>'Lists',cid,lm,rd.status,rd.reasons);
  END IF;
 END LOOP;
 RETURN jsonb_build_object('batch_id',bid,'preview',p_preview,'inserted',n_ins,'unchanged',n_unch,'conflicts',n_conf,'quarantined',n_quar,'already_imported',n_skip,'linked_to_crm',n_link);
END $$;

CREATE OR REPLACE FUNCTION public.apollo_intel_finalize(p_batch_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE b record; got int; r jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT public._is_founder_or_admin() THEN RAISE EXCEPTION 'Founder/admin required' USING ERRCODE='42501'; END IF;
 SELECT * INTO b FROM apollo_intel_import_batches WHERE id=p_batch_id; IF b.id IS NULL THEN RAISE EXCEPTION 'Unknown batch'; END IF;
 SELECT count(*) INTO got FROM apollo_intel_import_rows WHERE batch_id=p_batch_id;
 r:=jsonb_build_object('expected_rows',b.expected_rows,'received_rows',got,'columns',jsonb_array_length(b.header),'file_sha256',b.file_sha256,
  'outcomes',(SELECT coalesce(jsonb_object_agg(outcome,n),'{}') FROM (SELECT outcome,count(*) n FROM apollo_intel_import_rows WHERE batch_id=p_batch_id GROUP BY 1) x),
  'rows_sha256',(SELECT encode(extensions.digest(string_agg(raw_row_sha256,'' ORDER BY row_number),'sha256'),'hex') FROM apollo_intel_import_rows WHERE batch_id=p_batch_id),
  'blank_primary_retained',(SELECT count(*) FROM apollo_contact_intelligence WHERE first_batch_id=p_batch_id AND primary_email IS NULL),
  'readiness',(SELECT coalesce(jsonb_object_agg(readiness_status,n),'{}') FROM (SELECT readiness_status,count(*) n FROM apollo_contact_intelligence WHERE first_batch_id=p_batch_id GROUP BY 1) y));
 UPDATE apollo_intel_import_batches SET status=CASE WHEN got=b.expected_rows THEN 'reconciled' ELSE 'incomplete' END, reconciliation=r, finalized_at=now() WHERE id=p_batch_id;
 INSERT INTO activity_log(business_name,event_type,entity_type,description) VALUES('Kindnesss','apollo_intel_import_finalized','apollo_intel_import_batches',(r - 'outcomes')::text);
 RETURN r || jsonb_build_object('status',CASE WHEN got=b.expected_rows THEN 'reconciled' ELSE 'incomplete' END);
END $$;

CREATE OR REPLACE FUNCTION public.apollo_intel_mark(p_id uuid, p_mark text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE x record; rd record;
BEGIN
 IF auth.uid() IS NULL OR NOT public._is_founder_or_admin() THEN RAISE EXCEPTION 'Founder/admin required' USING ERRCODE='42501'; END IF;
 IF p_mark IS NOT NULL AND p_mark NOT IN ('approved_for_compliance_review','excluded') THEN RAISE EXCEPTION 'Invalid mark'; END IF;
 SELECT * INTO x FROM apollo_contact_intelligence WHERE id=p_id; IF x.id IS NULL THEN RAISE EXCEPTION 'Unknown record'; END IF;
 IF p_mark='approved_for_compliance_review' AND x.readiness_status<>'eligible_for_review' THEN RAISE EXCEPTION 'Blocked or archive-only records cannot be approved'; END IF;
 rd:=public.apollo_intel_readiness(x.raw_row,x.contact_id,p_mark);
 UPDATE apollo_contact_intelligence SET founder_mark=p_mark,founder_marked_by=auth.uid(),founder_marked_at=now(),readiness_status=rd.status,readiness_reasons=rd.reasons,updated_at=now() WHERE id=p_id;
 INSERT INTO activity_log(business_name,event_type,entity_type,entity_id,description) VALUES('Kindnesss','apollo_intel_marked','apollo_contact_intelligence',p_id,coalesce(p_mark,'cleared'));
 RETURN jsonb_build_object('id',p_id,'mark',p_mark,'readiness',rd.status);
END $$;
REVOKE ALL ON FUNCTION public.apollo_intel_import_chunk(text,text,int,jsonb,jsonb,boolean), public.apollo_intel_finalize(uuid), public.apollo_intel_mark(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.apollo_intel_import_chunk(text,text,int,jsonb,jsonb,boolean), public.apollo_intel_finalize(uuid), public.apollo_intel_mark(uuid,text) TO authenticated;