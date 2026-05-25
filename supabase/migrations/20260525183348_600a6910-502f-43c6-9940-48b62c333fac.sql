-- 1. Extend close action rows with engine fields
ALTER TABLE public.customer_sales_close_actions
  ADD COLUMN IF NOT EXISTS recommended_reason TEXT,
  ADD COLUMN IF NOT EXISTS confidence NUMERIC,
  ADD COLUMN IF NOT EXISTS missing_info JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS risk_flags JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS founder_approval_item_id UUID,
  ADD COLUMN IF NOT EXISTS assigned_human_user_id UUID,
  ADD COLUMN IF NOT EXISTS requested_changes TEXT,
  ADD COLUMN IF NOT EXISTS last_decision_reason TEXT,
  ADD COLUMN IF NOT EXISTS estimated_pipeline_value NUMERIC,
  ADD COLUMN IF NOT EXISTS confirmed_revenue_value NUMERIC,
  ADD COLUMN IF NOT EXISTS verified_event_type TEXT,
  ADD COLUMN IF NOT EXISTS verified_event_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS test_label TEXT;

CREATE INDEX IF NOT EXISTS idx_csca_approval_status ON public.customer_sales_close_actions(approval_status);
CREATE INDEX IF NOT EXISTS idx_csca_type ON public.customer_sales_close_actions(close_action_type);

-- 2. Close-engine provider settings (separate from voice providers)
CREATE TABLE IF NOT EXISTS public.customer_sales_close_provider_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_key TEXT NOT NULL UNIQUE,
  provider_label TEXT NOT NULL,
  provider_category TEXT NOT NULL,
  configured BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT false,
  status_note TEXT,
  next_setup_action TEXT,
  pre_approved_rule_allowed BOOLEAN NOT NULL DEFAULT false,
  last_checked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.customer_sales_close_provider_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "founders_admins_all_cs_close_provider_settings" ON public.customer_sales_close_provider_settings;
CREATE POLICY "founders_admins_all_cs_close_provider_settings"
  ON public.customer_sales_close_provider_settings
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'founder'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'founder'::app_role));

DROP TRIGGER IF EXISTS trg_cs_close_provider_settings_updated_at ON public.customer_sales_close_provider_settings;
CREATE TRIGGER trg_cs_close_provider_settings_updated_at
  BEFORE UPDATE ON public.customer_sales_close_provider_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.customer_sales_close_provider_settings (provider_key, provider_label, provider_category, next_setup_action)
VALUES
  ('stripe',           'Stripe (payment links + subscriptions)', 'payment',   'Add STRIPE_SECRET_KEY server-side and choose default currency'),
  ('invoice_provider', 'Invoicing provider',                     'invoice',   'Select Stripe Invoicing, Xero, QuickBooks or custom'),
  ('docusign',         'DocuSign / Dropbox Sign',                'contract',  'Add provider credentials and template IDs'),
  ('calendar',         'Calendly / Google Calendar',             'booking',   'Connect a calendar account and choose default event type'),
  ('email_followup',   'Email follow-up (Smartlead / native)',   'messaging', 'Reuse outbound provider once activated')
ON CONFLICT (provider_key) DO NOTHING;