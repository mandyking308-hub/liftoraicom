
ALTER TABLE public.lead_quality_profiles
  ADD COLUMN IF NOT EXISTS lifecycle_stage text,
  ADD COLUMN IF NOT EXISTS lifecycle_reason text,
  ADD COLUMN IF NOT EXISTS lifecycle_classified_at timestamptz,
  ADD COLUMN IF NOT EXISTS founder_lifecycle_override boolean NOT NULL DEFAULT false;

DO $$ BEGIN
  ALTER TABLE public.lead_quality_profiles
    ADD CONSTRAINT lead_quality_profiles_lifecycle_stage_chk
    CHECK (lifecycle_stage IS NULL OR lifecycle_stage IN (
      'active_candidate',
      'needs_verification',
      'verified_ready_for_review',
      'qualified_for_promotion',
      'promoted_to_contact',
      'already_in_crm',
      'duplicate_collapsed',
      'rejected_poor_fit',
      'rejected_missing_contact_details',
      'attempted_no_email',
      'archived_learning_only',
      'archived_not_working',
      'founder_review_required'
    ));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_lqp_lifecycle_stage ON public.lead_quality_profiles(lifecycle_stage);

CREATE OR REPLACE VIEW public.lead_lifecycle_summary AS
SELECT
  COUNT(*)                                                                          AS total_leads,
  COUNT(*) FILTER (WHERE lifecycle_stage IN (
    'active_candidate','needs_verification','verified_ready_for_review',
    'qualified_for_promotion','founder_review_required'))                            AS active_working_leads,
  COUNT(*) FILTER (WHERE lifecycle_stage = 'active_candidate')                       AS active_candidates,
  COUNT(*) FILTER (WHERE lifecycle_stage = 'needs_verification')                     AS needs_verification_active,
  COUNT(*) FILTER (WHERE lifecycle_stage = 'verified_ready_for_review')              AS verified_ready_for_review,
  COUNT(*) FILTER (WHERE lifecycle_stage = 'qualified_for_promotion')                AS qualified_for_promotion,
  COUNT(*) FILTER (WHERE lifecycle_stage = 'founder_review_required')                AS founder_review_required,
  COUNT(*) FILTER (WHERE lifecycle_stage = 'promoted_to_contact')                    AS promoted_to_contact,
  COUNT(*) FILTER (WHERE lifecycle_stage = 'already_in_crm')                         AS already_in_crm,
  COUNT(*) FILTER (WHERE lifecycle_stage = 'duplicate_collapsed')                    AS duplicates_archived,
  COUNT(*) FILTER (WHERE lifecycle_stage = 'rejected_poor_fit')                      AS poor_fit_archived,
  COUNT(*) FILTER (WHERE lifecycle_stage = 'rejected_missing_contact_details')       AS missing_contact_archived,
  COUNT(*) FILTER (WHERE lifecycle_stage = 'attempted_no_email')                     AS attempted_no_email,
  COUNT(*) FILTER (WHERE lifecycle_stage = 'archived_learning_only')                 AS archived_learning_only,
  COUNT(*) FILTER (WHERE lifecycle_stage = 'archived_not_working')                   AS archived_not_working,
  COUNT(*) FILTER (WHERE lifecycle_stage IN (
    'active_candidate','needs_verification','verified_ready_for_review',
    'qualified_for_promotion'))                                                      AS safe_to_unlock,
  COUNT(*) FILTER (WHERE lifecycle_stage IN (
    'verified_ready_for_review','qualified_for_promotion'))                          AS safe_to_promote,
  COUNT(*) FILTER (WHERE lifecycle_stage = 'qualified_for_promotion')                AS safe_to_queue
FROM public.lead_quality_profiles;

GRANT SELECT ON public.lead_lifecycle_summary TO authenticated;
