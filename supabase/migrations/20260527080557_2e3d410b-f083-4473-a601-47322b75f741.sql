
-- Single-row current runtime state
CREATE TABLE public.system_runtime_state (
  id text PRIMARY KEY DEFAULT 'singleton' CHECK (id = 'singleton'),
  mode text NOT NULL DEFAULT 'LIVE_INTERNAL_TEST'
    CHECK (mode IN ('LIVE_INTERNAL_TEST','APPROVAL_REQUIRED','MONDAY_WATCH','EMERGENCY_PAUSE','READ_ONLY_RECOVERY')),
  reason text,
  changed_by uuid,
  changed_at timestamptz NOT NULL DEFAULT now(),
  audit_metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

GRANT SELECT, INSERT, UPDATE ON public.system_runtime_state TO authenticated;
GRANT ALL ON public.system_runtime_state TO service_role;

ALTER TABLE public.system_runtime_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "founder read runtime state"
  ON public.system_runtime_state FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'founder'));

CREATE POLICY "founder write runtime state"
  ON public.system_runtime_state FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'founder'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'founder'));

-- Append-only ledger
CREATE TABLE public.system_mode_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  previous_mode text,
  new_mode text NOT NULL,
  reason text,
  changed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  audit_metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

GRANT SELECT, INSERT ON public.system_mode_ledger TO authenticated;
GRANT ALL ON public.system_mode_ledger TO service_role;

ALTER TABLE public.system_mode_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "founder read mode ledger"
  ON public.system_mode_ledger FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'founder'));

CREATE POLICY "founder insert mode ledger"
  ON public.system_mode_ledger FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'founder'));

-- Trigger to auto-append ledger entries on mode change
CREATE OR REPLACE FUNCTION public.log_system_mode_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'INSERT') OR (NEW.mode IS DISTINCT FROM OLD.mode) THEN
    INSERT INTO public.system_mode_ledger (previous_mode, new_mode, reason, changed_by, audit_metadata)
    VALUES (CASE WHEN TG_OP='UPDATE' THEN OLD.mode ELSE NULL END,
            NEW.mode, NEW.reason, NEW.changed_by, NEW.audit_metadata);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_system_mode_change
AFTER INSERT OR UPDATE ON public.system_runtime_state
FOR EACH ROW EXECUTE FUNCTION public.log_system_mode_change();

-- Seed the singleton row
INSERT INTO public.system_runtime_state (id, mode, reason, audit_metadata)
VALUES ('singleton','LIVE_INTERNAL_TEST','Initial activation — pre-Monday supervised mode', '{"seed":"runtime_modes_v1"}'::jsonb)
ON CONFLICT (id) DO NOTHING;
