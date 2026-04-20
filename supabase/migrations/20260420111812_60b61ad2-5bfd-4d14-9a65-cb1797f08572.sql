-- 1. Add PARTIALLY_PAID to invoice_status enum
ALTER TYPE public.invoice_status ADD VALUE IF NOT EXISTS 'PARTIALLY_PAID';

-- 2. Add expected_amount and payment_risk_flag to invoices
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS expected_amount numeric,
  ADD COLUMN IF NOT EXISTS payment_risk_flag boolean NOT NULL DEFAULT false;

-- Backfill expected_amount for existing rows = midpoint
UPDATE public.invoices
   SET expected_amount = (COALESCE(amount_min,0) + COALESCE(amount_max,0)) / 2.0
 WHERE expected_amount IS NULL;

-- Default expected_amount to midpoint going forward via trigger
CREATE OR REPLACE FUNCTION public.set_invoice_expected_amount()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.expected_amount IS NULL THEN
    NEW.expected_amount := (COALESCE(NEW.amount_min,0) + COALESCE(NEW.amount_max,0)) / 2.0;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_invoice_expected_amount ON public.invoices;
CREATE TRIGGER trg_invoice_expected_amount
BEFORE INSERT OR UPDATE OF amount_min, amount_max, expected_amount
ON public.invoices
FOR EACH ROW EXECUTE FUNCTION public.set_invoice_expected_amount();

-- 3. Add business_name to payments and payment_events for multi-business safety
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS business_name text NOT NULL DEFAULT '';
ALTER TABLE public.payment_events
  ADD COLUMN IF NOT EXISTS business_name text NOT NULL DEFAULT '';

-- Backfill business_name from invoices
UPDATE public.payments p
   SET business_name = i.business_name
  FROM public.invoices i
 WHERE p.invoice_id = i.id AND COALESCE(p.business_name,'') = '';

UPDATE public.payment_events pe
   SET business_name = i.business_name
  FROM public.invoices i
 WHERE pe.invoice_id = i.id AND COALESCE(pe.business_name,'') = '';

-- Auto-stamp business_name on insert from parent invoice
CREATE OR REPLACE FUNCTION public.stamp_business_name_from_invoice()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF COALESCE(NEW.business_name, '') = '' THEN
    SELECT business_name INTO NEW.business_name
      FROM public.invoices WHERE id = NEW.invoice_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_payments_stamp_business ON public.payments;
CREATE TRIGGER trg_payments_stamp_business
BEFORE INSERT ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.stamp_business_name_from_invoice();

DROP TRIGGER IF EXISTS trg_payment_events_stamp_business ON public.payment_events;
CREATE TRIGGER trg_payment_events_stamp_business
BEFORE INSERT ON public.payment_events
FOR EACH ROW EXECUTE FUNCTION public.stamp_business_name_from_invoice();

-- 4. Update handle_payment_received: PARTIALLY_PAID vs PAID using expected_amount
CREATE OR REPLACE FUNCTION public.handle_payment_received()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv public.invoices%ROWTYPE;
  total_paid numeric;
  expected numeric;
  new_status public.invoice_status;
BEGIN
  INSERT INTO public.payment_events (invoice_id, event_type, details)
  VALUES (NEW.invoice_id, 'payment_received',
          'Payment of ' || NEW.amount_received::text || ' received via ' || NEW.method::text);

  SELECT * INTO inv FROM public.invoices WHERE id = NEW.invoice_id;
  IF NOT FOUND THEN RETURN NEW; END IF;

  SELECT COALESCE(SUM(amount_received), 0) INTO total_paid
    FROM public.payments WHERE invoice_id = NEW.invoice_id;

  expected := COALESCE(inv.expected_amount,
                       (COALESCE(inv.amount_min,0) + COALESCE(inv.amount_max,0)) / 2.0);

  IF expected > 0 AND total_paid >= expected THEN
    new_status := 'PAID';
  ELSIF total_paid > 0 AND total_paid < expected THEN
    new_status := 'PARTIALLY_PAID';
  ELSE
    new_status := inv.status;
  END IF;

  IF new_status <> inv.status THEN
    UPDATE public.invoices SET status = new_status, payment_risk_flag = CASE WHEN new_status = 'PAID' THEN false ELSE payment_risk_flag END
     WHERE id = NEW.invoice_id;
  END IF;

  RETURN NEW;
END;
$$;

-- 5. Update handle_deal_won: also flip contact to CLIENT and use expected_amount on the new invoice
CREATE OR REPLACE FUNCTION public.handle_deal_won()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_invoice_id uuid;
BEGIN
  IF NEW.status = 'WON' AND (OLD.status IS DISTINCT FROM 'WON') THEN
    NEW.won_at := COALESCE(NEW.won_at, now());

    -- Loop back to CRM: mark contact as CLIENT (blocks outreach via sanity layer)
    IF NEW.contact_id IS NOT NULL THEN
      UPDATE public.contacts
         SET status = 'CLIENT'::contact_status,
             updated_at = now()
       WHERE id = NEW.contact_id
         AND status <> 'DO_NOT_CONTACT';
    END IF;

    SELECT id INTO existing_invoice_id
      FROM public.invoices
     WHERE deal_id = NEW.id
     LIMIT 1;

    IF existing_invoice_id IS NULL THEN
      INSERT INTO public.invoices (
        deal_id, contact_id, business_name, invoice_number,
        amount_min, amount_max, expected_amount, currency,
        issued_date, due_date, status, notes
      ) VALUES (
        NEW.id, NEW.contact_id, NEW.business_name, public.generate_invoice_number(),
        NEW.estimated_value_min, NEW.estimated_value_max,
        (COALESCE(NEW.estimated_value_min,0) + COALESCE(NEW.estimated_value_max,0)) / 2.0,
        NEW.currency,
        CURRENT_DATE, CURRENT_DATE + interval '14 days',
        'DRAFT',
        'Draft invoice auto-created from deal. This invoice reflects a non-binding estimate based on agreed scope.'
      );
    END IF;
  END IF;

  IF NEW.status = 'LOST' AND (OLD.status IS DISTINCT FROM 'LOST') THEN
    NEW.lost_at := COALESCE(NEW.lost_at, now());
  END IF;

  RETURN NEW;
