-- ENUMS
DO $$ BEGIN
  CREATE TYPE public.internal_proposal_status AS ENUM (
    'draft','sent','viewed','accepted','rejected','expired'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.demo_access_status AS ENUM ('active','expired','revoked');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.demo_event_type AS ENUM (
    'view','login','feature_used','session_start','session_end'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- INTERNAL PROPOSALS
CREATE TABLE IF NOT EXISTS public.internal_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL,
  deal_id uuid,
  business_name text NOT NULL DEFAULT '',
  title text NOT NULL DEFAULT '',
  industry text NOT NULL DEFAULT '',
  project_scale text NOT NULL DEFAULT '',
  timeline text NOT NULL DEFAULT '',
  business_problem text NOT NULL DEFAULT '',
  project_types text[] NOT NULL DEFAULT '{}',
  processes_to_automate text[] NOT NULL DEFAULT '{}',

  suggested_solution text NOT NULL DEFAULT '',
  estimated_scope text NOT NULL DEFAULT '',
  estimated_timeline text NOT NULL DEFAULT '',
  estimated_cost_range text NOT NULL DEFAULT '',
  estimated_cost_breakdown jsonb NOT NULL DEFAULT '[]'::jsonb,
  architecture_components jsonb NOT NULL DEFAULT '[]'::jsonb,
  estimated_roi_summary text NOT NULL DEFAULT '',
  estimated_annual_savings text NOT NULL DEFAULT '',
  estimated_roi_period text NOT NULL DEFAULT '',
  estimated_productivity_gain text NOT NULL DEFAULT '',

  version integer NOT NULL DEFAULT 1,
  status public.internal_proposal_status NOT NULL DEFAULT 'draft',
  include_demo boolean NOT NULL DEFAULT false,

  accept_token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24),'hex'),
  view_token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24),'hex'),

  sent_at timestamptz,
  viewed_at timestamptz,
  accepted_at timestamptz,
  rejected_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_internal_proposals_contact ON public.internal_proposals(contact_id);
CREATE INDEX IF NOT EXISTS idx_internal_proposals_status ON public.internal_proposals(status);

ALTER TABLE public.internal_proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders manage internal proposals"
  ON public.internal_proposals FOR ALL
  USING (public.has_role(auth.uid(),'founder'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'founder'::app_role));

CREATE TRIGGER trg_internal_proposals_updated_at
  BEFORE UPDATE ON public.internal_proposals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- VERSIONS (audit log of proposal snapshots)
CREATE TABLE IF NOT EXISTS public.internal_proposal_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL REFERENCES public.internal_proposals(id) ON DELETE CASCADE,
  version integer NOT NULL,
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  changed_by text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.internal_proposal_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders manage proposal versions"
  ON public.internal_proposal_versions FOR ALL
  USING (public.has_role(auth.uid(),'founder'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'founder'::app_role));

-- DEMO ACCESS
CREATE TABLE IF NOT EXISTS public.demo_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL,
  proposal_id uuid REFERENCES public.internal_proposals(id) ON DELETE SET NULL,
  business_name text NOT NULL DEFAULT '',
  demo_token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24),'hex'),
  status public.demo_access_status NOT NULL DEFAULT 'active',
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  access_count integer NOT NULL DEFAULT 0,
  high_intent boolean NOT NULL DEFAULT false,
  last_accessed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_demo_access_contact ON public.demo_access(contact_id);
CREATE INDEX IF NOT EXISTS idx_demo_access_status ON public.demo_access(status);

ALTER TABLE public.demo_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders manage demo access"
  ON public.demo_access FOR ALL
  USING (public.has_role(auth.uid(),'founder'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'founder'::app_role));

CREATE TRIGGER trg_demo_access_updated_at
  BEFORE UPDATE ON public.demo_access
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- DEMO EVENTS
CREATE TABLE IF NOT EXISTS public.demo_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  demo_id uuid NOT NULL REFERENCES public.demo_access(id) ON DELETE CASCADE,
  event_type public.demo_event_type NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  "timestamp" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_demo_events_demo ON public.demo_events(demo_id);
CREATE INDEX IF NOT EXISTS idx_demo_events_ts ON public.demo_events("timestamp");

ALTER TABLE public.demo_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders manage demo events"
  ON public.demo_events FOR ALL
  USING (public.has_role(auth.uid(),'founder'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'founder'::app_role));

