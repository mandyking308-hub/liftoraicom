
CREATE TABLE public.unified_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid,
  source_module text NOT NULL,
  source_table text,
  source_record_id uuid,
  notification_type text NOT NULL,
  title text NOT NULL,
  message text,
  severity text NOT NULL DEFAULT 'info',
  priority text NOT NULL DEFAULT 'normal',
  notification_status text NOT NULL DEFAULT 'new',
  action_required boolean NOT NULL DEFAULT false,
  action_url text,
  related_work_item_id uuid,
  related_approval_item_id uuid,
  due_at timestamptz,
  snoozed_until timestamptz,
  is_test_data boolean NOT NULL DEFAULT false,
  resolved_at timestamptz,
  audit_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_module, source_table, source_record_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.unified_notifications TO authenticated;
GRANT ALL ON public.unified_notifications TO service_role;
ALTER TABLE public.unified_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "founders manage notifications" ON public.unified_notifications
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'founder'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'founder'::app_role));
CREATE INDEX idx_unified_notif_status ON public.unified_notifications (notification_status, created_at DESC);
CREATE INDEX idx_unified_notif_severity ON public.unified_notifications (severity, priority);
CREATE INDEX idx_unified_notif_business ON public.unified_notifications (business_id);

CREATE TABLE public.escalation_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid,
  notification_id uuid REFERENCES public.unified_notifications(id) ON DELETE SET NULL,
  source_module text NOT NULL,
  escalation_type text NOT NULL,
  escalation_reason text,
  severity text NOT NULL DEFAULT 'medium',
  escalation_status text NOT NULL DEFAULT 'open',
  assigned_to_type text NOT NULL DEFAULT 'unassigned',
  assigned_to text,
  due_at timestamptz,
  resolved_at timestamptz,
  audit_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.escalation_records TO authenticated;
GRANT ALL ON public.escalation_records TO service_role;
ALTER TABLE public.escalation_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "founders manage escalations" ON public.escalation_records
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'founder'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'founder'::app_role));
CREATE INDEX idx_escalations_status ON public.escalation_records (escalation_status, created_at DESC);

CREATE TABLE public.notification_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name text NOT NULL,
  source_module text NOT NULL,
  condition_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  severity text NOT NULL DEFAULT 'info',
  priority text NOT NULL DEFAULT 'normal',
  create_work_item boolean NOT NULL DEFAULT true,
  create_escalation boolean NOT NULL DEFAULT false,
  escalation_type text,
  suppress_duplicates_window_minutes integer NOT NULL DEFAULT 60,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_rules TO authenticated;
GRANT ALL ON public.notification_rules TO service_role;
ALTER TABLE public.notification_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "founders manage notification rules" ON public.notification_rules
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'founder'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'founder'::app_role));

CREATE TRIGGER trg_unified_notif_updated BEFORE UPDATE ON public.unified_notifications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_escalation_updated BEFORE UPDATE ON public.escalation_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_notif_rules_updated BEFORE UPDATE ON public.notification_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.notification_rules (rule_name, source_module, severity, priority, create_work_item, create_escalation, escalation_type, suppress_duplicates_window_minutes) VALUES
  ('Approval waiting', 'approval', 'high', 'urgent', true, false, NULL, 30),
  ('Critical incident', 'incident', 'critical', 'critical', true, true, 'founder', 15),
  ('Privacy deadline', 'privacy', 'high', 'urgent', true, true, 'compliance', 30),
  ('Overdue support', 'support', 'high', 'high', true, false, NULL, 60),
  ('Revenue-blocking close', 'sales_close', 'high', 'urgent', true, false, NULL, 60),
  ('Marketplace supply gap', 'marketplace', 'medium', 'high', true, false, NULL, 120),
  ('Data quality issue', 'data_quality', 'medium', 'normal', true, false, NULL, 240),
  ('Vendor renewal', 'vendor', 'medium', 'normal', true, false, NULL, 1440),
  ('AI gateway warning', 'ai_cost', 'high', 'high', true, false, NULL, 60),
  ('Delivery blocker', 'delivery', 'high', 'high', true, false, NULL, 60);
