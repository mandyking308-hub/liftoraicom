-- =========================================
-- 1. COMPLIANCE COUNTRY RESOLUTION
-- =========================================
CREATE OR REPLACE FUNCTION public.resolve_entity_country(_contact_id uuid, _business text DEFAULT NULL)
RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE resolved text;
BEGIN
  SELECT NULLIF(c.country, '') INTO resolved FROM public.contacts c WHERE c.id = _contact_id;
  IF resolved IS NOT NULL THEN RETURN resolved; END IF;
  SELECT NULLIF(il.raw_data->>'country', '') INTO resolved
    FROM public.imported_leads il WHERE il.contact_id = _contact_id LIMIT 1;
  IF resolved IS NOT NULL THEN RETURN resolved; END IF;
  IF _business IN ('UK','EU','DE','FR') THEN RETURN _business; END IF;
  RETURN 'GLOBAL';
END; $$;

CREATE OR REPLACE FUNCTION public.compliance_check_contact(_contact_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  c public.contacts;
  resolved_country text;
  jp public.jurisdiction_profiles;
BEGIN
  SELECT * INTO c FROM public.contacts WHERE id = _contact_id;
  IF NOT FOUND THEN RETURN; END IF;
  resolved_country := public.resolve_entity_country(c.id, c.assigned_business);

  IF COALESCE(c.source,'') = '' THEN
    PERFORM public.log_compliance_event(
      'data_source_missing','contact', c.id, c.assigned_business, resolved_country,
      'PERSONAL_DATA_NO_SOURCE',
      'Contact ' || c.email || ' stored without recorded data source',
      '{}'::jsonb);
  END IF;

  SELECT * INTO jp FROM public.jurisdiction_profiles jp_inner
   WHERE jp_inner.country = resolved_country LIMIT 1;
  IF jp.gdpr_applicable IS TRUE AND COALESCE(c.assigned_business,'') NOT IN ('','UK','EU') THEN
    PERFORM public.log_compliance_event(
      'data_cross_border','contact', c.id, c.assigned_business, resolved_country,
      'CROSS_BORDER_TRANSFER',
      'Contact in GDPR jurisdiction (' || resolved_country || ') assigned to non-EU/UK business ' || c.assigned_business,
      '{}'::jsonb);
  END IF;
END; $$;

CREATE OR REPLACE FUNCTION public.compliance_check_outbound_communication(_comm_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  comm public.communications;
  c public.contacts;
  jp public.jurisdiction_profiles;
  recent_count int;
  resolved_country text;
BEGIN
  SELECT * INTO comm FROM public.communications WHERE id = _comm_id;
  IF NOT FOUND OR comm.direction <> 'outbound' THEN RETURN; END IF;
  SELECT * INTO c FROM public.contacts WHERE id = comm.contact_id;
  IF NOT FOUND THEN RETURN; END IF;
  resolved_country := public.resolve_entity_country(c.id, c.assigned_business);
  SELECT * INTO jp FROM public.jurisdiction_profiles jp_inner
   WHERE jp_inner.country = resolved_country LIMIT 1;

  IF c.status = 'DO_NOT_CONTACT' THEN
    PERFORM public.log_compliance_event(
      'outreach_do_not_contact','message', comm.id, c.assigned_business, resolved_country,
      'DO_NOT_CONTACT_VIOLATION',
      'Outbound communication recorded against DO_NOT_CONTACT contact ' || c.email,
      jsonb_build_object('contact_id', c.id, 'channel', comm.channel));
  END IF;

  IF jp.consent_required IS TRUE THEN
    PERFORM public.log_compliance_event(
      'outreach_consent_required','message', comm.id, c.assigned_business, resolved_country,
      'CONSENT_NOT_RECORDED',
      'Outbound to ' || c.email || ' in ' || resolved_country || ' — consent flag not stored',
      jsonb_build_object('contact_id', c.id));
  END IF;

  SELECT COUNT(*) INTO recent_count FROM public.communications
   WHERE contact_id = c.id AND direction = 'outbound'
     AND timestamp > now() - interval '24 hours';
  IF recent_count > 5 THEN
    PERFORM public.log_compliance_event(
      'outreach_frequency_cap','contact', c.id, c.assigned_business, resolved_country,
      'FREQUENCY_CAP_EXCEEDED',
      'Contact ' || c.email || ' received ' || recent_count || ' outbound messages in 24h',
      jsonb_build_object('count_24h', recent_count));
  END IF;

  IF comm.channel = 'email' AND POSITION('unsubscribe' IN lower(COALESCE(comm.message,''))) = 0 THEN
    PERFORM public.log_compliance_event(
      'outreach_unsubscribe_missing','message', comm.id, c.assigned_business, resolved_country,
      'UNSUBSCRIBE_MISSING',
      'Outbound email to ' || c.email || ' missing unsubscribe language',
      '{}'::jsonb);
  END IF;
END; $$;

ALTER TABLE public.contacts ENABLE TRIGGER trg_compliance_contacts;
ALTER TABLE public.communications ENABLE TRIGGER trg_compliance_communications;

-- =========================================
-- 2. INVOICE TRIGGER ON INSERT OR UPDATE
-- =========================================
CREATE OR REPLACE FUNCTION public.handle_deal_won()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  existing_invoice_id uuid;
  is_new_won boolean;
BEGIN
  is_new_won := NEW.status = 'WON' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'WON');
  IF is_new_won THEN
    NEW.won_at := COALESCE(NEW.won_at, now());
    IF NEW.contact_id IS NOT NULL THEN
      UPDATE public.contacts
         SET status = 'CLIENT'::contact_status, updated_at = now()
       WHERE id = NEW.contact_id AND status <> 'DO_NOT_CONTACT';
    END IF;
    SELECT id INTO existing_invoice_id FROM public.invoices WHERE deal_id = NEW.id LIMIT 1;
    IF existing_invoice_id IS NULL THEN
      INSERT INTO public.invoices (
        deal_id, contact_id, business_name, invoice_number,
        amount_min, amount_max, expected_amount, currency,
        issued_date, due_date, status, notes
      ) VALUES (
        NEW.id, NEW.contact_id, NEW.business_name, public.generate_invoice_number(),
        NEW.estimated_value_min, NEW.estimated_value_max,
        (COALESCE(NEW.estimated_value_min,0) + COALESCE(NEW.estimated_value_max,0)) / 2.0,
        NEW.currency, CURRENT_DATE, CURRENT_DATE + interval '14 days', 'DRAFT',
        'Draft invoice auto-created from deal. This invoice reflects a non-binding estimate based on agreed scope.');
    END IF;
  END IF;
  IF NEW.status = 'LOST' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'LOST') THEN
    NEW.lost_at := COALESCE(NEW.lost_at, now());
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS deal_won_create_invoice ON public.deals;
CREATE TRIGGER deal_won_create_invoice
  BEFORE INSERT OR UPDATE ON public.deals
  FOR EACH ROW EXECUTE FUNCTION public.handle_deal_won();

