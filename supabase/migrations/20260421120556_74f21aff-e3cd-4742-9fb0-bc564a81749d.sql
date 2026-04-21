
CREATE OR REPLACE FUNCTION public.handle_deal_won()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'WON' AND (OLD.status IS NULL OR OLD.status <> 'WON') THEN
    -- Invoicing gate
    IF public.is_feature_enabled('invoicing', NEW.business_name) THEN
      INSERT INTO public.invoices (
        deal_id, contact_id, business_name, invoice_number,
        amount_min, amount_max, currency, status
      )
      VALUES (
        NEW.id, NEW.contact_id, NEW.business_name,
        'INV-' || to_char(now(), 'YYYYMMDD') || '-' || substr(NEW.id::text, 1, 8),
        NEW.estimated_value_min, NEW.estimated_value_max,
        NEW.currency, 'DRAFT'
      );
    ELSE
      PERFORM public.log_feature_skip('invoicing', NEW.business_name, 'deal', NEW.id);
    END IF;

    -- Lock contact as CLIENT (always)
    IF NEW.contact_id IS NOT NULL THEN
      UPDATE public.contacts SET status = 'CLIENT' WHERE id = NEW.contact_id;
    END IF;

    -- Supplier auto-assign gate (handled by separate trg_deal_won_auto_assign trigger;
    -- here we only log the skip when suppliers are disabled)
    IF NOT public.is_feature_enabled('suppliers', NEW.business_name) THEN
      PERFORM public.log_feature_skip('suppliers', NEW.business_name, 'deal', NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
