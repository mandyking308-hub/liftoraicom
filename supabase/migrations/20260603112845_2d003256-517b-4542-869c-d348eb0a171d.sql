
-- =========================================================
-- AI Compliance Control Layer
-- Founder/admin-only tables, RLS-protected, no public access
-- =========================================================

-- 1) AI System Inventory
CREATE TABLE public.ai_compliance_systems (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NULL,
  system_name TEXT NOT NULL,
  system_type TEXT NOT NULL DEFAULT 'other'
    CHECK (system_type IN ('agent','workflow','gateway','model_route','connector','automation','analytics','content_generation','outreach','support','finance','legal_tax','other')),
  owner_role TEXT,
  provider TEXT,
  purpose TEXT,
  internal_or_external TEXT NOT NULL DEFAULT 'internal'
    CHECK (internal_or_external IN ('internal','external','mixed')),
  autonomy_level TEXT NOT NULL DEFAULT 'recommend_only'
    CHECK (autonomy_level IN ('assistive','recommend_only','draft_only','approval_required','semi_autonomous','autonomous_internal','external_action_capable')),
  uses_personal_data BOOLEAN NOT NULL DEFAULT false,
  uses_sensitive_data BOOLEAN NOT NULL DEFAULT false,
  handles_children_data BOOLEAN NOT NULL DEFAULT false,
  handles_health_data BOOLEAN NOT NULL DEFAULT false,
  handles_financial_data BOOLEAN NOT NULL DEFAULT false,
  handles_legal_data BOOLEAN NOT NULL DEFAULT false,
  external_action_capable BOOLEAN NOT NULL DEFAULT false,
  current_status TEXT NOT NULL DEFAULT 'under_review'
    CHECK (current_status IN ('live','paused','blocked','retired','under_review')),
  risk_level TEXT NOT NULL DEFAULT 'medium'
    CHECK (risk_level IN ('low','medium','high','critical')),
  founder_confirmed BOOLEAN NOT NULL DEFAULT false,
  last_reviewed_at TIMESTAMPTZ,
  next_review_due_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_compliance_systems TO authenticated;
GRANT ALL ON public.ai_compliance_systems TO service_role;
ALTER TABLE public.ai_compliance_systems ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders manage ai_compliance_systems"
  ON public.ai_compliance_systems FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'founder'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'founder'::app_role));

-- 2) Data Flow Register
CREATE TABLE public.ai_data_flow_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NULL,
  system_id UUID NULL REFERENCES public.ai_compliance_systems(id) ON DELETE SET NULL,
  source_system TEXT NOT NULL,
  destination_system TEXT NOT NULL,
  data_categories TEXT[] NOT NULL DEFAULT '{}',
  personal_data BOOLEAN NOT NULL DEFAULT false,
  sensitive_data BOOLEAN NOT NULL DEFAULT false,
  children_data BOOLEAN NOT NULL DEFAULT false,
  lawful_basis TEXT,
  processor_or_controller_note TEXT,
  retention_period TEXT,
  storage_location TEXT,
  cross_border_transfer BOOLEAN NOT NULL DEFAULT false,
  transfer_jurisdiction TEXT,
  security_controls TEXT,
  founder_confirmed BOOLEAN NOT NULL DEFAULT false,
  review_status TEXT NOT NULL DEFAULT 'draft'
    CHECK (review_status IN ('missing','draft','reviewed','approved','needs_adviser')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_data_flow_records TO authenticated;
GRANT ALL ON public.ai_data_flow_records TO service_role;
ALTER TABLE public.ai_data_flow_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders manage ai_data_flow_records"
  ON public.ai_data_flow_records FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'founder'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'founder'::app_role));

