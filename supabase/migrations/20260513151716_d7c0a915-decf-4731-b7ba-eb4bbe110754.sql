ALTER TABLE public.contact_compliance_events DROP CONSTRAINT IF EXISTS contact_compliance_events_event_type_check;
ALTER TABLE public.contact_compliance_events ADD CONSTRAINT contact_compliance_events_event_type_check
  CHECK (event_type IN (
    'lawful_basis_recorded','retention_set','unsubscribe_token_created',
    'unsubscribe_clicked','manual_do_not_contact','hard_bounce_suppressed',
    'reply_stop_suppressed','compliance_reviewed','compliance_approved',
    'outreach_allowed','outreach_blocked','outreach_email_sent'
  ));