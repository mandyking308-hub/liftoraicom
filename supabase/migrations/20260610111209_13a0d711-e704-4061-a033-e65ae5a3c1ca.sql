
-- Extend qtc_payments with business/legal/tax/Stripe placeholder fields
ALTER TABLE public.qtc_payments
  ADD COLUMN IF NOT EXISTS business_name_snapshot text,
  ADD COLUMN IF NOT EXISTS brand_name text,
  ADD COLUMN IF NOT EXISTS website_url text,
  ADD COLUMN IF NOT EXISTS product_id uuid,
  ADD COLUMN IF NOT EXISTS offer_id uuid,
  ADD COLUMN IF NOT EXISTS saleable_asset_group text,
  ADD COLUMN IF NOT EXISTS legal_entity text DEFAULT 'GSM_LLC',
  ADD COLUMN IF NOT EXISTS legal_entity_jurisdiction text DEFAULT 'Delaware, USA',
  ADD COLUMN IF NOT EXISTS revenue_owner_entity text DEFAULT 'GSM_LLC',
  ADD COLUMN IF NOT EXISTS payout_account_status text DEFAULT 'not_configured',
  ADD COLUMN IF NOT EXISTS temporary_payout_account_used boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS temporary_payout_reason text,
  ADD COLUMN IF NOT EXISTS transfer_required_to_primary_account boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_product_id text,
  ADD COLUMN IF NOT EXISTS stripe_price_id text,
  ADD COLUMN IF NOT EXISTS stripe_checkout_session_id text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS stripe_invoice_id text,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text,
  ADD COLUMN IF NOT EXISTS stripe_event_id text,
  ADD COLUMN IF NOT EXISTS gross_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stripe_fee_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS net_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS refund_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS refunded_at timestamptz,
  ADD COLUMN IF NOT EXISTS customer_country text,
  ADD COLUMN IF NOT EXISTS customer_state_region text,
  ADD COLUMN IF NOT EXISTS customer_tax_id text,
  ADD COLUMN IF NOT EXISTS tax_type text,
  ADD COLUMN IF NOT EXISTS tax_rate numeric,
  ADD COLUMN IF NOT EXISTS tax_jurisdiction text,
  ADD COLUMN IF NOT EXISTS tax_reporting_period text,
  ADD COLUMN IF NOT EXISTS tax_collected numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_remittance_status text DEFAULT 'not_remitted',
  ADD COLUMN IF NOT EXISTS is_test_data boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS founder_approval_required boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS founder_approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS confirmation_source text,
  ADD COLUMN IF NOT EXISTS metadata_json jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS sale_ready boolean DEFAULT false;

-- Extend qtc_invoices
ALTER TABLE public.qtc_invoices
  ADD COLUMN IF NOT EXISTS business_name_snapshot text,
  ADD COLUMN IF NOT EXISTS brand_name text,
  ADD COLUMN IF NOT EXISTS website_url text,
  ADD COLUMN IF NOT EXISTS product_id uuid,
  ADD COLUMN IF NOT EXISTS offer_id uuid,
  ADD COLUMN IF NOT EXISTS saleable_asset_group text,
  ADD COLUMN IF NOT EXISTS legal_entity text DEFAULT 'GSM_LLC',
  ADD COLUMN IF NOT EXISTS legal_entity_jurisdiction text DEFAULT 'Delaware, USA',
  ADD COLUMN IF NOT EXISTS revenue_owner_entity text DEFAULT 'GSM_LLC',
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_invoice_id text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS gross_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS net_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS customer_country text,
  ADD COLUMN IF NOT EXISTS customer_state_region text,
  ADD COLUMN IF NOT EXISTS customer_tax_id text,
  ADD COLUMN IF NOT EXISTS tax_type text,
  ADD COLUMN IF NOT EXISTS tax_rate numeric,
  ADD COLUMN IF NOT EXISTS tax_jurisdiction text,
  ADD COLUMN IF NOT EXISTS is_test_data boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS metadata_json jsonb DEFAULT '{}'::jsonb;

