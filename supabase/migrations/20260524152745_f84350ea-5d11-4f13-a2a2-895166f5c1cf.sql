
CREATE TABLE IF NOT EXISTS public.business_onboarding_factory_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  run_status text NOT NULL DEFAULT 'draft',
  run_type text NOT NULL DEFAULT 'end_to_end_internal_readiness',
  provider_status text NOT NULL DEFAULT 'unknown',
  business_created boolean NOT NULL DEFAULT false,
  knowledge_registered boolean NOT NULL DEFAULT false,
  profile_created boolean NOT NULL DEFAULT false,
  starter_pack_created boolean NOT NULL DEFAULT false,
  materialisation_completed boolean NOT NULL DEFAULT false,
  command_centre_visible boolean NOT NULL DEFAULT false,
  founder_review_created boolean NOT NULL DEFAULT false,
  internal_ready boolean NOT NULL DEFAULT false,
  external_ready boolean NOT NULL DEFAULT false,
  readiness_score integer NOT NULL DEFAULT 0,
  missing_context_count integer NOT NULL DEFAULT 0,
  risk_warning_count integer NOT NULL DEFAULT 0,
  materialised_items_count integer NOT NULL DEFAULT 0,
  fallback_items_count integer NOT NULL DEFAULT 0,
  blocked_items_count integer NOT NULL DEFAULT 0,
  skipped_duplicate_count integer NOT NULL DEFAULT 0,
  no_forbidden_action_audit jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_test_data boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bofr_status_chk CHECK (run_status IN ('draft','previewed','completed','partial','blocked','failed')),
  CONSTRAINT bofr_external_locked CHECK (external_ready = false)
);

CREATE INDEX IF NOT EXISTS bofr_business_idx ON public.business_onboarding_factory_runs (business_id);
CREATE INDEX IF NOT EXISTS bofr_status_idx ON public.business_onboarding_factory_runs (run_status);
CREATE INDEX IF NOT EXISTS bofr_internal_ready_idx ON public.business_onboarding_factory_runs (internal_ready);
CREATE INDEX IF NOT EXISTS bofr_external_ready_idx ON public.business_onboarding_factory_runs (external_ready);
CREATE INDEX IF NOT EXISTS bofr_created_idx ON public.business_onboarding_factory_runs (created_at DESC);

ALTER TABLE public.business_onboarding_factory_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bofr_founder_admin_all" ON public.business_onboarding_factory_runs
FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'))
WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));

CREATE TRIGGER bofr_updated_at
BEFORE UPDATE ON public.business_onboarding_factory_runs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.founder_approval_types (type_key, label, description, default_priority, execution_enabled, auto_execute_allowed, active)
VALUES ('business_onboarding_factory_review','Business Onboarding Factory Review','Review the end-to-end internal onboarding factory output for a business. No external action permitted.','normal',false,false,true)
ON CONFLICT (type_key) DO NOTHING;
