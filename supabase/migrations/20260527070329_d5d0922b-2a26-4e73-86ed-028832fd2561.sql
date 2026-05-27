
-- =========================================================
-- Collections / Dunning / Failed Payment Recovery
-- =========================================================

-- Overdue invoices snapshot (mirrors finance/qtc but for dunning workflow)
CREATE TABLE public.collections_overdue_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name TEXT,
  invoice_reference TEXT NOT NULL,
  contact_id UUID,
  customer_label TEXT,
  amount_outstanding NUMERIC(14,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'GBP',
  due_date DATE,
  days_overdue INTEGER NOT NULL DEFAULT 0,
  risk_tier TEXT NOT NULL DEFAULT 'low',          -- low|medium|high|critical
  collection_status TEXT NOT NULL DEFAULT 'open', -- open|in_recovery|paused|recovered|written_off
  founder_review_required BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  is_test_data BOOLEAN NOT NULL DEFAULT false,
  trace_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.collections_failed_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name TEXT,
  invoice_reference TEXT,
  contact_id UUID,
  amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'GBP',
  provider TEXT,                                     -- stripe|paddle|bank|other
  failure_code TEXT,
  failure_reason TEXT,
  attempt_count INTEGER NOT NULL DEFAULT 1,
  last_attempt_at TIMESTAMPTZ,
  retry_recommendation TEXT NOT NULL DEFAULT 'founder_review', -- retry_now|retry_scheduled|founder_review|abandon
  recovery_status TEXT NOT NULL DEFAULT 'open',     -- open|scheduled|recovered|abandoned
  requires_external_action BOOLEAN NOT NULL DEFAULT true,
  approved_to_retry BOOLEAN NOT NULL DEFAULT false,
  is_test_data BOOLEAN NOT NULL DEFAULT false,
  trace_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.collections_recovery_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name TEXT,
  invoice_reference TEXT,
  overdue_invoice_id UUID REFERENCES public.collections_overdue_invoices(id) ON DELETE SET NULL,
  failed_payment_id UUID REFERENCES public.collections_failed_payments(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,                       -- reminder|retry_payment|payment_plan|founder_review|service_hold|write_off|escalate_legal
  action_status TEXT NOT NULL DEFAULT 'recommended', -- recommended|approved|executed|cancelled|blocked
  requires_approval BOOLEAN NOT NULL DEFAULT true,
  requires_external_action BOOLEAN NOT NULL DEFAULT false,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  executed_at TIMESTAMPTZ,
  rationale TEXT,
  is_test_data BOOLEAN NOT NULL DEFAULT false,
  trace_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.collections_reminder_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name TEXT,
  invoice_reference TEXT,
  overdue_invoice_id UUID REFERENCES public.collections_overdue_invoices(id) ON DELETE SET NULL,
  contact_id UUID,
  channel TEXT NOT NULL DEFAULT 'email',           -- email|sms|portal|letter
  tone TEXT NOT NULL DEFAULT 'polite',             -- polite|firm|final
  draft_subject TEXT,
  draft_body TEXT NOT NULL,
  approval_status TEXT NOT NULL DEFAULT 'pending', -- pending|approved|sent|rejected
  requires_external_send BOOLEAN NOT NULL DEFAULT true,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  is_test_data BOOLEAN NOT NULL DEFAULT false,
  trace_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.collections_payment_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name TEXT,
  invoice_reference TEXT,
  overdue_invoice_id UUID REFERENCES public.collections_overdue_invoices(id) ON DELETE SET NULL,
  contact_id UUID,
  total_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'GBP',
  instalment_count INTEGER NOT NULL DEFAULT 3,
  cadence TEXT NOT NULL DEFAULT 'monthly',         -- weekly|biweekly|monthly
  first_instalment_date DATE,
  plan_status TEXT NOT NULL DEFAULT 'proposed',    -- proposed|approved|active|completed|cancelled|defaulted
  requires_approval BOOLEAN NOT NULL DEFAULT true,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  notes TEXT,
  is_test_data BOOLEAN NOT NULL DEFAULT false,
  trace_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.collections_service_hold_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name TEXT,
  contact_id UUID,
  customer_label TEXT,
  hold_scope TEXT NOT NULL DEFAULT 'service',      -- service|account|integration|full
  justification TEXT NOT NULL,
  risk_score INTEGER NOT NULL DEFAULT 0,
  hold_status TEXT NOT NULL DEFAULT 'recommended', -- recommended|approved|executed|rejected|reversed
  founder_decision TEXT,                           -- approve|reject|defer
  founder_decision_at TIMESTAMPTZ,
  executed BOOLEAN NOT NULL DEFAULT false,
  is_test_data BOOLEAN NOT NULL DEFAULT false,
  trace_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.collections_writeoff_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name TEXT,
  invoice_reference TEXT,
  overdue_invoice_id UUID REFERENCES public.collections_overdue_invoices(id) ON DELETE SET NULL,
  amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'GBP',
  recommendation TEXT NOT NULL DEFAULT 'write_off', -- write_off|continue_recovery|legal_referral
  reason TEXT,
  founder_decision TEXT,                            -- approve|reject|defer
  founder_decision_at TIMESTAMPTZ,
  applied BOOLEAN NOT NULL DEFAULT false,
  is_test_data BOOLEAN NOT NULL DEFAULT false,
  trace_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===== GRANTS =====
GRANT SELECT, INSERT, UPDATE, DELETE ON public.collections_overdue_invoices TO authenticated;
GRANT ALL ON public.collections_overdue_invoices TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.collections_failed_payments TO authenticated;
GRANT ALL ON public.collections_failed_payments TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.collections_recovery_actions TO authenticated;
GRANT ALL ON public.collections_recovery_actions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.collections_reminder_drafts TO authenticated;
GRANT ALL ON public.collections_reminder_drafts TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.collections_payment_plans TO authenticated;
GRANT ALL ON public.collections_payment_plans TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.collections_service_hold_recommendations TO authenticated;
GRANT ALL ON public.collections_service_hold_recommendations TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.collections_writeoff_decisions TO authenticated;
GRANT ALL ON public.collections_writeoff_decisions TO service_role;

-- ===== RLS =====
ALTER TABLE public.collections_overdue_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections_failed_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections_recovery_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections_reminder_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections_payment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections_service_hold_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections_writeoff_decisions ENABLE ROW LEVEL SECURITY;

-- Policies: founder/admin via has_role()
DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'collections_overdue_invoices',
    'collections_failed_payments',
    'collections_recovery_actions',
    'collections_reminder_drafts',
    'collections_payment_plans',
    'collections_service_hold_recommendations',
    'collections_writeoff_decisions'
  ]) LOOP
    EXECUTE format($f$
      CREATE POLICY "Founders manage %1$I"
      ON public.%1$I
      FOR ALL
      TO authenticated
      USING (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'))
      WITH CHECK (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'));
    $f$, t);
  END LOOP;
END $$;

-- updated_at triggers (reuse existing function)
DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'collections_overdue_invoices',
    'collections_failed_payments',
    'collections_recovery_actions',
    'collections_reminder_drafts',
    'collections_payment_plans',
    'collections_service_hold_recommendations',
    'collections_writeoff_decisions'
  ]) LOOP
    EXECUTE format('CREATE TRIGGER trg_%1$I_updated_at BEFORE UPDATE ON public.%1$I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();', t);
  END LOOP;
END $$;

-- Helpful indexes
CREATE INDEX idx_coi_status ON public.collections_overdue_invoices(collection_status);
CREATE INDEX idx_coi_risk ON public.collections_overdue_invoices(risk_tier);
CREATE INDEX idx_cfp_status ON public.collections_failed_payments(recovery_status);
CREATE INDEX idx_cra_status ON public.collections_recovery_actions(action_status);
CREATE INDEX idx_crd_status ON public.collections_reminder_drafts(approval_status);
