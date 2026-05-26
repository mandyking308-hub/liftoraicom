
CREATE TABLE public.trust_risk_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid,
  identity_profile_id uuid,
  seller_id uuid,
  customer_id uuid,
  related_table text,
  related_record_id uuid,
  risk_type text NOT NULL CHECK (risk_type IN ('duplicate_account','suspicious_payment','chargeback_risk','refund_abuse','fake_seller','fake_buyer','abusive_message','spam','identity_mismatch','payout_risk','policy_violation','other')),
  severity text NOT NULL DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
  risk_summary text,
  evidence_summary text,
  recommended_action text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','review_required','action_required','resolved','false_positive','accepted')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  audit_metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);
GRANT SELECT, INSERT, UPDATE ON public.trust_risk_events TO authenticated;
GRANT ALL ON public.trust_risk_events TO service_role;
ALTER TABLE public.trust_risk_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "trust_events_select" ON public.trust_risk_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));
CREATE POLICY "trust_events_insert" ON public.trust_risk_events FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));
CREATE POLICY "trust_events_update" ON public.trust_risk_events FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));
CREATE INDEX idx_trust_events_type ON public.trust_risk_events(risk_type);
CREATE INDEX idx_trust_events_severity ON public.trust_risk_events(severity);
CREATE INDEX idx_trust_events_status ON public.trust_risk_events(status);

CREATE TABLE public.trust_action_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trust_risk_event_id uuid NOT NULL REFERENCES public.trust_risk_events(id) ON DELETE CASCADE,
  action_type text NOT NULL CHECK (action_type IN ('watch','request_info','manual_review','block_message','suspend_account','hold_payout','cancel_order','refund_review','escalate','no_action')),
  action_status text NOT NULL DEFAULT 'draft' CHECK (action_status IN ('draft','approval_required','approved','rejected','completed','cancelled')),
  founder_approval_required boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  audit_metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);
GRANT SELECT, INSERT, UPDATE ON public.trust_action_recommendations TO authenticated;
GRANT ALL ON public.trust_action_recommendations TO service_role;
ALTER TABLE public.trust_action_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "trust_actions_select" ON public.trust_action_recommendations FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));
CREATE POLICY "trust_actions_insert" ON public.trust_action_recommendations FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));
CREATE POLICY "trust_actions_update" ON public.trust_action_recommendations FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));
CREATE INDEX idx_trust_actions_event ON public.trust_action_recommendations(trust_risk_event_id);
CREATE INDEX idx_trust_actions_status ON public.trust_action_recommendations(action_status);

CREATE TABLE public.abuse_message_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  communication_record_id uuid NOT NULL REFERENCES public.communication_records(id) ON DELETE CASCADE,
  flag_type text NOT NULL CHECK (flag_type IN ('abusive','spam','harassment','scam','suspicious_link','prohibited_content','other')),
  severity text NOT NULL DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
  flag_summary text,
  created_at timestamptz NOT NULL DEFAULT now(),
  audit_metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);
GRANT SELECT, INSERT ON public.abuse_message_flags TO authenticated;
GRANT ALL ON public.abuse_message_flags TO service_role;
ALTER TABLE public.abuse_message_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "abuse_flags_select" ON public.abuse_message_flags FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));
CREATE POLICY "abuse_flags_insert" ON public.abuse_message_flags FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));
CREATE INDEX idx_abuse_flags_record ON public.abuse_message_flags(communication_record_id);

CREATE TRIGGER trg_trust_events_updated BEFORE UPDATE ON public.trust_risk_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_trust_actions_updated BEFORE UPDATE ON public.trust_action_recommendations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
