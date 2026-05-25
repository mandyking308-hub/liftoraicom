
ALTER TABLE public.customer_sales_products
  ADD COLUMN IF NOT EXISTS faqs JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS do_not_say TEXT[],
  ADD COLUMN IF NOT EXISTS escalation_rules TEXT;
