
-- =========================================================
-- Operating Loops Closure Pack
-- =========================================================

CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

-- ---------- INSURANCE CLAIMS ----------
CREATE TABLE public.insurance_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid,
  incident_id uuid,
  policy_id uuid REFERENCES public.insurance_policy_register(id) ON DELETE SET NULL,
  claim_type text NOT NULL,
  insurer text,
  broker_name text,
  broker_contact text,
  policy_reference text,
  incident_date date,
  opened_date date DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'draft',
  claim_value_estimate numeric,
  recovered_amount numeric,
  excess_amount numeric,
  currency text DEFAULT 'GBP',
  owner text,
  next_action text,
  next_action_due date,
  evidence_refs jsonb DEFAULT '[]'::jsonb,
  founder_approval_status text DEFAULT 'not_required',
  founder_approved_by uuid,
  founder_approved_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.insurance_claims TO authenticated;
GRANT ALL ON public.insurance_claims TO service_role;
ALTER TABLE public.insurance_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ic_founder_all" ON public.insurance_claims FOR ALL TO authenticated
  USING (public.is_founder_or_admin(auth.uid())) WITH CHECK (public.is_founder_or_admin(auth.uid()));
CREATE TRIGGER tr_ic_updated BEFORE UPDATE ON public.insurance_claims FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE public.insurance_claim_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id uuid NOT NULL REFERENCES public.insurance_claims(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  actor uuid,
  payload jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.insurance_claim_events TO authenticated;
GRANT ALL ON public.insurance_claim_events TO service_role;
ALTER TABLE public.insurance_claim_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ice_founder_all" ON public.insurance_claim_events FOR ALL TO authenticated
  USING (public.is_founder_or_admin(auth.uid())) WITH CHECK (public.is_founder_or_admin(auth.uid()));

-- ---------- STATUTORY FILINGS ----------
CREATE TABLE public.statutory_filings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid,
  entity_id uuid,
  jurisdiction text,
  filing_category text NOT NULL,
  filing_name text NOT NULL,
  authority text,
  period_start date,
  period_end date,
  due_date date,
  owner text,
  adviser_contact text,
  status text NOT NULL DEFAULT 'not_started',
  evidence_ref text,
  payment_required boolean DEFAULT false,
  payment_amount numeric,
  currency text DEFAULT 'GBP',
  filed_date date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.statutory_filings TO authenticated;
GRANT ALL ON public.statutory_filings TO service_role;
ALTER TABLE public.statutory_filings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sf_founder_all" ON public.statutory_filings FOR ALL TO authenticated
  USING (public.is_founder_or_admin(auth.uid())) WITH CHECK (public.is_founder_or_admin(auth.uid()));
CREATE TRIGGER tr_sf_updated BEFORE UPDATE ON public.statutory_filings FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX idx_sf_due ON public.statutory_filings(due_date);

CREATE TABLE public.statutory_filing_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filing_id uuid NOT NULL REFERENCES public.statutory_filings(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  actor uuid,
  payload jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.statutory_filing_events TO authenticated;
GRANT ALL ON public.statutory_filing_events TO service_role;
ALTER TABLE public.statutory_filing_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sfe_founder_all" ON public.statutory_filing_events FOR ALL TO authenticated
  USING (public.is_founder_or_admin(auth.uid())) WITH CHECK (public.is_founder_or_admin(auth.uid()));

-- ---------- CORPORATE SECRETARIAL ----------
CREATE TABLE public.corporate_secretarial_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id uuid,
  entity_name text NOT NULL,
  jurisdiction text,
  directors jsonb DEFAULT '[]'::jsonb,
  shareholders jsonb DEFAULT '[]'::jsonb,
  psc_record jsonb DEFAULT '[]'::jsonb,
  registered_office text,
  registered_agent text,
  annual_confirmation_due date,
  accounts_due date,
  licence_renewal_due date,
  status text NOT NULL DEFAULT 'active',
  evidence_refs jsonb DEFAULT '[]'::jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.corporate_secretarial_records TO authenticated;
GRANT ALL ON public.corporate_secretarial_records TO service_role;
ALTER TABLE public.corporate_secretarial_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cs_founder_all" ON public.corporate_secretarial_records FOR ALL TO authenticated
  USING (public.is_founder_or_admin(auth.uid())) WITH CHECK (public.is_founder_or_admin(auth.uid()));
CREATE TRIGGER tr_cs_updated BEFORE UPDATE ON public.corporate_secretarial_records FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE public.corporate_secretarial_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id uuid NOT NULL REFERENCES public.corporate_secretarial_records(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  actor uuid,
  payload jsonb DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.corporate_secretarial_events TO authenticated;
GRANT ALL ON public.corporate_secretarial_events TO service_role;
ALTER TABLE public.corporate_secretarial_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cse_founder_all" ON public.corporate_secretarial_events FOR ALL TO authenticated
  USING (public.is_founder_or_admin(auth.uid())) WITH CHECK (public.is_founder_or_admin(auth.uid()));

-- ---------- INTERNATIONAL EXPANSION ----------
CREATE TABLE public.international_expansion_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid,
  target_jurisdiction text NOT NULL,
  launch_purpose text,
  market_relevance_notes text,
  tax_review_status text DEFAULT 'not_started',
  legal_review_status text DEFAULT 'not_started',
  payments_status text DEFAULT 'not_started',
  banking_status text DEFAULT 'not_started',
  localisation_status text DEFAULT 'not_started',
  privacy_status text DEFAULT 'not_started',
  regulatory_status text DEFAULT 'not_started',
  adviser_status text DEFAULT 'not_started',
  substance_notes text,
  go_no_go_status text NOT NULL DEFAULT 'blocked',
  founder_decision text,
  founder_decided_at timestamptz,
  evidence_refs jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.international_expansion_runs TO authenticated;
GRANT ALL ON public.international_expansion_runs TO service_role;
ALTER TABLE public.international_expansion_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ie_founder_all" ON public.international_expansion_runs FOR ALL TO authenticated
  USING (public.is_founder_or_admin(auth.uid())) WITH CHECK (public.is_founder_or_admin(auth.uid()));
CREATE TRIGGER tr_ie_updated BEFORE UPDATE ON public.international_expansion_runs FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE public.international_expansion_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.international_expansion_runs(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  actor uuid,
  payload jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.international_expansion_events TO authenticated;
GRANT ALL ON public.international_expansion_events TO service_role;
ALTER TABLE public.international_expansion_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "iee_founder_all" ON public.international_expansion_events FOR ALL TO authenticated
  USING (public.is_founder_or_admin(auth.uid())) WITH CHECK (public.is_founder_or_admin(auth.uid()));

-- ---------- DATA ROOM HARDENING ----------
CREATE TABLE public.data_room_access_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_name text NOT NULL,
  organisation text,
  email text,
  domain text,
  access_scope text,
  allowed_folders jsonb DEFAULT '[]'::jsonb,
  expiry_at timestamptz,
  watermark_enabled boolean DEFAULT true,
  download_allowed boolean DEFAULT false,
  view_only boolean DEFAULT true,
  nda_status text DEFAULT 'not_signed',
  approval_status text DEFAULT 'pending',
  approved_by uuid,
  approved_at timestamptz,
  revoked_at timestamptz,
  revoked_reason text,
  token_hash text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.data_room_access_tokens TO authenticated;
GRANT ALL ON public.data_room_access_tokens TO service_role;
ALTER TABLE public.data_room_access_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "drat_founder_all" ON public.data_room_access_tokens FOR ALL TO authenticated
  USING (public.is_founder_or_admin(auth.uid())) WITH CHECK (public.is_founder_or_admin(auth.uid()));
CREATE TRIGGER tr_drat_updated BEFORE UPDATE ON public.data_room_access_tokens FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE public.data_room_view_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id uuid REFERENCES public.data_room_access_tokens(id) ON DELETE SET NULL,
  viewer_fingerprint text,
  item_ref text,
  action text NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  ip_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.data_room_view_audit TO authenticated;
GRANT ALL ON public.data_room_view_audit TO service_role;
ALTER TABLE public.data_room_view_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "drva_founder_all" ON public.data_room_view_audit FOR ALL TO authenticated
  USING (public.is_founder_or_admin(auth.uid())) WITH CHECK (public.is_founder_or_admin(auth.uid()));

CREATE TABLE public.data_room_share_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_name text NOT NULL,
  organisation text,
  requested_scope text,
  justification text,
  status text NOT NULL DEFAULT 'pending',
  founder_decision text,
  founder_decided_at timestamptz,
  founder_decided_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.data_room_share_requests TO authenticated;
GRANT ALL ON public.data_room_share_requests TO service_role;
ALTER TABLE public.data_room_share_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "drsr_founder_all" ON public.data_room_share_requests FOR ALL TO authenticated
  USING (public.is_founder_or_admin(auth.uid())) WITH CHECK (public.is_founder_or_admin(auth.uid()));
CREATE TRIGGER tr_drsr_updated BEFORE UPDATE ON public.data_room_share_requests FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ---------- RELEASE WORKFLOW ----------
CREATE TABLE public.release_workflow_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  roadmap_item_id uuid REFERENCES public.product_roadmap_items(id) ON DELETE SET NULL,
  business_id uuid,
  release_title text NOT NULL,
  release_type text NOT NULL DEFAULT 'feature',
  qa_status text DEFAULT 'not_started',
  documentation_status text DEFAULT 'not_started',
  customer_impact text,
  support_impact text,
  release_status text NOT NULL DEFAULT 'planned',
  planned_release_date date,
  released_at timestamptz,
  customer_comms_draft text,
  internal_notes text,
  founder_approved_by uuid,
  founder_approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.release_workflow_items TO authenticated;
GRANT ALL ON public.release_workflow_items TO service_role;
ALTER TABLE public.release_workflow_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rw_founder_all" ON public.release_workflow_items FOR ALL TO authenticated
  USING (public.is_founder_or_admin(auth.uid())) WITH CHECK (public.is_founder_or_admin(auth.uid()));
CREATE TRIGGER tr_rw_updated BEFORE UPDATE ON public.release_workflow_items FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE public.release_workflow_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.release_workflow_items(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  actor uuid,
  payload jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.release_workflow_events TO authenticated;
GRANT ALL ON public.release_workflow_events TO service_role;
ALTER TABLE public.release_workflow_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rwe_founder_all" ON public.release_workflow_events FOR ALL TO authenticated
  USING (public.is_founder_or_admin(auth.uid())) WITH CHECK (public.is_founder_or_admin(auth.uid()));

-- ---------- FX CONSOLIDATION ----------
CREATE TABLE public.fx_rate_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  currency text NOT NULL,
  base_currency text NOT NULL DEFAULT 'GBP',
  rate numeric NOT NULL,
  as_of date NOT NULL DEFAULT CURRENT_DATE,
  source text DEFAULT 'manual',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fx_rate_snapshots TO authenticated;
GRANT ALL ON public.fx_rate_snapshots TO service_role;
ALTER TABLE public.fx_rate_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fxr_founder_all" ON public.fx_rate_snapshots FOR ALL TO authenticated
  USING (public.is_founder_or_admin(auth.uid())) WITH CHECK (public.is_founder_or_admin(auth.uid()));
CREATE INDEX idx_fxr_ccy_date ON public.fx_rate_snapshots(currency, as_of DESC);

CREATE TABLE public.portfolio_fx_warnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  currency text NOT NULL,
  business_id uuid,
  missing_rate boolean DEFAULT true,
  last_seen_at timestamptz DEFAULT now(),
  notes text,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.portfolio_fx_warnings TO authenticated;
GRANT ALL ON public.portfolio_fx_warnings TO service_role;
ALTER TABLE public.portfolio_fx_warnings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fxw_founder_all" ON public.portfolio_fx_warnings FOR ALL TO authenticated
  USING (public.is_founder_or_admin(auth.uid())) WITH CHECK (public.is_founder_or_admin(auth.uid()));
CREATE TRIGGER tr_fxw_updated BEFORE UPDATE ON public.portfolio_fx_warnings FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
