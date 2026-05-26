
CREATE TABLE public.communication_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid,
  identity_profile_id uuid,
  contact_id uuid,
  customer_id uuid,
  seller_id uuid,
  partner_id uuid,
  channel text NOT NULL CHECK (channel IN ('email','voice','sms','whatsapp','social_dm','support_portal','seller_portal','partner_portal','adviser','manual','other')),
  direction text NOT NULL CHECK (direction IN ('inbound','outbound','internal_note')),
  communication_status text NOT NULL DEFAULT 'draft' CHECK (communication_status IN ('draft','approval_required','approved','sent','received','failed','blocked','cancelled','logged')),
  subject text,
  summary text,
  content_reference text,
  external_provider text,
  provider_message_id text,
  approval_item_id uuid,
  sent_at timestamptz,
  received_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  audit_metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);
GRANT SELECT, INSERT, UPDATE ON public.communication_records TO authenticated;
GRANT ALL ON public.communication_records TO service_role;
ALTER TABLE public.communication_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comm_records_select" ON public.communication_records FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));
CREATE POLICY "comm_records_insert" ON public.communication_records FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));
CREATE POLICY "comm_records_update" ON public.communication_records FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));
CREATE INDEX idx_comm_records_business ON public.communication_records(business_id);
CREATE INDEX idx_comm_records_identity ON public.communication_records(identity_profile_id);
CREATE INDEX idx_comm_records_status ON public.communication_records(communication_status);
CREATE INDEX idx_comm_records_channel ON public.communication_records(channel);

CREATE TABLE public.communication_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid,
  thread_title text NOT NULL,
  primary_identity_profile_id uuid,
  thread_status text NOT NULL DEFAULT 'active' CHECK (thread_status IN ('active','waiting_reply','closed','escalated','archived')),
  last_message_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.communication_threads TO authenticated;
GRANT ALL ON public.communication_threads TO service_role;
ALTER TABLE public.communication_threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comm_threads_select" ON public.communication_threads FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));
CREATE POLICY "comm_threads_insert" ON public.communication_threads FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));
CREATE POLICY "comm_threads_update" ON public.communication_threads FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));

CREATE TABLE public.communication_thread_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.communication_threads(id) ON DELETE CASCADE,
  communication_record_id uuid NOT NULL REFERENCES public.communication_records(id) ON DELETE CASCADE,
  message_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.communication_thread_messages TO authenticated;
GRANT ALL ON public.communication_thread_messages TO service_role;
ALTER TABLE public.communication_thread_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comm_thread_msgs_select" ON public.communication_thread_messages FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));
CREATE POLICY "comm_thread_msgs_insert" ON public.communication_thread_messages FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));
CREATE INDEX idx_comm_thread_msgs_thread ON public.communication_thread_messages(thread_id, message_order);

CREATE TABLE public.communication_safety_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  communication_record_id uuid NOT NULL REFERENCES public.communication_records(id) ON DELETE CASCADE,
  flag_type text NOT NULL CHECK (flag_type IN ('do_not_contact','sensitive','complaint','legal','angry_customer','vulnerable','approval_required','prompt_injection','unknown_business','other')),
  severity text NOT NULL DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
  flag_summary text,
  created_at timestamptz NOT NULL DEFAULT now(),
  audit_metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);
GRANT SELECT, INSERT ON public.communication_safety_flags TO authenticated;
GRANT ALL ON public.communication_safety_flags TO service_role;
ALTER TABLE public.communication_safety_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comm_safety_flags_select" ON public.communication_safety_flags FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));
CREATE POLICY "comm_safety_flags_insert" ON public.communication_safety_flags FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));
CREATE INDEX idx_comm_safety_record ON public.communication_safety_flags(communication_record_id);

CREATE TRIGGER trg_comm_records_updated BEFORE UPDATE ON public.communication_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_comm_threads_updated BEFORE UPDATE ON public.communication_threads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
