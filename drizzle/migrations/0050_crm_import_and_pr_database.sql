-- Customer CRM: founder-only import + search
CREATE INDEX IF NOT EXISTS contacts_email_lower_idx ON public.contacts (lower(email));
CREATE INDEX IF NOT EXISTS contacts_tags_gin_idx ON public.contacts USING gin (tags);

CREATE OR REPLACE FUNCTION public.crm_import_contacts(p_rows jsonb, p_type text, p_source text DEFAULT 'spreadsheet')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r jsonb; v_email text; v_tag text; v_status text; v_existing public.contacts%ROWTYPE;
  n_new int := 0; n_merged int := 0; n_invalid int := 0; n_blocked int := 0;
BEGIN
  IF NOT public._is_founder_or_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF p_type IS NULL OR length(trim(p_type)) = 0 OR length(p_type) > 60 THEN RAISE EXCEPTION 'type_required'; END IF;
  IF jsonb_typeof(p_rows) <> 'array' OR jsonb_array_length(p_rows) > 1000 THEN RAISE EXCEPTION 'batch_too_large'; END IF;
  v_tag := 'type:' || trim(p_type);
  FOR r IN SELECT * FROM jsonb_array_elements(p_rows) LOOP
    v_email := lower(trim(coalesce(r->>'email','')));
    IF v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' THEN n_invalid := n_invalid + 1; CONTINUE; END IF;
    v_status := lower(coalesce(r->>'email_status',''));
    v_status := CASE WHEN v_status IN ('verified','valid','deliverable') THEN 'verified'
                     WHEN v_status LIKE '%catch%' OR v_status IN ('accept_all','risky') THEN 'catch_all_risky'
                     WHEN v_status IN ('invalid','undeliverable','bounced') THEN 'invalid'
                     ELSE 'unknown' END;
    SELECT * INTO v_existing FROM public.contacts WHERE lower(email) = v_email LIMIT 1;
    IF FOUND THEN
      IF v_existing.is_globally_suppressed OR v_existing.hard_bounced OR v_existing.unsubscribed_at IS NOT NULL OR v_existing.do_not_contact_at IS NOT NULL THEN
        n_blocked := n_blocked + 1;
      END IF;
      UPDATE public.contacts SET
        tags = CASE WHEN v_tag = ANY(coalesce(tags,'{}')) THEN tags ELSE array_append(coalesce(tags,'{}'), v_tag) END,
        first_name = coalesce(first_name, nullif(r->>'first_name','')),
        last_name = coalesce(last_name, nullif(r->>'last_name','')),
        name = coalesce(name, nullif(trim(coalesce(r->>'first_name','')||' '||coalesce(r->>'last_name','')),'')),
        company = coalesce(company, nullif(r->>'company','')),
        role = coalesce(role, nullif(r->>'role','')),
        country = coalesce(country, nullif(r->>'country','')),
        phone = coalesce(phone, nullif(r->>'phone','')),
        linkedin_url = coalesce(linkedin_url, nullif(r->>'linkedin_url','')),
        industry = coalesce(industry, nullif(r->>'industry','')),
        updated_at = now()
      WHERE id = v_existing.id;
      n_merged := n_merged + 1;
    ELSE
      INSERT INTO public.contacts (email, first_name, last_name, name, company, role, country, phone, linkedin_url, industry,
        tags, source, data_source, source_collected_at, email_verified_status, sendable_status, compliance_status, lawful_basis, lawful_basis_recorded_at)
      VALUES (v_email, nullif(r->>'first_name',''), nullif(r->>'last_name',''),
        nullif(trim(coalesce(r->>'first_name','')||' '||coalesce(r->>'last_name','')),''),
        nullif(r->>'company',''), nullif(r->>'role',''), nullif(r->>'country',''), nullif(r->>'phone',''),
        nullif(r->>'linkedin_url',''), nullif(r->>'industry',''), ARRAY[v_tag], 'crm_upload', left(coalesce(p_source,'spreadsheet'),120), now(),
        v_status, (CASE WHEN v_status = 'verified' THEN 'sendable' ELSE 'needs_review' END)::contact_sendable_status,
        'outreach_allowed', 'legitimate_interests', now());
      n_new := n_new + 1;
    END IF;
  END LOOP;
  RETURN jsonb_build_object('new', n_new, 'merged', n_merged, 'invalid', n_invalid, 'do_not_contact', n_blocked);
