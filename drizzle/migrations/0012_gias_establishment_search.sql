-- Isolated GIAS establishment store: public institutional fields only. Founder/admin only.
CREATE TABLE public.gias_import_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_registry_id uuid NOT NULL,
  source_filename text NOT NULL,
  source_snapshot_date date,
  snapshot_date_basis text NOT NULL DEFAULT 'inferred_from_filename',
  file_sha256 text NOT NULL CHECK (file_sha256 ~ '^[0-9a-f]{64}$'),
  expected_row_count integer NOT NULL CHECK (expected_row_count >= 0),
  staged_rows integer NOT NULL DEFAULT 0,
  valid_rows integer NOT NULL DEFAULT 0,
  invalid_rows integer NOT NULL DEFAULT 0,
  duplicate_urns_in_file integer NOT NULL DEFAULT 0,
  inserted_rows integer NOT NULL DEFAULT 0,
  updated_rows integer NOT NULL DEFAULT 0,
  unchanged_rows integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'staging' CHECK (status IN ('staging','validated','blocked','applied','rolled_back','failed')),
  block_reasons text[] NOT NULL DEFAULT '{}',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  validated_at timestamptz,
  applied_at timestamptz,
  rolled_back_at timestamptz,
  UNIQUE (source_registry_id, file_sha256)
);

CREATE TABLE public.gias_import_staging (
  batch_id uuid NOT NULL REFERENCES public.gias_import_batches(id) ON DELETE CASCADE,
  row_number integer NOT NULL,
  urn text,
  establishment_name text,
  establishment_status text,
  establishment_group text,
  establishment_type text,
  phase text,
  locality text,
  town text,
  county text,
  postcode text,
  country_label text,
  website text,
  row_hash text,
  validation_status text NOT NULL DEFAULT 'pending' CHECK (validation_status IN ('pending','valid','invalid','duplicate')),
  validation_errors text[] NOT NULL DEFAULT '{}',
  PRIMARY KEY (batch_id, row_number)
);

CREATE TABLE public.gias_establishments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_registry_id uuid NOT NULL,
  urn text NOT NULL CHECK (urn ~ '^[0-9]{5,7}$'),
  establishment_name text NOT NULL,
  establishment_status text,
  establishment_group text,
  establishment_type text,
  phase text,
  locality text,
  town text,
  county text,
  postcode text,
  country_label text,
  website text CHECK (website IS NULL OR website ~* '^https?://[^\s<>"'']+$'),
  source_filename text NOT NULL,
  source_snapshot_date date,
  snapshot_date_basis text NOT NULL DEFAULT 'inferred_from_filename',
  rights_provenance text NOT NULL DEFAULT 'DfE GIAS official bulk data; founder sign-off recorded; third-party terms not independently reviewed',
  fact_verification_status text NOT NULL DEFAULT 'gias_sourced_not_school_confirmed',
  review_flags text[] NOT NULL DEFAULT '{}',
  row_hash text NOT NULL,
  last_batch_id uuid REFERENCES public.gias_import_batches(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_registry_id, urn)
);
COMMENT ON TABLE public.gias_establishments IS 'Public institutional GIAS fields only. No people, contacts, leads, CRM, children or family data. Facts are GIAS-sourced, not school-confirmed.';

CREATE TABLE public.gias_import_changes (
  batch_id uuid NOT NULL REFERENCES public.gias_import_batches(id) ON DELETE CASCADE,
  source_registry_id uuid NOT NULL,
  urn text NOT NULL,
  action text NOT NULL CHECK (action IN ('insert','update')),
  before_row jsonb,
  PRIMARY KEY (batch_id, urn)
);

CREATE TABLE public.gias_source_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_registry_id uuid NOT NULL,
  decision text NOT NULL,
  scope_note text NOT NULL,
  decided_by_label text NOT NULL,
  recorded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.gias_import_batches, public.gias_import_staging, public.gias_establishments, public.gias_import_changes, public.gias_source_decisions TO authenticated;
GRANT ALL ON public.gias_import_batches, public.gias_import_staging, public.gias_establishments, public.gias_import_changes, public.gias_source_decisions TO service_role;
REVOKE ALL ON public.gias_import_batches, public.gias_import_staging, public.gias_establishments, public.gias_import_changes, public.gias_source_decisions FROM anon;