-- EXPIRY FUNCTION
CREATE OR REPLACE FUNCTION public.expire_demos()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n integer;
BEGIN
  UPDATE public.demo_access
     SET status = 'expired', updated_at = now()
   WHERE status = 'active' AND expires_at < now();
  GET DIAGNOSTICS n = ROW_COUNT;

  -- Also expire proposals past 30 days that were never accepted
  UPDATE public.internal_proposals
     SET status = 'expired', updated_at = now()
   WHERE status IN ('sent','viewed')
     AND sent_at IS NOT NULL
     AND sent_at < (now() - interval '30 days');

  RETURN n;
END;
$$;

-- PUBLIC TOKEN HELPERS (security definer, validated)
CREATE OR REPLACE FUNCTION public.get_proposal_by_token(_token text)
RETURNS public.internal_proposals
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p public.internal_proposals;
BEGIN
  SELECT * INTO p FROM public.internal_proposals
   WHERE view_token = _token OR accept_token = _token
   LIMIT 1;
  IF NOT FOUND THEN RETURN NULL; END IF;

  -- Mark as viewed on first view
  IF p.status = 'sent' AND p.viewed_at IS NULL THEN
    UPDATE public.internal_proposals
       SET viewed_at = now(), status = 'viewed', updated_at = now()
     WHERE id = p.id;
    p.viewed_at := now();
    p.status := 'viewed';
  END IF;

  RETURN p;
END;
$$;

CREATE OR REPLACE FUNCTION public.accept_proposal_by_token(_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  p public.internal_proposals;
  new_deal_id uuid;
  mid_value numeric;
BEGIN
  SELECT * INTO p FROM public.internal_proposals WHERE accept_token = _token LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'INVALID_TOKEN');
  END IF;

  IF p.status = 'accepted' THEN
    RETURN jsonb_build_object('ok', true, 'already_accepted', true, 'proposal_id', p.id, 'deal_id', p.deal_id);
  END IF;

  IF p.status IN ('rejected','expired') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'PROPOSAL_'|| upper(p.status::text));
  END IF;

  -- Estimate mid-point for the deal value
  mid_value := 50000; -- safe fallback

  UPDATE public.internal_proposals
     SET status = 'accepted', accepted_at = now(), updated_at = now()
   WHERE id = p.id;

  -- Create the deal (handle_deal_won trigger will create the invoice + flip contact to CLIENT)
  IF p.deal_id IS NULL THEN
    INSERT INTO public.deals (
      contact_id, business_name, deal_name,
      estimated_value_min, estimated_value_max, currency,
      status, notes, won_at
    ) VALUES (
      p.contact_id,
      COALESCE(p.business_name,''),
      COALESCE(NULLIF(p.title,''), 'Accepted proposal') ,
      mid_value, mid_value, 'GBP',
      'WON', 'Auto-created from accepted proposal ' || p.id::text, now()
    ) RETURNING id INTO new_deal_id;

    UPDATE public.internal_proposals SET deal_id = new_deal_id WHERE id = p.id;
  ELSE
    UPDATE public.deals SET status = 'WON', won_at = COALESCE(won_at, now()), updated_at = now()
     WHERE id = p.deal_id;
    new_deal_id := p.deal_id;
  END IF;

  RETURN jsonb_build_object('ok', true, 'proposal_id', p.id, 'deal_id', new_deal_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.log_demo_event(_token text, _event_type text, _metadata jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  d public.demo_access;
  ev_type public.demo_event_type;
BEGIN
  SELECT * INTO d FROM public.demo_access WHERE demo_token = _token LIMIT 1;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'INVALID_TOKEN'); END IF;

  IF d.status <> 'active' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'DEMO_'|| upper(d.status::text));
  END IF;

  IF d.expires_at < now() THEN
    UPDATE public.demo_access SET status = 'expired', updated_at = now() WHERE id = d.id;
    RETURN jsonb_build_object('ok', false, 'error', 'DEMO_EXPIRED');
  END IF;

  BEGIN
    ev_type := _event_type::public.demo_event_type;
  EXCEPTION WHEN invalid_text_representation THEN
    ev_type := 'view';
  END;

  INSERT INTO public.demo_events (demo_id, event_type, metadata)
  VALUES (d.id, ev_type, COALESCE(_metadata,'{}'::jsonb));

  UPDATE public.demo_access
     SET access_count = access_count + 1,
         last_accessed_at = now(),
         high_intent = (access_count + 1) >= 2,
         updated_at = now()
   WHERE id = d.id;

  RETURN jsonb_build_object('ok', true, 'demo_id', d.id, 'access_count', d.access_count + 1);
END;
$$;