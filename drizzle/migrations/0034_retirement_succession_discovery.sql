CREATE TABLE public.retirement_acquisition_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_key text NOT NULL UNIQUE,
  name text NOT NULL,
  url text NOT NULL UNIQUE,
  access_mode text NOT NULL CHECK (access_mode IN ('email_alert','account_alert','manual_listing')),
  alert_status text NOT NULL DEFAULT 'needs_setup' CHECK (alert_status IN ('needs_setup','manual_public','receiving_verified')),
  scraping_allowed boolean NOT NULL DEFAULT false,
  terms_note text,
  discovery_connector text NOT NULL DEFAULT 'not_configured',
  last_checked_at timestamptz,
  verified_alert_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT receiving_requires_proof CHECK (alert_status <> 'receiving_verified' OR verified_alert_at IS NOT NULL)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.retirement_acquisition_sources TO authenticated;
GRANT ALL ON public.retirement_acquisition_sources TO service_role;
ALTER TABLE public.retirement_acquisition_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "founder admin manage retirement sources" ON public.retirement_acquisition_sources
  FOR ALL TO authenticated USING (public._is_founder_or_admin()) WITH CHECK (public._is_founder_or_admin());

CREATE TABLE public.retirement_acquisition_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_key text NOT NULL REFERENCES public.retirement_acquisition_sources(source_key),
  source_url text NOT NULL,
  normalized_url text NOT NULL UNIQUE,
  source_listing_id text,
  title text NOT NULL,
  sector text,
  location text,
  country text NOT NULL DEFAULT 'UK',
  years_trading numeric,
  asking_price numeric,
  turnover numeric,
  profit numeric,
  currency text NOT NULL DEFAULT 'GBP',
  staff_count integer,
  owner_role text,
  owner_hours_per_week numeric,
  replacement_manager_cost numeric,
  recurring_revenue text NOT NULL DEFAULT 'unknown' CHECK (recurring_revenue IN ('yes','no','unknown')),
  is_franchise boolean,
  premises_only boolean,
  sale_reason text,
  retirement_confidence text NOT NULL DEFAULT 'unknown' CHECK (retirement_confidence IN ('explicit','implied','unknown')),
  seller_finance_status text NOT NULL DEFAULT 'unknown' CHECK (seller_finance_status IN ('explicit','possible','none','unknown')),
  seller_finance_evidence text,
  third_party_finance_note text,
  deposit_required text NOT NULL DEFAULT 'unknown',
  evidence_url text,
  evidence_summary text,
  evidence_quality text NOT NULL DEFAULT 'unverified' CHECK (evidence_quality IN ('verified','partial','unverified')),
  unverified_fields text[] NOT NULL DEFAULT '{}',
  listing_availability text NOT NULL DEFAULT 'unknown' CHECK (listing_availability IN ('available','under_offer','sold','removed','unknown')),
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','review','shortlist','rejected','under_offer','sold')),
  score integer,
  red_flags text[] NOT NULL DEFAULT '{}',
  next_action text,
  is_test boolean NOT NULL DEFAULT false,
  ingest_channel text NOT NULL DEFAULT 'manual' CHECK (ingest_channel IN ('manual','csv','json','agent','email_alert')),
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT seller_finance_needs_proof CHECK (seller_finance_status <> 'explicit' OR (seller_finance_evidence IS NOT NULL AND length(trim(seller_finance_evidence)) > 0)),
  CONSTRAINT source_url_http CHECK (source_url ~* '^https?://')
);
CREATE UNIQUE INDEX retirement_candidates_source_listing_uq ON public.retirement_acquisition_candidates (source_key, source_listing_id) WHERE source_listing_id IS NOT NULL;
COMMENT ON COLUMN public.retirement_acquisition_candidates.profit IS 'Seller-stated profit; NULL means unknown, never zero.';
COMMENT ON TABLE public.retirement_acquisition_candidates IS 'Retirement/succession acquisition research. Not distressed opportunities, not outreach leads.';
GRANT SELECT, INSERT, UPDATE, DELETE ON public.retirement_acquisition_candidates TO authenticated;
GRANT ALL ON public.retirement_acquisition_candidates TO service_role;
ALTER TABLE public.retirement_acquisition_candidates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "founder admin manage retirement candidates" ON public.retirement_acquisition_candidates
  FOR ALL TO authenticated USING (public._is_founder_or_admin()) WITH CHECK (public._is_founder_or_admin());

CREATE TABLE public.retirement_acquisition_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  channel text,
  inserted_count integer NOT NULL DEFAULT 0,
  updated_count integer NOT NULL DEFAULT 0,
  rejected_count integer NOT NULL DEFAULT 0,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  actor uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.retirement_acquisition_activity TO authenticated;
GRANT ALL ON public.retirement_acquisition_activity TO service_role;
ALTER TABLE public.retirement_acquisition_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "founder admin read retirement activity" ON public.retirement_acquisition_activity
  FOR SELECT TO authenticated USING (public._is_founder_or_admin());
CREATE POLICY "founder admin log retirement activity" ON public.retirement_acquisition_activity
  FOR INSERT TO authenticated WITH CHECK (public._is_founder_or_admin());