ALTER TABLE public.gias_import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gias_import_staging ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gias_establishments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gias_import_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gias_source_decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gias batches founder/admin" ON public.gias_import_batches FOR ALL TO authenticated USING (public._is_founder_or_admin()) WITH CHECK (public._is_founder_or_admin());
CREATE POLICY "gias staging founder/admin" ON public.gias_import_staging FOR ALL TO authenticated USING (public._is_founder_or_admin()) WITH CHECK (public._is_founder_or_admin());
CREATE POLICY "gias establishments founder/admin read" ON public.gias_establishments FOR SELECT TO authenticated USING (public._is_founder_or_admin());
CREATE POLICY "gias changes founder/admin read" ON public.gias_import_changes FOR SELECT TO authenticated USING (public._is_founder_or_admin());
CREATE POLICY "gias decisions founder/admin read" ON public.gias_source_decisions FOR SELECT TO authenticated USING (public._is_founder_or_admin());
CREATE POLICY "gias decisions founder/admin insert" ON public.gias_source_decisions FOR INSERT TO authenticated WITH CHECK (public._is_founder_or_admin());

CREATE INDEX gias_est_name_trgm ON public.gias_establishments USING gin (establishment_name gin_trgm_ops);
CREATE INDEX gias_est_town_trgm ON public.gias_establishments USING gin (town gin_trgm_ops);
CREATE INDEX gias_est_postcode_trgm ON public.gias_establishments USING gin (postcode gin_trgm_ops);
CREATE INDEX gias_est_urn ON public.gias_establishments (urn);
CREATE INDEX gias_est_filters ON public.gias_establishments (establishment_status, phase, establishment_type, county);

-- Validate a staged batch: per-row checks, in-file duplicate URNs, count reconciliation.
CREATE OR REPLACE FUNCTION public.gias_validate_batch(_batch_id uuid)
RETURNS public.gias_import_batches LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE b public.gias_import_batches; reasons text[] := '{}';
BEGIN
  IF NOT public._is_founder_or_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT * INTO b FROM public.gias_import_batches WHERE id = _batch_id FOR UPDATE;
  IF b.id IS NULL THEN RAISE EXCEPTION 'batch not found'; END IF;
  IF b.status NOT IN ('staging','validated','blocked') THEN RAISE EXCEPTION 'batch status % cannot be validated', b.status; END IF;

  UPDATE public.gias_import_staging s SET
    urn = nullif(btrim(urn),''), establishment_name = nullif(btrim(establishment_name),''),
    postcode = upper(nullif(btrim(postcode),'')),
    website = CASE WHEN website ~* '^https?://[^\s<>"'']+$' THEN btrim(website)
                   WHEN btrim(coalesce(website,'')) ~* '^www\.[^\s<>"'']+$' THEN 'https://'||btrim(website)
                   ELSE NULL END,
    validation_errors = array_remove(ARRAY[
      CASE WHEN coalesce(btrim(urn),'') !~ '^[0-9]{5,7}$' THEN 'invalid_urn' END,
      CASE WHEN coalesce(btrim(establishment_name),'') = '' THEN 'missing_name' END
    ], NULL)
  WHERE s.batch_id = _batch_id;

  UPDATE public.gias_import_staging s SET row_hash = md5(concat_ws('|', urn, establishment_name, establishment_status, establishment_group, establishment_type, phase, locality, town, county, postcode, country_label, website)),
    validation_status = CASE WHEN cardinality(validation_errors) > 0 THEN 'invalid' ELSE 'valid' END
  WHERE s.batch_id = _batch_id;

  UPDATE public.gias_import_staging s SET validation_status = 'duplicate', validation_errors = validation_errors || 'duplicate_urn_in_file'
  WHERE s.batch_id = _batch_id AND s.validation_status = 'valid'
    AND s.urn IN (SELECT urn FROM public.gias_import_staging WHERE batch_id = _batch_id AND validation_status <> 'invalid' GROUP BY urn HAVING count(*) > 1);

  SELECT count(*), count(*) FILTER (WHERE validation_status='valid'), count(*) FILTER (WHERE validation_status='invalid'), count(*) FILTER (WHERE validation_status='duplicate')
    INTO b.staged_rows, b.valid_rows, b.invalid_rows, b.duplicate_urns_in_file
  FROM public.gias_import_staging WHERE batch_id = _batch_id;

  IF b.staged_rows <> b.expected_row_count THEN reasons := reasons || format('row_count_mismatch: expected %s staged %s', b.expected_row_count, b.staged_rows); END IF;
  IF b.duplicate_urns_in_file > 0 THEN reasons := reasons || format('duplicate_urns_in_file: %s', b.duplicate_urns_in_file); END IF;
  IF b.invalid_rows > 0 THEN reasons := reasons || format('invalid_rows: %s', b.invalid_rows); END IF;

  UPDATE public.gias_import_batches SET staged_rows=b.staged_rows, valid_rows=b.valid_rows, invalid_rows=b.invalid_rows,
    duplicate_urns_in_file=b.duplicate_urns_in_file, block_reasons=reasons,
    status = CASE WHEN cardinality(reasons)=0 THEN 'validated' ELSE 'blocked' END, validated_at=now()
  WHERE id=_batch_id RETURNING * INTO b;
  RETURN b;
