
CREATE TABLE public.founder_alert_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_key text NOT NULL UNIQUE,
  rule_name text NOT NULL,
  alert_category text NOT NULL,
  severity text NOT NULL DEFAULT 'medium',
  enabled boolean NOT NULL DEFAULT true,
  delivery_channel text NOT NULL DEFAULT 'command_centre',
  external_delivery_allowed boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.founder_notification_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid,
  alert_rule_id uuid REFERENCES public.founder_alert_rules(id) ON DELETE SET NULL,
  alert_title text NOT NULL,
  alert_summary text,
  severity text NOT NULL DEFAULT 'medium',
  source_table text,
  source_id uuid,
  status text NOT NULL DEFAULT 'unread',
  delivery_channel text NOT NULL DEFAULT 'command_centre',
  external_delivery_status text NOT NULL DEFAULT 'not_sent',
  founder_action_required boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz,
  resolved_at timestamptz
);

ALTER TABLE public.founder_alert_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.founder_notification_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "alert_rules_admin_founder_all" ON public.founder_alert_rules FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));
CREATE POLICY "notif_queue_admin_founder_all" ON public.founder_notification_queue FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));

CREATE TRIGGER update_founder_alert_rules_updated_at BEFORE UPDATE ON public.founder_alert_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_notif_queue_status ON public.founder_notification_queue(status);
CREATE INDEX idx_notif_queue_severity ON public.founder_notification_queue(severity);
CREATE INDEX idx_notif_queue_created ON public.founder_notification_queue(created_at DESC);

INSERT INTO public.founder_alert_rules (rule_key, rule_name, alert_category, severity) VALUES
  ('urgent_customer','Urgent customer signal','urgent_customer','high'),
  ('complaint_new','New complaint','complaint','high'),
  ('high_value_reply','High-value reply','high_value_reply','medium'),
  ('payment_received','Payment received','payment','medium'),
  ('invoice_overdue','Invoice overdue','invoice_overdue','high'),
  ('cashflow_risk','Cashflow risk','cashflow_risk','high'),
  ('security_incident','Security incident','security','critical'),
  ('system_failure','System failure','system_failure','critical'),
  ('supplier_issue','Supplier issue','supplier_issue','medium'),
  ('legal_compliance','Legal/compliance','legal_compliance','high'),
  ('reputation_signal','Reputation signal','reputation','high'),
  ('approval_needed','Approval needed','approval_needed','medium'),
  ('smartlead_event','Smartlead event','Smartlead','medium'),
  ('social_engagement','Social engagement','social_engagement','low'),
  ('winback_signal','Win-back signal','winback','medium'),
  ('retention_risk','Retention risk','retention_risk','high')
ON CONFLICT (rule_key) DO NOTHING;
