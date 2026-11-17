COMMENT ON COLUMN public.portfolio_send_bookings.emails_planned IS 'DEPRECATED: replaced by sequence_step + recipients_planned';
ALTER TABLE public.portfolio_send_bookings
  ADD COLUMN sequence_step integer NOT NULL DEFAULT 1 CHECK (sequence_step BETWEEN 1 AND 5),
  ADD COLUMN recipients_planned integer NOT NULL DEFAULT 0 CHECK (recipients_planned >= 0),
  ADD COLUMN booking_group uuid;

CREATE OR REPLACE FUNCTION public.validate_portfolio_send_booking()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE mb record; biz record;
BEGIN
  NEW.updated_at := now();
  IF NEW.status = 'cancelled' THEN RETURN NEW; END IF;
  SELECT estate_classification, active, retired INTO mb FROM gsm_mailboxes WHERE id = NEW.mailbox_id;
  IF mb IS NULL OR mb.estate_classification <> 'gsm' OR NOT mb.active OR mb.retired THEN
    RAISE EXCEPTION 'Only active GSM commercial mailboxes can be booked (GHAT is excluded).';
  END IF;
  SELECT portfolio_status, archived_at INTO biz FROM businesses WHERE id = NEW.business_id;
  IF biz.archived_at IS NOT NULL OR biz.portfolio_status = 'legacy_prelaunch' THEN
    RAISE EXCEPTION 'Archived or legacy businesses cannot be booked.';
  END IF;
  IF EXISTS (SELECT 1 FROM portfolio_send_bookings b WHERE b.mailbox_id = NEW.mailbox_id AND b.status = 'planned'
      AND b.id <> NEW.id AND b.business_id <> NEW.business_id
      AND tstzrange(b.starts_at, b.ends_at) && tstzrange(NEW.starts_at, NEW.ends_at)) THEN
    RAISE EXCEPTION 'A mailbox is already booked by another business for that time.';
  END IF;
  IF EXISTS (SELECT 1 FROM portfolio_send_bookings b WHERE b.mailbox_id = NEW.mailbox_id AND b.status = 'planned'
      AND b.id <> NEW.id AND b.business_id = NEW.business_id AND b.campaign_label = NEW.campaign_label
      AND b.sequence_step = NEW.sequence_step) THEN
    RAISE EXCEPTION 'Email % of this campaign is already booked on this mailbox.', NEW.sequence_step;
  END IF;
  RETURN NEW;
END $$;