-- Extend qtc_revenue_confirmations
ALTER TABLE public.qtc_revenue_confirmations
  ADD COLUMN IF NOT EXISTS business_name_snapshot text,
  ADD COLUMN IF NOT EXISTS brand_name text,
  ADD COLUMN IF NOT EXISTS saleable_asset_group text,
  ADD COLUMN IF NOT EXISTS legal_entity text DEFAULT 'GSM_LLC',
  ADD COLUMN IF NOT EXISTS revenue_owner_entity text DEFAULT 'GSM_LLC',
  ADD COLUMN IF NOT EXISTS sale_ready boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_test_data boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS metadata_json jsonb DEFAULT '{}'::jsonb;

-- Extend qtc_quotes (brand snapshots only — quote already has product_id/offer_id)
ALTER TABLE public.qtc_quotes
  ADD COLUMN IF NOT EXISTS business_name_snapshot text,
  ADD COLUMN IF NOT EXISTS brand_name text,
  ADD COLUMN IF NOT EXISTS legal_entity text DEFAULT 'GSM_LLC',
  ADD COLUMN IF NOT EXISTS saleable_asset_group text;

-- Trigger: snapshot + compute net + sale-ready on qtc_payments
CREATE OR REPLACE FUNCTION public.qtc_payments_normalise()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Snapshot business name from businesses table if missing
  IF NEW.business_name_snapshot IS NULL AND NEW.business_id IS NOT NULL THEN
    SELECT name INTO NEW.business_name_snapshot FROM public.businesses WHERE id = NEW.business_id;
  END IF;

  -- Default legal entity to GSM_LLC if missing
  IF NEW.legal_entity IS NULL THEN
    NEW.legal_entity := 'GSM_LLC';
  END IF;
  IF NEW.revenue_owner_entity IS NULL THEN
    NEW.revenue_owner_entity := NEW.legal_entity;
  END IF;

  -- Gross defaults to legacy amount when not set
  IF (NEW.gross_amount IS NULL OR NEW.gross_amount = 0) AND NEW.amount IS NOT NULL THEN
    NEW.gross_amount := NEW.amount;
  END IF;

  -- Net = gross - tax - fees
  NEW.net_amount := COALESCE(NEW.gross_amount,0) - COALESCE(NEW.tax_amount,0) - COALESCE(NEW.stripe_fee_amount,0);

  -- is_test_data legacy support
  IF NEW.is_test_data IS NULL THEN
    NEW.is_test_data := COALESCE((NEW.audit_metadata->>'test_label') = 'LIVE_INTERNAL_TEST', false);
  END IF;

  -- Sale-ready: must have business_id, legal_entity, succeeded payment, not test, not temporary payout, not pending transfer
  NEW.sale_ready := (
    NEW.business_id IS NOT NULL
    AND NEW.legal_entity IS NOT NULL
    AND NEW.payment_status = 'succeeded'
    AND COALESCE(NEW.is_test_data, false) = false
    AND COALESCE(NEW.temporary_payout_account_used, false) = false
    AND COALESCE(NEW.transfer_required_to_primary_account, false) = false
  );

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_qtc_payments_normalise ON public.qtc_payments;
CREATE TRIGGER trg_qtc_payments_normalise
  BEFORE INSERT OR UPDATE ON public.qtc_payments
  FOR EACH ROW EXECUTE FUNCTION public.qtc_payments_normalise();

-- Update qtc_on_payment_succeeded to propagate snapshots + sale_ready, exclude test rows
CREATE OR REPLACE FUNCTION public.qtc_on_payment_succeeded()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  test_flag boolean := COALESCE(NEW.is_test_data, (NEW.audit_metadata->>'test_label') = 'LIVE_INTERNAL_TEST', false);
BEGIN
  IF NEW.payment_status = 'succeeded' AND (OLD.payment_status IS DISTINCT FROM 'succeeded') AND test_flag = false THEN
    INSERT INTO public.qtc_revenue_confirmations (
      business_id, contact_id, deal_id, invoice_id, payment_id,
      revenue_amount, currency, revenue_type, confirmation_source,
      business_name_snapshot, brand_name, saleable_asset_group, legal_entity, revenue_owner_entity,
      sale_ready, is_test_data
    )
    VALUES (
      NEW.business_id, NEW.contact_id, NEW.deal_id, NEW.invoice_id, NEW.id,
      COALESCE(NEW.net_amount, NEW.amount), NEW.currency, 'one_time', 'payment_provider',
      NEW.business_name_snapshot, NEW.brand_name, NEW.saleable_asset_group, NEW.legal_entity, NEW.revenue_owner_entity,
      COALESCE(NEW.sale_ready, false), false
    );
    NEW.confirmed_revenue := true;
    IF NEW.invoice_id IS NOT NULL THEN
      UPDATE public.qtc_invoices SET invoice_status = 'paid', paid_at = now() WHERE id = NEW.invoice_id;
    END IF;
  END IF;
  RETURN NEW;
