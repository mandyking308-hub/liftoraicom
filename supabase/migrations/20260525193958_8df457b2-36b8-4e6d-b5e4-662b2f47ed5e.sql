
CREATE TABLE public.access_systems (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  system_name TEXT NOT NULL,
  system_type TEXT NOT NULL DEFAULT 'other',
  business_id UUID,
  login_method_summary TEXT,
  owner TEXT,
  risk_level TEXT NOT NULL DEFAULT 'medium',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.secret_inventory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  system_id UUID REFERENCES public.access_systems(id) ON DELETE SET NULL,
  secret_name TEXT NOT NULL,
  secret_type TEXT NOT NULL DEFAULT 'other',
  configured BOOLEAN NOT NULL DEFAULT false,
  storage_location_summary TEXT,
  last_rotated_at TIMESTAMPTZ,
  rotation_due_at TIMESTAMPTZ,
  owner TEXT,
  risk_level TEXT NOT NULL DEFAULT 'medium',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.access_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  system_id UUID NOT NULL REFERENCES public.access_systems(id) ON DELETE CASCADE,
  user_or_operator TEXT NOT NULL,
  access_level TEXT,
  access_status TEXT NOT NULL DEFAULT 'requested',
  granted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.access_audit_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  system_id UUID REFERENCES public.access_systems(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  event_summary TEXT,
  severity TEXT NOT NULL DEFAULT 'info',
  audit_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.access_systems ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.secret_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_audit_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders manage access_systems" ON public.access_systems FOR ALL
  USING (public.has_role(auth.uid(), 'founder') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'founder') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Founders manage secret_inventory" ON public.secret_inventory FOR ALL
  USING (public.has_role(auth.uid(), 'founder') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'founder') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Founders manage access_assignments" ON public.access_assignments FOR ALL
  USING (public.has_role(auth.uid(), 'founder') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'founder') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Founders manage access_audit_events" ON public.access_audit_events FOR ALL
  USING (public.has_role(auth.uid(), 'founder') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'founder') OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_access_systems_updated BEFORE UPDATE ON public.access_systems
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_secret_inventory_updated BEFORE UPDATE ON public.secret_inventory
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_access_assignments_updated BEFORE UPDATE ON public.access_assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_secret_inventory_system ON public.secret_inventory(system_id);
CREATE INDEX idx_secret_inventory_due ON public.secret_inventory(rotation_due_at);
CREATE INDEX idx_access_assignments_system ON public.access_assignments(system_id);
CREATE INDEX idx_access_assignments_status ON public.access_assignments(access_status);
CREATE INDEX idx_access_audit_events_system ON public.access_audit_events(system_id);
CREATE INDEX idx_access_audit_events_created ON public.access_audit_events(created_at DESC);
