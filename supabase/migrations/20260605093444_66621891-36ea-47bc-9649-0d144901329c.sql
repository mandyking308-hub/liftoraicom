
-- Updated_at trigger fn
CREATE OR REPLACE FUNCTION public.hwc_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

-- ============ worker_profiles ============
CREATE TABLE public.worker_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE,
  full_name text NOT NULL,
  email text NOT NULL,
  role text NOT NULL,
  country text,
  timezone text,
  status text NOT NULL DEFAULT 'pending',
  nda_signed boolean NOT NULL DEFAULT false,
  hourly_rate numeric,
  provider_company text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.worker_profiles TO authenticated;
GRANT ALL ON public.worker_profiles TO service_role;
ALTER TABLE public.worker_profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_worker_profiles_updated BEFORE UPDATE ON public.worker_profiles
  FOR EACH ROW EXECUTE FUNCTION public.hwc_touch_updated_at();

CREATE TABLE public.worker_access_windows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id uuid NOT NULL REFERENCES public.worker_profiles(id) ON DELETE CASCADE,
  portal_type text NOT NULL CHECK (portal_type IN ('operator','oversight')),
  window_date date NOT NULL DEFAULT (now()::date),
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  max_session_minutes integer NOT NULL DEFAULT 240,
  status text NOT NULL DEFAULT 'scheduled',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_waw_worker ON public.worker_access_windows(worker_id, portal_type, status);
GRANT SELECT, INSERT, UPDATE ON public.worker_access_windows TO authenticated;
GRANT ALL ON public.worker_access_windows TO service_role;
ALTER TABLE public.worker_access_windows ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.worker_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id uuid NOT NULL REFERENCES public.worker_profiles(id) ON DELETE CASCADE,
  access_window_id uuid REFERENCES public.worker_access_windows(id) ON DELETE SET NULL,
  login_at timestamptz NOT NULL DEFAULT now(),
  logout_at timestamptz,
  forced_logout_at timestamptz,
  ip_address text,
  device_fingerprint text,
  country_detected text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.worker_sessions TO authenticated;
GRANT ALL ON public.worker_sessions TO service_role;
ALTER TABLE public.worker_sessions ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.worker_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid,
  assigned_to uuid REFERENCES public.worker_profiles(id) ON DELETE SET NULL,
  task_type text NOT NULL,
  title text NOT NULL,
  description text,
  priority text NOT NULL DEFAULT 'normal',
  status text NOT NULL DEFAULT 'assigned',
  due_at timestamptz,
  requires_founder_approval boolean NOT NULL DEFAULT false,
  external_action_blocked boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.worker_tasks TO authenticated;
GRANT ALL ON public.worker_tasks TO service_role;
ALTER TABLE public.worker_tasks ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_worker_tasks_updated BEFORE UPDATE ON public.worker_tasks
  FOR EACH ROW EXECUTE FUNCTION public.hwc_touch_updated_at();

CREATE TABLE public.worker_task_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.worker_tasks(id) ON DELETE CASCADE,
  worker_id uuid NOT NULL REFERENCES public.worker_profiles(id) ON DELETE CASCADE,
  log_text text NOT NULL,
  time_spent_minutes integer,
  status_update text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.worker_task_logs TO authenticated;
GRANT ALL ON public.worker_task_logs TO service_role;
ALTER TABLE public.worker_task_logs ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.worker_evidence_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.worker_tasks(id) ON DELETE CASCADE,
  worker_id uuid NOT NULL REFERENCES public.worker_profiles(id) ON DELETE CASCADE,
  file_url text,
  evidence_type text NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.worker_evidence_uploads TO authenticated;
GRANT ALL ON public.worker_evidence_uploads TO service_role;
ALTER TABLE public.worker_evidence_uploads ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.worker_oversight_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reviewer_id uuid NOT NULL REFERENCES public.worker_profiles(id) ON DELETE CASCADE,
  worker_id uuid NOT NULL REFERENCES public.worker_profiles(id) ON DELETE CASCADE,
  task_id uuid NOT NULL REFERENCES public.worker_tasks(id) ON DELETE CASCADE,
  review_date date NOT NULL DEFAULT (now()::date),
  review_status text NOT NULL,
  review_notes text,
  minutes_spent integer,
  location_basis text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.worker_oversight_reviews TO authenticated;
