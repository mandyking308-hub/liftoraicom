-- Stage 1 state-integrity fix: internal proposals must not claim "sent" when no
-- provider transmission occurs. Additive only; no existing row is modified.
ALTER TYPE public.internal_proposal_status ADD VALUE IF NOT EXISTS 'prepared';

ALTER TABLE public.internal_proposals
  ADD COLUMN IF NOT EXISTS prepared_at TIMESTAMPTZ;