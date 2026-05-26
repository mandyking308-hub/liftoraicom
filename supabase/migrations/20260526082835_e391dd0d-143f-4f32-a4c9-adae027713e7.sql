
CREATE TABLE public.business_lifecycle_stages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stage_code TEXT NOT NULL UNIQUE,
  stage_name TEXT NOT NULL,
  description TEXT,
  allowed_modules TEXT[] NOT NULL DEFAULT '{}',
  required_modules TEXT[] NOT NULL DEFAULT '{}',
  allowed_external_actions TEXT[] NOT NULL DEFAULT '{}',
  required_checks TEXT[] NOT NULL DEFAULT '{}',
  approval_required_for_entry BOOLEAN NOT NULL DEFAULT true,
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.business_lifecycle_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL,
  stage_id UUID NOT NULL REFERENCES public.business_lifecycle_stages(id) ON DELETE RESTRICT,
  stage_status TEXT NOT NULL DEFAULT 'current',
  reason TEXT,
  founder_approved_at TIMESTAMPTZ,
  entered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.business_stage_transition_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL,
  from_stage TEXT,
  to_stage TEXT NOT NULL,
  transition_reason TEXT,
  approval_required BOOLEAN NOT NULL DEFAULT true,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  audit_metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE public.business_lifecycle_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_lifecycle_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_stage_transition_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage lifecycle_stages" ON public.business_lifecycle_stages
  FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage lifecycle_assignments" ON public.business_lifecycle_assignments
  FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage stage_transition_events" ON public.business_stage_transition_events
  FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_bla_business ON public.business_lifecycle_assignments(business_id, stage_status);
CREATE INDEX idx_bste_business ON public.business_stage_transition_events(business_id, created_at DESC);

CREATE TRIGGER trg_bls_updated BEFORE UPDATE ON public.business_lifecycle_stages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_bla_updated BEFORE UPDATE ON public.business_lifecycle_assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.business_lifecycle_stages (stage_code, stage_name, description, allowed_modules, required_modules, allowed_external_actions, required_checks, approval_required_for_entry, sort_order) VALUES
('idea', 'Idea', 'Concept stage. Internal exploration only.', ARRAY['brain','manuals','archetype'], ARRAY['archetype'], ARRAY[]::text[], ARRAY['business_id_assigned'], false, 10),
('research', 'Research', 'Market and feasibility research. No external selling.', ARRAY['brain','manuals','archetype','knowledge'], ARRAY['archetype'], ARRAY[]::text[], ARRAY['archetype_set','target_market_drafted'], false, 20),
('build', 'Build', 'Building product/system. Internal drafts only.', ARRAY['brain','manuals','templates','launch_factory','integration_map'], ARRAY['templates'], ARRAY[]::text[], ARRAY['template_applied','launch_checklist_started'], true, 30),
('internal_live', 'Internal live', 'Running internally for the founder. Drafts and analysis only.', ARRAY['brain','copilot','manuals','templates','launch_factory','integration_map','compliance'], ARRAY['launch_factory','compliance'], ARRAY[]::text[], ARRAY['legal_footer_ready','privacy_ready'], true, 40),
('customer_live', 'Customer live', 'Can prepare customer interactions. External actions remain approval-gated.', ARRAY['brain','copilot','crm','customer_sales','social','outreach','compliance','manuals'], ARRAY['compliance','launch_factory'], ARRAY['approved_email_send','approved_social_post'], ARRAY['legal_published','privacy_published','support_inbox_ready'], true, 50),
('revenue_live', 'Revenue live', 'Quote-to-cash, delivery and support active.', ARRAY['quote_to_cash','delivery','support','crm','finance','compliance','customer_sales'], ARRAY['quote_to_cash','delivery','support','finance'], ARRAY['approved_email_send','approved_invoice_send'], ARRAY['payment_provider_live','contract_template_live','support_sla_set'], true, 60),
('scaling', 'Scaling', 'Capacity, reporting and upgrades activated.', ARRAY['capacity','reporting','customer_upgrades','revenue_autopilot','resource_allocation'], ARRAY['capacity','reporting'], ARRAY['approved_campaign_send'], ARRAY['capacity_plan_set','reporting_live'], true, 70),
('stable', 'Stable', 'Steady-state operation; monitor and maintain.', ARRAY['monitoring','reporting','support','finance'], ARRAY['monitoring'], ARRAY[]::text[], ARRAY['monitoring_live'], false, 80),
('paused', 'Paused', 'Temporarily suspended. No external action.', ARRAY['manuals','knowledge'], ARRAY[]::text[], ARRAY[]::text[], ARRAY['pause_reason_logged'], true, 90),
('parked', 'Parked', 'Mothballed. Minimal cost, no operation.', ARRAY['manuals'], ARRAY[]::text[], ARRAY[]::text[], ARRAY['park_reason_logged'], true, 100),
('exit_ready', 'Exit ready', 'Preparing exit. Data room and exit metrics active.', ARRAY['exit_hardening','data_room','reporting','finance','manuals'], ARRAY['exit_hardening','data_room'], ARRAY[]::text[], ARRAY['data_room_ready','exit_metrics_set'], true, 110),
('sold_closed', 'Sold / closed', 'Wound up or transferred. Archive only.', ARRAY['archive'], ARRAY[]::text[], ARRAY[]::text[], ARRAY['closure_documented'], true, 120);
