ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS portfolio_status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS archived_reason text;

UPDATE public.businesses
   SET portfolio_status = 'legacy_prelaunch',
       archived_at = COALESCE(archived_at, now()),
       archived_reason = COALESCE(archived_reason, 'Portfolio reset 2026-10-06: pre-launch record retained read-only for manual review and selective reuse.')
 WHERE portfolio_status = 'active';

ALTER TABLE public.businesses
  ADD CONSTRAINT businesses_portfolio_status_check
  CHECK (portfolio_status IN ('active', 'legacy_prelaunch'));

CREATE INDEX IF NOT EXISTS businesses_portfolio_status_idx ON public.businesses (portfolio_status);

COMMENT ON COLUMN public.businesses.portfolio_status IS 'active = canonical portfolio business shown in active lists/onboarding; legacy_prelaunch = reversible archive (LEGACY / PRE-LAUNCH BUSINESSES), row and all linked records retained.';