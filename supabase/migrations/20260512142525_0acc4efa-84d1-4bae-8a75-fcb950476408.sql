DROP VIEW IF EXISTS public.cadence_status;

CREATE VIEW public.cadence_status
WITH (security_invoker = true)
AS
WITH per_contact AS (
  SELECT
    contact_id,
    campaign_id,
    MAX(sequence_step) FILTER (
      WHERE status = 'sent'
        AND delivery_kind = 'smtp_real'
        AND smtp_accepted_at IS NOT NULL
        AND provider_message_id IS NOT NULL
    ) AS last_valid_sent_step,
    MAX(sequence_step) AS current_step,
    COUNT(*) FILTER (WHERE status = 'pending')   AS pending_rows,
    COUNT(*) FILTER (WHERE status = 'delayed')   AS delayed_rows,
    COUNT(*) FILTER (WHERE status = 'blocked')   AS blocked_rows,
    COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled_rows
  FROM public.email_queue
  GROUP BY contact_id, campaign_id
),
next_pending AS (
  SELECT DISTINCT ON (contact_id, campaign_id)
    contact_id, campaign_id, sequence_step AS next_eligible_step,
    scheduled_at AS next_eligible_send_at,
    status AS next_status,
    block_reason AS next_block_reason
  FROM public.email_queue
  WHERE status IN ('pending', 'delayed', 'throttled')
  ORDER BY contact_id, campaign_id, scheduled_at ASC NULLS LAST
)
SELECT
  pc.contact_id,
  pc.campaign_id,
  pc.current_step,
  pc.last_valid_sent_step,
  np.next_eligible_step,
  np.next_eligible_send_at,
  np.next_status,
  CASE
    WHEN np.next_block_reason IN ('paused_by_contact_gate','RECENT_COMMUNICATION_24H','RECENTLY_CONTACTED')
      THEN 'paused_by_contact_gate'
    WHEN np.next_block_reason IS NOT NULL THEN np.next_block_reason
    ELSE NULL
  END AS paused_reason,
  pc.pending_rows,
  pc.delayed_rows,
  pc.blocked_rows,
  pc.cancelled_rows
FROM per_contact pc
LEFT JOIN next_pending np
  ON np.contact_id = pc.contact_id AND np.campaign_id = pc.campaign_id;