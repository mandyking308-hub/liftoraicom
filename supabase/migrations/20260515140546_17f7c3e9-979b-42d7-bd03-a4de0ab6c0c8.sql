
-- =========================
-- business_operating_profiles
-- =========================
CREATE TABLE IF NOT EXISTS public.business_operating_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  business_name text NOT NULL,
  operating_status text NOT NULL DEFAULT 'setup',
  business_type text,
  primary_goal text,
  revenue_model text,
  target_market text,
  primary_offer text,
  primary_channel text,
  default_outbound_lane text,
  default_provider_type text,
  crm_enabled boolean NOT NULL DEFAULT true,
  agents_enabled boolean NOT NULL DEFAULT true,
  proposals_enabled boolean NOT NULL DEFAULT true,
  finance_enabled boolean NOT NULL DEFAULT true,
  suppliers_enabled boolean NOT NULL DEFAULT false,
  smartlead_enabled boolean NOT NULL DEFAULT false,
  native_email_enabled boolean NOT NULL DEFAULT true,
  apollo_enabled boolean NOT NULL DEFAULT false,
  founder_approval_required boolean NOT NULL DEFAULT true,
  auto_send_allowed boolean NOT NULL DEFAULT false,
  external_provider_mutation_allowed boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id)
);

ALTER TABLE public.business_operating_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders/admins manage operating profiles"
  ON public.business_operating_profiles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'founder'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'founder'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_business_operating_profiles_updated_at
  BEFORE UPDATE ON public.business_operating_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================
-- business_operating_modules
-- =========================
CREATE TABLE IF NOT EXISTS public.business_operating_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  module_key text NOT NULL,
  module_label text NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  setup_status text NOT NULL DEFAULT 'not_started',
  readiness_status text NOT NULL DEFAULT 'not_checked',
  blockers jsonb NOT NULL DEFAULT '[]'::jsonb,
  last_checked_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, module_key)
);

ALTER TABLE public.business_operating_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders/admins manage operating modules"
  ON public.business_operating_modules
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'founder'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'founder'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_business_operating_modules_updated_at
  BEFORE UPDATE ON public.business_operating_modules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================
-- business_agent_assignments_v2
-- =========================
CREATE TABLE IF NOT EXISTS public.business_agent_assignments_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  agent_key text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  operating_mode text NOT NULL DEFAULT 'founder_approved',
  can_create_internal_records boolean NOT NULL DEFAULT true,
  can_send_external boolean NOT NULL DEFAULT false,
  can_call_provider_post boolean NOT NULL DEFAULT false,
  can_spend_credits boolean NOT NULL DEFAULT false,
  founder_approval_required boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'ready',
  blockers jsonb NOT NULL DEFAULT '[]'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, agent_key)
);

ALTER TABLE public.business_agent_assignments_v2 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders/admins manage agent assignments v2"
  ON public.business_agent_assignments_v2
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'founder'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'founder'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_business_agent_assignments_v2_updated_at
  BEFORE UPDATE ON public.business_agent_assignments_v2
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================
-- Seed Neon Candy
-- =========================
INSERT INTO public.business_operating_profiles (
  business_id, business_name, operating_status,
  smartlead_enabled, native_email_enabled, apollo_enabled,
  crm_enabled, agents_enabled, proposals_enabled, finance_enabled, suppliers_enabled,
  founder_approval_required, auto_send_allowed, external_provider_mutation_allowed
)
SELECT b.id, b.name, 'active_build',
  true, true, true,
  true, true, true, true, false,
  true, false, false
FROM public.businesses b
WHERE b.id = 'b47c4b11-9a96-4af9-9aec-2f5218de9182'
ON CONFLICT (business_id) DO UPDATE SET
  operating_status = EXCLUDED.operating_status,
  smartlead_enabled = EXCLUDED.smartlead_enabled,
  native_email_enabled = EXCLUDED.native_email_enabled,
  apollo_enabled = EXCLUDED.apollo_enabled,
  crm_enabled = EXCLUDED.crm_enabled,
  agents_enabled = EXCLUDED.agents_enabled,
  founder_approval_required = EXCLUDED.founder_approval_required,
  auto_send_allowed = EXCLUDED.auto_send_allowed,
  external_provider_mutation_allowed = EXCLUDED.external_provider_mutation_allowed,
  updated_at = now();

-- Seed module rows for every existing business
INSERT INTO public.business_operating_modules (business_id, module_key, module_label, enabled)
SELECT b.id, m.key, m.label, m.default_enabled
FROM public.businesses b
CROSS JOIN (VALUES
  ('crm','CRM', true),
  ('compliance','Compliance', true),
  ('outbound_native','Outbound — Native', true),
  ('outbound_smartlead','Outbound — Smartlead', false),
  ('apollo_sourcing','Apollo Sourcing', false),
  ('ai_engagement','AI Engagement', true),
  ('founder_approval','Founder Approval', true),
  ('proposals','Proposals', true),
  ('demos','Demos', true),
  ('deals','Deals', true),
  ('finance','Finance', true),
  ('suppliers','Suppliers', false),
  ('reporting','Reporting', true),
  ('monitoring','Monitoring', true),
  ('knowledge','Knowledge', true),
  ('manual','Manual', true),
  ('testing','Testing', true)
) AS m(key, label, default_enabled)
ON CONFLICT (business_id, module_key) DO NOTHING;

-- Seed agent assignments for every existing business
INSERT INTO public.business_agent_assignments_v2 (business_id, agent_key, enabled, operating_mode, founder_approval_required)
SELECT b.id, a.key, true, 'founder_approved', true
FROM public.businesses b
CROSS JOIN (VALUES
  ('outreach_agent'),
  ('inbox_agent'),
  ('ai_engagement_agent'),
  ('proposal_agent'),
  ('commercial_agent'),
  ('finance_agent'),
  ('supplier_agent'),
  ('compliance_agent'),
  ('ops_agent'),
  ('founder_copilot_agent'),
  ('priority_agent')
) AS a(key)
ON CONFLICT (business_id, agent_key) DO NOTHING;
