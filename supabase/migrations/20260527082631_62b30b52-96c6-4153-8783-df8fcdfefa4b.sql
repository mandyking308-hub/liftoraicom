
CREATE TABLE public.business_runtime_activation (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid NOT NULL UNIQUE REFERENCES public.businesses(id) ON DELETE CASCADE,
  activated boolean NOT NULL DEFAULT false,
  risk_level text NOT NULL DEFAULT 'unknown',
  runtime_state text NOT NULL DEFAULT 'isolated',
  outbound_allowed boolean NOT NULL DEFAULT false,
  queue_allowed boolean NOT NULL DEFAULT false,
  ai_orchestration_allowed boolean NOT NULL DEFAULT false,
  notes text,
  activated_by uuid,
  activated_at timestamptz,
  deactivated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_runtime_activation TO authenticated;
GRANT ALL ON public.business_runtime_activation TO service_role;

ALTER TABLE public.business_runtime_activation ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders view runtime activation"
  ON public.business_runtime_activation FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Founders insert runtime activation"
  ON public.business_runtime_activation FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Founders update runtime activation"
  ON public.business_runtime_activation FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Founders delete runtime activation"
  ON public.business_runtime_activation FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_bra_updated
  BEFORE UPDATE ON public.business_runtime_activation
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.business_runtime_activation_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  action text NOT NULL,
  prev_state jsonb,
  new_state jsonb,
  actor_id uuid,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.business_runtime_activation_log TO authenticated;
GRANT ALL ON public.business_runtime_activation_log TO service_role;

ALTER TABLE public.business_runtime_activation_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders view activation log"
  ON public.business_runtime_activation_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Founders insert activation log"
  ON public.business_runtime_activation_log FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.block_activation_log_mutation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RAISE EXCEPTION 'business_runtime_activation_log is append-only';
END;
$$;

CREATE TRIGGER trg_bra_log_immutable_upd
  BEFORE UPDATE ON public.business_runtime_activation_log
  FOR EACH ROW EXECUTE FUNCTION public.block_activation_log_mutation();

CREATE TRIGGER trg_bra_log_immutable_del
  BEFORE DELETE ON public.business_runtime_activation_log
  FOR EACH ROW EXECUTE FUNCTION public.block_activation_log_mutation();

CREATE INDEX idx_bra_log_business ON public.business_runtime_activation_log(business_id, created_at DESC);
