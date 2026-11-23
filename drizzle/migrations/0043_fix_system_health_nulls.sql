CREATE OR REPLACE FUNCTION public.compute_system_health()
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_emails_per_hour numeric; v_reply_rate numeric; v_conversion_rate numeric;
  v_assignment_completion numeric; v_payment_collection numeric;
  v_avg_response_time numeric; v_proposal_conversion numeric;
  v_demo_to_deal numeric; v_supplier_util numeric;
BEGIN
  SELECT COUNT(*)::numeric INTO v_emails_per_hour FROM email_queue WHERE status='sent' AND sent_at > now() - interval '1 hour';
  SELECT CASE WHEN COUNT(*) FILTER (WHERE event_type='sent')=0 THEN 0
    ELSE COUNT(*) FILTER (WHERE event_type='replied')::numeric / NULLIF(COUNT(*) FILTER (WHERE event_type='sent'),0) * 100 END
  INTO v_reply_rate FROM email_events WHERE timestamp > now() - interval '7 days';
  SELECT CASE WHEN COUNT(*) FILTER (WHERE event_type='session_start')=0 THEN 0
    ELSE (SELECT COUNT(*)::numeric FROM deals WHERE status='WON' AND won_at > now() - interval '30 days')
       / NULLIF(COUNT(*) FILTER (WHERE event_type='session_start'),0) * 100 END
  INTO v_conversion_rate FROM demo_events WHERE timestamp > now() - interval '30 days';
  SELECT CASE WHEN COUNT(*)=0 THEN 0
    ELSE COUNT(*) FILTER (WHERE status='completed')::numeric / NULLIF(COUNT(*),0) * 100 END
  INTO v_assignment_completion FROM assignments WHERE created_at > now() - interval '30 days';
  SELECT CASE WHEN COALESCE((SELECT SUM(expected_amount) FROM invoices WHERE issued_date > CURRENT_DATE - 30),0)=0 THEN 0
    ELSE COALESCE((SELECT SUM(amount_received) FROM payments WHERE received_date > CURRENT_DATE - 30),0)
       / NULLIF((SELECT SUM(expected_amount) FROM invoices WHERE issued_date > CURRENT_DATE - 30),0) * 100 END
  INTO v_payment_collection;
  SELECT COALESCE(AVG(reply_latency_seconds),0) INTO v_avg_response_time
  FROM ai_actions WHERE created_at > now() - interval '7 days' AND reply_latency_seconds IS NOT NULL;
  SELECT CASE WHEN COUNT(*) FILTER (WHERE status='sent')=0 THEN 0
    ELSE COUNT(*) FILTER (WHERE status='accepted')::numeric / NULLIF(COUNT(*) FILTER (WHERE status IN ('sent','accepted')),0) * 100 END
  INTO v_proposal_conversion FROM internal_proposals WHERE created_at > now() - interval '30 days';
  SELECT CASE WHEN COUNT(DISTINCT da.contact_id) FILTER (WHERE da.high_intent)=0 THEN 0
    ELSE (SELECT COUNT(*)::numeric FROM deals d WHERE d.status='WON' AND d.won_at > now() - interval '30 days'
              AND d.contact_id IN (SELECT contact_id FROM demo_access WHERE high_intent))
       / NULLIF(COUNT(DISTINCT da.contact_id) FILTER (WHERE da.high_intent),0) * 100 END
  INTO v_demo_to_deal FROM demo_access da WHERE da.created_at > now() - interval '30 days';
  SELECT CASE WHEN COALESCE(SUM(max_concurrent_assignments),0)=0 THEN 0
    ELSE SUM(active_assignment_count)::numeric / NULLIF(SUM(max_concurrent_assignments),0) * 100 END
  INTO v_supplier_util FROM suppliers WHERE status='APPROVED';

  INSERT INTO system_health (metric_name, value, timestamp) VALUES
    ('emails_per_hour', COALESCE(v_emails_per_hour,0), now()),
    ('reply_rate', COALESCE(v_reply_rate,0), now()),
    ('conversion_rate', COALESCE(v_conversion_rate,0), now()),
    ('assignment_completion_rate', COALESCE(v_assignment_completion,0), now()),
    ('payment_collection_rate', COALESCE(v_payment_collection,0), now()),
    ('avg_response_time', COALESCE(v_avg_response_time,0), now()),
    ('proposal_conversion_rate', COALESCE(v_proposal_conversion,0), now()),
    ('demo_to_deal_rate', COALESCE(v_demo_to_deal,0), now()),
    ('supplier_utilisation_rate', COALESCE(v_supplier_util,0), now());
END; $function$;