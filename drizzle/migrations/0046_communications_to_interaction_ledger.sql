CREATE OR REPLACE FUNCTION public.log_communication_to_interaction_ledger()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  INSERT INTO public.crm_interaction_ledger
    (contact_id, communication_id, source_system, source_channel, channel_key, source_table, source_id,
     interaction_type, direction, summary, body_preview, occurred_at, matched_status, dedupe_key,
     founder_review_required, ai_relevant)
  VALUES
    (NEW.contact_id, NEW.id, 'liftor', COALESCE(NEW.channel::text,'email'), COALESCE(NEW.channel::text,'email'), 'communications', NEW.id,
     CASE WHEN NEW.direction::text = 'inbound' THEN 'message_received' ELSE 'message_sent' END,
     CASE WHEN NEW.direction::text IN ('inbound','outbound') THEN NEW.direction::text ELSE 'unknown' END,
     CASE WHEN NEW.direction::text = 'inbound' THEN 'message received' ELSE 'message sent' END,
     left(NEW.message, 200), COALESCE(NEW."timestamp", now()), 'matched', 'communication:' || NEW.id,
     NEW.direction::text = 'inbound', NEW.direction::text = 'inbound')
  ON CONFLICT (dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.log_communication_to_interaction_ledger() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER trg_communications_interaction_ledger AFTER INSERT ON public.communications
FOR EACH ROW EXECUTE FUNCTION public.log_communication_to_interaction_ledger();