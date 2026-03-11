
-- Integrations table
CREATE TABLE public.integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  service_type text NOT NULL DEFAULT 'ai_model',
  endpoint_url text,
  auth_method text NOT NULL DEFAULT 'api_key',
  status text NOT NULL DEFAULT 'connected',
  last_sync timestamptz,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders can manage integrations" ON public.integrations FOR ALL USING (public.has_role(auth.uid(), 'founder'));

CREATE TRIGGER update_integrations_updated_at BEFORE UPDATE ON public.integrations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Integration linked systems
CREATE TABLE public.integration_linked_systems (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id uuid NOT NULL REFERENCES public.integrations(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  entity_name text NOT NULL,
  linked_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.integration_linked_systems ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders can manage linked systems" ON public.integration_linked_systems FOR ALL USING (public.has_role(auth.uid(), 'founder'));

-- Integration activity logs
CREATE TABLE public.integration_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id uuid NOT NULL REFERENCES public.integrations(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  details text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.integration_activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders can manage integration logs" ON public.integration_activity_logs FOR ALL USING (public.has_role(auth.uid(), 'founder'));

-- Integration alerts
CREATE TABLE public.integration_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id uuid NOT NULL REFERENCES public.integrations(id) ON DELETE CASCADE,
  severity text NOT NULL DEFAULT 'warning',
  title text NOT NULL,
  description text,
  resolved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.integration_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders can manage integration alerts" ON public.integration_alerts FOR ALL USING (public.has_role(auth.uid(), 'founder'));