END;
$$;

-- 6. Update finance_mark_overdue_invoices to also flip PARTIALLY_PAID past due to OVERDUE
-- and set payment_risk_flag = true for invoices > 14 days overdue
CREATE OR REPLACE FUNCTION public.finance_mark_overdue_invoices()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected integer;
BEGIN
  UPDATE public.invoices
     SET status = 'OVERDUE'
   WHERE status IN ('SENT', 'PARTIALLY_PAID')
     AND due_date < CURRENT_DATE;
  GET DIAGNOSTICS affected = ROW_COUNT;

  -- Flag payment risk on invoices > 14 days overdue and not paid
  UPDATE public.invoices
     SET payment_risk_flag = true
   WHERE status IN ('OVERDUE', 'PARTIALLY_PAID')
     AND due_date < (CURRENT_DATE - interval '14 days')
     AND payment_risk_flag = false;

  RETURN affected;
END;
$$;

-- 7. Update finance_target_vs_actual to count PARTIALLY_PAID as outstanding too
CREATE OR REPLACE FUNCTION public.finance_target_vs_actual(
  _business_name text DEFAULT NULL::text,
  _month date DEFAULT (date_trunc('month'::text, (CURRENT_DATE)::timestamp with time zone))::date
)
RETURNS TABLE(
  business_name text, monthly_target numeric, pipeline_target numeric,
  pipeline_value numeric, closed_value numeric, collected_value numeric,
  outstanding_value numeric, overdue_value numeric, progress_pct numeric
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  month_start date := date_trunc('month', _month)::date;
  month_end date := (date_trunc('month', _month) + interval '1 month - 1 day')::date;
BEGIN
  RETURN QUERY
  WITH businesses AS (
    SELECT DISTINCT b FROM (
      SELECT business_name AS b FROM public.deals
      UNION SELECT business_name FROM public.invoices
      UNION SELECT business_name FROM public.revenue_targets
    ) s
    WHERE _business_name IS NULL OR s.b = _business_name
  ),
  target AS (
    SELECT rt.business_name, rt.monthly_target, rt.pipeline_target
      FROM public.revenue_targets rt WHERE rt.month = month_start
  ),
  pipeline AS (
    SELECT d.business_name,
           COALESCE(SUM((d.estimated_value_min + d.estimated_value_max) / 2.0), 0) AS pipeline_value
      FROM public.deals d WHERE d.status NOT IN ('WON','LOST')
     GROUP BY d.business_name
  ),
  closed AS (
    SELECT d.business_name,
           COALESCE(SUM((d.estimated_value_min + d.estimated_value_max) / 2.0), 0) AS closed_value
      FROM public.deals d
     WHERE d.status = 'WON' AND d.won_at >= month_start AND d.won_at <= month_end + interval '1 day'
     GROUP BY d.business_name
  ),
  collected AS (
    SELECT i.business_name, COALESCE(SUM(p.amount_received), 0) AS collected_value
      FROM public.payments p JOIN public.invoices i ON i.id = p.invoice_id
     WHERE p.received_date BETWEEN month_start AND month_end
     GROUP BY i.business_name
  ),
  outstanding AS (
    SELECT i.business_name,
           COALESCE(SUM(COALESCE(i.expected_amount, (i.amount_min + i.amount_max)/2.0)), 0) AS outstanding_value,
           COALESCE(SUM(CASE WHEN i.status = 'OVERDUE'
                             THEN COALESCE(i.expected_amount, (i.amount_min + i.amount_max)/2.0)
                             ELSE 0 END), 0) AS overdue_value
      FROM public.invoices i
     WHERE i.status IN ('SENT','OVERDUE','PARTIALLY_PAID')
     GROUP BY i.business_name
  )
  SELECT
    b.b, COALESCE(target.monthly_target, 0), COALESCE(target.pipeline_target, 0),
    COALESCE(pipeline.pipeline_value, 0), COALESCE(closed.closed_value, 0),
    COALESCE(collected.collected_value, 0),
    COALESCE(outstanding.outstanding_value, 0), COALESCE(outstanding.overdue_value, 0),
    CASE WHEN COALESCE(target.monthly_target, 0) > 0
         THEN ROUND((COALESCE(collected.collected_value, 0) / target.monthly_target) * 100, 2)
         ELSE 0 END
  FROM businesses b
  LEFT JOIN target ON target.business_name = b.b
  LEFT JOIN pipeline ON pipeline.business_name = b.b
  LEFT JOIN closed ON closed.business_name = b.b
  LEFT JOIN collected ON collected.business_name = b.b
  LEFT JOIN outstanding ON outstanding.business_name = b.b
  ORDER BY b.b;
END;
$$;