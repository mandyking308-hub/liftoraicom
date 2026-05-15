
CREATE TABLE IF NOT EXISTS public.crm_interaction_source_adapters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  adapter_key text NOT NULL UNIQUE,
  source_system text NOT NULL,
  source_channel text NOT NULL,
  source_table text,
  enabled_for_preview boolean NOT NULL DEFAULT true,
  enabled_for_capture boolean NOT NULL DEFAULT false,
  capture_requires_feature_flag boolean NOT NULL DEFAULT true,
  feature_flag_name text,
  supported_interaction_types jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_interaction_source_adapters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Founders manage crm source adapters" ON public.crm_interaction_source_adapters;
CREATE POLICY "Founders manage crm source adapters"
  ON public.crm_interaction_source_adapters
  FOR ALL
  USING (public.has_role(auth.uid(), 'founder'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'founder'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_crm_interaction_source_adapters_updated
  BEFORE UPDATE ON public.crm_interaction_source_adapters
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.crm_interaction_source_adapters
  (adapter_key, source_system, source_channel, source_table, feature_flag_name, supported_interaction_types, notes)
VALUES
  ('smartlead_provider_events','smartlead','provider_event','outbound_provider_events','CRM_INTERACTION_CAPTURE_ENABLED',
    '["smartlead_email_sent","smartlead_email_opened","smartlead_email_clicked","smartlead_email_replied","smartlead_email_bounced","smartlead_lead_unsubscribed"]'::jsonb,
    'Smartlead webhook + polled events.'),
  ('native_email_events','native','email_event','email_events','CRM_INTERACTION_CAPTURE_ENABLED',
    '["native_email_sent","native_email_opened","native_email_bounced","native_email_delivered"]'::jsonb,
    'Native IONOS email lifecycle events.'),
  ('communications','native','communication','communications','CRM_INTERACTION_CAPTURE_ENABLED',
    '["native_email_sent","native_email_reply_received","ai_reply_sent"]'::jsonb,
    'Founder/AI/native outbound and inbound stored communications.'),
  ('inbound_messages','native','inbound','inbound_messages','CRM_INTERACTION_CAPTURE_ENABLED',
    '["native_email_reply_received"]'::jsonb,
    'Inbox-polled inbound replies.'),
  ('ai_actions','liftor_ai','ai_action','ai_actions','CRM_INTERACTION_CAPTURE_ENABLED',
    '["ai_reply_draft_created","ai_reply_sent","ai_action_recorded"]'::jsonb,
    'Logged AI actions; status determines interaction type.'),
  ('ai_drafts','liftor_ai','ai_draft','ai_drafts','CRM_INTERACTION_CAPTURE_ENABLED',
    '["ai_reply_draft_created"]'::jsonb,
    'AI-generated drafts pending founder review.'),
  ('internal_proposals','liftor','proposal','internal_proposals','CRM_INTERACTION_CAPTURE_ENABLED',
    '["proposal_created","proposal_sent"]'::jsonb,
    'Internal proposals issued to prospects.'),
  ('demo_access','liftor','demo','demo_access','CRM_INTERACTION_CAPTURE_ENABLED',
    '["demo_access_created"]'::jsonb,
    'Demo access grants.'),
  ('demo_events','liftor','demo','demo_events','CRM_INTERACTION_CAPTURE_ENABLED',
    '["demo_viewed","demo_completed"]'::jsonb,
    'Demo viewer activity.'),
  ('deals','liftor','deal','deals','CRM_INTERACTION_CAPTURE_ENABLED',
    '["deal_created","deal_stage_changed","deal_won","deal_lost"]'::jsonb,
    'Sales pipeline state changes.'),
  ('invoices','liftor','finance','invoices','CRM_INTERACTION_CAPTURE_ENABLED',
    '["invoice_created","invoice_sent"]'::jsonb,
    'Invoices issued.'),
  ('payments','liftor','finance','payments','CRM_INTERACTION_CAPTURE_ENABLED',
    '["payment_received"]'::jsonb,
    'Recorded customer payments.'),
  ('assignments','liftor','assignment','assignments','CRM_INTERACTION_CAPTURE_ENABLED',
    '["supplier_assignment_created"]'::jsonb,
    'Supplier/contractor assignment events.'),
  ('supplier_updates','liftor','supplier','assignments','CRM_INTERACTION_CAPTURE_ENABLED',
    '["supplier_message","supplier_status_change"]'::jsonb,
    'Supplier status updates and messages.'),
  ('compliance_events','liftor','compliance','compliance_events','CRM_INTERACTION_CAPTURE_ENABLED',
    '["compliance_event_created"]'::jsonb,
    'Compliance lifecycle events.'),
  ('system_events','liftor','system','activity_log','CRM_INTERACTION_CAPTURE_ENABLED',
    '["system_event_created"]'::jsonb,
    'System-level events that touch a contact/business.'),
  ('founder_manual_notes','founder','note',NULL,'CRM_INTERACTION_CAPTURE_ENABLED',
    '["founder_note_added"]'::jsonb,
    'Manual founder-entered notes.')
ON CONFLICT (adapter_key) DO UPDATE
  SET source_system = EXCLUDED.source_system,
      source_channel = EXCLUDED.source_channel,
      source_table = EXCLUDED.source_table,
      supported_interaction_types = EXCLUDED.supported_interaction_types,
      notes = EXCLUDED.notes,
      feature_flag_name = EXCLUDED.feature_flag_name,
      updated_at = now();
