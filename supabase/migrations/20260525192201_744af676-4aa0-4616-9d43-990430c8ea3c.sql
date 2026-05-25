CREATE TABLE public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid,
  customer_id uuid,
  contact_id uuid,
  source_channel text NOT NULL DEFAULT 'manual' CHECK (source_channel IN ('email','chat','voice','portal','manual','social')),
  ticket_title text NOT NULL,
  ticket_description text,
  ticket_status text NOT NULL DEFAULT 'new' CHECK (ticket_status IN ('new','triaged','in_progress','waiting_customer','waiting_internal','escalated','resolved','closed','cancelled')),
  severity text NOT NULL DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
  sentiment text NOT NULL DEFAULT 'unknown' CHECK (sentiment IN ('positive','neutral','frustrated','angry','vulnerable','unknown')),
  issue_type text,
  sla_due_at timestamptz,
  assigned_to_type text DEFAULT 'ai_agent' CHECK (assigned_to_type IN ('ai_agent','human','founder')),
  assigned_to text,
  customer_visible boolean NOT NULL DEFAULT false,
  resolution_summary text,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  audit_metadata jsonb DEFAULT '{}'::jsonb
);
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders manage support_tickets" ON public.support_tickets
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'founder'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'founder'));
CREATE TRIGGER trg_support_tickets_updated BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_support_tickets_status ON public.support_tickets(ticket_status);
CREATE INDEX idx_support_tickets_severity ON public.support_tickets(severity);

CREATE TABLE public.support_ticket_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid,
  ticket_id uuid REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('created','triaged','assigned','replied_draft','escalated','sla_warning','resolved','reopened','customer_update')),
  event_summary text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  audit_metadata jsonb DEFAULT '{}'::jsonb
);
ALTER TABLE public.support_ticket_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders manage support_ticket_events" ON public.support_ticket_events
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'founder'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'founder'));
CREATE INDEX idx_support_ticket_events_ticket ON public.support_ticket_events(ticket_id);

CREATE TABLE public.support_sla_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid,
  policy_name text NOT NULL,
  severity text NOT NULL DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
  response_time_minutes integer DEFAULT 60,
  resolution_time_minutes integer DEFAULT 1440,
  escalation_after_minutes integer DEFAULT 120,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.support_sla_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders manage support_sla_policies" ON public.support_sla_policies
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'founder'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'founder'));
CREATE TRIGGER trg_support_sla_policies_updated BEFORE UPDATE ON public.support_sla_policies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();