-- =========================================
-- 3. PRIORITY ENGINE — CRITICAL TIER
-- =========================================
CREATE OR REPLACE FUNCTION public.priority_score_deal(_deal_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  d public.deals;
  mid numeric := 0;
  revenue_f numeric := 0; prob_f numeric := 0; urgency_f numeric := 0;
  engagement_f numeric := 0; risk_f numeric := 0;
  days_idle int := 0;
  has_invoice_overdue boolean := false;
  demo_uses int := 0;
  raw numeric := 0; final_score int := 0;
  factors jsonb;
BEGIN
  SELECT * INTO d FROM public.deals WHERE id = _deal_id;
  IF NOT FOUND THEN RETURN; END IF;
  IF d.status::text IN ('WON','LOST') THEN
    DELETE FROM public.priority_scores WHERE entity_type = 'deal' AND entity_id = _deal_id;
    RETURN;
  END IF;
  mid := (COALESCE(d.estimated_value_min,0) + COALESCE(d.estimated_value_max,0)) / 2.0;
  revenue_f := LEAST(100, (mid / 1000.0));
  prob_f := COALESCE(d.probability, 0);
  IF d.status::text = 'QUALIFIED' THEN prob_f := prob_f + 15; END IF;
  IF d.status::text = 'PROPOSAL_SENT' THEN prob_f := prob_f + 25; END IF;
  IF prob_f > 100 THEN prob_f := 100; END IF;
  days_idle := EXTRACT(EPOCH FROM (now() - d.updated_at)) / 86400;
  urgency_f := LEAST(100, days_idle * 8);
  SELECT EXISTS(SELECT 1 FROM public.invoices WHERE deal_id = _deal_id AND status = 'OVERDUE')
    INTO has_invoice_overdue;
  IF has_invoice_overdue THEN urgency_f := LEAST(100, urgency_f + 30); END IF;
  IF d.contact_id IS NOT NULL THEN
    SELECT COUNT(*) INTO demo_uses FROM public.demo_events de
      JOIN public.demo_access da ON da.id = de.demo_id
     WHERE da.contact_id = d.contact_id AND de.timestamp > now() - interval '14 days';
    engagement_f := LEAST(100, demo_uses * 12);
    risk_f := public.compliance_score_for('contact', d.contact_id);
  END IF;
  raw := (revenue_f * 0.30) + (prob_f * 0.25) + (urgency_f * 0.20) + (engagement_f * 0.15) - (risk_f * 0.10);
  final_score := GREATEST(0, LEAST(100, ROUND(raw)::int));
  IF mid >= 100000 THEN final_score := GREATEST(final_score, 85); END IF;
  IF has_invoice_overdue AND mid >= 25000 THEN final_score := GREATEST(final_score, 90); END IF;
  IF has_invoice_overdue AND days_idle > 14 THEN final_score := GREATEST(final_score, 95); END IF;
  factors := jsonb_build_object(
    'revenue', ROUND(revenue_f,1), 'probability', ROUND(prob_f,1),
    'urgency', ROUND(urgency_f,1), 'engagement', ROUND(engagement_f,1),
    'risk', ROUND(risk_f,1), 'mid_value', mid, 'days_idle', days_idle,
    'demo_uses_14d', demo_uses, 'invoice_overdue', has_invoice_overdue,
    'status', d.status::text,
    'critical_boosted', (mid >= 100000 OR (has_invoice_overdue AND mid >= 25000)));
  INSERT INTO public.priority_scores (entity_type, entity_id, business_name, score, factors, priority_level, last_updated)
  VALUES ('deal', _deal_id, COALESCE(d.business_name,''), final_score, factors,
          public.priority_level_from_score(final_score), now())
  ON CONFLICT (entity_type, entity_id) DO UPDATE
    SET score = EXCLUDED.score, factors = EXCLUDED.factors,
        priority_level = EXCLUDED.priority_level,
        business_name = EXCLUDED.business_name, last_updated = now();
END; $$;

CREATE OR REPLACE FUNCTION public.priority_score_assignment(_assignment_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  a public.assignments;
  d public.deals;
  revenue_f numeric := 0; prob_f numeric := 60; urgency_f numeric := 0;
  engagement_f numeric := 0; risk_f numeric := 0;
  raw numeric := 0; final_score int := 0; mid numeric := 0;
  days_to_due int; factors jsonb;
BEGIN
  SELECT * INTO a FROM public.assignments WHERE id = _assignment_id;
  IF NOT FOUND THEN RETURN; END IF;
  IF a.status::text = 'failed' THEN
    INSERT INTO public.priority_scores (entity_type, entity_id, business_name, score, factors, priority_level, last_updated)
    VALUES ('assignment', _assignment_id, COALESCE(a.business_name,''), 95,
            jsonb_build_object('reason','assignment_failed','status', a.status::text),
            'critical'::priority_level, now())
    ON CONFLICT (entity_type, entity_id) DO UPDATE
      SET score = EXCLUDED.score, factors = EXCLUDED.factors,
          priority_level = EXCLUDED.priority_level, last_updated = now();
    RETURN;
  END IF;
  IF a.status::text = 'completed' THEN
    DELETE FROM public.priority_scores WHERE entity_type = 'assignment' AND entity_id = _assignment_id;
    RETURN;
  END IF;
  SELECT * INTO d FROM public.deals WHERE id = a.deal_id;
  mid := (COALESCE(d.estimated_value_min,0) + COALESCE(d.estimated_value_max,0)) / 2.0;
  revenue_f := LEAST(100, mid / 1000.0);
  IF a.expected_completion_date IS NOT NULL THEN
    days_to_due := (a.expected_completion_date - CURRENT_DATE);
    urgency_f := CASE
      WHEN days_to_due < 0 THEN 100
      WHEN days_to_due <= 1 THEN 90
      WHEN days_to_due <= 3 THEN 70
      WHEN days_to_due <= 7 THEN 40
      ELSE 20 END;
  ELSE urgency_f := 50;
  END IF;
  IF a.sla_status::text = 'overdue' THEN urgency_f := 100;
  ELSIF a.sla_status::text = 'at_risk' THEN urgency_f := GREATEST(urgency_f, 80);
  END IF;
  IF a.status::text = 'in_progress' THEN engagement_f := 70;
  ELSIF a.acknowledged_at IS NOT NULL THEN engagement_f := 50;
  ELSE engagement_f := 20;
  END IF;
  risk_f := public.compliance_score_for('assignment', _assignment_id);
  raw := (revenue_f * 0.30) + (prob_f * 0.25) + (urgency_f * 0.20) + (engagement_f * 0.15) - (risk_f * 0.10);
  final_score := GREATEST(0, LEAST(100, ROUND(raw)::int));
  IF a.sla_status::text = 'overdue' AND mid >= 25000 THEN
    final_score := GREATEST(final_score, 90);
  END IF;
  IF mid >= 100000 AND a.status::text <> 'completed' THEN
    final_score := GREATEST(final_score, 85);
  END IF;
  factors := jsonb_build_object(
    'revenue', ROUND(revenue_f,1), 'probability', ROUND(prob_f,1),
    'urgency', ROUND(urgency_f,1), 'engagement', ROUND(engagement_f,1),
    'risk', ROUND(risk_f,1), 'sla_status', a.sla_status::text,
    'status', a.status::text, 'mid_value', mid,
    'acknowledged', a.acknowledged_at IS NOT NULL);
  INSERT INTO public.priority_scores (entity_type, entity_id, business_name, score, factors, priority_level, last_updated)
  VALUES ('assignment', _assignment_id, COALESCE(a.business_name,''), final_score, factors,
          public.priority_level_from_score(final_score), now())
  ON CONFLICT (entity_type, entity_id) DO UPDATE
    SET score = EXCLUDED.score, factors = EXCLUDED.factors,
        priority_level = EXCLUDED.priority_level,
        business_name = EXCLUDED.business_name, last_updated = now();
END; $$;

CREATE OR REPLACE FUNCTION public.priority_score_invoice(_invoice_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  inv public.invoices;
  days_overdue int := 0;
  expected numeric := 0;
  final_score int := 0;
  factors jsonb;
BEGIN
  SELECT * INTO inv FROM public.invoices WHERE id = _invoice_id;
  IF NOT FOUND THEN RETURN; END IF;
  IF inv.status = 'PAID' THEN
    DELETE FROM public.priority_scores WHERE entity_type = 'invoice'::priority_entity_type AND entity_id = _invoice_id;
    RETURN;
  END IF;
  expected := COALESCE(inv.expected_amount, 0);
  days_overdue := GREATEST(0, (CURRENT_DATE - inv.due_date));
  final_score := LEAST(100, ROUND(days_overdue * 4 + (expected / 5000.0))::int);
  IF days_overdue > 14 THEN final_score := GREATEST(final_score, 90); END IF;
  IF days_overdue > 30 THEN final_score := GREATEST(final_score, 95); END IF;
  IF expected >= 50000 AND days_overdue > 0 THEN final_score := GREATEST(final_score, 85); END IF;
  IF expected >= 100000 AND days_overdue > 7 THEN final_score := 100; END IF;
  factors := jsonb_build_object(
    'expected_amount', expected, 'days_overdue', days_overdue,
    'status', inv.status, 'invoice_number', inv.invoice_number,
    'payment_risk_flag', inv.payment_risk_flag);
  INSERT INTO public.priority_scores (entity_type, entity_id, business_name, score, factors, priority_level, last_updated)
  VALUES ('invoice'::priority_entity_type, _invoice_id, COALESCE(inv.business_name,''), final_score, factors,
          public.priority_level_from_score(final_score), now())
  ON CONFLICT (entity_type, entity_id) DO UPDATE
    SET score = EXCLUDED.score, factors = EXCLUDED.factors,
        priority_level = EXCLUDED.priority_level,
        business_name = EXCLUDED.business_name, last_updated = now();
END; $$;

CREATE OR REPLACE FUNCTION public.trg_priority_invoice()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  PERFORM public.priority_score_invoice(NEW.id);
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_priority_invoice ON public.invoices;
CREATE TRIGGER trg_priority_invoice
  AFTER INSERT OR UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.trg_priority_invoice();

-- Recompute priority scores
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.deals WHERE status NOT IN ('WON','LOST') LOOP
    PERFORM public.priority_score_deal(r.id);
  END LOOP;
  FOR r IN SELECT id FROM public.assignments WHERE status NOT IN ('completed') LOOP
    PERFORM public.priority_score_assignment(r.id);
  END LOOP;
  FOR r IN SELECT id FROM public.invoices WHERE status <> 'PAID' LOOP
    PERFORM public.priority_score_invoice(r.id);
  END LOOP;
END $$;