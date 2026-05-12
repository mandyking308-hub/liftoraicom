
ALTER TABLE public.lead_quality_profiles
  DROP CONSTRAINT IF EXISTS lead_quality_profiles_lifecycle_stage_check,
  DROP CONSTRAINT IF EXISTS lead_quality_profiles_lifecycle_stage_chk;

ALTER TABLE public.lead_quality_profiles
  ADD CONSTRAINT lead_quality_profiles_lifecycle_stage_chk
  CHECK (
    lifecycle_stage IS NULL OR lifecycle_stage = ANY (ARRAY[
      'active_candidate',
      'needs_verification',
      'verified_ready_for_review',
      'qualified_for_promotion',
      'verified_email_available_locked',
      'email_reveal_required',
      'reveal_shortlisted',
      'reveal_attempted_no_email',
      'reveal_invalid_email',
      'safe_to_promote_after_reveal',
      'already_in_crm_after_reveal',
      'promoted_to_contact',
      'already_in_crm',
      'duplicate_collapsed',
      'rejected_poor_fit',
      'rejected_missing_contact_details',
      'attempted_no_email',
      'archived_learning_only',
      'archived_not_working',
      'founder_review_required',
      'needs_founder_review',
      'legacy_needs_verification_hold'
    ])
  );

UPDATE public.lead_quality_profiles
SET lifecycle_stage = 'email_reveal_required'
WHERE lifecycle_stage = 'verified_email_available_locked';

DROP VIEW IF EXISTS public.lead_lifecycle_summary;
CREATE VIEW public.lead_lifecycle_summary AS
SELECT
  COUNT(*) FILTER (WHERE lifecycle_stage = 'active_candidate')                    AS active_candidate,
  COUNT(*) FILTER (WHERE lifecycle_stage = 'needs_verification')                  AS needs_verification,
  COUNT(*) FILTER (WHERE lifecycle_stage = 'verified_ready_for_review')           AS verified_ready_for_review,
  COUNT(*) FILTER (WHERE lifecycle_stage = 'qualified_for_promotion')             AS qualified_for_promotion,
  COUNT(*) FILTER (WHERE lifecycle_stage = 'verified_email_available_locked')     AS verified_email_available_locked,
  COUNT(*) FILTER (WHERE lifecycle_stage = 'email_reveal_required')               AS email_reveal_required,
  COUNT(*) FILTER (WHERE lifecycle_stage = 'reveal_shortlisted')                  AS reveal_shortlisted,
  COUNT(*) FILTER (WHERE lifecycle_stage = 'reveal_attempted_no_email')           AS reveal_attempted_no_email,
  COUNT(*) FILTER (WHERE lifecycle_stage = 'reveal_invalid_email')                AS reveal_invalid_email,
  COUNT(*) FILTER (WHERE lifecycle_stage = 'safe_to_promote_after_reveal')        AS safe_to_promote_after_reveal,
  COUNT(*) FILTER (WHERE lifecycle_stage = 'already_in_crm_after_reveal')         AS already_in_crm_after_reveal,
  COUNT(*) FILTER (WHERE lifecycle_stage = 'promoted_to_contact')                 AS promoted_to_contact,
  COUNT(*) FILTER (WHERE lifecycle_stage = 'already_in_crm')                      AS already_in_crm,
  COUNT(*) FILTER (WHERE lifecycle_stage = 'duplicate_collapsed')                 AS duplicate_collapsed,
  COUNT(*) FILTER (WHERE lifecycle_stage = 'rejected_poor_fit')                   AS rejected_poor_fit,
  COUNT(*) FILTER (WHERE lifecycle_stage = 'rejected_missing_contact_details')    AS rejected_missing_contact_details,
  COUNT(*) FILTER (WHERE lifecycle_stage = 'attempted_no_email')                  AS attempted_no_email,
  COUNT(*) FILTER (WHERE lifecycle_stage = 'archived_learning_only')              AS archived_learning_only,
  COUNT(*) FILTER (WHERE lifecycle_stage = 'archived_not_working')                AS archived_not_working,
  COUNT(*) FILTER (WHERE lifecycle_stage = 'founder_review_required')             AS founder_review_required,
  COUNT(*) FILTER (WHERE lifecycle_stage = 'needs_founder_review')                AS needs_founder_review,
  COUNT(*) FILTER (WHERE lifecycle_stage = 'legacy_needs_verification_hold')      AS legacy_optional_unlock_candidates,
  COUNT(*) FILTER (
    WHERE lifecycle_stage IN ('active_candidate','verified_ready_for_review','qualified_for_promotion')
  ) AS active_working_leads,
  COUNT(*) FILTER (
    WHERE lifecycle_stage IN ('email_reveal_required','reveal_shortlisted','verified_email_available_locked')
  ) AS unlock_required,
  COUNT(*) FILTER (WHERE lifecycle_stage = 'safe_to_promote_after_reveal')        AS safe_to_promote,
  COUNT(*) FILTER (WHERE lifecycle_stage = 'qualified_for_promotion')             AS safe_to_queue,
  COUNT(*) FILTER (
    WHERE lifecycle_stage IN ('email_reveal_required','reveal_shortlisted','verified_email_available_locked')
  ) AS safe_to_unlock
FROM public.lead_quality_profiles;
