
-- Client subscriptions
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  plan_name text NOT NULL DEFAULT 'Standard',
  coverage_type text NOT NULL DEFAULT 'Full Platform',
  support_level text NOT NULL DEFAULT 'Standard',
  status text NOT NULL DEFAULT 'active',
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  last_renewal_date date,
  next_renewal_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Clients can view own subscriptions" ON public.subscriptions FOR SELECT USING (client_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "Founders can manage subscriptions" ON public.subscriptions FOR ALL USING (public.has_role(auth.uid(), 'founder'));

-- System status per subscription
CREATE TABLE public.system_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  service_name text NOT NULL,
  status text NOT NULL DEFAULT 'operational',
  last_checked timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.system_status ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Clients can view own system status" ON public.system_status FOR SELECT USING (subscription_id IN (SELECT id FROM public.subscriptions WHERE client_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())));
CREATE POLICY "Founders can manage system status" ON public.system_status FOR ALL USING (public.has_role(auth.uid(), 'founder'));

-- Maintenance events
CREATE TABLE public.maintenance_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  scheduled_date date NOT NULL,
  status text NOT NULL DEFAULT 'scheduled',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.maintenance_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Clients can view own maintenance events" ON public.maintenance_events FOR SELECT USING (subscription_id IN (SELECT id FROM public.subscriptions WHERE client_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())));
CREATE POLICY "Founders can manage maintenance events" ON public.maintenance_events FOR ALL USING (public.has_role(auth.uid(), 'founder'));

-- Update logs
CREATE TABLE public.update_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  affected_system text,
  performed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.update_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Clients can view own update logs" ON public.update_logs FOR SELECT USING (subscription_id IN (SELECT id FROM public.subscriptions WHERE client_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())));
CREATE POLICY "Founders can manage update logs" ON public.update_logs FOR ALL USING (public.has_role(auth.uid(), 'founder'));

-- Feature requests
CREATE TABLE public.feature_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  business_impact text,
  status text NOT NULL DEFAULT 'submitted',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.feature_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Clients can view own feature requests" ON public.feature_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Clients can create feature requests" ON public.feature_requests FOR INSERT WITH CHECK (auth.uid() = user_id AND subscription_id IN (SELECT id FROM public.subscriptions WHERE client_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())));
CREATE POLICY "Founders can manage feature requests" ON public.feature_requests FOR ALL USING (public.has_role(auth.uid(), 'founder'));

-- Updated_at triggers
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_feature_requests_updated_at BEFORE UPDATE ON public.feature_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
