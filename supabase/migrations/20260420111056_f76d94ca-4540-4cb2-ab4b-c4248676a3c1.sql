-- =========================================================
-- ENUMS
-- =========================================================
CREATE TYPE public.deal_status AS ENUM ('NEW', 'QUALIFIED', 'PROPOSAL_SENT', 'WON', 'LOST');
CREATE TYPE public.invoice_status AS ENUM ('DRAFT', 'SENT', 'PAID', 'OVERDUE');
CREATE TYPE public.payment_method AS ENUM ('bank', 'stripe', 'cash', 'other');
CREATE TYPE public.payment_event_type AS ENUM ('reminder_sent', 'escalation_sent', 'critical_flagged', 'payment_received');

-- =========================================================
-- REVENUE TARGETS
-- =========================================================
CREATE TABLE public.revenue_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name text NOT NULL DEFAULT '',
  monthly_target numeric NOT NULL DEFAULT 0,
  pipeline_target numeric NOT NULL DEFAULT 0,
  conversion_assumption numeric NOT NULL DEFAULT 0,
  month date NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_name, month)
);

ALTER TABLE public.revenue_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders can manage revenue targets"
  ON public.revenue_targets FOR ALL
  USING (has_role(auth.uid(), 'founder'::app_role))
  WITH CHECK (has_role(auth.uid(), 'founder'::app_role));

CREATE TRIGGER update_revenue_targets_updated_at
  BEFORE UPDATE ON public.revenue_targets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- DEALS
-- =========================================================
CREATE TABLE public.deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  business_name text NOT NULL DEFAULT '',
  deal_name text NOT NULL,
  estimated_value_min numeric NOT NULL DEFAULT 0,
  estimated_value_max numeric NOT NULL DEFAULT 0,
  probability integer NOT NULL DEFAULT 0 CHECK (probability >= 0 AND probability <= 100),
  status public.deal_status NOT NULL DEFAULT 'NEW',
  currency text NOT NULL DEFAULT 'USD',
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  won_at timestamptz,
  lost_at timestamptz
);

CREATE INDEX idx_deals_status ON public.deals(status);
CREATE INDEX idx_deals_business ON public.deals(business_name);
CREATE INDEX idx_deals_contact ON public.deals(contact_id);

ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders can manage deals"
  ON public.deals FOR ALL
  USING (has_role(auth.uid(), 'founder'::app_role))
  WITH CHECK (has_role(auth.uid(), 'founder'::app_role));

CREATE TRIGGER update_deals_updated_at
  BEFORE UPDATE ON public.deals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- INVOICES
-- =========================================================
CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid REFERENCES public.deals(id) ON DELETE SET NULL,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  business_name text NOT NULL DEFAULT '',
  invoice_number text NOT NULL UNIQUE,
  amount_min numeric NOT NULL DEFAULT 0,
  amount_max numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  issued_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date NOT NULL DEFAULT (CURRENT_DATE + interval '14 days'),
  status public.invoice_status NOT NULL DEFAULT 'DRAFT',
  notes text NOT NULL DEFAULT 'This invoice reflects a non-binding estimate based on agreed scope.',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_invoices_status ON public.invoices(status);
CREATE INDEX idx_invoices_deal ON public.invoices(deal_id);
CREATE INDEX idx_invoices_due_date ON public.invoices(due_date);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders can manage invoices"
  ON public.invoices FOR ALL
  USING (has_role(auth.uid(), 'founder'::app_role))
  WITH CHECK (has_role(auth.uid(), 'founder'::app_role));

CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- PAYMENTS
-- =========================================================
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  amount_received numeric NOT NULL DEFAULT 0,
  received_date date NOT NULL DEFAULT CURRENT_DATE,
  method public.payment_method NOT NULL DEFAULT 'bank',
  reference text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_payments_invoice ON public.payments(invoice_id);
CREATE INDEX idx_payments_received_date ON public.payments(received_date);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders can manage payments"
  ON public.payments FOR ALL
  USING (has_role(auth.uid(), 'founder'::app_role))
  WITH CHECK (has_role(auth.uid(), 'founder'::app_role));

-- =========================================================
-- PAYMENT EVENTS
-- =========================================================
CREATE TABLE public.payment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  event_type public.payment_event_type NOT NULL,
  details text NOT NULL DEFAULT '',
  "timestamp" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_payment_events_invoice ON public.payment_events(invoice_id);
CREATE INDEX idx_payment_events_type ON public.payment_events(event_type);

ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders can manage payment events"
  ON public.payment_events FOR ALL
  USING (has_role(auth.uid(), 'founder'::app_role))
  WITH CHECK (has_role(auth.uid(), 'founder'::app_role));

-- =========================================================
-- INVOICE NUMBER GENERATOR
-- =========================================================
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  year_part text := to_char(now(), 'YYYY');
  seq_part text;
  count_this_year integer;
BEGIN
  SELECT COUNT(*) + 1 INTO count_this_year
    FROM public.invoices
   WHERE issued_date >= date_trunc('year', now());
  seq_part := lpad(count_this_year::text, 5, '0');
  RETURN 'INV-' || year_part || '-' || seq_part;
END;
$$;

