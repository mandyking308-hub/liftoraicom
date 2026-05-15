
CREATE TABLE IF NOT EXISTS public.founder_approval_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NULL,
  approval_type text NOT NULL,
  source_system text NULL,
  source_table text NULL,
  source_id uuid NULL,
  agent_key text NULL,
  contact_id uuid NULL,
  conversation_id uuid NULL,
  proposal_id uuid NULL,
  deal_id uuid NULL,
  invoice_id uuid NULL,
  supplier_id uuid NULL,
  title text NOT NULL,
  summary text NULL,
  recommended_action text NULL,
  draft_subject text NULL,
  draft_body text NULL,
  priority_level text NOT NULL DEFAULT 'normal',
  risk_flags jsonb NOT NULL DEFAULT '[]'::jsonb,
  compliance_flags jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  founder_decision text NULL,
  founder_notes text NULL,
  execution_enabled boolean NOT NULL DEFAULT false,
  auto_execute_allowed boolean NOT NULL DEFAULT false,
  send_allowed boolean NOT NULL DEFAULT false,
  decided_at timestamptz NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fai_status ON public.founder_approval_items(status);
CREATE INDEX IF NOT EXISTS idx_fai_type ON public.founder_approval_items(approval_type);
CREATE INDEX IF NOT EXISTS idx_fai_priority ON public.founder_approval_items(priority_level);
CREATE INDEX IF NOT EXISTS idx_fai_created ON public.founder_approval_items(created_at DESC);

ALTER TABLE public.founder_approval_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "founders_admins_all_fai" ON public.founder_approval_items;
CREATE POLICY "founders_admins_all_fai" ON public.founder_approval_items
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));

DROP TRIGGER IF EXISTS trg_fai_updated_at ON public.founder_approval_items;
CREATE TRIGGER trg_fai_updated_at
  BEFORE UPDATE ON public.founder_approval_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.founder_approval_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type_key text NOT NULL UNIQUE,
  label text NOT NULL,
  description text NULL,
  default_priority text NOT NULL DEFAULT 'normal',
  execution_enabled boolean NOT NULL DEFAULT false,
  auto_execute_allowed boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.founder_approval_types ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "founders_admins_all_fat" ON public.founder_approval_types;
CREATE POLICY "founders_admins_all_fat" ON public.founder_approval_types
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));

DROP TRIGGER IF EXISTS trg_fat_updated_at ON public.founder_approval_types;
CREATE TRIGGER trg_fat_updated_at
  BEFORE UPDATE ON public.founder_approval_types
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.founder_approval_types (type_key, label, description, default_priority) VALUES
  ('ai_reply_draft','AI reply draft','AI-drafted conversation reply awaiting founder approval.','high'),
  ('crm_next_action','CRM next action','Suggested next action from CRM lifecycle engine.','normal'),
  ('proposal_preview','Proposal preview','AI-generated proposal awaiting founder review.','high'),
  ('demo_preview','Demo preview','Demo session/script awaiting founder review.','normal'),
  ('deal_recommendation','Deal recommendation','Suggested deal stage change or new deal.','high'),
  ('invoice_recommendation','Invoice recommendation','Suggested invoice creation or change.','high'),
  ('supplier_assignment_recommendation','Supplier assignment','Suggested supplier match for a workstream.','normal'),
  ('compliance_action','Compliance action','Compliance/legal-sensitive action awaiting review.','urgent'),
  ('smartlead_lead_push','Smartlead lead push','Suggested lead push to Smartlead campaign.','high'),
  ('smartlead_campaign_mapping','Smartlead campaign mapping','Proposed campaign mapping change.','normal'),
  ('system_repair','System repair','Suggested platform repair action.','high'),
  ('finance_chaser','Finance chaser','Suggested polite invoice chaser.','normal'),
  ('founder_brief_item','Founder brief item','Item surfaced into founder brief.','low')
ON CONFLICT (type_key) DO NOTHING;
