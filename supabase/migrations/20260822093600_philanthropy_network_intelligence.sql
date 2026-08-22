-- Next-generation wealth & philanthropy network intelligence
-- Separate from billionaire_intelligence. Cross-over to billionaire records must use explicit evidence/link tables.

CREATE TABLE IF NOT EXISTS public.philanthropy_network_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  network_name text NOT NULL UNIQUE,
  category text NOT NULL,
  priority_tier smallint NOT NULL DEFAULT 3 CHECK (priority_tier BETWEEN 1 AND 3),
  region text NOT NULL DEFAULT 'Global',
  country_focus text[] NOT NULL DEFAULT '{}'::text[],
  audience text,
  website_url text,
  source_url text,
  source_status text NOT NULL DEFAULT 'needs_verification',
  access_mode text NOT NULL DEFAULT 'unknown_requires_verification',
  inheritor_focus boolean NOT NULL DEFAULT false,
  next_gen_focus boolean NOT NULL DEFAULT false,
  family_office_focus boolean NOT NULL DEFAULT false,
  philanthropy_focus boolean NOT NULL DEFAULT true,
  impact_investing_focus boolean NOT NULL DEFAULT false,
  membership_size_note text,
  ghat_route_notes text,
  status text NOT NULL DEFAULT 'active',
  last_verified_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.philanthropy_network_registry TO authenticated;
GRANT ALL ON public.philanthropy_network_registry TO service_role;
ALTER TABLE public.philanthropy_network_registry ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Founders manage philanthropy network registry" ON public.philanthropy_network_registry;
CREATE POLICY "Founders manage philanthropy network registry"
  ON public.philanthropy_network_registry FOR ALL TO authenticated
  USING (has_role(auth.uid(),'founder'::app_role) OR has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'founder'::app_role) OR has_role(auth.uid(),'admin'::app_role));

CREATE INDEX IF NOT EXISTS philanthropy_network_registry_priority_idx
  ON public.philanthropy_network_registry(priority_tier, region, network_name);
CREATE INDEX IF NOT EXISTS philanthropy_network_registry_source_status_idx
  ON public.philanthropy_network_registry(source_status);

CREATE TABLE IF NOT EXISTS public.philanthropy_network_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  network_id uuid NOT NULL REFERENCES public.philanthropy_network_registry(id) ON DELETE CASCADE,
  contact_type text NOT NULL DEFAULT 'general'
    CHECK (contact_type IN ('general','person','membership','partnerships','philanthropy','media','other')),
  person_name text,
  role_title text,
  public_email text,
  public_phone text,
  contact_page_url text,
  linkedin_url text,
  preferred_channel text NOT NULL DEFAULT 'website'
    CHECK (preferred_channel IN ('email','website','phone','linkedin','other')),
  is_primary boolean NOT NULL DEFAULT false,
  verification_status text NOT NULL DEFAULT 'needs_verification'
    CHECK (verification_status IN ('official_site_verified','reputable_directory_current','needs_verification','stale')),
  source_url text NOT NULL,
  last_verified_at timestamptz,
  notes text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (coalesce(nullif(btrim(public_email),''), nullif(btrim(contact_page_url),''), nullif(btrim(public_phone),''), nullif(btrim(linkedin_url),'')) IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS philanthropy_network_contacts_dedupe_idx
  ON public.philanthropy_network_contacts (
    network_id,
    lower(coalesce(public_email,'')),
    lower(coalesce(person_name,'')),
    lower(coalesce(contact_page_url,''))
  );
CREATE INDEX IF NOT EXISTS philanthropy_network_contacts_network_idx
  ON public.philanthropy_network_contacts(network_id);
CREATE INDEX IF NOT EXISTS philanthropy_network_contacts_primary_idx
  ON public.philanthropy_network_contacts(network_id,is_primary) WHERE is_primary;
CREATE INDEX IF NOT EXISTS philanthropy_network_contacts_status_idx
  ON public.philanthropy_network_contacts(verification_status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.philanthropy_network_contacts TO authenticated;
GRANT ALL ON public.philanthropy_network_contacts TO service_role;
ALTER TABLE public.philanthropy_network_contacts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Founders manage philanthropy network contacts" ON public.philanthropy_network_contacts;
CREATE POLICY "Founders manage philanthropy network contacts"
  ON public.philanthropy_network_contacts FOR ALL TO authenticated
  USING (has_role(auth.uid(),'founder'::app_role) OR has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'founder'::app_role) OR has_role(auth.uid(),'admin'::app_role));

CREATE TABLE IF NOT EXISTS public.philanthropy_network_research_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  network_id uuid NOT NULL UNIQUE REFERENCES public.philanthropy_network_registry(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','in_progress','complete','needs_manual_review','no_public_contact')),
  priority smallint NOT NULL DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
  fields_needed text[] NOT NULL DEFAULT ARRAY['website','contact_person','role_title','public_email','contact_page_url']::text[],
  attempts integer NOT NULL DEFAULT 0,
  last_checked_at timestamptz,
  next_check_at timestamptz,
  last_result text,
  notes text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS philanthropy_network_research_queue_status_idx
  ON public.philanthropy_network_research_queue(status,priority);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.philanthropy_network_research_queue TO authenticated;
GRANT ALL ON public.philanthropy_network_research_queue TO service_role;
ALTER TABLE public.philanthropy_network_research_queue ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Founders manage philanthropy network research queue" ON public.philanthropy_network_research_queue;
CREATE POLICY "Founders manage philanthropy network research queue"
  ON public.philanthropy_network_research_queue FOR ALL TO authenticated
  USING (has_role(auth.uid(),'founder'::app_role) OR has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'founder'::app_role) OR has_role(auth.uid(),'admin'::app_role));

INSERT INTO public.philanthropy_network_research_queue (network_id, priority, metadata)
SELECT id,
       CASE priority_tier WHEN 1 THEN 1 WHEN 2 THEN 2 ELSE 3 END,
       jsonb_build_object('seeded_from','philanthropy_network_registry','seeded_at',now())
FROM public.philanthropy_network_registry
ON CONFLICT (network_id) DO UPDATE SET
  priority = EXCLUDED.priority,
  updated_at = now();

COMMENT ON TABLE public.philanthropy_network_registry IS
  'Founder-only organisation-level intelligence for philanthropy, inheritor, next-gen and family-office networks. Separate from billionaire_intelligence.';
COMMENT ON TABLE public.philanthropy_network_contacts IS
  'Publicly sourced institutional/contact routes for philanthropy_network_registry. No inferred private contact details.';
COMMENT ON TABLE public.philanthropy_network_research_queue IS
  'Founder-only enrichment queue for network websites, named contacts, public emails/forms and evidence verification.';
