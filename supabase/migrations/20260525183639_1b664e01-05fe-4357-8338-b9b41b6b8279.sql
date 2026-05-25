-- 1. Safety events / audit log
CREATE TABLE IF NOT EXISTS public.customer_sales_safety_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID,
  conversation_id UUID,
  call_log_id UUID,
  close_action_id UUID,
  contact_id UUID,
  event_category TEXT NOT NULL,
  rule_key TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info',
  decision TEXT NOT NULL DEFAULT 'allowed',
  approval_required BOOLEAN NOT NULL DEFAULT false,
  external_side_effect BOOLEAN NOT NULL DEFAULT false,
  reason TEXT,
  data_used JSONB NOT NULL DEFAULT '{}'::jsonb,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_css_events_category ON public.customer_sales_safety_events(event_category);
CREATE INDEX IF NOT EXISTS idx_css_events_severity ON public.customer_sales_safety_events(severity);
CREATE INDEX IF NOT EXISTS idx_css_events_created ON public.customer_sales_safety_events(created_at DESC);

-- 2. Per-contact safety state for outbound eligibility
CREATE TABLE IF NOT EXISTS public.customer_sales_contact_safety (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID UNIQUE,
  lawful_basis TEXT,
  permission_status TEXT NOT NULL DEFAULT 'unknown',
  opt_out BOOLEAN NOT NULL DEFAULT false,
  do_not_call BOOLEAN NOT NULL DEFAULT false,
  on_suppression_list BOOLEAN NOT NULL DEFAULT false,
  suppression_reason TEXT,
  time_zone TEXT,
  allowed_window_start TIME,
  allowed_window_end TIME,
  frequency_cap_per_week INTEGER NOT NULL DEFAULT 3,
  cooldown_hours INTEGER NOT NULL DEFAULT 24,
  last_contacted_at TIMESTAMPTZ,
  vulnerable_flag BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_css_contact_safety_updated_at ON public.customer_sales_contact_safety;
CREATE TRIGGER trg_css_contact_safety_updated_at
  BEFORE UPDATE ON public.customer_sales_contact_safety
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Prohibited claim library
CREATE TABLE IF NOT EXISTS public.customer_sales_prohibited_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_key TEXT NOT NULL UNIQUE,
  claim_label TEXT NOT NULL,
  category TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'high',
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.customer_sales_prohibited_claims (claim_key, claim_label, category, severity, description) VALUES
  ('unapproved_guarantee',     'Unapproved guarantee',           'guarantee',  'high',     'Any guarantee not present in founder-approved product knowledge.'),
  ('fake_scarcity',            'Fake scarcity',                  'pressure',   'high',     'Claims of limited stock / time without verifiable basis.'),
  ('false_discount',           'False discount',                 'pricing',    'high',     'Reference price or % off not backed by approved pricing.'),
  ('unverified_result',        'Unverified result / outcome',    'claims',     'high',     'Statistics, case-study outcomes or testimonials not in approved knowledge.'),
  ('legal_claim',              'Legal claim',                    'regulated',  'critical', 'Legal advice or interpretation requires approval.'),
  ('tax_claim',                'Tax claim',                      'regulated',  'critical', 'Tax advice or interpretation requires approval.'),
  ('medical_claim',            'Medical claim',                  'regulated',  'critical', 'Medical advice / treatment claims require approval.'),
  ('financial_claim',          'Financial / investment claim',   'regulated',  'critical', 'Financial advice or return claims require approval.'),
  ('off_knowledge_statement',  'Off-knowledge statement',        'accuracy',   'high',     'Statement not supported by approved product knowledge.'),
  ('false_transaction_claim',  '"I have sent/charged/booked"',   'integrity',  'critical', 'Stating an external action occurred without verified event.')
ON CONFLICT (claim_key) DO NOTHING;

-- 4. Escalation triggers
CREATE TABLE IF NOT EXISTS public.customer_sales_escalation_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_key TEXT NOT NULL UNIQUE,
  trigger_label TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'high',
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.customer_sales_escalation_triggers (trigger_key, trigger_label, severity, description) VALUES
  ('angry_customer',                  'Angry customer',                          'high',     'Sustained negative sentiment or hostile language.'),
  ('vulnerable_customer',             'Vulnerable customer',                     'critical', 'Health, age, financial distress or capacity concern.'),
  ('legal_finance_compliance_question','Legal / financial / compliance question','critical', 'Customer asks about contract, regulation, tax or compliance.'),
  ('custom_pricing',                  'Custom pricing requested',                'high',     'Discount, package or term outside approved offer.'),
  ('refund_dispute',                  'Refund dispute',                          'high',     'Customer disputes a charge or asks for refund.'),
  ('complaint',                       'Formal complaint',                        'high',     'Customer escalates or threatens escalation.'),
  ('contract_negotiation',            'Contract negotiation',                    'high',     'Customer requests changes to legal terms.'),
  ('high_value_opportunity',          'High-value opportunity',                  'normal',   'Opportunity above founder threshold.'),
  ('customer_asks_for_human',         'Customer asks for a human',               'high',     'Direct request for human handoff.'),
  ('low_agent_confidence',            'Low agent confidence',                    'normal',   'Brain confidence below threshold for current stage.'),
  ('product_knowledge_incomplete',    'Product knowledge incomplete',            'high',     'Completeness below 70 — agent must not close.'),
  ('ready_but_close_not_approved',    'Ready to buy, close path not approved',   'critical', 'Customer is ready, close action awaits founder approval.')
ON CONFLICT (trigger_key) DO NOTHING;

-- 5. Enable RLS + founder/admin policies + updated_at trigger where missing
DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'customer_sales_safety_events',
    'customer_sales_contact_safety',
    'customer_sales_prohibited_claims',
    'customer_sales_escalation_triggers'
  ]) LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "founders_admins_all_%s" ON public.%I', t, t);
    EXECUTE format($p$CREATE POLICY "founders_admins_all_%s" ON public.%I FOR ALL TO authenticated USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'founder'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'founder'::app_role))$p$, t, t);
  END LOOP;
END $$;

-- 6. Convenience flags on conversations + close actions for consent tracking
ALTER TABLE public.customer_sales_conversations
  ADD COLUMN IF NOT EXISTS recording_notice_required BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS recording_notice_given BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS transcript_notice_given BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS customer_consented BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS consent_timestamp TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS consent_text_used TEXT,
  ADD COLUMN IF NOT EXISTS jurisdiction TEXT,
  ADD COLUMN IF NOT EXISTS provider_recording_status TEXT,
  ADD COLUMN IF NOT EXISTS prohibited_claim_warnings JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS escalation_triggered JSONB NOT NULL DEFAULT '[]'::jsonb;