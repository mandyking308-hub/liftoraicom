DROP FUNCTION IF EXISTS public.compute_system_health();
CREATE FUNCTION public.compute_system_health()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
  SELECT CASE WHEN SUM(max_concurrent_assignments)=0 THEN 0
    ELSE SUM(active_assignment_count)::numeric / NULLIF(SUM(max_concurrent_assignments),0) * 100 END
  INTO v_supplier_util FROM suppliers WHERE status='APPROVED';

  INSERT INTO system_health (metric_name, value, timestamp) VALUES
    ('emails_per_hour', v_emails_per_hour, now()),
    ('reply_rate', v_reply_rate, now()),
    ('conversion_rate', v_conversion_rate, now()),
    ('assignment_completion_rate', v_assignment_completion, now()),
    ('payment_collection_rate', v_payment_collection, now()),
    ('avg_response_time', v_avg_response_time, now()),
    ('proposal_conversion_rate', v_proposal_conversion, now()),
    ('demo_to_deal_rate', v_demo_to_deal, now()),
    ('supplier_utilisation_rate', v_supplier_util, now());
END; $$;