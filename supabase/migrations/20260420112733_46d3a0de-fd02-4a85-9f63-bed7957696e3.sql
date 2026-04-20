-- 1. Multi-campaign lock on contacts
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS active_campaign_id uuid;

-- 2. Safety buffer: lower default daily limit to 80 and cap existing inboxes
ALTER TABLE public.inboxes
  ALTER COLUMN daily_send_limit SET DEFAULT 80;

UPDATE public.inboxes
  SET daily_send_limit = 80
  WHERE daily_send_limit > 80;

-- 3. Tracking placeholders on email_queue
ALTER TABLE public.email_queue
  ADD COLUMN IF NOT EXISTS tracking_pixel_id uuid DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS tracking_token text DEFAULT '';

-- 4. Add new email_event_type values for tracking
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'opened' AND enumtypid = 'public.email_event_type'::regtype) THEN
    ALTER TYPE public.email_event_type ADD VALUE 'opened';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'clicked' AND enumtypid = 'public.email_event_type'::regtype) THEN
    ALTER TYPE public.email_event_type ADD VALUE 'clicked';
  END IF;
END $$;

-- 5. Hard guard: prevent enqueueing a contact already in pending/sent state
CREATE OR REPLACE FUNCTION public.guard_email_queue_single_campaign()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_active uuid;
BEGIN
  -- If this contact is already locked to a different active campaign, block
  SELECT active_campaign_id INTO existing_active
    FROM public.contacts WHERE id = NEW.contact_id;

  IF existing_active IS NOT NULL AND existing_active <> NEW.campaign_id THEN
    RAISE EXCEPTION 'Contact % is already locked to campaign %', NEW.contact_id, existing_active;
  END IF;

  -- If a pending/sent row already exists for this contact in ANY campaign, block (unless same campaign+step)
  IF EXISTS (
    SELECT 1 FROM public.email_queue
    WHERE contact_id = NEW.contact_id
      AND status IN ('pending','sent')
      AND NOT (campaign_id = NEW.campaign_id AND sequence_step = NEW.sequence_step)
      AND campaign_id <> NEW.campaign_id
  ) THEN
    RAISE EXCEPTION 'Contact % already has active queue items in another campaign', NEW.contact_id;
  END IF;

  -- Lock the contact to this campaign
  UPDATE public.contacts
    SET active_campaign_id = NEW.campaign_id
    WHERE id = NEW.contact_id AND active_campaign_id IS NULL;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_email_queue_single_campaign ON public.email_queue;
CREATE TRIGGER trg_guard_email_queue_single_campaign
  BEFORE INSERT ON public.email_queue
  FOR EACH ROW EXECUTE FUNCTION public.guard_email_queue_single_campaign();

-- 6. Sequence exit on reply: cancel future pending steps + clear active_campaign_id
CREATE OR REPLACE FUNCTION public.cancel_queue_on_reply()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.event_type = 'replied' THEN
    UPDATE public.email_queue
      SET status = 'blocked', block_reason = 'REPLY_RECEIVED'
      WHERE contact_id = NEW.contact_id AND status = 'pending';
    UPDATE public.contacts SET active_campaign_id = NULL WHERE id = NEW.contact_id;
  ELSIF NEW.event_type = 'bounced' THEN
    -- Hard global block on bounce
    UPDATE public.contacts
      SET status = 'DO_NOT_CONTACT'::contact_status,
          active_campaign_id = NULL
      WHERE id = NEW.contact_id;
    UPDATE public.email_queue
      SET status = 'blocked', block_reason = 'BOUNCED'
      WHERE contact_id = NEW.contact_id AND status = 'pending';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cancel_queue_on_reply ON public.email_events;
CREATE TRIGGER trg_cancel_queue_on_reply
  AFTER INSERT ON public.email_events
  FOR EACH ROW EXECUTE FUNCTION public.cancel_queue_on_reply();

-- 7. Also cancel future steps when an inbound communication is recorded (covers manual logging)
CREATE OR REPLACE FUNCTION public.cancel_queue_on_inbound_comm()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.direction = 'inbound' THEN
    UPDATE public.email_queue
      SET status = 'blocked', block_reason = 'REPLY_RECEIVED'
      WHERE contact_id = NEW.contact_id AND status = 'pending';
    UPDATE public.contacts SET active_campaign_id = NULL WHERE id = NEW.contact_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cancel_queue_on_inbound_comm ON public.communications;
CREATE TRIGGER trg_cancel_queue_on_inbound_comm
  AFTER INSERT ON public.communications
  FOR EACH ROW EXECUTE FUNCTION public.cancel_queue_on_inbound_comm();