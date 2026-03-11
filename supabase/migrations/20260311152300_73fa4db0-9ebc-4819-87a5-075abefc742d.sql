
-- Security alerts table
CREATE TABLE public.security_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text DEFAULT '',
  severity text NOT NULL DEFAULT 'medium',
  alert_type text NOT NULL DEFAULT 'general',
  system_id uuid REFERENCES public.monitored_systems(id) ON DELETE SET NULL,
  system_name text DEFAULT '',
  resolved boolean NOT NULL DEFAULT false,
  resolved_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.security_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders can manage security alerts" ON public.security_alerts FOR ALL USING (has_role(auth.uid(), 'founder'::app_role));

-- Access anomalies table
CREATE TABLE public.access_anomalies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name text DEFAULT '',
  anomaly_type text NOT NULL,
  description text DEFAULT '',
  severity text NOT NULL DEFAULT 'medium',
  flagged boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.access_anomalies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders can manage access anomalies" ON public.access_anomalies FOR ALL USING (has_role(auth.uid(), 'founder'::app_role));

-- Risk indicators table
CREATE TABLE public.risk_indicators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  system_id uuid REFERENCES public.monitored_systems(id) ON DELETE SET NULL,
  system_name text NOT NULL DEFAULT '',
  risk_description text NOT NULL,
  severity text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'active',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.risk_indicators ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders can manage risk indicators" ON public.risk_indicators FOR ALL USING (has_role(auth.uid(), 'founder'::app_role));
CREATE TRIGGER update_risk_indicators_updated_at BEFORE UPDATE ON public.risk_indicators FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Compliance items table
CREATE TABLE public.compliance_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  area text NOT NULL,
  description text DEFAULT '',
  status text NOT NULL DEFAULT 'not_reviewed',
  last_review_date timestamp with time zone,
  next_review_date timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.compliance_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders can manage compliance items" ON public.compliance_items FOR ALL USING (has_role(auth.uid(), 'founder'::app_role));
CREATE TRIGGER update_compliance_items_updated_at BEFORE UPDATE ON public.compliance_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Compliance documents table
CREATE TABLE public.compliance_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint DEFAULT NULL,
  category text NOT NULL DEFAULT 'General',
  uploaded_by text NOT NULL DEFAULT 'Liftor AI',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.compliance_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders can manage compliance documents" ON public.compliance_documents FOR ALL USING (has_role(auth.uid(), 'founder'::app_role));

-- Security events log
CREATE TABLE public.security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name text DEFAULT '',
  event_type text NOT NULL,
  description text DEFAULT '',
  affected_system text DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders can manage security events" ON public.security_events FOR ALL USING (has_role(auth.uid(), 'founder'::app_role));

-- Storage bucket for compliance docs
INSERT INTO storage.buckets (id, name, public) VALUES ('compliance-documents', 'compliance-documents', false);
CREATE POLICY "Founders can manage compliance doc storage" ON storage.objects FOR ALL USING (bucket_id = 'compliance-documents' AND has_role(auth.uid(), 'founder'::app_role));

-- Seed default compliance items
INSERT INTO public.compliance_items (area, description, status) VALUES
  ('Operational Documentation', 'System operational procedures and runbooks', 'not_reviewed'),
  ('System Architecture Records', 'Architecture diagrams and technical documentation', 'not_reviewed'),
  ('Process Documentation', 'Business process maps and automation specifications', 'not_reviewed'),
  ('Access Control Policies', 'Role-based access control policies and procedures', 'not_reviewed'),
  ('Data Protection', 'Data handling, encryption, and privacy policies', 'not_reviewed'),
  ('Incident Response', 'Security incident response procedures', 'not_reviewed');
