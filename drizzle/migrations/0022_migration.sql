CREATE OR REPLACE FUNCTION public.lock_portfolio_send_booking()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('psb-mailbox:' || NEW.mailbox_id::text));
  PERFORM pg_advisory_xact_lock(hashtext('psb-campaign:' || NEW.business_id::text || ':' || NEW.campaign_label));
  RETURN NEW;
END $$;
CREATE TRIGGER portfolio_send_booking_aa_lock BEFORE INSERT OR UPDATE ON public.portfolio_send_bookings
  FOR EACH ROW EXECUTE FUNCTION public.lock_portfolio_send_booking();