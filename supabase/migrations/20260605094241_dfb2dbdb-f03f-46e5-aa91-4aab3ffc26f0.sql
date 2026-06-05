
-- Campaign Factory & Automation Book
CREATE TABLE IF NOT EXISTS public.automation_runbooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  runbook_name text NOT NULL,
  business_id uuid,
  automation_area text NOT NULL,
  trigger_type text NOT NULL,
  trigger_description text,
  input_requirements jsonb NOT NULL DEFAULT '{}'::jsonb,
  output_requirements jsonb NOT NULL DEFAULT '{}'::jsonb,
  approval_required boolean NOT NULL DEFAULT true,
  external_action_allowed boolean NOT NULL DEFAULT false,
  operator_role_required text,
  oversight_required boolean NOT NULL DEFAULT true,
  failure_modes text,
  escalation_rules text,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.automation_runbooks TO authenticated;
GRANT ALL ON public.automation_runbooks TO service_role;
ALTER TABLE public.automation_runbooks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founder manages runbooks" ON public.automation_runbooks FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Workers read active runbooks" ON public.automation_runbooks FOR SELECT TO authenticated
  USING (status = 'active');

CREATE TABLE IF NOT EXISTS public.campaign_factory_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_month date NOT NULL,
  batch_name text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  total_businesses integer NOT NULL DEFAULT 0,
  total_campaigns integer NOT NULL DEFAULT 0,
  total_content_items integer NOT NULL DEFAULT 0,
  generated_by_ai boolean NOT NULL DEFAULT true,
  operator_id uuid,
  oversight_reviewer_id uuid,
  founder_approved_by uuid,
  founder_approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_factory_batches TO authenticated;
GRANT ALL ON public.campaign_factory_batches TO service_role;
ALTER TABLE public.campaign_factory_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founder manages batches" ON public.campaign_factory_batches FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Workers read batches" ON public.campaign_factory_batches FOR SELECT TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public.business_campaign_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid REFERENCES public.campaign_factory_batches(id) ON DELETE CASCADE,
  business_id uuid,
  business_name text NOT NULL,
  month_start date NOT NULL,
  campaign_theme text,
  target_customer text,
  offer text,
  campaign_goal text,
  channels jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'draft',
  risk_level text NOT NULL DEFAULT 'normal',
  approval_summary text,
  assigned_operator_id uuid,
  assigned_oversight_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_campaign_plans TO authenticated;
GRANT ALL ON public.business_campaign_plans TO service_role;
ALTER TABLE public.business_campaign_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founder manages plans" ON public.business_campaign_plans FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Operators read assigned plans" ON public.business_campaign_plans FOR SELECT TO authenticated
  USING (assigned_operator_id = public.current_worker_id() OR assigned_oversight_id = public.current_worker_id());
CREATE POLICY "Operators update assigned plans" ON public.business_campaign_plans FOR UPDATE TO authenticated
  USING (assigned_operator_id = public.current_worker_id())
  WITH CHECK (assigned_operator_id = public.current_worker_id());

CREATE TABLE IF NOT EXISTS public.outreach_campaign_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_campaign_plan_id uuid REFERENCES public.business_campaign_plans(id) ON DELETE CASCADE,
  business_id uuid,
  campaign_name text NOT NULL,
  lead_criteria jsonb NOT NULL DEFAULT '{}'::jsonb,
  email_sequence jsonb NOT NULL DEFAULT '[]'::jsonb,
  smartlead_campaign_id text,
  status text NOT NULL DEFAULT 'draft',
  external_send_blocked boolean NOT NULL DEFAULT true,
  compliance_checked boolean NOT NULL DEFAULT false,
  unsubscribe_required boolean NOT NULL DEFAULT true,
  founder_approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.outreach_campaign_drafts TO authenticated;
GRANT ALL ON public.outreach_campaign_drafts TO service_role;
ALTER TABLE public.outreach_campaign_drafts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founder manages outreach drafts" ON public.outreach_campaign_drafts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Workers read outreach drafts of assigned plans" ON public.outreach_campaign_drafts FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.business_campaign_plans p
    WHERE p.id = business_campaign_plan_id
      AND (p.assigned_operator_id = public.current_worker_id() OR p.assigned_oversight_id = public.current_worker_id())));

CREATE TABLE IF NOT EXISTS public.social_campaign_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_campaign_plan_id uuid REFERENCES public.business_campaign_plans(id) ON DELETE CASCADE,
  business_id uuid,
  platform text NOT NULL,
  content_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  metricool_schedule_id text,
  status text NOT NULL DEFAULT 'draft',
  external_publish_blocked boolean NOT NULL DEFAULT true,
  founder_approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.social_campaign_drafts TO authenticated;
