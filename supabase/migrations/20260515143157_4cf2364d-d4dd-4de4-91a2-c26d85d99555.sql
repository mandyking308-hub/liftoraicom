
CREATE TABLE IF NOT EXISTS public.client_system_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_key text NOT NULL UNIQUE,
  package_name text NOT NULL,
  description text NULL,
  included_modules jsonb NOT NULL DEFAULT '[]'::jsonb,
  setup_fee_min numeric NULL,
  setup_fee_max numeric NULL,
  monthly_fee_min numeric NULL,
  monthly_fee_max numeric NULL,
  delivery_notes text NULL,
  active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.client_system_packages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read active packages" ON public.client_system_packages;
CREATE POLICY "Public can read active packages"
  ON public.client_system_packages FOR SELECT
  USING (active = true OR public.has_role(auth.uid(), 'founder') OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Founders manage packages" ON public.client_system_packages;
CREATE POLICY "Founders manage packages"
  ON public.client_system_packages FOR ALL
  USING (public.has_role(auth.uid(), 'founder') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'founder') OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_client_system_packages_updated_at
  BEFORE UPDATE ON public.client_system_packages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.client_system_packages (package_key, package_name, description, included_modules, setup_fee_min, setup_fee_max, monthly_fee_min, monthly_fee_max, delivery_notes)
VALUES
  ('ai_outreach_system', 'AI Outreach System',
   'Outbound engine: ICP brief, sourcing, AI drafting, founder-approved sending, reply triage, CRM capture.',
   '["icp_brief","sourcing","drafting","approval_console","sending","reply_triage","crm_capture"]'::jsonb,
   3500, 7500, 900, 2200, 'Two-week build · founder approval gates retained'),
  ('ai_crm_sales_system', 'AI CRM & Sales System',
   'CRM memory, lifecycle scoring, conversation bridge, commercial handoff and proposal agents.',
   '["crm_memory","lifecycle","conversation_bridge","commercial_handoff","proposal_agent"]'::jsonb,
   4500, 9500, 1200, 2800, 'Three-week build · integrates with existing CRM if present'),
  ('ai_operations_brain', 'AI Operations Brain',
   'Internal operating schedules, supplier review, finance review, system health and approvals routing.',
   '["operating_schedules","supplier_review","finance_review","system_health","approvals"]'::jsonb,
   5500, 11000, 1500, 3500, 'Internal-only by default · no autonomous outbound'),
  ('ai_full_business_os', 'AI Full Business OS',
   'End-to-end stack: outreach + CRM + operations + proposals + revenue + governance.',
   '["outreach","crm","operations","proposals","revenue","governance"]'::jsonb,
   12000, 28000, 3500, 8500, 'Six to ten week build · founder retains final approval on all sends'),
  ('ai_music_brand_growth_system', 'AI Music Brand Growth System',
   'For artists and labels: audience growth, release ops, partner outreach, fan CRM.',
   '["audience_growth","release_ops","partner_outreach","fan_crm"]'::jsonb,
   4000, 9000, 1100, 2600, 'Music-vertical knowledge brain included'),
  ('ai_property_lead_system', 'AI Property Lead System',
   'Property pipeline: source, qualify, brief, founder-approved outreach, viewing handoff.',
   '["sourcing","qualification","briefing","approved_outreach","viewing_handoff"]'::jsonb,
   4500, 9500, 1200, 2800, 'Property knowledge brain · compliance-aware'),
  ('ai_consultancy_growth_system', 'AI Consultancy Growth System',
   'For consultancies/agencies: positioning, ICP capture, proposal engine, commercial handoff.',
   '["positioning","icp","proposal_engine","commercial_handoff"]'::jsonb,
   4000, 8500, 1100, 2500, 'Consultancy knowledge brain · proposal templates included')
ON CONFLICT (package_key) DO NOTHING;