-- =========================================================
-- AUTO-CREATE DRAFT INVOICE WHEN DEAL MOVES TO WON
-- =========================================================
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

    SELECT id INTO existing_invoice_id
      FROM public.invoices
     WHERE deal_id = NEW.id
     LIMIT 1;

    IF existing_invoice_id IS NULL THEN
      INSERT INTO public.invoices (
        deal_id,
        contact_id,
        business_name,
        invoice_number,
        amount_min,
        amount_max,
        currency,
        issued_date,
        due_date,
        status,
        notes
      ) VALUES (
        NEW.id,
        NEW.contact_id,
        NEW.business_name,
        public.generate_invoice_number(),
        NEW.estimated_value_min,
        NEW.estimated_value_max,
        NEW.currency,
        CURRENT_DATE,
        CURRENT_DATE + interval '14 days',
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

CREATE TRIGGER deal_won_create_invoice
  BEFORE UPDATE ON public.deals
  FOR EACH ROW EXECUTE FUNCTION public.handle_deal_won();

-- =========================================================
-- ON PAYMENT INSERT: log event + auto-mark PAID if covered
-- =========================================================
CREATE OR REPLACE FUNCTION public.handle_payment_received()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv public.invoices%ROWTYPE;
  total_paid numeric;
  mid_amount numeric;
BEGIN
  INSERT INTO public.payment_events (invoice_id, event_type, details)
  VALUES (NEW.invoice_id, 'payment_received',
          'Payment of ' || NEW.amount_received::text || ' received via ' || NEW.method::text);

  SELECT * INTO inv FROM public.invoices WHERE id = NEW.invoice_id;
  IF NOT FOUND THEN RETURN NEW; END IF;

  SELECT COALESCE(SUM(amount_received), 0) INTO total_paid
    FROM public.payments WHERE invoice_id = NEW.invoice_id;

  mid_amount := (COALESCE(inv.amount_min,0) + COALESCE(inv.amount_max,0)) / 2.0;

  IF mid_amount > 0 AND total_paid >= mid_amount AND inv.status <> 'PAID' THEN
    UPDATE public.invoices SET status = 'PAID' WHERE id = NEW.invoice_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER payment_received_after_insert
  AFTER INSERT ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.handle_payment_received();

-- =========================================================
-- MARK OVERDUE INVOICES (called by chasing engine)
-- =========================================================
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
   WHERE status = 'SENT'
     AND due_date < CURRENT_DATE;
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;

-- =========================================================
-- TARGET vs ACTUAL ENGINE
-- =========================================================
CREATE OR REPLACE FUNCTION public.finance_target_vs_actual(
  _business_name text DEFAULT NULL,
  _month date DEFAULT date_trunc('month', CURRENT_DATE)::date
)
RETURNS TABLE (
  business_name text,
  monthly_target numeric,
  pipeline_target numeric,
  pipeline_value numeric,
  closed_value numeric,
  collected_value numeric,
  outstanding_value numeric,
  overdue_value numeric,
  progress_pct numeric
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
    SELECT DISTINCT b
    FROM (
      SELECT business_name AS b FROM public.deals
      UNION
      SELECT business_name FROM public.invoices
      UNION
      SELECT business_name FROM public.revenue_targets
    ) s
    WHERE _business_name IS NULL OR s.b = _business_name
  ),
  target AS (
    SELECT rt.business_name, rt.monthly_target, rt.pipeline_target
      FROM public.revenue_targets rt
     WHERE rt.month = month_start
  ),
  pipeline AS (
    SELECT d.business_name,
           COALESCE(SUM((d.estimated_value_min + d.estimated_value_max) / 2.0), 0) AS pipeline_value
      FROM public.deals d
     WHERE d.status NOT IN ('WON','LOST')
     GROUP BY d.business_name
  ),
  closed AS (
    SELECT d.business_name,
           COALESCE(SUM((d.estimated_value_min + d.estimated_value_max) / 2.0), 0) AS closed_value
      FROM public.deals d
     WHERE d.status = 'WON'
       AND d.won_at >= month_start
       AND d.won_at <= month_end + interval '1 day'
     GROUP BY d.business_name
  ),
  collected AS (
    SELECT i.business_name,
           COALESCE(SUM(p.amount_received), 0) AS collected_value
      FROM public.payments p
      JOIN public.invoices i ON i.id = p.invoice_id
     WHERE p.received_date BETWEEN month_start AND month_end
     GROUP BY i.business_name
  ),
  outstanding AS (
    SELECT i.business_name,
           COALESCE(SUM((i.amount_min + i.amount_max)/2.0), 0) AS outstanding_value,
           COALESCE(SUM(CASE WHEN i.status = 'OVERDUE' THEN (i.amount_min + i.amount_max)/2.0 ELSE 0 END), 0) AS overdue_value
      FROM public.invoices i
     WHERE i.status IN ('SENT','OVERDUE')
     GROUP BY i.business_name
  )
  SELECT
    b.b AS business_name,
    COALESCE(target.monthly_target, 0) AS monthly_target,
    COALESCE(target.pipeline_target, 0) AS pipeline_target,
    COALESCE(pipeline.pipeline_value, 0) AS pipeline_value,
    COALESCE(closed.closed_value, 0) AS closed_value,
    COALESCE(collected.collected_value, 0) AS collected_value,
    COALESCE(outstanding.outstanding_value, 0) AS outstanding_value,
    COALESCE(outstanding.overdue_value, 0) AS overdue_value,
    CASE WHEN COALESCE(target.monthly_target, 0) > 0
         THEN ROUND((COALESCE(collected.collected_value, 0) / target.monthly_target) * 100, 2)
         ELSE 0 END AS progress_pct
  FROM businesses b
  LEFT JOIN target ON target.business_name = b.b
  LEFT JOIN pipeline ON pipeline.business_name = b.b
  LEFT JOIN closed ON closed.business_name = b.b
  LEFT JOIN collected ON collected.business_name = b.b
  LEFT JOIN outstanding ON outstanding.business_name = b.b
  ORDER BY b.b;
END;
$$;

-- =========================================================
-- ENABLE pg_cron + pg_net (idempotent)
-- =========================================================
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;