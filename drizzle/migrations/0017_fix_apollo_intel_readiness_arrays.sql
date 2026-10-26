CREATE OR REPLACE FUNCTION public.apollo_intel_readiness(r jsonb, p_contact uuid, p_mark text, OUT status text, OUT reasons text[]) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE c record; b record;
BEGIN
 reasons:='{}';
 IF nullif(trim(r->>'Email'),'') IS NULL THEN status:='archive_only'; reasons:=ARRAY['no_primary_email']; RETURN; END IF;
 IF coalesce(r->>'Email Status','') !~* '^verified$' THEN reasons:=array_append(reasons,'email_not_verified'); END IF;
 IF coalesce(r->>'Primary Email Catch-all Status','') ~* 'catch' AND coalesce(r->>'Primary Email Catch-all Status','') !~* 'not' THEN reasons:=array_append(reasons,'catch_all'); END IF;
 IF coalesce(r->>'Email Bounced','') ~* '^(true|yes|1)$' THEN reasons:=array_append(reasons,'apollo_bounced'); END IF;
 IF coalesce(r->>'Do Not Call','') ~* '^(true|yes|1)$' THEN reasons:=array_append(reasons,'apollo_do_not_call'); END IF;
 IF coalesce(r->>'Lists','') ~* 'neon' THEN reasons:=array_append(reasons,'neoncandy_list_membership'); END IF;
 IF coalesce(r->>'Email Sent','') ~* '^(true|yes|1)$' OR coalesce(r->>'Replied','') ~* '^(true|yes|1)$' THEN reasons:=array_append(reasons,'prior_sequence_activity'); END IF;
 IF p_contact IS NOT NULL THEN
  SELECT * INTO c FROM contacts WHERE id=p_contact;
  IF c.is_globally_suppressed OR c.hard_bounced OR c.unsubscribed_at IS NOT NULL OR c.do_not_contact_at IS NOT NULL THEN reasons:=array_append(reasons,'crm_suppressed'); END IF;
  IF c.lawful_basis IS NULL THEN reasons:=array_append(reasons,'lawful_basis_missing'); END IF;
  SELECT * INTO b FROM business_contact_relationships WHERE contact_id=p_contact AND business_id='640de582-a112-4d16-a221-03c27f00c6ec';
  IF b.do_not_contact THEN reasons:=array_append(reasons,'business_do_not_contact'); END IF;
 ELSE reasons:=array_append(reasons,'lawful_basis_missing'); END IF;
 IF p_mark='excluded' THEN reasons:=array_append(reasons,'founder_excluded'); END IF;
 status:=CASE WHEN reasons <@ ARRAY['lawful_basis_missing'] THEN 'eligible_for_review' ELSE 'blocked' END;
END $$;
REVOKE ALL ON FUNCTION public.apollo_intel_readiness(jsonb,uuid,text) FROM PUBLIC, anon, authenticated;