END $$;

-- Apply a validated batch atomically; idempotent (unchanged rows are skipped, re-apply refused).
CREATE OR REPLACE FUNCTION public.gias_apply_batch(_batch_id uuid)
RETURNS public.gias_import_batches LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE b public.gias_import_batches; n_ins int; n_upd int;
BEGIN
  IF NOT public._is_founder_or_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT * INTO b FROM public.gias_import_batches WHERE id = _batch_id FOR UPDATE;
  IF b.id IS NULL THEN RAISE EXCEPTION 'batch not found'; END IF;
  IF b.status <> 'validated' THEN RAISE EXCEPTION 'batch must be validated (status %)', b.status; END IF;

  INSERT INTO public.gias_import_changes (batch_id, source_registry_id, urn, action, before_row)
  SELECT _batch_id, b.source_registry_id, s.urn, CASE WHEN e.id IS NULL THEN 'insert' ELSE 'update' END, CASE WHEN e.id IS NULL THEN NULL ELSE to_jsonb(e) END
  FROM public.gias_import_staging s
  LEFT JOIN public.gias_establishments e ON e.source_registry_id = b.source_registry_id AND e.urn = s.urn
  WHERE s.batch_id = _batch_id AND s.validation_status = 'valid' AND (e.id IS NULL OR e.row_hash <> s.row_hash);

  SELECT count(*) FILTER (WHERE action='insert'), count(*) FILTER (WHERE action='update') INTO n_ins, n_upd
  FROM public.gias_import_changes WHERE batch_id = _batch_id;

  INSERT INTO public.gias_establishments AS e (source_registry_id, urn, establishment_name, establishment_status, establishment_group, establishment_type, phase, locality, town, county, postcode, country_label, website, source_filename, source_snapshot_date, snapshot_date_basis, row_hash, last_batch_id)
  SELECT b.source_registry_id, s.urn, s.establishment_name, s.establishment_status, s.establishment_group, s.establishment_type, s.phase, s.locality, s.town, s.county, s.postcode, s.country_label, s.website, b.source_filename, b.source_snapshot_date, b.snapshot_date_basis, s.row_hash, _batch_id
  FROM public.gias_import_staging s JOIN public.gias_import_changes c ON c.batch_id = _batch_id AND c.urn = s.urn
  WHERE s.batch_id = _batch_id AND s.validation_status = 'valid'
  ON CONFLICT (source_registry_id, urn) DO UPDATE SET
    establishment_name=excluded.establishment_name, establishment_status=excluded.establishment_status, establishment_group=excluded.establishment_group,
    establishment_type=excluded.establishment_type, phase=excluded.phase, locality=excluded.locality, town=excluded.town, county=excluded.county,
    postcode=excluded.postcode, country_label=excluded.country_label, website=excluded.website, source_filename=excluded.source_filename,
    source_snapshot_date=excluded.source_snapshot_date, snapshot_date_basis=excluded.snapshot_date_basis, row_hash=excluded.row_hash,
    last_batch_id=excluded.last_batch_id, updated_at=now();

  UPDATE public.gias_import_batches SET status='applied', applied_at=now(), inserted_rows=n_ins, updated_rows=n_upd,
    unchanged_rows=b.valid_rows - n_ins - n_upd WHERE id=_batch_id RETURNING * INTO b;
  RETURN b;
END $$;

