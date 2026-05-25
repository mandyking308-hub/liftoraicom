-- 1. onboarding_records
CREATE TABLE public.onboarding_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid,
  customer_id uuid,
  contact_id uuid,
  delivery_order_id uuid REFERENCES public.delivery_orders(id) ON DELETE SET NULL,
  product_id uuid,
  onboarding_status text NOT NULL DEFAULT 'not_started' CHECK (onboarding_status IN ('not_started','waiting_customer','in_progress','blocked','complete','cancelled')),
  onboarding_stage text,
  welcome_pack_prepared boolean NOT NULL DEFAULT false,
  welcome_pack_sent boolean NOT NULL DEFAULT false,
  portal_invite_prepared boolean NOT NULL DEFAULT false,
  portal_invite_sent boolean NOT NULL DEFAULT false,
  missing_information jsonb DEFAULT '[]'::jsonb,
  first_success_milestone text,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  audit_metadata jsonb DEFAULT '{}'::jsonb
);
ALTER TABLE public.onboarding_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders manage onboarding_records" ON public.onboarding_records
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'founder'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'founder'));
CREATE TRIGGER trg_onboarding_records_updated BEFORE UPDATE ON public.onboarding_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_onboarding_records_business ON public.onboarding_records(business_id);
CREATE INDEX idx_onboarding_records_status ON public.onboarding_records(onboarding_status);

-- 2. onboarding_checklist_items
CREATE TABLE public.onboarding_checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid,
  onboarding_record_id uuid REFERENCES public.onboarding_records(id) ON DELETE CASCADE,
  item_name text NOT NULL,
  item_type text NOT NULL DEFAULT 'internal_task' CHECK (item_type IN ('internal_task','customer_info','document','portal_setup','payment_check','meeting','support_handoff')),
  item_status text NOT NULL DEFAULT 'pending' CHECK (item_status IN ('pending','requested','received','completed','blocked','not_needed')),
  required_from text NOT NULL DEFAULT 'ai_agent' CHECK (required_from IN ('customer','founder','human_operator','ai_agent','vendor')),
  due_at timestamptz,
  completed_at timestamptz,
  blocker_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.onboarding_checklist_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders manage onboarding_checklist_items" ON public.onboarding_checklist_items
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'founder'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'founder'));
CREATE TRIGGER trg_onboarding_checklist_items_updated BEFORE UPDATE ON public.onboarding_checklist_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_onboarding_checklist_record ON public.onboarding_checklist_items(onboarding_record_id);

-- 3. onboarding_templates
CREATE TABLE public.onboarding_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid,
  product_id uuid,
  template_name text NOT NULL,
  checklist_json jsonb DEFAULT '[]'::jsonb,
  welcome_message_template text,
  required_documents jsonb DEFAULT '[]'::jsonb,
  required_customer_info jsonb DEFAULT '[]'::jsonb,
  first_success_milestone text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.onboarding_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders manage onboarding_templates" ON public.onboarding_templates
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'founder'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'founder'));
CREATE TRIGGER trg_onboarding_templates_updated BEFORE UPDATE ON public.onboarding_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();