GRANT ALL ON public.social_campaign_drafts TO service_role;
ALTER TABLE public.social_campaign_drafts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founder manages social drafts" ON public.social_campaign_drafts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Workers read social drafts of assigned plans" ON public.social_campaign_drafts FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.business_campaign_plans p
    WHERE p.id = business_campaign_plan_id
      AND (p.assigned_operator_id = public.current_worker_id() OR p.assigned_oversight_id = public.current_worker_id())));

CREATE TABLE IF NOT EXISTS public.campaign_approval_packs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_campaign_plan_id uuid REFERENCES public.business_campaign_plans(id) ON DELETE CASCADE,
  business_id uuid,
  approval_pack_title text NOT NULL,
  approval_pack_summary text,
  included_items jsonb NOT NULL DEFAULT '{}'::jsonb,
  risks jsonb NOT NULL DEFAULT '[]'::jsonb,
  decisions_required jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'waiting_founder',
  founder_decision text,
  founder_notes text,
  founder_decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_approval_packs TO authenticated;
GRANT ALL ON public.campaign_approval_packs TO service_role;
ALTER TABLE public.campaign_approval_packs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founder manages approval packs" ON public.campaign_approval_packs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Workers read packs of assigned plans" ON public.campaign_approval_packs FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.business_campaign_plans p
    WHERE p.id = business_campaign_plan_id
      AND (p.assigned_operator_id = public.current_worker_id() OR p.assigned_oversight_id = public.current_worker_id())));

CREATE TABLE IF NOT EXISTS public.campaign_operator_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_campaign_plan_id uuid REFERENCES public.business_campaign_plans(id) ON DELETE CASCADE,
  operator_id uuid,
  check_type text NOT NULL,
  check_status text NOT NULL,
  notes text,
  evidence_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_operator_checks TO authenticated;
GRANT ALL ON public.campaign_operator_checks TO service_role;
ALTER TABLE public.campaign_operator_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founder full access operator checks" ON public.campaign_operator_checks FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Operator inserts own checks" ON public.campaign_operator_checks FOR INSERT TO authenticated
  WITH CHECK (operator_id = public.current_worker_id());
CREATE POLICY "Operator reads own checks" ON public.campaign_operator_checks FOR SELECT TO authenticated
  USING (operator_id = public.current_worker_id() OR EXISTS (
    SELECT 1 FROM public.business_campaign_plans p WHERE p.id = business_campaign_plan_id AND p.assigned_oversight_id = public.current_worker_id()
  ));

CREATE TABLE IF NOT EXISTS public.campaign_oversight_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_campaign_plan_id uuid REFERENCES public.business_campaign_plans(id) ON DELETE CASCADE,
  reviewer_id uuid,
  review_status text NOT NULL,
  review_notes text,
  minutes_spent integer,
  location_basis text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_oversight_checks TO authenticated;
GRANT ALL ON public.campaign_oversight_checks TO service_role;
ALTER TABLE public.campaign_oversight_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founder full access oversight checks" ON public.campaign_oversight_checks FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Reviewer inserts own checks" ON public.campaign_oversight_checks FOR INSERT TO authenticated
  WITH CHECK (reviewer_id = public.current_worker_id());
CREATE POLICY "Reviewer reads own checks" ON public.campaign_oversight_checks FOR SELECT TO authenticated
  USING (reviewer_id = public.current_worker_id());

-- updated_at triggers
DO $$ BEGIN
  CREATE TRIGGER trg_automation_runbooks_updated BEFORE UPDATE ON public.automation_runbooks
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER trg_campaign_factory_batches_updated BEFORE UPDATE ON public.campaign_factory_batches
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER trg_business_campaign_plans_updated BEFORE UPDATE ON public.business_campaign_plans
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER trg_outreach_campaign_drafts_updated BEFORE UPDATE ON public.outreach_campaign_drafts
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER trg_social_campaign_drafts_updated BEFORE UPDATE ON public.social_campaign_drafts
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER trg_campaign_approval_packs_updated BEFORE UPDATE ON public.campaign_approval_packs
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_bcp_batch ON public.business_campaign_plans(batch_id);
CREATE INDEX IF NOT EXISTS idx_bcp_operator ON public.business_campaign_plans(assigned_operator_id);
CREATE INDEX IF NOT EXISTS idx_bcp_oversight ON public.business_campaign_plans(assigned_oversight_id);
CREATE INDEX IF NOT EXISTS idx_ocd_plan ON public.outreach_campaign_drafts(business_campaign_plan_id);
CREATE INDEX IF NOT EXISTS idx_scd_plan ON public.social_campaign_drafts(business_campaign_plan_id);
CREATE INDEX IF NOT EXISTS idx_pack_plan ON public.campaign_approval_packs(business_campaign_plan_id);
CREATE INDEX IF NOT EXISTS idx_runbook_area ON public.automation_runbooks(automation_area);
