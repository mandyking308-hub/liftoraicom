
-- ===== starter_pack_materialised_items =====
CREATE TABLE IF NOT EXISTS public.starter_pack_materialised_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  starter_pack_id uuid NULL,
  onboarding_run_id uuid NULL,
  destination_module text NOT NULL,
  item_type text NOT NULL,
  item_status text NOT NULL DEFAULT 'draft',
  title text NULL,
  subject text NULL,
  body text NULL,
  structured_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_section text NULL,
  source_hash text NULL,
  risk_level text NOT NULL DEFAULT 'low',
  requires_founder_review boolean NOT NULL DEFAULT true,
  external_send_allowed boolean NOT NULL DEFAULT false,
  external_action_blocked boolean NOT NULL DEFAULT true,
  materialised_to_table text NULL,
  materialised_to_id uuid NULL,
  materialisation_status text NOT NULL DEFAULT 'stored_fallback',
  missing_context jsonb NOT NULL DEFAULT '[]'::jsonb,
  risk_warnings jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_test_data boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT spmi_destination_module_chk CHECK (destination_module IN ('outreach','social','support','customer_success','proposal','demo','revenue','supplier','approval','command_centre','other')),
  CONSTRAINT spmi_item_status_chk CHECK (item_status IN ('draft','needs_review','approved_internal','rejected','archived')),
  CONSTRAINT spmi_materialisation_status_chk CHECK (materialisation_status IN ('materialised_to_module','stored_fallback','skipped_duplicate','blocked_missing_context','failed')),
  CONSTRAINT spmi_no_external_send CHECK (external_send_allowed = false),
  CONSTRAINT spmi_external_blocked CHECK (external_action_blocked = true)
);

CREATE INDEX IF NOT EXISTS spmi_business_idx ON public.starter_pack_materialised_items (business_id);
CREATE INDEX IF NOT EXISTS spmi_starter_pack_idx ON public.starter_pack_materialised_items (starter_pack_id);
CREATE INDEX IF NOT EXISTS spmi_destination_idx ON public.starter_pack_materialised_items (destination_module);
CREATE INDEX IF NOT EXISTS spmi_item_type_idx ON public.starter_pack_materialised_items (item_type);
CREATE INDEX IF NOT EXISTS spmi_item_status_idx ON public.starter_pack_materialised_items (item_status);
CREATE INDEX IF NOT EXISTS spmi_mat_status_idx ON public.starter_pack_materialised_items (materialisation_status);
CREATE INDEX IF NOT EXISTS spmi_created_idx ON public.starter_pack_materialised_items (created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS spmi_dedup_idx ON public.starter_pack_materialised_items (starter_pack_id, source_section, source_hash) WHERE source_hash IS NOT NULL;

ALTER TABLE public.starter_pack_materialised_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "spmi_founder_admin_all" ON public.starter_pack_materialised_items
FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'))
WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));

CREATE TRIGGER spmi_updated_at
BEFORE UPDATE ON public.starter_pack_materialised_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===== starter_pack_materialisation_runs =====
CREATE TABLE IF NOT EXISTS public.starter_pack_materialisation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  starter_pack_id uuid NOT NULL,
  run_status text NOT NULL DEFAULT 'draft',
  dry_run boolean NOT NULL DEFAULT true,
  total_items integer NOT NULL DEFAULT 0,
  materialised_items integer NOT NULL DEFAULT 0,
  fallback_items integer NOT NULL DEFAULT 0,
  skipped_duplicates integer NOT NULL DEFAULT 0,
  blocked_items integer NOT NULL DEFAULT 0,
  founder_approval_items integer NOT NULL DEFAULT 0,
  missing_context_count integer NOT NULL DEFAULT 0,
  risk_warning_count integer NOT NULL DEFAULT 0,
  external_actions_allowed boolean NOT NULL DEFAULT false,
  is_test_data boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT spmr_run_status_chk CHECK (run_status IN ('draft','previewed','materialised','partial','blocked','failed')),
  CONSTRAINT spmr_no_external CHECK (external_actions_allowed = false)
);

CREATE INDEX IF NOT EXISTS spmr_business_idx ON public.starter_pack_materialisation_runs (business_id);
CREATE INDEX IF NOT EXISTS spmr_pack_idx ON public.starter_pack_materialisation_runs (starter_pack_id);
CREATE INDEX IF NOT EXISTS spmr_status_idx ON public.starter_pack_materialisation_runs (run_status);
CREATE INDEX IF NOT EXISTS spmr_created_idx ON public.starter_pack_materialisation_runs (created_at DESC);

ALTER TABLE public.starter_pack_materialisation_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "spmr_founder_admin_all" ON public.starter_pack_materialisation_runs
FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'))
WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));

CREATE TRIGGER spmr_updated_at
BEFORE UPDATE ON public.starter_pack_materialisation_runs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Register founder approval type
INSERT INTO public.founder_approval_types (type_key, label, description, default_priority, execution_enabled, auto_execute_allowed, active)
VALUES ('starter_pack_materialisation_review','Starter Pack Materialisation Review','Review materialised internal drafts created from a business starter pack. No external action permitted.','normal',false,false,true)
ON CONFLICT (type_key) DO NOTHING;