-- 3) Human Oversight Records
CREATE TABLE public.ai_human_oversight_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NULL,
  system_id UUID NULL REFERENCES public.ai_compliance_systems(id) ON DELETE SET NULL,
  oversight_type TEXT NOT NULL
    CHECK (oversight_type IN ('founder_approval','human_review','escalation','kill_switch','override','rejection','manual_check')),
  trigger_source TEXT,
  trigger_reason TEXT,
  proposed_ai_action TEXT,
  human_decision TEXT NOT NULL DEFAULT 'parked'
    CHECK (human_decision IN ('approved','rejected','changed','escalated','parked')),
  decided_by UUID NULL,
  decision_notes TEXT,
  external_action_blocked BOOLEAN NOT NULL DEFAULT false,
  evidence_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_human_oversight_records TO authenticated;
GRANT ALL ON public.ai_human_oversight_records TO service_role;
ALTER TABLE public.ai_human_oversight_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders manage ai_human_oversight_records"
  ON public.ai_human_oversight_records FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'founder'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'founder'::app_role));

-- 4) Evidence Items
CREATE TABLE public.ai_compliance_evidence_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NULL,
  system_id UUID NULL REFERENCES public.ai_compliance_systems(id) ON DELETE SET NULL,
  evidence_type TEXT NOT NULL DEFAULT 'other'
    CHECK (evidence_type IN ('policy','technical_manual','user_manual','audit_log','approval_log','data_flow','risk_assessment','vendor_record','incident_record','test_result','screenshot','export','other')),
  title TEXT NOT NULL,
  summary TEXT,
  source_module TEXT,
  source_table TEXT,
  source_record_id TEXT,
  review_status TEXT NOT NULL DEFAULT 'draft'
    CHECK (review_status IN ('missing','draft','current','stale','adviser_review_required')),
  owner TEXT,
  next_review_due_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_compliance_evidence_items TO authenticated;
GRANT ALL ON public.ai_compliance_evidence_items TO service_role;
ALTER TABLE public.ai_compliance_evidence_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders manage ai_compliance_evidence_items"
  ON public.ai_compliance_evidence_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'founder'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'founder'::app_role));

-- 5) Gap Actions
CREATE TABLE public.ai_compliance_gap_actions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NULL,
  system_id UUID NULL REFERENCES public.ai_compliance_systems(id) ON DELETE SET NULL,
  gap_title TEXT NOT NULL,
  gap_description TEXT,
  severity TEXT NOT NULL DEFAULT 'medium'
    CHECK (severity IN ('info','low','medium','high','critical')),
  source TEXT,
  required_action TEXT,
  action_owner TEXT,
  due_date TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','in_progress','blocked','done','parked')),
  founder_decision_required BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_compliance_gap_actions TO authenticated;
GRANT ALL ON public.ai_compliance_gap_actions TO service_role;
ALTER TABLE public.ai_compliance_gap_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders manage ai_compliance_gap_actions"
  ON public.ai_compliance_gap_actions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'founder'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'founder'::app_role));

-- updated_at triggers (reuse existing function if present, else define)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER ai_compliance_systems_updated_at BEFORE UPDATE ON public.ai_compliance_systems
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER ai_data_flow_records_updated_at BEFORE UPDATE ON public.ai_data_flow_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER ai_compliance_evidence_items_updated_at BEFORE UPDATE ON public.ai_compliance_evidence_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER ai_compliance_gap_actions_updated_at BEFORE UPDATE ON public.ai_compliance_gap_actions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Useful indexes
CREATE INDEX idx_ai_compliance_systems_business ON public.ai_compliance_systems(business_id);
CREATE INDEX idx_ai_compliance_systems_risk ON public.ai_compliance_systems(risk_level);
CREATE INDEX idx_ai_data_flow_records_system ON public.ai_data_flow_records(system_id);
CREATE INDEX idx_ai_human_oversight_system ON public.ai_human_oversight_records(system_id);
CREATE INDEX idx_ai_human_oversight_created ON public.ai_human_oversight_records(created_at DESC);
CREATE INDEX idx_ai_compliance_evidence_system ON public.ai_compliance_evidence_items(system_id);
CREATE INDEX idx_ai_compliance_gap_actions_status ON public.ai_compliance_gap_actions(status);
