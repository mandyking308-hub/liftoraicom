
CREATE TABLE public.incident_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID,
  incident_title TEXT NOT NULL,
  incident_type TEXT NOT NULL DEFAULT 'other',
  severity TEXT NOT NULL DEFAULT 'medium',
  incident_status TEXT NOT NULL DEFAULT 'detected',
  affected_systems TEXT[] NOT NULL DEFAULT '{}',
  affected_customers_count INTEGER NOT NULL DEFAULT 0,
  customer_notification_required BOOLEAN NOT NULL DEFAULT false,
  regulator_notification_required BOOLEAN NOT NULL DEFAULT false,
  discovered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  root_cause TEXT,
  workaround TEXT,
  owner TEXT,
  audit_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.incident_timeline_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  incident_id UUID NOT NULL REFERENCES public.incident_records(id) ON DELETE CASCADE,
  event_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  event_summary TEXT NOT NULL,
  event_type TEXT NOT NULL DEFAULT 'update',
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.incident_postmortems (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  incident_id UUID NOT NULL REFERENCES public.incident_records(id) ON DELETE CASCADE,
  root_cause_summary TEXT,
  impact_summary TEXT,
  what_worked TEXT,
  what_failed TEXT,
  corrective_actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  owner TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.continuity_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID,
  plan_name TEXT NOT NULL,
  scenario TEXT,
  fallback_steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  critical_contacts JSONB NOT NULL DEFAULT '[]'::jsonb,
  critical_systems TEXT[] NOT NULL DEFAULT '{}',
  last_tested_at TIMESTAMPTZ,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.incident_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_timeline_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_postmortems ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.continuity_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders manage incidents" ON public.incident_records
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'));

CREATE POLICY "Founders manage incident timeline" ON public.incident_timeline_events
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'));

CREATE POLICY "Founders manage postmortems" ON public.incident_postmortems
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'));

CREATE POLICY "Founders manage continuity plans" ON public.continuity_plans
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'));

CREATE TRIGGER update_incident_records_updated_at
  BEFORE UPDATE ON public.incident_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_continuity_plans_updated_at
  BEFORE UPDATE ON public.continuity_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_incident_records_status ON public.incident_records(incident_status);
CREATE INDEX idx_incident_records_severity ON public.incident_records(severity);
CREATE INDEX idx_incident_timeline_incident ON public.incident_timeline_events(incident_id, event_time DESC);
CREATE INDEX idx_incident_postmortems_incident ON public.incident_postmortems(incident_id);
CREATE INDEX idx_continuity_plans_active ON public.continuity_plans(active);
