
-- =========================================================
-- Feature Flags + System Configuration Registry
-- =========================================================

CREATE TABLE IF NOT EXISTS public.feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_key TEXT NOT NULL UNIQUE,
  flag_name TEXT NOT NULL,
  flag_category TEXT NOT NULL DEFAULT 'module',
  description TEXT,
  default_value BOOLEAN NOT NULL DEFAULT false,
  current_value BOOLEAN NOT NULL DEFAULT false,
  external_action_risk BOOLEAN NOT NULL DEFAULT false,
  requires_founder_approval BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  audit_metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.feature_flags TO authenticated;
GRANT ALL ON public.feature_flags TO service_role;
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders view feature flags" ON public.feature_flags
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'));
CREATE POLICY "Founders manage feature flags" ON public.feature_flags
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'));

CREATE TRIGGER trg_feature_flags_updated
  BEFORE UPDATE ON public.feature_flags
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.business_feature_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID,
  flag_id UUID NOT NULL REFERENCES public.feature_flags(id) ON DELETE CASCADE,
  override_value BOOLEAN NOT NULL,
  override_reason TEXT,
  founder_approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  audit_metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_feature_overrides TO authenticated;
GRANT ALL ON public.business_feature_overrides TO service_role;
ALTER TABLE public.business_feature_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders view business overrides" ON public.business_feature_overrides
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'));
CREATE POLICY "Founders manage business overrides" ON public.business_feature_overrides
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'));

CREATE INDEX IF NOT EXISTS idx_bus_overrides_flag ON public.business_feature_overrides(flag_id);
CREATE INDEX IF NOT EXISTS idx_bus_overrides_biz ON public.business_feature_overrides(business_id);

CREATE TRIGGER trg_business_overrides_updated
  BEFORE UPDATE ON public.business_feature_overrides
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.system_configuration_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key TEXT NOT NULL UNIQUE,
  config_name TEXT NOT NULL,
  config_category TEXT NOT NULL DEFAULT 'other',
  config_value JSONB NOT NULL DEFAULT '{}'::jsonb,
  sensitivity_level TEXT NOT NULL DEFAULT 'low',
  founder_approval_required BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.system_configuration_values TO authenticated;
GRANT ALL ON public.system_configuration_values TO service_role;
ALTER TABLE public.system_configuration_values ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders view system config" ON public.system_configuration_values
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'));
CREATE POLICY "Founders manage system config" ON public.system_configuration_values
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'));

CREATE TRIGGER trg_system_config_updated
  BEFORE UPDATE ON public.system_configuration_values
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.configuration_audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_type TEXT NOT NULL,
  config_key TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB,
  changed_by UUID,
  change_reason TEXT,
  approval_item_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  audit_metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.configuration_audit_events TO authenticated;
GRANT ALL ON public.configuration_audit_events TO service_role;
ALTER TABLE public.configuration_audit_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders view config audit" ON public.configuration_audit_events
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'));
CREATE POLICY "Founders write config audit" ON public.configuration_audit_events
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'));

CREATE INDEX IF NOT EXISTS idx_cfg_audit_key ON public.configuration_audit_events(config_key);
CREATE INDEX IF NOT EXISTS idx_cfg_audit_created ON public.configuration_audit_events(created_at DESC);

-- ---------------------------------------------------------
-- Trigger: auto-audit on feature_flags + business_feature_overrides + system_configuration_values
-- ---------------------------------------------------------

CREATE OR REPLACE FUNCTION public.log_feature_flag_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.current_value IS DISTINCT FROM NEW.current_value THEN
    INSERT INTO public.configuration_audit_events(config_type, config_key, old_value, new_value, changed_by, change_reason, audit_metadata)
    VALUES ('feature_flag', NEW.flag_key, to_jsonb(OLD.current_value), to_jsonb(NEW.current_value), auth.uid(), 'value changed',
            jsonb_build_object('flag_id', NEW.id, 'external_action_risk', NEW.external_action_risk, 'requires_founder_approval', NEW.requires_founder_approval));
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_log_feature_flag_change ON public.feature_flags;
CREATE TRIGGER trg_log_feature_flag_change
  AFTER UPDATE ON public.feature_flags
  FOR EACH ROW EXECUTE FUNCTION public.log_feature_flag_change();

CREATE OR REPLACE FUNCTION public.log_business_override_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE k TEXT;
BEGIN
  SELECT flag_key INTO k FROM public.feature_flags WHERE id = COALESCE(NEW.flag_id, OLD.flag_id);
  INSERT INTO public.configuration_audit_events(config_type, config_key, old_value, new_value, changed_by, change_reason, audit_metadata)
  VALUES ('business_override', COALESCE(k, 'unknown'),
          CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD.override_value) END,
          CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW.override_value) END,
          auth.uid(),
          TG_OP,
          jsonb_build_object('business_id', COALESCE(NEW.business_id, OLD.business_id), 'flag_id', COALESCE(NEW.flag_id, OLD.flag_id)));
  RETURN COALESCE(NEW, OLD);