-- Roll back an applied batch: remove its inserts, restore prior versions of its updates.
CREATE OR REPLACE FUNCTION public.gias_rollback_batch(_batch_id uuid)
RETURNS public.gias_import_batches LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE b public.gias_import_batches;
BEGIN
  IF NOT public._is_founder_or_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT * INTO b FROM public.gias_import_batches WHERE id = _batch_id FOR UPDATE;
  IF b.status <> 'applied' THEN RAISE EXCEPTION 'only applied batches can be rolled back'; END IF;
  IF EXISTS (SELECT 1 FROM public.gias_import_batches WHERE source_registry_id=b.source_registry_id AND status='applied' AND applied_at > b.applied_at) THEN
    RAISE EXCEPTION 'a later batch is applied; roll that back first'; END IF;
  DELETE FROM public.gias_establishments e USING public.gias_import_changes c
   WHERE c.batch_id=_batch_id AND c.action='insert' AND e.source_registry_id=c.source_registry_id AND e.urn=c.urn;
  UPDATE public.gias_establishments e SET (establishment_name, establishment_status, establishment_group, establishment_type, phase, locality, town, county, postcode, country_label, website, source_filename, source_snapshot_date, snapshot_date_basis, row_hash, last_batch_id, updated_at) =
    (SELECT r.establishment_name, r.establishment_status, r.establishment_group, r.establishment_type, r.phase, r.locality, r.town, r.county, r.postcode, r.country_label, r.website, r.source_filename, r.source_snapshot_date, r.snapshot_date_basis, r.row_hash, r.last_batch_id, now()
     FROM jsonb_populate_record(NULL::public.gias_establishments, c.before_row) r)
  FROM public.gias_import_changes c
  WHERE c.batch_id=_batch_id AND c.action='update' AND e.source_registry_id=c.source_registry_id AND e.urn=c.urn;
  UPDATE public.gias_import_batches SET status='rolled_back', rolled_back_at=now() WHERE id=_batch_id RETURNING * INTO b;
  RETURN b;
END $$;

-- Paginated search; runs as caller so RLS applies.
CREATE OR REPLACE FUNCTION public.gias_search(_q text DEFAULT NULL, _status text DEFAULT NULL, _phase text DEFAULT NULL, _type text DEFAULT NULL, _county text DEFAULT NULL, _page int DEFAULT 1, _page_size int DEFAULT 25)
RETURNS TABLE (urn text, establishment_name text, establishment_status text, establishment_type text, phase text, town text, county text, postcode text, website text, source_snapshot_date date, fact_verification_status text, review_flags text[], total_count bigint)
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = public AS $$
DECLARE q text := nullif(btrim(_q),''); ps int := least(greatest(coalesce(_page_size,25),1),100); pg int := greatest(coalesce(_page,1),1);
BEGIN
  IF NOT public._is_founder_or_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF q IS NOT NULL AND length(q) > 100 THEN RAISE EXCEPTION 'query too long'; END IF;
  RETURN QUERY
  SELECT e.urn, e.establishment_name, e.establishment_status, e.establishment_type, e.phase, e.town, e.county, e.postcode, e.website, e.source_snapshot_date, e.fact_verification_status, e.review_flags, count(*) OVER ()
  FROM public.gias_establishments e
  WHERE (q IS NULL OR e.urn = q OR e.establishment_name ILIKE '%'||q||'%' OR e.town ILIKE '%'||q||'%' OR e.postcode ILIKE '%'||q||'%' OR e.establishment_name % q)
    AND (_status IS NULL OR e.establishment_status = _status)
    AND (_phase IS NULL OR e.phase = _phase)
    AND (_type IS NULL OR e.establishment_type = _type)
    AND (_county IS NULL OR e.county = _county)
  ORDER BY (q IS NOT NULL AND e.urn = q) DESC, CASE WHEN q IS NULL THEN 0 ELSE similarity(e.establishment_name, q) END DESC, e.establishment_name
  LIMIT ps OFFSET (pg-1)*ps;
END $$;

REVOKE ALL ON FUNCTION public.gias_validate_batch(uuid), public.gias_apply_batch(uuid), public.gias_rollback_batch(uuid), public.gias_search(text,text,text,text,text,int,int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.gias_validate_batch(uuid), public.gias_apply_batch(uuid), public.gias_rollback_batch(uuid), public.gias_search(text,text,text,text,text,int,int) TO authenticated, service_role;