GRANT ALL ON public.worker_oversight_reviews TO service_role;
ALTER TABLE public.worker_oversight_reviews ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.worker_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id uuid REFERENCES public.worker_profiles(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  portal_type text,
  related_task_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.worker_audit_events TO authenticated;
GRANT ALL ON public.worker_audit_events TO service_role;
ALTER TABLE public.worker_audit_events ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.monthly_business_content_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid,
  month_start date NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  plan_summary text,
  created_by_ai boolean NOT NULL DEFAULT true,
  operator_id uuid REFERENCES public.worker_profiles(id) ON DELETE SET NULL,
  oversight_reviewer_id uuid REFERENCES public.worker_profiles(id) ON DELETE SET NULL,
  founder_approved_by uuid,
  founder_approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.monthly_business_content_plans TO authenticated;
GRANT ALL ON public.monthly_business_content_plans TO service_role;
ALTER TABLE public.monthly_business_content_plans ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_mbcp_updated BEFORE UPDATE ON public.monthly_business_content_plans
  FOR EACH ROW EXECUTE FUNCTION public.hwc_touch_updated_at();

CREATE TABLE public.monthly_content_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.monthly_business_content_plans(id) ON DELETE CASCADE,
  business_id uuid,
  content_date date NOT NULL,
  channel text NOT NULL,
  content_type text NOT NULL,
  title text NOT NULL,
  hook text,
  caption text,
  cta text,
  asset_notes text,
  status text NOT NULL DEFAULT 'draft',
  external_publish_blocked boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.monthly_content_items TO authenticated;
GRANT ALL ON public.monthly_content_items TO service_role;
ALTER TABLE public.monthly_content_items ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_mci_updated BEFORE UPDATE ON public.monthly_content_items
  FOR EACH ROW EXECUTE FUNCTION public.hwc_touch_updated_at();

CREATE TABLE public.worker_kill_switch (
  id boolean PRIMARY KEY DEFAULT true CHECK (id = true),
  active boolean NOT NULL DEFAULT false,
  reason text,
  toggled_by uuid,
  toggled_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.worker_kill_switch (id, active) VALUES (true, false) ON CONFLICT DO NOTHING;
GRANT SELECT ON public.worker_kill_switch TO authenticated;
GRANT ALL ON public.worker_kill_switch TO service_role;
ALTER TABLE public.worker_kill_switch ENABLE ROW LEVEL SECURITY;

-- ============ helpers ============
CREATE OR REPLACE FUNCTION public.current_worker_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.worker_profiles WHERE user_id = auth.uid() LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.is_kill_switch_active()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT active FROM public.worker_kill_switch WHERE id = true), false)
$$;

CREATE OR REPLACE FUNCTION public.worker_has_active_window(_worker_id uuid, _portal_type text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT NOT public.is_kill_switch_active() AND EXISTS (
    SELECT 1 FROM public.worker_access_windows
    WHERE worker_id = _worker_id
      AND portal_type = _portal_type
      AND status IN ('scheduled','active')
      AND now() BETWEEN start_time AND end_time
  )
$$;

CREATE OR REPLACE FUNCTION public.is_founder()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('founder'::public.app_role, 'admin'::public.app_role)
  )
$$;

CREATE OR REPLACE FUNCTION public.is_oversight_reviewer()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('dubai_oversight'::public.app_role, 'professional_reviewer'::public.app_role)
  )
$$;

-- ============ POLICIES ============
CREATE POLICY wp_founder_all ON public.worker_profiles FOR ALL TO authenticated
  USING (public.is_founder()) WITH CHECK (public.is_founder());
CREATE POLICY wp_self_read ON public.worker_profiles FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY wp_oversight_read ON public.worker_profiles FOR SELECT TO authenticated
  USING (public.is_oversight_reviewer());

CREATE POLICY waw_founder_all ON public.worker_access_windows FOR ALL TO authenticated
  USING (public.is_founder()) WITH CHECK (public.is_founder());
CREATE POLICY waw_self_read ON public.worker_access_windows FOR SELECT TO authenticated
  USING (worker_id = public.current_worker_id());

CREATE POLICY ws_founder_all ON public.worker_sessions FOR ALL TO authenticated
  USING (public.is_founder()) WITH CHECK (public.is_founder());
CREATE POLICY ws_self_read ON public.worker_sessions FOR SELECT TO authenticated
  USING (worker_id = public.current_worker_id());
CREATE POLICY ws_self_insert ON public.worker_sessions FOR INSERT TO authenticated
  WITH CHECK (worker_id = public.current_worker_id());
CREATE POLICY ws_self_update ON public.worker_sessions FOR UPDATE TO authenticated
  USING (worker_id = public.current_worker_id())
  WITH CHECK (worker_id = public.current_worker_id());

CREATE POLICY wt_founder_all ON public.worker_tasks FOR ALL TO authenticated
  USING (public.is_founder()) WITH CHECK (public.is_founder());
CREATE POLICY wt_assigned_read ON public.worker_tasks FOR SELECT TO authenticated
  USING (assigned_to = public.current_worker_id());
