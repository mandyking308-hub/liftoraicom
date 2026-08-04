CREATE OR REPLACE FUNCTION public.social_claim_distribution_job(
  p_job_id uuid,
  p_business_id uuid,
  p_idempotency_key text,
  p_channel_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_claimed integer := 0;
BEGIN
  UPDATE public.social_publish_jobs
     SET distribution_idempotency_key = p_idempotency_key,
         distribution_status = 'submitting',
         mapped_channel_id = p_channel_id,
         attempt_count = COALESCE(attempt_count, 0) + 1,
         submitted_at = COALESCE(submitted_at, now())
   WHERE id = p_job_id
     AND business_id = p_business_id
     AND provider_post_id IS NULL
     AND distribution_idempotency_key IS NULL
     AND COALESCE(distribution_status, 'not_submitted') NOT IN ('submitting', 'scheduled', 'sent', 'dead_letter');

  GET DIAGNOSTICS v_claimed = ROW_COUNT;
  RETURN v_claimed = 1;
END;
$$;

REVOKE ALL ON FUNCTION public.social_claim_distribution_job(uuid, uuid, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.social_claim_distribution_job(uuid, uuid, text, uuid) TO service_role;