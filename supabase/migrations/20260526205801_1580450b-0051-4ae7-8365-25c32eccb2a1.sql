
-- ENUMS
DO $$ BEGIN CREATE TYPE public.recon_source_type AS ENUM ('bank','stripe','paypal','invoice','manual','marketplace_payout','refund','chargeback','other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.recon_status AS ENUM ('unmatched','suggested_match','matched','disputed','ignored','needs_review'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.recon_match_status AS ENUM ('suggested','approved','rejected','confirmed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.recon_payout_status AS ENUM ('draft','approval_required','approved','scheduled','paid','failed','disputed','cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.recon_exception_type AS ENUM ('unmatched_payment','duplicate_payment','refund_mismatch','chargeback','payout_mismatch','currency_mismatch','amount_mismatch','missing_invoice','other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.recon_severity AS ENUM ('low','medium','high','critical'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.recon_exception_status AS ENUM ('open','review_required','resolved','ignored'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 1. reconciliation_records
CREATE TABLE public.reconciliation_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID,
  legal_entity_id UUID,
  source_type public.recon_source_type NOT NULL,
  source_record_id TEXT,
  amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  transaction_date DATE,
  description TEXT,
  reconciliation_status public.recon_status NOT NULL DEFAULT 'unmatched',
  matched_table TEXT,
  matched_record_id UUID,
  confidence_score NUMERIC(5,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  audit_metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reconciliation_records TO authenticated;
GRANT ALL ON public.reconciliation_records TO service_role;
ALTER TABLE public.reconciliation_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders manage reconciliation_records" ON public.reconciliation_records FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder')) WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));

-- 2. payment_reconciliation_matches
CREATE TABLE public.payment_reconciliation_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID,
  payment_id UUID,
  invoice_id UUID,
  bank_record_id UUID,
  payout_record_id UUID,
  match_status public.recon_match_status NOT NULL DEFAULT 'suggested',
  match_confidence NUMERIC(5,2),
  match_reason TEXT,
  founder_approval_required BOOLEAN NOT NULL DEFAULT false,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  audit_metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_reconciliation_matches TO authenticated;
GRANT ALL ON public.payment_reconciliation_matches TO service_role;
ALTER TABLE public.payment_reconciliation_matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders manage payment_reconciliation_matches" ON public.payment_reconciliation_matches FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder')) WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));

-- 3. marketplace_payout_records
CREATE TABLE public.marketplace_payout_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID,
  marketplace_id UUID,
  seller_id UUID,
  payout_period_start DATE,
  payout_period_end DATE,
  gross_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  platform_fee NUMERIC(18,2) NOT NULL DEFAULT 0,
  commission_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  payout_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  payout_status public.recon_payout_status NOT NULL DEFAULT 'draft',
  payout_provider TEXT,
  provider_payout_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  audit_metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketplace_payout_records TO authenticated;
GRANT ALL ON public.marketplace_payout_records TO service_role;
ALTER TABLE public.marketplace_payout_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders manage marketplace_payout_records" ON public.marketplace_payout_records FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder')) WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));

-- 4. reconciliation_exceptions
CREATE TABLE public.reconciliation_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID,
  exception_type public.recon_exception_type NOT NULL,
  severity public.recon_severity NOT NULL DEFAULT 'medium',
  exception_summary TEXT NOT NULL,
  recommended_action TEXT,
  status public.recon_exception_status NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  audit_metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reconciliation_exceptions TO authenticated;
GRANT ALL ON public.reconciliation_exceptions TO service_role;
ALTER TABLE public.reconciliation_exceptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders manage reconciliation_exceptions" ON public.reconciliation_exceptions FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder')) WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));

-- Triggers
CREATE TRIGGER trg_recon_records_updated BEFORE UPDATE ON public.reconciliation_records FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_recon_matches_updated BEFORE UPDATE ON public.payment_reconciliation_matches FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_recon_payouts_updated BEFORE UPDATE ON public.marketplace_payout_records FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_recon_exceptions_updated BEFORE UPDATE ON public.reconciliation_exceptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_recon_records_status ON public.reconciliation_records (reconciliation_status);
CREATE INDEX idx_recon_records_source ON public.reconciliation_records (source_type);
CREATE INDEX idx_recon_matches_status ON public.payment_reconciliation_matches (match_status);
CREATE INDEX idx_recon_payouts_status ON public.marketplace_payout_records (payout_status);
CREATE INDEX idx_recon_exceptions_status ON public.reconciliation_exceptions (status);
CREATE INDEX idx_recon_exceptions_sev ON public.reconciliation_exceptions (severity);