CREATE POLICY wt_assigned_update ON public.worker_tasks FOR UPDATE TO authenticated
  USING (
    assigned_to = public.current_worker_id()
    AND public.worker_has_active_window(public.current_worker_id(), 'operator')
  )
  WITH CHECK (assigned_to = public.current_worker_id());
CREATE POLICY wt_oversight_read ON public.worker_tasks FOR SELECT TO authenticated
  USING (public.is_oversight_reviewer() AND status IN ('submitted','reviewed','needs_changes','completed'));

CREATE POLICY wtl_founder_all ON public.worker_task_logs FOR ALL TO authenticated
  USING (public.is_founder()) WITH CHECK (public.is_founder());
CREATE POLICY wtl_self_read ON public.worker_task_logs FOR SELECT TO authenticated
  USING (worker_id = public.current_worker_id());
CREATE POLICY wtl_self_insert ON public.worker_task_logs FOR INSERT TO authenticated
  WITH CHECK (
    worker_id = public.current_worker_id()
    AND public.worker_has_active_window(public.current_worker_id(), 'operator')
  );
CREATE POLICY wtl_oversight_read ON public.worker_task_logs FOR SELECT TO authenticated
  USING (public.is_oversight_reviewer());

CREATE POLICY wev_founder_all ON public.worker_evidence_uploads FOR ALL TO authenticated
  USING (public.is_founder()) WITH CHECK (public.is_founder());
CREATE POLICY wev_self_read ON public.worker_evidence_uploads FOR SELECT TO authenticated
  USING (worker_id = public.current_worker_id());
CREATE POLICY wev_self_insert ON public.worker_evidence_uploads FOR INSERT TO authenticated
  WITH CHECK (
    worker_id = public.current_worker_id()
    AND public.worker_has_active_window(public.current_worker_id(), 'operator')
  );
CREATE POLICY wev_oversight_read ON public.worker_evidence_uploads FOR SELECT TO authenticated
  USING (public.is_oversight_reviewer());

CREATE POLICY wor_founder_all ON public.worker_oversight_reviews FOR ALL TO authenticated
  USING (public.is_founder()) WITH CHECK (public.is_founder());
CREATE POLICY wor_reviewer_read ON public.worker_oversight_reviews FOR SELECT TO authenticated
  USING (reviewer_id = public.current_worker_id());
CREATE POLICY wor_reviewer_insert ON public.worker_oversight_reviews FOR INSERT TO authenticated
  WITH CHECK (
    reviewer_id = public.current_worker_id()
    AND public.is_oversight_reviewer()
    AND public.worker_has_active_window(public.current_worker_id(), 'oversight')
  );

CREATE POLICY wae_founder_read ON public.worker_audit_events FOR SELECT TO authenticated
  USING (public.is_founder());
CREATE POLICY wae_self_read ON public.worker_audit_events FOR SELECT TO authenticated
  USING (worker_id = public.current_worker_id());
CREATE POLICY wae_self_insert ON public.worker_audit_events FOR INSERT TO authenticated
  WITH CHECK (
    worker_id IS NULL
    OR worker_id = public.current_worker_id()
    OR public.is_founder()
  );

CREATE POLICY mbcp_founder_all ON public.monthly_business_content_plans FOR ALL TO authenticated
  USING (public.is_founder()) WITH CHECK (public.is_founder());
CREATE POLICY mbcp_assigned_read ON public.monthly_business_content_plans FOR SELECT TO authenticated
  USING (
    operator_id = public.current_worker_id()
    OR oversight_reviewer_id = public.current_worker_id()
  );

CREATE POLICY mci_founder_all ON public.monthly_content_items FOR ALL TO authenticated
  USING (public.is_founder()) WITH CHECK (public.is_founder());
CREATE POLICY mci_assigned_read ON public.monthly_content_items FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.monthly_business_content_plans p
    WHERE p.id = plan_id
      AND (p.operator_id = public.current_worker_id() OR p.oversight_reviewer_id = public.current_worker_id())
  ));
CREATE POLICY mci_operator_update ON public.monthly_content_items FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.monthly_business_content_plans p
    WHERE p.id = plan_id
      AND p.operator_id = public.current_worker_id()
      AND p.founder_approved_at IS NULL
  ) AND public.worker_has_active_window(public.current_worker_id(), 'operator'))
  WITH CHECK (
    external_publish_blocked = true
    AND status IN ('draft','operator_prepared','oversight_reviewed','parked')
  );

CREATE POLICY wks_founder_all ON public.worker_kill_switch FOR ALL TO authenticated
  USING (public.is_founder()) WITH CHECK (public.is_founder());
CREATE POLICY wks_read ON public.worker_kill_switch FOR SELECT TO authenticated USING (true);