-- Authenticated ingestion path (founder session or service_role research agent). Never anon.
CREATE OR REPLACE FUNCTION public.retirement_candidates_upsert(_rows jsonb, _channel text DEFAULT 'manual')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r jsonb; ins int := 0; upd int := 0; rej int := 0; rejected jsonb := '[]'::jsonb; was_insert boolean;
BEGIN
  IF NOT (public._is_founder_or_admin() OR auth.role() = 'service_role') THEN
    RAISE EXCEPTION 'founder/admin only' USING ERRCODE = '42501';
  END IF;
  IF _channel NOT IN ('manual','csv','json','agent','email_alert') THEN RAISE EXCEPTION 'bad channel'; END IF;
  IF jsonb_typeof(_rows) <> 'array' OR jsonb_array_length(_rows) > 500 THEN RAISE EXCEPTION 'rows must be an array of at most 500'; END IF;
  FOR r IN SELECT * FROM jsonb_array_elements(_rows) LOOP
    IF coalesce(r->>'normalized_url','') = '' OR coalesce(r->>'source_url','') !~* '^https?://'
       OR coalesce(r->>'title','') = ''
       OR NOT EXISTS (SELECT 1 FROM retirement_acquisition_sources WHERE source_key = r->>'source_key')
       OR (r->>'seller_finance_status' = 'explicit' AND coalesce(trim(r->>'seller_finance_evidence'),'') = '') THEN
      rej := rej + 1; rejected := rejected || jsonb_build_array(coalesce(r->>'source_url', r->>'title', '?'));
      CONTINUE;
    END IF;
    INSERT INTO retirement_acquisition_candidates AS c (
      source_key, source_url, normalized_url, source_listing_id, title, sector, location, years_trading,
      asking_price, turnover, profit, currency, staff_count, owner_role, owner_hours_per_week, replacement_manager_cost,
      recurring_revenue, is_franchise, premises_only, sale_reason, retirement_confidence, seller_finance_status,
      seller_finance_evidence, third_party_finance_note, deposit_required, evidence_url, evidence_summary, evidence_quality,
      unverified_fields, listing_availability, score, red_flags, next_action, is_test, ingest_channel, created_by)
    VALUES (
      r->>'source_key', r->>'source_url', r->>'normalized_url', nullif(r->>'source_listing_id',''), r->>'title',
      r->>'sector', r->>'location', (r->>'years_trading')::numeric,
      (r->>'asking_price')::numeric, (r->>'turnover')::numeric, (r->>'profit')::numeric, coalesce(r->>'currency','GBP'),
      (r->>'staff_count')::int, r->>'owner_role', (r->>'owner_hours_per_week')::numeric, (r->>'replacement_manager_cost')::numeric,
      coalesce(r->>'recurring_revenue','unknown'), (r->>'is_franchise')::boolean, (r->>'premises_only')::boolean,
      r->>'sale_reason', coalesce(r->>'retirement_confidence','unknown'), coalesce(r->>'seller_finance_status','unknown'),
      r->>'seller_finance_evidence', r->>'third_party_finance_note', coalesce(r->>'deposit_required','unknown'),
      r->>'evidence_url', r->>'evidence_summary', coalesce(r->>'evidence_quality','unverified'),
      coalesce(ARRAY(SELECT jsonb_array_elements_text(r->'unverified_fields')), '{}'),
      coalesce(r->>'listing_availability','unknown'), (r->>'score')::int,
      coalesce(ARRAY(SELECT jsonb_array_elements_text(r->'red_flags')), '{}'), r->>'next_action',
      coalesce((r->>'is_test')::boolean,false), _channel, auth.uid())
    ON CONFLICT (normalized_url) DO UPDATE SET
      last_seen_at = now(), updated_at = now(),
      title = EXCLUDED.title, asking_price = EXCLUDED.asking_price, turnover = EXCLUDED.turnover, profit = EXCLUDED.profit,
      sale_reason = coalesce(EXCLUDED.sale_reason, c.sale_reason), retirement_confidence = EXCLUDED.retirement_confidence,
      seller_finance_status = EXCLUDED.seller_finance_status, seller_finance_evidence = EXCLUDED.seller_finance_evidence,
      third_party_finance_note = EXCLUDED.third_party_finance_note, evidence_quality = EXCLUDED.evidence_quality,
      unverified_fields = EXCLUDED.unverified_fields, listing_availability = EXCLUDED.listing_availability,
      score = EXCLUDED.score, red_flags = EXCLUDED.red_flags
    RETURNING (xmax = 0) INTO was_insert;
    IF was_insert THEN ins := ins + 1; ELSE upd := upd + 1; END IF;
  END LOOP;
  INSERT INTO retirement_acquisition_activity(action, channel, inserted_count, updated_count, rejected_count, detail, actor)
  VALUES ('import', _channel, ins, upd, rej, jsonb_build_object('rejected', rejected), auth.uid());
  RETURN jsonb_build_object('inserted', ins, 'updated', upd, 'rejected', rej, 'rejected_items', rejected);
END $$;
REVOKE ALL ON FUNCTION public.retirement_candidates_upsert(jsonb, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.retirement_candidates_upsert(jsonb, text) TO authenticated, service_role;