END $$;

-- Ensure normalise runs before succeeded trigger (alphabetical: trg_qtc_payment_succeeded < trg_qtc_payments_normalise)
-- Re-create succeeded trigger so it fires AFTER normalise. Postgres fires BEFORE triggers alphabetically;
-- normalise(_p) > payment_succeeded, so rename succeeded trigger.
DROP TRIGGER IF EXISTS trg_qtc_payment_succeeded ON public.qtc_payments;
CREATE TRIGGER trg_qtc_payments_zz_succeeded
  BEFORE UPDATE ON public.qtc_payments
  FOR EACH ROW EXECUTE FUNCTION public.qtc_on_payment_succeeded();

-- Backfill existing rows
UPDATE public.qtc_payments p
SET business_name_snapshot = COALESCE(p.business_name_snapshot, b.name),
    legal_entity = COALESCE(p.legal_entity, 'GSM_LLC'),
    revenue_owner_entity = COALESCE(p.revenue_owner_entity, 'GSM_LLC'),
    gross_amount = COALESCE(NULLIF(p.gross_amount,0), p.amount, 0),
    net_amount = COALESCE(NULLIF(p.gross_amount,0), p.amount, 0) - COALESCE(p.tax_amount,0) - COALESCE(p.stripe_fee_amount,0),
    is_test_data = COALESCE(p.is_test_data, (p.audit_metadata->>'test_label') = 'LIVE_INTERNAL_TEST', false),
    sale_ready = (
      p.business_id IS NOT NULL
      AND p.payment_status = 'succeeded'
      AND COALESCE((p.audit_metadata->>'test_label') = 'LIVE_INTERNAL_TEST', false) = false
    )
FROM public.businesses b
WHERE b.id = p.business_id;

UPDATE public.qtc_invoices i
SET business_name_snapshot = COALESCE(i.business_name_snapshot, b.name),
    legal_entity = COALESCE(i.legal_entity, 'GSM_LLC'),
    gross_amount = COALESCE(NULLIF(i.gross_amount,0), i.invoice_amount, 0),
    net_amount = COALESCE(NULLIF(i.gross_amount,0), i.invoice_amount, 0) - COALESCE(i.tax_amount,0)
FROM public.businesses b
WHERE b.id = i.business_id;

UPDATE public.qtc_revenue_confirmations r
SET business_name_snapshot = COALESCE(r.business_name_snapshot, b.name),
    legal_entity = COALESCE(r.legal_entity, 'GSM_LLC'),
    sale_ready = (r.business_id IS NOT NULL)
FROM public.businesses b
WHERE b.id = r.business_id;

-- Readiness view (founder-only via underlying table RLS)
CREATE OR REPLACE VIEW public.qtc_payment_architecture_readiness AS
SELECT
  COUNT(*) FILTER (WHERE business_id IS NULL) AS missing_business_id,
  COUNT(*) FILTER (WHERE legal_entity IS NULL) AS missing_legal_entity,
  COUNT(*) FILTER (WHERE temporary_payout_account_used = true) AS temporary_payout_used,
  COUNT(*) FILTER (WHERE transfer_required_to_primary_account = true) AS pending_transfer,
  COUNT(*) FILTER (WHERE sale_ready = false AND COALESCE(is_test_data,false) = false) AS not_sale_ready,
  COUNT(*) FILTER (WHERE is_test_data = true) AS test_payments,
  COUNT(*) AS total_payments
FROM public.qtc_payments;

GRANT SELECT ON public.qtc_payment_architecture_readiness TO authenticated;