END $$;

DROP TRIGGER IF EXISTS trg_log_business_override_change ON public.business_feature_overrides;
CREATE TRIGGER trg_log_business_override_change
  AFTER INSERT OR UPDATE OR DELETE ON public.business_feature_overrides
  FOR EACH ROW EXECUTE FUNCTION public.log_business_override_change();

CREATE OR REPLACE FUNCTION public.log_system_config_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.config_value IS DISTINCT FROM NEW.config_value THEN
    INSERT INTO public.configuration_audit_events(config_type, config_key, old_value, new_value, changed_by, change_reason, audit_metadata)
    VALUES ('system_value', NEW.config_key, OLD.config_value, NEW.config_value, auth.uid(), 'value changed',
            jsonb_build_object('sensitivity_level', NEW.sensitivity_level));
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_log_system_config_change ON public.system_configuration_values;
CREATE TRIGGER trg_log_system_config_change
  AFTER UPDATE ON public.system_configuration_values
  FOR EACH ROW EXECUTE FUNCTION public.log_system_config_change();

-- ---------------------------------------------------------
-- Seed flags
-- ---------------------------------------------------------

INSERT INTO public.feature_flags (flag_key, flag_name, flag_category, description, default_value, current_value, external_action_risk, requires_founder_approval)
VALUES
 ('customer_sales_engine_enabled',   'Customer Sales Engine',          'module', 'Internal customer sales engine module.',         true,  true,  false, false),
 ('marketplace_engine_enabled',      'Marketplace Engine',             'module', 'Internal marketplace engine module.',            true,  true,  false, false),
 ('quote_to_cash_enabled',           'Quote-to-Cash',                  'module', 'Internal quote-to-cash workflow.',               true,  true,  false, false),
 ('delivery_engine_enabled',         'Delivery Engine',                'module', 'Internal delivery engine.',                      true,  true,  false, false),
 ('support_sla_enabled',             'Support SLA Engine',             'module', 'Internal support SLA tracking.',                 true,  true,  false, false),
 ('portfolio_diversity_enabled',     'Portfolio Diversity Health',     'module', 'Portfolio diversity scoring.',                   true,  true,  false, false),
 ('control_fabric_enabled',          'Control Fabric',                 'module', 'Cross-module control fabric.',                   true,  true,  false, false),
 ('ai_eval_engine_enabled',          'AI Eval Engine',                 'module', 'AI evaluation and benchmark engine.',            true,  true,  false, false),

 ('external_email_send_enabled',     'External Email Send',            'external_action', 'Allow outbound email send.',             false, false, true,  true),
 ('smartlead_campaign_start_enabled','Smartlead Campaign Start',       'external_action', 'Start Smartlead outbound campaigns.',    false, false, true,  true),
 ('social_publish_enabled',          'Social Publish',                 'external_action', 'Publish to external social channels.',   false, false, true,  true),
 ('customer_voice_call_enabled',     'Customer Voice Call',            'external_action', 'Place customer voice calls.',            false, false, true,  true),
 ('outbound_voice_call_enabled',     'Outbound Voice Call',            'external_action', 'Place outbound voice calls.',            false, false, true,  true),
 ('payment_link_send_enabled',       'Payment Link Send',              'external_action', 'Send payment links to customers.',       false, false, true,  true),
 ('invoice_send_enabled',            'Invoice Send',                   'external_action', 'Send invoices to customers.',            false, false, true,  true),
 ('contract_send_enabled',           'Contract Send',                  'external_action', 'Send contracts for e-signature.',        false, false, true,  true),
 ('portal_invites_enabled',          'Portal Invites',                 'external_action', 'Send portal invites to external users.', false, false, true,  true),
 ('data_room_share_enabled',         'Data Room Share',                'external_action', 'Share data room links externally.',      false, false, true,  true),
 ('seller_invite_send_enabled',      'Seller Invite Send',             'external_action', 'Send seller onboarding invites.',        false, false, true,  true),
 ('payout_processing_enabled',       'Payout Processing',              'external_action', 'Process payouts via providers.',         false, false, true,  true),
 ('refund_processing_enabled',       'Refund Processing',              'external_action', 'Process refunds via providers.',         false, false, true,  true),
 ('public_listing_publish_enabled',  'Public Listing Publish',         'external_action', 'Publish marketplace listings publicly.', false, false, true,  true),
 ('paid_api_activation_enabled',     'Paid API Activation',            'provider',        'Activate paid third-party APIs.',        false, false, true,  true)
ON CONFLICT (flag_key) DO NOTHING;