END $$;
REVOKE ALL ON FUNCTION public.crm_import_contacts(jsonb, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.crm_import_contacts(jsonb, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.crm_people_search(p_type text DEFAULT NULL, p_country text DEFAULT NULL, p_search text DEFAULT NULL,
  p_campaign text DEFAULT NULL, p_not_in_campaign boolean DEFAULT false, p_not_contacted_days int DEFAULT NULL,
  p_usable_only boolean DEFAULT false, p_limit int DEFAULT 50, p_offset int DEFAULT 0, p_ids_only boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_total int; v_rows jsonb; v_ids jsonb;
BEGIN
  IF NOT public._is_founder_or_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  CREATE TEMP TABLE IF NOT EXISTS _crm_hits (id uuid) ON COMMIT DROP;
  TRUNCATE _crm_hits;
  INSERT INTO _crm_hits
  SELECT c.id FROM public.contacts c
  WHERE c.archived_at IS NULL AND coalesce(c.is_internal,false) = false
    AND (p_type IS NULL OR ('type:'||p_type) = ANY(coalesce(c.tags,'{}')))
    AND (p_country IS NULL OR c.country ILIKE p_country)
    AND (p_search IS NULL OR c.email ILIKE '%'||p_search||'%' OR c.name ILIKE '%'||p_search||'%' OR c.company ILIKE '%'||p_search||'%')
    AND (NOT p_usable_only OR (c.email_verified_status = 'verified' AND NOT coalesce(c.is_globally_suppressed,false) AND NOT coalesce(c.hard_bounced,false) AND c.unsubscribed_at IS NULL AND c.do_not_contact_at IS NULL))
    AND (p_campaign IS NULL OR (p_not_in_campaign = false AND EXISTS (SELECT 1 FROM public.smartlead_lead_snapshots s WHERE s.provider_campaign_id = p_campaign AND lower(s.email) = lower(c.email))))
    AND (p_campaign IS NULL OR p_not_in_campaign = false OR NOT EXISTS (SELECT 1 FROM public.smartlead_lead_snapshots s WHERE s.provider_campaign_id = p_campaign AND lower(s.email) = lower(c.email)))
    AND (p_campaign IS NOT NULL OR p_not_in_campaign = false OR NOT EXISTS (SELECT 1 FROM public.smartlead_lead_snapshots s WHERE lower(s.email) = lower(c.email)))
    AND (p_not_contacted_days IS NULL OR c.last_contacted_at IS NULL OR c.last_contacted_at < now() - make_interval(days => p_not_contacted_days));
  SELECT count(*) INTO v_total FROM _crm_hits;
  IF p_ids_only THEN
    SELECT coalesce(jsonb_agg(id), '[]') INTO v_ids FROM (SELECT id FROM _crm_hits LIMIT 5000) x;
    RETURN jsonb_build_object('total', v_total, 'ids', v_ids);
  END IF;
  SELECT coalesce(jsonb_agg(row_to_json(t)), '[]') INTO v_rows FROM (
    SELECT c.id, c.email, c.name, c.company, c.role, c.country, c.tags, c.email_verified_status, c.last_contacted_at, c.last_replied_at,
      (coalesce(c.is_globally_suppressed,false) OR coalesce(c.hard_bounced,false) OR c.unsubscribed_at IS NOT NULL OR c.do_not_contact_at IS NOT NULL) AS blocked,
      (SELECT coalesce(jsonb_agg(DISTINCT s.provider_campaign_id), '[]') FROM public.smartlead_lead_snapshots s WHERE lower(s.email) = lower(c.email)) AS campaigns
    FROM public.contacts c JOIN _crm_hits h ON h.id = c.id
    ORDER BY c.created_at DESC LIMIT least(p_limit, 200) OFFSET greatest(p_offset, 0)) t;
  RETURN jsonb_build_object('total', v_total, 'rows', v_rows);
END $$;
REVOKE ALL ON FUNCTION public.crm_people_search(text,text,text,text,boolean,int,boolean,int,int,boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.crm_people_search(text,text,text,text,boolean,int,boolean,int,int,boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.crm_summary()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v jsonb;
BEGIN
  IF NOT public._is_founder_or_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  WITH base AS (SELECT c.* FROM public.contacts c WHERE c.archived_at IS NULL AND coalesce(c.is_internal,false) = false),
  inc AS (SELECT DISTINCT lower(email) e FROM public.smartlead_lead_snapshots)
  SELECT jsonb_build_object(
    'total', (SELECT count(*) FROM base),
    'usable', (SELECT count(*) FROM base WHERE email_verified_status = 'verified' AND NOT coalesce(is_globally_suppressed,false) AND NOT coalesce(hard_bounced,false) AND unsubscribed_at IS NULL AND do_not_contact_at IS NULL),
    'in_campaign', (SELECT count(*) FROM base b WHERE lower(b.email) IN (SELECT e FROM inc)),
    'types', (SELECT coalesce(jsonb_object_agg(t, n), '{}') FROM (SELECT substr(tag, 6) t, count(*) n FROM base, unnest(tags) tag WHERE tag LIKE 'type:%' GROUP BY 1) x),
    'countries', (SELECT coalesce(jsonb_agg(country ORDER BY country), '[]') FROM (SELECT DISTINCT country FROM base WHERE country IS NOT NULL AND country <> '') y)
  ) INTO v;
  RETURN v;
END $$;
REVOKE ALL ON FUNCTION public.crm_summary() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.crm_summary() TO authenticated;

-- PR & Marketing database (separate from customer CRM)
CREATE TABLE public.pr_media_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text, email text, organisation text, role text, category text,
  phone text, website text, country text, continent text,
  tags text[] NOT NULL DEFAULT '{}', notes text, source text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX pr_media_contacts_email_uidx ON public.pr_media_contacts (lower(email)) WHERE email IS NOT NULL;
CREATE INDEX pr_media_contacts_geo_idx ON public.pr_media_contacts (continent, country);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pr_media_contacts TO authenticated;
GRANT ALL ON public.pr_media_contacts TO service_role;
ALTER TABLE public.pr_media_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "founder manages pr contacts" ON public.pr_media_contacts FOR ALL TO authenticated
  USING (public._is_founder_or_admin()) WITH CHECK (public._is_founder_or_admin());

CREATE TABLE public.pr_media_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pr_contact_id uuid NOT NULL REFERENCES public.pr_media_contacts(id) ON DELETE CASCADE,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  direction text NOT NULL DEFAULT 'outbound' CHECK (direction IN ('inbound','outbound','note')),
  channel text NOT NULL DEFAULT 'email', subject text, summary text,
  created_by uuid, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX pr_media_interactions_contact_idx ON public.pr_media_interactions (pr_contact_id, occurred_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pr_media_interactions TO authenticated;
GRANT ALL ON public.pr_media_interactions TO service_role;
ALTER TABLE public.pr_media_interactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "founder manages pr interactions" ON public.pr_media_interactions FOR ALL TO authenticated
  USING (public._is_founder_or_admin()) WITH CHECK (public._is_founder_or_admin());

CREATE OR REPLACE FUNCTION public.pr_media_import(p_rows jsonb, p_source text DEFAULT 'spreadsheet')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r jsonb; v_email text; v_id uuid; n_new int := 0; n_merged int := 0; n_skipped int := 0;
BEGIN
  IF NOT public._is_founder_or_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF jsonb_typeof(p_rows) <> 'array' OR jsonb_array_length(p_rows) > 1000 THEN RAISE EXCEPTION 'batch_too_large'; END IF;
  FOR r IN SELECT * FROM jsonb_array_elements(p_rows) LOOP
    v_email := nullif(lower(trim(coalesce(r->>'email',''))), '');
    IF v_email IS NOT NULL AND v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' THEN v_email := NULL; END IF;
    IF v_email IS NULL AND nullif(trim(coalesce(r->>'name','')), '') IS NULL AND nullif(trim(coalesce(r->>'organisation','')), '') IS NULL THEN
      n_skipped := n_skipped + 1; CONTINUE;
    END IF;
    v_id := NULL;
    IF v_email IS NOT NULL THEN SELECT id INTO v_id FROM public.pr_media_contacts WHERE lower(email) = v_email; END IF;
    IF v_id IS NULL AND v_email IS NULL THEN
      SELECT id INTO v_id FROM public.pr_media_contacts WHERE email IS NULL
        AND lower(coalesce(name,'')) = lower(coalesce(r->>'name','')) AND lower(coalesce(organisation,'')) = lower(coalesce(r->>'organisation','')) LIMIT 1;
    END IF;
    IF v_id IS NOT NULL THEN
      UPDATE public.pr_media_contacts SET
        name = coalesce(name, nullif(r->>'name','')), organisation = coalesce(organisation, nullif(r->>'organisation','')),
        role = coalesce(role, nullif(r->>'role','')), category = coalesce(category, nullif(r->>'category','')),
        phone = coalesce(phone, nullif(r->>'phone','')), website = coalesce(website, nullif(r->>'website','')),
        country = coalesce(country, nullif(r->>'country','')), continent = coalesce(continent, nullif(r->>'continent','')),
        updated_at = now() WHERE id = v_id;
      n_merged := n_merged + 1;
    ELSE
      INSERT INTO public.pr_media_contacts (name, email, organisation, role, category, phone, website, country, continent, source)
      VALUES (nullif(r->>'name',''), v_email, nullif(r->>'organisation',''), nullif(r->>'role',''), nullif(r->>'category',''),
        nullif(r->>'phone',''), nullif(r->>'website',''), nullif(r->>'country',''), nullif(r->>'continent',''), left(coalesce(p_source,'spreadsheet'),120));
      n_new := n_new + 1;
    END IF;
  END LOOP;
  RETURN jsonb_build_object('new', n_new, 'merged', n_merged, 'skipped', n_skipped);
END $$;
REVOKE ALL ON FUNCTION public.pr_media_import(jsonb, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pr_media_import(jsonb, text) TO authenticated;