CREATE TYPE public.rni_relationship_type AS ENUM (
  'adviser','supplier','potential_customer','referral_partner','buyer','investor',
  'finance_route','government_trade_route','property_residency_route','operations_support',
  'school_education_contact','legal_tax_contact','m_and_a_contact','media_content_contact','other'
);
CREATE TYPE public.rni_relationship_status AS ENUM (
  'new','active','warm','needs_follow_up','waiting_on_them','meeting_booked','proposal_requested',
  'nda_required','onboarding_pending','parked','rejected','do_not_contact'
);
CREATE TYPE public.rni_opportunity_role AS ENUM (
  'customer','adviser','introducer','supplier','operator','buyer','partner','investor',
  'intelligence_source','gatekeeper','unknown'
);
CREATE TYPE public.rni_trust_level AS ENUM ('unknown','low','medium','high','vetted');
CREATE TYPE public.rni_disclosure_level AS ENUM ('public_only','light_context','nda_before_detail','confidential_allowed','restricted');
CREATE TYPE public.rni_source AS ENUM ('gmail','calendar','manual','event','referral','website','linkedin','other');

CREATE TABLE public.relationship_intelligence_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_name text NOT NULL,
  organisation_name text,
  email text,
  phone text,
  website text,
  jurisdiction text,
  city_country text,
  relationship_type public.rni_relationship_type NOT NULL DEFAULT 'other',
  relationship_status public.rni_relationship_status NOT NULL DEFAULT 'new',
  opportunity_role public.rni_opportunity_role NOT NULL DEFAULT 'unknown',
  trust_level public.rni_trust_level NOT NULL DEFAULT 'unknown',
  disclosure_level public.rni_disclosure_level NOT NULL DEFAULT 'public_only',
  commercial_value_score smallint NOT NULL DEFAULT 1,
  strategic_value_score smallint NOT NULL DEFAULT 1,
  urgency_score smallint NOT NULL DEFAULT 1,
  last_contact_at timestamptz,
  next_action_at timestamptz,
  next_action_summary text,
  source public.rni_source NOT NULL DEFAULT 'manual',
  source_notes text,
  meeting_summary text,
  ai_summary text,
  founder_notes text,
  tags text[] NOT NULL DEFAULT '{}',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.relationship_intelligence_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES public.relationship_intelligence_contacts(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  summary text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  actor_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.relationship_intelligence_contacts TO authenticated;
GRANT ALL ON public.relationship_intelligence_contacts TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.relationship_intelligence_events TO authenticated;
GRANT ALL ON public.relationship_intelligence_events TO service_role;

ALTER TABLE public.relationship_intelligence_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.relationship_intelligence_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders/admins manage RNI contacts" ON public.relationship_intelligence_contacts
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));

CREATE POLICY "Founders/admins manage RNI events" ON public.relationship_intelligence_events
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));

CREATE INDEX idx_rni_contacts_status ON public.relationship_intelligence_contacts(relationship_status);
CREATE INDEX idx_rni_contacts_type ON public.relationship_intelligence_contacts(relationship_type);
CREATE INDEX idx_rni_contacts_next_action ON public.relationship_intelligence_contacts(next_action_at);
CREATE INDEX idx_rni_events_contact ON public.relationship_intelligence_events(contact_id, created_at DESC);

CREATE TRIGGER trg_rni_contacts_updated
  BEFORE UPDATE ON public.relationship_intelligence_contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();