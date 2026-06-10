
-- Idempotency / verified event log
CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id text NOT NULL UNIQUE,
  event_type text NOT NULL,
  livemode boolean NOT NULL DEFAULT false,
  api_version text,
  related_business_id uuid,
  related_payment_id uuid,
  related_invoice_id uuid,
  payload jsonb NOT NULL,
  processing_status text NOT NULL DEFAULT 'received',
  processing_error text,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);

GRANT SELECT ON public.stripe_webhook_events TO authenticated;
GRANT ALL ON public.stripe_webhook_events TO service_role;
ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "founders read stripe_webhook_events"
ON public.stripe_webhook_events FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'founder'::app_role));

CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_type ON public.stripe_webhook_events(event_type, received_at DESC);

-- Stripe mapping on offers / products
ALTER TABLE public.customer_sales_offers
  ADD COLUMN IF NOT EXISTS stripe_product_id text,
  ADD COLUMN IF NOT EXISTS stripe_price_id text,
  ADD COLUMN IF NOT EXISTS stripe_price_recurrence text;

ALTER TABLE public.customer_sales_products
  ADD COLUMN IF NOT EXISTS stripe_product_id text,
  ADD COLUMN IF NOT EXISTS stripe_price_id text,
  ADD COLUMN IF NOT EXISTS stripe_price_recurrence text;

-- Surface confirmation source on payments (manual vs stripe-verified)
ALTER TABLE public.qtc_payments
  ADD COLUMN IF NOT EXISTS stripe_test_mode boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS webhook_confirmation_source text;

-- Surface confirmation source on revenue rows
ALTER TABLE public.qtc_revenue_confirmations
  ADD COLUMN IF NOT EXISTS stripe_event_id text,
  ADD COLUMN IF NOT EXISTS stripe_verified boolean DEFAULT false;
