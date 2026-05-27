
CREATE TABLE public.liftor_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL CHECK (scope IN ('database','workflow','prompt','config','memory','runtime_state')),
  label text NOT NULL,
  taken_by uuid,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  byte_size integer NOT NULL DEFAULT 0,
  integrity_hash text NOT NULL,
  status text NOT NULL DEFAULT 'ready' CHECK (status IN ('ready','failed','expired')),
  error_message text,
  audit_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.liftor_snapshots TO authenticated;
GRANT ALL ON public.liftor_snapshots TO service_role;

ALTER TABLE public.liftor_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "founder read snapshots" ON public.liftor_snapshots
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'founder'::app_role));

CREATE POLICY "founder insert snapshots" ON public.liftor_snapshots
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'founder'::app_role));

-- Immutability trigger: block changes to scope, payload, integrity_hash after insert
CREATE OR REPLACE FUNCTION public.tg_liftor_snapshots_immutable()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.scope IS DISTINCT FROM OLD.scope
     OR NEW.payload::text IS DISTINCT FROM OLD.payload::text
     OR NEW.integrity_hash IS DISTINCT FROM OLD.integrity_hash THEN
    RAISE EXCEPTION 'liftor_snapshots is immutable: scope/payload/integrity_hash cannot be changed';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_liftor_snapshots_immutable
BEFORE UPDATE ON public.liftor_snapshots
FOR EACH ROW EXECUTE FUNCTION public.tg_liftor_snapshots_immutable();

CREATE INDEX idx_liftor_snapshots_scope_created ON public.liftor_snapshots(scope, created_at DESC);

-- Recovery actions audit log (append-only)
CREATE TABLE public.liftor_recovery_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id uuid REFERENCES public.liftor_snapshots(id) ON DELETE SET NULL,
  action text NOT NULL CHECK (action IN ('restore_simulate','restore_apply','rollback','snapshot_create','snapshot_verify')),
  target_scope text,
  confirmed boolean NOT NULL DEFAULT false,
  dry_run boolean NOT NULL DEFAULT true,
  success boolean NOT NULL DEFAULT true,
  performed_by uuid,
  notes text,
  audit_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.liftor_recovery_actions TO authenticated;
GRANT ALL ON public.liftor_recovery_actions TO service_role;

ALTER TABLE public.liftor_recovery_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "founder read recovery actions" ON public.liftor_recovery_actions
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'founder'::app_role));

CREATE POLICY "founder insert recovery actions" ON public.liftor_recovery_actions
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'founder'::app_role));

CREATE OR REPLACE FUNCTION public.tg_liftor_recovery_actions_append_only()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'liftor_recovery_actions is append-only';
END $$;

CREATE TRIGGER trg_liftor_recovery_actions_no_update
BEFORE UPDATE OR DELETE ON public.liftor_recovery_actions
FOR EACH ROW EXECUTE FUNCTION public.tg_liftor_recovery_actions_append_only();

CREATE INDEX idx_liftor_recovery_actions_created ON public.liftor_recovery_actions(created_at DESC);
