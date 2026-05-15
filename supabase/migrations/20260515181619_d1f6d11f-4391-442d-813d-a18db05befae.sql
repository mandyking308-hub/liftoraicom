
CREATE TABLE IF NOT EXISTS public.group_entity_register (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.businesses(id) ON DELETE SET NULL,
  entity_name text NOT NULL,
  entity_type text,
  jurisdiction text,
  company_number text,
  registration_number text,
  registered_office text,
  incorporation_date date,
  financial_year_end date,
  tax_residency_notes text,
  shareholder_notes text,
  director_notes text,
  beneficial_owner_notes text,
  licence_number text,
  licence_expiry_date date,
  entity_status text DEFAULT 'active',
  responsible_adviser text,
  adviser_contact text,
  risk_level text DEFAULT 'medium',
  next_filing_due_at date,
  next_review_due_at date,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.group_entity_register ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders manage group_entity_register" ON public.group_entity_register
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'founder'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'founder'));
CREATE TRIGGER trg_ger_updated BEFORE UPDATE ON public.group_entity_register
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE UNIQUE INDEX IF NOT EXISTS idx_ger_unique_name ON public.group_entity_register(entity_name);

CREATE TABLE IF NOT EXISTS public.group_obligation_calendar (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id uuid REFERENCES public.group_entity_register(id) ON DELETE CASCADE,
  business_id uuid REFERENCES public.businesses(id) ON DELETE SET NULL,
  obligation_type text NOT NULL,
  obligation_name text NOT NULL,
  jurisdiction text,
  due_date date,
  recurrence_rule text,
  status text DEFAULT 'pending',
  responsible_party text,
  adviser_required boolean DEFAULT false,
  founder_review_required boolean DEFAULT true,
  notes text,
  evidence_document_id uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.group_obligation_calendar ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders manage group_obligation_calendar" ON public.group_obligation_calendar
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'founder'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'founder'));
CREATE TRIGGER trg_goc_updated BEFORE UPDATE ON public.group_obligation_calendar
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX IF NOT EXISTS idx_goc_due ON public.group_obligation_calendar(due_date);
CREATE INDEX IF NOT EXISTS idx_goc_entity ON public.group_obligation_calendar(entity_id);
CREATE INDEX IF NOT EXISTS idx_goc_status ON public.group_obligation_calendar(status);

CREATE TABLE IF NOT EXISTS public.group_governance_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id uuid REFERENCES public.group_entity_register(id) ON DELETE SET NULL,
  business_id uuid REFERENCES public.businesses(id) ON DELETE SET NULL,
  review_type text NOT NULL,
  review_period_start date,
  review_period_end date,
  review_status text DEFAULT 'draft',
  summary text,
  key_risks jsonb DEFAULT '[]'::jsonb,
  key_decisions jsonb DEFAULT '[]'::jsonb,
  required_actions jsonb DEFAULT '[]'::jsonb,
  adviser_actions jsonb DEFAULT '[]'::jsonb,
  founder_review_required boolean DEFAULT true,
  approved_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.group_governance_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders manage group_governance_reviews" ON public.group_governance_reviews
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'founder'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'founder'));
CREATE TRIGGER trg_ggr_updated BEFORE UPDATE ON public.group_governance_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX IF NOT EXISTS idx_ggr_entity ON public.group_governance_reviews(entity_id);

-- Seed entities (no sensitive tax IDs)
INSERT INTO public.group_entity_register (entity_name, entity_type, jurisdiction, financial_year_end, entity_status, risk_level, responsible_adviser, metadata) VALUES
  ('Health Choices Global Limited','private_limited_company','United Kingdom', NULL, 'active','medium','UK accountant','{"notes":"UK trading entity. Sensitive identifiers not stored here."}'::jsonb),
  ('Global Solutions Management LLC','llc','Delaware, USA', NULL, 'active','medium','US registered agent','{"notes":"Delaware operating entity for Liftor AI. Sensitive identifiers not stored here."}'::jsonb),
  ('Zorvian Management Consultants FZCO','free_zone_company','UAE (Dubai DWTC / IFZA)', NULL, 'active','medium','UAE corporate adviser','{"notes":"UAE entity. Licence renewal and corporate tax tracked via obligation calendar."}'::jsonb)
ON CONFLICT (entity_name) DO NOTHING;

-- Seed standard obligations per entity (placeholders, no due dates set)
INSERT INTO public.group_obligation_calendar (entity_id, obligation_type, obligation_name, jurisdiction, recurrence_rule, status, founder_review_required, adviser_required, notes)
SELECT e.id, o.obligation_type, o.obligation_name, e.jurisdiction, 'annual', 'pending', true, true, 'Auto-seeded placeholder. Confirm date with adviser before any filing.'
FROM public.group_entity_register e
CROSS JOIN (VALUES
  ('annual_accounts','Annual accounts'),
  ('confirmation_statement','Confirmation / annual return'),
  ('corporation_tax','Corporation / corporate tax'),
  ('registered_agent','Registered agent renewal'),
  ('licence_renewal','Trade / business licence renewal'),
  ('insurance_renewal','Insurance renewal'),
  ('board_review','Board / founder review'),
  ('tax_adviser_review','Tax adviser review'),
  ('legal_adviser_review','Legal adviser review'),
  ('data_protection_review','Data protection review')
) AS o(obligation_type, obligation_name)
ON CONFLICT DO NOTHING;

-- Seed an annual entity review per entity
INSERT INTO public.group_governance_reviews (entity_id, review_type, review_status, summary, founder_review_required)
SELECT e.id, 'annual_entity_review', 'draft', 'Auto-seeded annual entity review placeholder. Founder confirms scope.', true
FROM public.group_entity_register e
ON CONFLICT DO NOTHING;
