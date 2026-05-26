
CREATE TABLE public.global_audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NULL,
  actor_type TEXT NOT NULL DEFAULT 'system' CHECK (actor_type IN ('founder','user','ai_agent','system','provider','webhook','human_operator','unknown')),
  actor_id UUID NULL,
  actor_label TEXT NULL,
  event_type TEXT NOT NULL,
  event_category TEXT NOT NULL DEFAULT 'other' CHECK (event_category IN ('ai','approval','external_action','data_change','access','finance','privacy','security','configuration','workflow','provider','document','decision','other')),
  source_module TEXT NOT NULL,
  source_table TEXT NULL,
  source_record_id TEXT NULL,
  action_summary TEXT NOT NULL,
  before_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  after_summary  JSONB NOT NULL DEFAULT '{}'::jsonb,
  sensitivity_level TEXT NOT NULL DEFAULT 'low' CHECK (sensitivity_level IN ('low','medium','high','critical')),
  external_side_effect BOOLEAN NOT NULL DEFAULT false,
  approval_item_id UUID NULL,
  trace_id TEXT NULL,
  ip_address_summary TEXT NULL,
  user_agent_summary TEXT NULL,
  is_test_data BOOLEAN NOT NULL DEFAULT false,
  audit_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.global_audit_events TO authenticated;
GRANT ALL ON public.global_audit_events TO service_role;

ALTER TABLE public.global_audit_events ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_gae_created_at ON public.global_audit_events (created_at DESC);
CREATE INDEX idx_gae_business ON public.global_audit_events (business_id, created_at DESC);
CREATE INDEX idx_gae_actor ON public.global_audit_events (actor_id, created_at DESC);
CREATE INDEX idx_gae_module ON public.global_audit_events (source_module, created_at DESC);
CREATE INDEX idx_gae_category ON public.global_audit_events (event_category, created_at DESC);
CREATE INDEX idx_gae_sensitivity ON public.global_audit_events (sensitivity_level, created_at DESC);
CREATE INDEX idx_gae_external ON public.global_audit_events (external_side_effect, created_at DESC);
CREATE INDEX idx_gae_trace ON public.global_audit_events (trace_id);
CREATE INDEX idx_gae_approval ON public.global_audit_events (approval_item_id);

-- Founders/admins can read everything
CREATE POLICY "founders read all audit events"
  ON public.global_audit_events
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'founder'::app_role)
  );

-- Any authenticated session may append audit records (the helper is what callers use).
CREATE POLICY "authenticated may append audit events"
  ON public.global_audit_events
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- No UPDATE / DELETE policies => append-only by default under RLS.

COMMENT ON TABLE public.global_audit_events IS 'Append-only global audit ledger. No raw secrets. No UI delete path. External export requires founder approval.';
