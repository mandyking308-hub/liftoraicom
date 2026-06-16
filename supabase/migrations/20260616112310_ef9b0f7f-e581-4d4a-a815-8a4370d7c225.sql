
-- Healthcare Overlay Pack: founder/admin only governance/evidence layer
-- No clinical decisions; no patient/customer access.

-- helper: founder-or-admin check via existing user_roles + has_role function
CREATE OR REPLACE FUNCTION public.is_founder_or_admin(_uid uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _uid AND role IN ('founder','admin')
  );
$$;

-- 1. Readiness gate
CREATE TABLE public.healthcare_readiness (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid,
  business_name text NOT NULL,
  provider_onboarding_status text NOT NULL DEFAULT 'not_started',
  credentialing_status text NOT NULL DEFAULT 'not_started',
  safeguarding_status text NOT NULL DEFAULT 'not_started',
  clinical_incident_status text NOT NULL DEFAULT 'not_started',
  special_category_data_status text NOT NULL DEFAULT 'not_started',
  regulatory_evidence_status text NOT NULL DEFAULT 'not_started',
  external_adviser_review_status text NOT NULL DEFAULT 'not_recorded',
  go_live_blocked boolean NOT NULL DEFAULT true,
  go_live_blocked_reason text,
  founder_approved boolean NOT NULL DEFAULT false,
  founder_approved_by uuid,
  founder_approved_at timestamptz,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.healthcare_readiness TO authenticated;
GRANT ALL ON public.healthcare_readiness TO service_role;
ALTER TABLE public.healthcare_readiness ENABLE ROW LEVEL SECURITY;
CREATE POLICY "founder_admin_all_readiness" ON public.healthcare_readiness
  FOR ALL TO authenticated
  USING (public.is_founder_or_admin(auth.uid()))
  WITH CHECK (public.is_founder_or_admin(auth.uid()));

-- 2. Credentialing
CREATE TABLE public.healthcare_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid,
  person_name text NOT NULL,
  role text,
  credential_type text NOT NULL,
  credential_body text,
  registration_number text,
  issue_date date,
  expiry_date date,
  verification_status text NOT NULL DEFAULT 'missing',
  evidence_link text,
  verified_by uuid,
  verified_at timestamptz,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.healthcare_credentials TO authenticated;
GRANT ALL ON public.healthcare_credentials TO service_role;
ALTER TABLE public.healthcare_credentials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "founder_admin_all_credentials" ON public.healthcare_credentials
  FOR ALL TO authenticated
  USING (public.is_founder_or_admin(auth.uid()))
  WITH CHECK (public.is_founder_or_admin(auth.uid()));

-- 3. Safeguarding
CREATE TABLE public.healthcare_safeguarding_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid,
  concern_title text NOT NULL,
  person_reference text,
  concern_type text,
  severity text NOT NULL DEFAULT 'medium',
  reported_by text,
  reported_at timestamptz NOT NULL DEFAULT now(),
  immediate_action text,
  safeguarding_lead text,
  external_referral_required boolean NOT NULL DEFAULT false,
  external_adviser_review_required boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'open',
  resolution_notes text,
  evidence_links jsonb DEFAULT '[]'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.healthcare_safeguarding_records TO authenticated;
GRANT ALL ON public.healthcare_safeguarding_records TO service_role;
ALTER TABLE public.healthcare_safeguarding_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "founder_admin_all_safeguarding" ON public.healthcare_safeguarding_records
  FOR ALL TO authenticated
  USING (public.is_founder_or_admin(auth.uid()))
  WITH CHECK (public.is_founder_or_admin(auth.uid()));

-- 4. Clinical Incidents (governance only)
CREATE TABLE public.healthcare_clinical_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid,
  incident_title text NOT NULL,
  incident_type text,
  severity text NOT NULL DEFAULT 'medium',
  occurred_at timestamptz,
  reported_at timestamptz NOT NULL DEFAULT now(),
  affected_person_category text,
  description text,
  immediate_containment text,
  duty_of_candour_considered boolean NOT NULL DEFAULT false,
  complaint_linked boolean NOT NULL DEFAULT false,
  insurance_linked boolean NOT NULL DEFAULT false,
  regulator_notification_considered boolean NOT NULL DEFAULT false,
  external_clinical_adviser_review_required boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'logged',
  evidence_links jsonb DEFAULT '[]'::jsonb,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.healthcare_clinical_incidents TO authenticated;
GRANT ALL ON public.healthcare_clinical_incidents TO service_role;
ALTER TABLE public.healthcare_clinical_incidents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "founder_admin_all_clinical_incidents" ON public.healthcare_clinical_incidents
  FOR ALL TO authenticated
  USING (public.is_founder_or_admin(auth.uid()))
  WITH CHECK (public.is_founder_or_admin(auth.uid()));

-- 5. Regulatory Evidence Map
CREATE TABLE public.healthcare_regulatory_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid,
  evidence_category text NOT NULL,
  title text NOT NULL,
  description text,
  linked_document text,
  owner text,
  review_date date,
  status text NOT NULL DEFAULT 'missing',
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.healthcare_regulatory_evidence TO authenticated;
GRANT ALL ON public.healthcare_regulatory_evidence TO service_role;
ALTER TABLE public.healthcare_regulatory_evidence ENABLE ROW LEVEL SECURITY;
CREATE POLICY "founder_admin_all_regulatory_evidence" ON public.healthcare_regulatory_evidence
  FOR ALL TO authenticated
  USING (public.is_founder_or_admin(auth.uid()))
  WITH CHECK (public.is_founder_or_admin(auth.uid()));

-- 6. Special-category health data governance
CREATE TABLE public.healthcare_data_governance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid,
  business_name text NOT NULL,
  special_category_data_present boolean NOT NULL DEFAULT false,
  lawful_basis_recorded text,
  explicit_consent_required boolean NOT NULL DEFAULT false,
  dpia_required boolean NOT NULL DEFAULT false,
  dpia_status text NOT NULL DEFAULT 'not_started',
  retention_policy_status text NOT NULL DEFAULT 'not_started',
  access_control_review_status text NOT NULL DEFAULT 'not_started',
  external_dpo_legal_review_required boolean NOT NULL DEFAULT false,
  external_dpo_legal_review_status text NOT NULL DEFAULT 'not_recorded',
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.healthcare_data_governance TO authenticated;
GRANT ALL ON public.healthcare_data_governance TO service_role;
ALTER TABLE public.healthcare_data_governance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "founder_admin_all_data_governance" ON public.healthcare_data_governance
  FOR ALL TO authenticated
  USING (public.is_founder_or_admin(auth.uid()))
  WITH CHECK (public.is_founder_or_admin(auth.uid()));

-- 7. Audit events for every status change in this overlay
CREATE TABLE public.healthcare_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid,
  business_id uuid,
  event_type text NOT NULL,
  previous_value jsonb,
  new_value jsonb,
  actor_id uuid,
  actor_email text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.healthcare_audit_events TO authenticated;
GRANT ALL ON public.healthcare_audit_events TO service_role;
ALTER TABLE public.healthcare_audit_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "founder_admin_read_audit" ON public.healthcare_audit_events
  FOR SELECT TO authenticated
  USING (public.is_founder_or_admin(auth.uid()));
CREATE POLICY "founder_admin_write_audit" ON public.healthcare_audit_events
  FOR INSERT TO authenticated
  WITH CHECK (public.is_founder_or_admin(auth.uid()));

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.healthcare_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;$$;

CREATE TRIGGER trg_hc_readiness_updated BEFORE UPDATE ON public.healthcare_readiness
  FOR EACH ROW EXECUTE FUNCTION public.healthcare_set_updated_at();
CREATE TRIGGER trg_hc_credentials_updated BEFORE UPDATE ON public.healthcare_credentials
  FOR EACH ROW EXECUTE FUNCTION public.healthcare_set_updated_at();
CREATE TRIGGER trg_hc_safeguarding_updated BEFORE UPDATE ON public.healthcare_safeguarding_records
  FOR EACH ROW EXECUTE FUNCTION public.healthcare_set_updated_at();
CREATE TRIGGER trg_hc_incidents_updated BEFORE UPDATE ON public.healthcare_clinical_incidents
  FOR EACH ROW EXECUTE FUNCTION public.healthcare_set_updated_at();
CREATE TRIGGER trg_hc_evidence_updated BEFORE UPDATE ON public.healthcare_regulatory_evidence
  FOR EACH ROW EXECUTE FUNCTION public.healthcare_set_updated_at();
CREATE TRIGGER trg_hc_data_gov_updated BEFORE UPDATE ON public.healthcare_data_governance
  FOR EACH ROW EXECUTE FUNCTION public.healthcare_set_updated_at();

-- helpful indexes
CREATE INDEX idx_hc_credentials_business ON public.healthcare_credentials(business_id);
CREATE INDEX idx_hc_credentials_expiry ON public.healthcare_credentials(expiry_date);
CREATE INDEX idx_hc_safeguarding_business ON public.healthcare_safeguarding_records(business_id);
CREATE INDEX idx_hc_incidents_business ON public.healthcare_clinical_incidents(business_id);
CREATE INDEX idx_hc_evidence_business ON public.healthcare_regulatory_evidence(business_id);
CREATE INDEX idx_hc_audit_entity ON public.healthcare_audit_events(entity_type, entity_id);
