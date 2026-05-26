
CREATE TABLE public.internal_handoff_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID,
  source_module TEXT NOT NULL,
  source_table TEXT,
  source_record_id TEXT,
  handoff_type TEXT NOT NULL CHECK (handoff_type IN ('ai_to_founder','ai_to_human','human_to_ai','founder_to_human','agent_to_agent','adviser_review','technical_review')),
  from_actor_type TEXT,
  from_actor_id TEXT,
  to_actor_type TEXT,
  to_actor_id TEXT,
  handoff_status TEXT NOT NULL DEFAULT 'created' CHECK (handoff_status IN ('created','accepted','in_progress','blocked','completed','overdue','cancelled')),
  handoff_summary TEXT,
  due_at TIMESTAMPTZ,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent','critical')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  audit_metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);
GRANT SELECT, INSERT, UPDATE ON public.internal_handoff_records TO authenticated;
GRANT ALL ON public.internal_handoff_records TO service_role;
ALTER TABLE public.internal_handoff_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ihr admin select" ON public.internal_handoff_records FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));
CREATE POLICY "ihr admin insert" ON public.internal_handoff_records FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));
CREATE POLICY "ihr admin update" ON public.internal_handoff_records FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));
CREATE INDEX idx_ihr_status ON public.internal_handoff_records(handoff_status);
CREATE INDEX idx_ihr_due ON public.internal_handoff_records(due_at);
CREATE INDEX idx_ihr_to ON public.internal_handoff_records(to_actor_type, to_actor_id);
CREATE INDEX idx_ihr_from ON public.internal_handoff_records(from_actor_type, from_actor_id);
CREATE TRIGGER trg_ihr_updated BEFORE UPDATE ON public.internal_handoff_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.internal_sla_policies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  policy_name TEXT NOT NULL,
  source_module TEXT,
  handoff_type TEXT,
  priority TEXT,
  response_time_minutes INTEGER,
  completion_time_minutes INTEGER,
  escalation_after_minutes INTEGER,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.internal_sla_policies TO authenticated;
GRANT ALL ON public.internal_sla_policies TO service_role;
ALTER TABLE public.internal_sla_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "isp admin select" ON public.internal_sla_policies FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));
CREATE POLICY "isp admin insert" ON public.internal_sla_policies FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));
CREATE POLICY "isp admin update" ON public.internal_sla_policies FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));
CREATE TRIGGER trg_isp_updated BEFORE UPDATE ON public.internal_sla_policies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.internal_sla_breaches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  handoff_record_id UUID NOT NULL REFERENCES public.internal_handoff_records(id) ON DELETE CASCADE,
  breach_type TEXT NOT NULL CHECK (breach_type IN ('response_overdue','completion_overdue','blocked_too_long','unassigned','stale_approval')),
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
  breach_summary TEXT,
  escalation_created BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','acknowledged','resolved','ignored')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.internal_sla_breaches TO authenticated;
GRANT ALL ON public.internal_sla_breaches TO service_role;
ALTER TABLE public.internal_sla_breaches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "isb admin select" ON public.internal_sla_breaches FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));
CREATE POLICY "isb admin insert" ON public.internal_sla_breaches FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));
CREATE POLICY "isb admin update" ON public.internal_sla_breaches FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));
CREATE INDEX idx_isb_status ON public.internal_sla_breaches(status);
CREATE TRIGGER trg_isb_updated BEFORE UPDATE ON public.internal_sla_breaches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
