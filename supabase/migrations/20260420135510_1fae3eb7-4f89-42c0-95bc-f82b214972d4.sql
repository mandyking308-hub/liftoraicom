-- Recreate the trigger as AFTER INSERT OR UPDATE so NEW.id exists for the FK in invoices.
DROP TRIGGER IF EXISTS deal_won_create_invoice ON public.deals;
CREATE TRIGGER deal_won_create_invoice
AFTER INSERT OR UPDATE ON public.deals
FOR EACH ROW EXECUTE FUNCTION public.handle_deal_won();