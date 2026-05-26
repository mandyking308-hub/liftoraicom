
-- 1. webhook_inbox_events
CREATE TABLE public.webhook_inbox_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connector_id UUID REFERENCES public.connector_registry(id) ON DELETE SET NULL,
  business_id UUID,
  provider_name TEXT NOT NULL,
  webhook_event_type TEXT NOT NULL,
  provider_event_id TEXT,
  raw_payload_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  payload_hash TEXT,
  signature_verified BOOLEAN NOT NULL DEFAULT false,
  verification_status TEXT NOT NULL DEFAULT 'unknown' CHECK (verification_status IN ('not_required','verified','failed','missing','unknown')),
  processing_status TEXT NOT NULL DEFAULT 'received' CHECK (processing_status IN ('received','normalised','duplicate','failed','ignored','parked')),
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  audit_metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX idx_wie_received ON public.webhook_inbox_events(received_at DESC);
CREATE INDEX idx_wie_provider ON public.webhook_inbox_events(provider_name, webhook_event_type);
CREATE UNIQUE INDEX idx_wie_payload_hash ON public.webhook_inbox_events(payload_hash) WHERE payload_hash IS NOT NULL;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.webhook_inbox_events TO authenticated;
GRANT ALL ON public.webhook_inbox_events TO service_role;
ALTER TABLE public.webhook_inbox_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "founders view wie" ON public.webhook_inbox_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));
CREATE POLICY "founders manage wie" ON public.webhook_inbox_events FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));

-- 2. normalised_external_events
CREATE TABLE public.normalised_external_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_inbox_event_id UUID REFERENCES public.webhook_inbox_events(id) ON DELETE CASCADE,
  business_id UUID,
  event_type TEXT NOT NULL,
  event_category TEXT NOT NULL CHECK (event_category IN ('payment','call','email_reply','signature','booking','seller','support','form','social','other')),
  related_contact_id UUID,
  related_customer_id UUID,
  related_seller_id UUID,
  related_record_table TEXT,
  related_record_id UUID,
  confidence_score NUMERIC,
  normalised_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  liftor_event_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  audit_metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX idx_nee_created ON public.normalised_external_events(created_at DESC);
CREATE INDEX idx_nee_category ON public.normalised_external_events(event_category);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.normalised_external_events TO authenticated;
GRANT ALL ON public.normalised_external_events TO service_role;
ALTER TABLE public.normalised_external_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "founders view nee" ON public.normalised_external_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));
CREATE POLICY "founders manage nee" ON public.normalised_external_events FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));

-- 3. webhook_processing_rules
CREATE TABLE public.webhook_processing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_name TEXT NOT NULL,
  webhook_event_type TEXT NOT NULL,
  normalised_event_type TEXT NOT NULL,
  event_category TEXT NOT NULL DEFAULT 'other' CHECK (event_category IN ('payment','call','email_reply','signature','booking','seller','support','form','social','other')),
  required_signature BOOLEAN NOT NULL DEFAULT true,
  idempotency_field TEXT,
  business_mapping_strategy TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  audit_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider_name, webhook_event_type)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.webhook_processing_rules TO authenticated;
GRANT ALL ON public.webhook_processing_rules TO service_role;
ALTER TABLE public.webhook_processing_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "founders view wpr" ON public.webhook_processing_rules FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));
CREATE POLICY "founders manage wpr" ON public.webhook_processing_rules FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));
CREATE TRIGGER trg_wpr_updated BEFORE UPDATE ON public.webhook_processing_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.webhook_processing_rules (provider_name, webhook_event_type, normalised_event_type, event_category, required_signature, idempotency_field, business_mapping_strategy) VALUES
  ('stripe','payment_intent.succeeded','payment_succeeded','payment',true,'id','by_customer_email'),
  ('stripe','payment_intent.payment_failed','payment_failed','payment',true,'id','by_customer_email'),
  ('stripe','charge.refunded','payment_refunded','payment',true,'id','by_customer_email'),
  ('stripe','charge.dispute.created','payment_chargeback','payment',true,'id','by_customer_email'),
  ('smartlead','email.reply','email_reply','email_reply',true,'message_id','by_contact_email'),
  ('smartlead','email.bounce','email_bounce','email_reply',true,'message_id','by_contact_email'),
  ('smartlead','email.unsubscribe','email_unsubscribe','email_reply',true,'message_id','by_contact_email'),
  ('retell','call.ended','call_ended','call',true,'call_id','by_caller_phone'),
  ('vapi','call.ended','call_ended','call',true,'call_id','by_caller_phone'),
  ('twilio','call.completed','call_ended','call',true,'CallSid','by_caller_phone'),
  ('docusign','envelope.completed','contract_signed','signature',true,'envelopeId','by_signer_email'),
  ('calendly','invitee.created','booking_created','booking',true,'event_uuid','by_invitee_email'),
  ('calendly','invitee.canceled','booking_cancelled','booking',true,'event_uuid','by_invitee_email'),
  ('shopify','orders/paid','order_paid','payment',true,'id','by_customer_email'),
  ('shopify','refunds/create','order_refunded','payment',true,'id','by_customer_email'),
  ('generic_form','form.submitted','form_submission','form',false,'submission_id','by_email_field')
ON CONFLICT DO NOTHING;
