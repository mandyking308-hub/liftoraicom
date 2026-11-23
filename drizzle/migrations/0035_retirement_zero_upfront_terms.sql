ALTER TABLE public.retirement_acquisition_candidates
  ADD COLUMN IF NOT EXISTS upfront_cash_required numeric NULL,
  ADD COLUMN IF NOT EXISTS seller_finance_percent numeric NULL,
  ADD COLUMN IF NOT EXISTS zero_upfront_status text NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS zero_upfront_evidence text NULL,
  ADD COLUMN IF NOT EXISTS zero_upfront_evidence_url text NULL,
  ADD COLUMN IF NOT EXISTS terms_confirmed_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS seller_contact_status text NOT NULL DEFAULT 'not_contacted',
  ADD COLUMN IF NOT EXISTS outstanding_costs text[] NOT NULL DEFAULT ARRAY['legal fees','accountancy fees','working capital','inventory/stock','taxes (incl. SDLT/VAT)','pension liabilities','employee liabilities (TUPE)','personal guarantee / security risk'];

UPDATE public.retirement_acquisition_candidates
SET zero_upfront_status = 'cash_required',
    zero_upfront_evidence = 'Listing: 100% seller finance is not available; buyers should demonstrate an appropriate deposit. Stored note: ' || coalesce(seller_finance_evidence,''),
    zero_upfront_evidence_url = coalesce(evidence_url, source_url),
    deposit_required = 'yes'
WHERE id = 'e86abeca-4969-464f-986e-e1883e9a728d';

UPDATE public.retirement_acquisition_candidates
SET zero_upfront_status = 'cash_required',
    seller_finance_percent = 50,
    zero_upfront_evidence = 'Listing: up to 50% seller funding considered — the remaining balance is not covered on published terms. Stored note: ' || coalesce(seller_finance_evidence,''),
    zero_upfront_evidence_url = coalesce(evidence_url, source_url)
WHERE id = '97fe56b3-65e0-4b3e-8598-0cc90212a3d1';

ALTER TABLE public.retirement_acquisition_candidates
  ADD CONSTRAINT ret_zero_upfront_status_chk CHECK (zero_upfront_status IN ('confirmed_zero','negotiation_candidate','cash_required','unknown')),
  ADD CONSTRAINT ret_seller_contact_status_chk CHECK (seller_contact_status IN ('not_contacted','draft_prepared','founder_approved','contacted','responded')),
  ADD CONSTRAINT ret_seller_finance_percent_chk CHECK (seller_finance_percent IS NULL OR (seller_finance_percent >= 0 AND seller_finance_percent <= 100)),
  ADD CONSTRAINT ret_upfront_cash_chk CHECK (upfront_cash_required IS NULL OR upfront_cash_required >= 0),
  ADD CONSTRAINT ret_confirmed_zero_proof_chk CHECK (
    zero_upfront_status <> 'confirmed_zero' OR (
      upfront_cash_required = 0 AND seller_finance_percent = 100
      AND length(btrim(coalesce(zero_upfront_evidence,''))) > 0
      AND zero_upfront_evidence_url ~ '^https?://'
      AND terms_confirmed_at IS NOT NULL));

COMMENT ON COLUMN public.retirement_acquisition_candidates.upfront_cash_required IS 'Purchase consideration payable at completion. NULL = unknown, never zero.';