-- Add new lifecycle stages for verified-locked candidates and update the summary view.

ALTER TABLE public.lead_quality_profiles
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
      'promoted_to_contact',
      'already_in_crm',
      'duplicate_collapsed',
      'rejected_poor_fit',
      'rejected_missing_contact_details',
      'attempted_no_email',
      'archived_learning_only',
      'archived_not_working',
      'founder_review_required',
      'legacy_needs_verification_hold'
    ])
  );

-- Reclassify the 75 leads currently sitting in rejected_missing_contact_details
-- whose underlying apollo_leads row reports has_email_flag = true (verified by Apollo, just locked).
UPDATE public.lead_quality_profiles lqp
SET lifecycle_stage = 'verified_email_available_locked',
    lifecycle_reason = 'Apollo reports verified email available; actual address is locked behind unlock credits',
    lifecycle_classified_at = now(),
    risk_flags = (
      SELECT array_agg(DISTINCT f) FROM unnest(
        COALESCE(lqp.risk_flags, ARRAY[]::text[]) || ARRAY['verified_email_locked','needs_apollo_unlock']
      ) AS f WHERE f <> 'missing_email'
    ),
    notes = COALESCE(lqp.notes, '') || E'\n[reclassified] verified email available, email locked / reveal required'
FROM public.apollo_leads al
WHERE al.id = lqp.apollo_lead_id
  AND lqp.lifecycle_stage = 'rejected_missing_contact_details'
  AND al.has_email_flag = true
  AND COALESCE(NULLIF(trim(al.email), ''), NULL) IS NULL;

-- Refresh lifecycle summary view to expose the new bucket and unlock-required count.
DROP VIEW IF EXISTS public.lead_lifecycle_summary;
CREATE VIEW public.lead_lifecycle_summary AS
SELECT
  count(*)                                                                                AS total_leads,
  count(*) FILTER (WHERE lifecycle_stage = ANY (ARRAY[
    'active_candidate','needs_verification','verified_ready_for_review',
    'qualified_for_promotion','founder_review_required'
  ]))                                                                                     AS active_working_leads,
  count(*) FILTER (WHERE lifecycle_stage = 'active_candidate')                            AS active_candidates,
  count(*) FILTER (WHERE lifecycle_stage = 'needs_verification')                          AS needs_verification_active,
  count(*) FILTER (WHERE lifecycle_stage = 'verified_ready_for_review')                   AS verified_ready_for_review,
  count(*) FILTER (WHERE lifecycle_stage = 'qualified_for_promotion')                     AS qualified_for_promotion,
  count(*) FILTER (WHERE lifecycle_stage = 'founder_review_required')                     AS founder_review_required,
  count(*) FILTER (WHERE lifecycle_stage = 'promoted_to_contact')                         AS promoted_to_contact,
  count(*) FILTER (WHERE lifecycle_stage = 'already_in_crm')                              AS already_in_crm,
  count(*) FILTER (WHERE lifecycle_stage = 'duplicate_collapsed')                         AS duplicates_archived,
  count(*) FILTER (WHERE lifecycle_stage = 'rejected_poor_fit')                           AS poor_fit_archived,
  count(*) FILTER (WHERE lifecycle_stage = 'rejected_missing_contact_details')            AS missing_contact_archived,
  count(*) FILTER (WHERE lifecycle_stage = 'attempted_no_email')                          AS attempted_no_email,
  count(*) FILTER (WHERE lifecycle_stage = 'archived_learning_only')                      AS archived_learning_only,
  count(*) FILTER (WHERE lifecycle_stage = 'archived_not_working')                        AS archived_not_working,
  count(*) FILTER (WHERE lifecycle_stage = 'legacy_needs_verification_hold')              AS legacy_optional_unlock_candidates,
  count(*) FILTER (WHERE lifecycle_stage = 'verified_email_available_locked')             AS verified_email_available_locked,
  count(*) FILTER (WHERE lifecycle_stage = 'verified_email_available_locked')             AS unlock_required,
  count(*) FILTER (WHERE lifecycle_stage = ANY (ARRAY[
    'active_candidate','needs_verification','verified_ready_for_review','qualified_for_promotion'
  ]))                                                                                     AS safe_to_unlock,
  count(*) FILTER (WHERE lifecycle_stage = ANY (ARRAY[
    'verified_ready_for_review','qualified_for_promotion'
  ]))                                                                                     AS safe_to_promote,
  count(*) FILTER (WHERE lifecycle_stage = 'qualified_for_promotion')                     AS safe_to_queue
FROM public.lead_quality_profiles;