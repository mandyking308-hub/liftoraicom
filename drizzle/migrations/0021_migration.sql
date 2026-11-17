CREATE TABLE public.portfolio_send_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id),
  campaign_label text NOT NULL,
  campaign_draft_id uuid REFERENCES public.outreach_campaign_drafts(id),
  mailbox_id uuid NOT NULL REFERENCES public.gsm_mailboxes(id),
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  emails_planned integer NOT NULL DEFAULT 1 CHECK (emails_planned BETWEEN 1 AND 5),
  status text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','cancelled')),
  sending_enabled boolean NOT NULL DEFAULT false CHECK (sending_enabled = false),
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at)
);
CREATE INDEX portfolio_send_bookings_mailbox_idx ON public.portfolio_send_bookings(mailbox_id, starts_at);
CREATE INDEX portfolio_send_bookings_business_idx ON public.portfolio_send_bookings(business_id, campaign_label);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.portfolio_send_bookings TO authenticated;
GRANT ALL ON public.portfolio_send_bookings TO service_role;
ALTER TABLE public.portfolio_send_bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founder/admin manage send calendar" ON public.portfolio_send_bookings
  FOR ALL TO authenticated USING (public._is_founder_or_admin()) WITH CHECK (public._is_founder_or_admin());

CREATE OR REPLACE FUNCTION public.validate_portfolio_send_booking()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE mb record; total int; biz record;
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
      AND b.id <> NEW.id AND tstzrange(b.starts_at, b.ends_at) && tstzrange(NEW.starts_at, NEW.ends_at)) THEN
    RAISE EXCEPTION 'This mailbox is already booked for that time.';
  END IF;
  SELECT COALESCE(sum(emails_planned),0) INTO total FROM portfolio_send_bookings b
    WHERE b.business_id = NEW.business_id AND b.campaign_label = NEW.campaign_label AND b.status = 'planned' AND b.id <> NEW.id;
  IF total + NEW.emails_planned > 5 THEN
    RAISE EXCEPTION 'A business campaign is limited to five emails in total (% already booked).', total;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER portfolio_send_booking_validate BEFORE INSERT OR UPDATE ON public.portfolio_send_bookings
  FOR EACH ROW EXECUTE FUNCTION public.validate_portfolio_send_booking();