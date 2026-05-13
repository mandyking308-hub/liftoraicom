
-- Extend business_autopilot_settings
ALTER TABLE public.business_autopilot_settings
  ADD COLUMN IF NOT EXISTS apollo_candidate_pull_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS apollo_email_reveal_autonomous boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS apollo_reveal_daily_credit_budget int NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS apollo_reveal_monthly_credit_budget int NOT NULL DEFAULT 500,
  ADD COLUMN IF NOT EXISTS apollo_reveal_min_quality_score numeric NOT NULL DEFAULT 7,
  ADD COLUMN IF NOT EXISTS apollo_reveal_max_domain_frequency int NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS apollo_reveal_exclude_legacy_hold boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS apollo_reveal_exclude_previous_no_email boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS apollo_reveal_exclude_existing_crm boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS apollo_reveal_exclude_duplicates boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS apollo_reveal_exclude_poor_fit boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS auto_promote_after_valid_reveal boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS auto_promote_only_verified_email boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS auto_promote_only_crm_new boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS auto_promote_only_campaign_fit boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS auto_queue_after_promotion boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS auto_queue_campaign_id uuid,
  ADD COLUMN IF NOT EXISTS auto_queue_step int NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS auto_queue_domain_cap int NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS auto_send_after_queue boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sending_provider_mode text NOT NULL DEFAULT 'ionos_proof',
  ADD COLUMN IF NOT EXISTS daily_send_budget int NOT NULL DEFAULT 20,
  ADD COLUMN IF NOT EXISTS updated_by uuid;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bas_sending_provider_mode_chk'
  ) THEN
    ALTER TABLE public.business_autopilot_settings
      ADD CONSTRAINT bas_sending_provider_mode_chk
      CHECK (sending_provider_mode IN ('ionos_proof','external_scale'));
  END IF;
END $$;

-- Seed Neon Candy
INSERT INTO public.business_autopilot_settings (
  business_id, auto_queue_campaign_id, apollo_email_reveal_autonomous, auto_promote_after_valid_reveal,
  auto_queue_after_promotion, auto_send_after_queue
)
VALUES (
  'b47c4b11-9a96-4af9-9aec-2f5218de9182',
  'd621d6bc-76af-48a2-a8f2-c7505dbb9654',
  false, true, true, false
)
ON CONFLICT (business_id) DO UPDATE SET
  auto_queue_campaign_id = COALESCE(public.business_autopilot_settings.auto_queue_campaign_id, EXCLUDED.auto_queue_campaign_id);

-- apollo_credit_ledger
CREATE TABLE IF NOT EXISTS public.apollo_credit_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name text NOT NULL,
  function_source text NOT NULL CHECK (function_source IN ('reveal','enrich','search')),
  credits_used int NOT NULL DEFAULT 0,
  apollo_person_ids text[] NOT NULL DEFAULT ARRAY[]::text[],
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_acl_business_date ON public.apollo_credit_ledger (business_name, created_at);
ALTER TABLE public.apollo_credit_ledger ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='apollo_credit_ledger' AND policyname='Founders read apollo credit ledger') THEN
    CREATE POLICY "Founders read apollo credit ledger" ON public.apollo_credit_ledger
      FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'founder'::app_role));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='apollo_credit_ledger' AND policyname='Founders insert apollo credit ledger') THEN
    CREATE POLICY "Founders insert apollo credit ledger" ON public.apollo_credit_ledger
      FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'founder'::app_role));
  END IF;
END $$;

-- autopilot_run_log
CREATE TABLE IF NOT EXISTS public.autopilot_run_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name text NOT NULL,
  run_id uuid,
  stage text NOT NULL CHECK (stage IN ('reveal','promote','queue','send','skip','block','classify','run_start','run_end')),
  actor text NOT NULL DEFAULT 'autopilot' CHECK (actor IN ('autopilot','founder','system')),
  candidate_id uuid,
  contact_id uuid,
  apollo_person_id text,
  outcome text NOT NULL,
  reason text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_arl_business_date ON public.autopilot_run_log (business_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_arl_stage ON public.autopilot_run_log (stage);
ALTER TABLE public.autopilot_run_log ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='autopilot_run_log' AND policyname='Founders read autopilot run log') THEN
    CREATE POLICY "Founders read autopilot run log" ON public.autopilot_run_log
      FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'founder'::app_role));
  END IF;
END $$;

-- founder_decision_queue
CREATE TABLE IF NOT EXISTS public.founder_decision_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name text NOT NULL,
  decision_type text NOT NULL CHECK (decision_type IN (
    'policy_change','budget_increase','ambiguous_lead','provider_approval',
    'enable_auto_send','large_suppression','copy_change'
  )),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','auto_approved')),
  requested_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolver_user_id uuid,
  resolver_note text
);
CREATE INDEX IF NOT EXISTS idx_fdq_business_status ON public.founder_decision_queue (business_name, status);
ALTER TABLE public.founder_decision_queue ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='founder_decision_queue' AND policyname='Founders manage decision queue') THEN
    CREATE POLICY "Founders manage decision queue" ON public.founder_decision_queue
      FOR ALL TO authenticated
      USING (public.has_role(auth.uid(),'founder'::app_role))
      WITH CHECK (public.has_role(auth.uid(),'founder'::app_role));
  END IF;
END $$;
