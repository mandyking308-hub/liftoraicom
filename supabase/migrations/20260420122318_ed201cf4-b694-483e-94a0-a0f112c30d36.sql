-- ============================================================
-- LEGAL & COMPLIANCE ENGINE — Phase 1 (non-blocking, visibility-first)
-- ============================================================

-- 1. Enums
DO $$ BEGIN
  CREATE TYPE public.compliance_category AS ENUM
    ('outreach','data_privacy','contracts','delivery','payments');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.compliance_severity AS ENUM ('low','medium','high','critical');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.compliance_entity_type AS ENUM
    ('contact','campaign','message','proposal','demo','deal','assignment','supplier','invoice','payment');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.compliance_enforcement AS ENUM ('log_only','warn','block');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Tables
CREATE TABLE IF NOT EXISTS public.compliance_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category public.compliance_category NOT NULL,
  jurisdiction text NOT NULL DEFAULT 'GLOBAL',
  severity public.compliance_severity NOT NULL DEFAULT 'medium',
  description text NOT NULL DEFAULT '',
  active boolean NOT NULL DEFAULT true,
  enforcement_mode public.compliance_enforcement NOT NULL DEFAULT 'log_only',
  conditions jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.compliance_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id uuid REFERENCES public.compliance_rules(id) ON DELETE SET NULL,
  entity_type public.compliance_entity_type NOT NULL,
  entity_id uuid,
  business_name text NOT NULL DEFAULT '',
  jurisdiction text NOT NULL DEFAULT 'GLOBAL',
  severity public.compliance_severity NOT NULL DEFAULT 'medium',
  flag_type text NOT NULL DEFAULT '',
  message text NOT NULL DEFAULT '',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  resolved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_compliance_events_entity ON public.compliance_events(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_compliance_events_recent ON public.compliance_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_compliance_events_severity ON public.compliance_events(severity, created_at DESC);

CREATE TABLE IF NOT EXISTS public.jurisdiction_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country text NOT NULL UNIQUE,
  region text NOT NULL DEFAULT '',
  gdpr_applicable boolean NOT NULL DEFAULT false,
  email_marketing_allowed boolean NOT NULL DEFAULT true,
  consent_required boolean NOT NULL DEFAULT false,
  data_transfer_restrictions text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.contract_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name text NOT NULL DEFAULT '',
  template_name text NOT NULL,
  jurisdiction text NOT NULL DEFAULT 'GLOBAL',
  template_text text NOT NULL DEFAULT '',
  version integer NOT NULL DEFAULT 1,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_contract_templates_business ON public.contract_templates(business_name);

CREATE TABLE IF NOT EXISTS public.compliance_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type public.compliance_entity_type NOT NULL,
  entity_id uuid NOT NULL,
  score integer NOT NULL DEFAULT 0,
  event_count integer NOT NULL DEFAULT 0,
  last_event_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (entity_type, entity_id)
);
CREATE INDEX IF NOT EXISTS idx_compliance_scores_score ON public.compliance_scores(score DESC);

-- 3. RLS — admin only
ALTER TABLE public.compliance_rules        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_events       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jurisdiction_profiles   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_templates      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_scores       ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Admins manage compliance_rules"      ON public.compliance_rules
    FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Admins manage compliance_events"     ON public.compliance_events
    FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Admins manage jurisdiction_profiles" ON public.jurisdiction_profiles
    FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Admins manage contract_templates"    ON public.contract_templates
    FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Admins manage compliance_scores"     ON public.compliance_scores
    FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 4. Helpers
CREATE OR REPLACE FUNCTION public.severity_weight(_s public.compliance_severity)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE _s WHEN 'low' THEN 5 WHEN 'medium' THEN 15 WHEN 'high' THEN 30 WHEN 'critical' THEN 50 END;
$$;

CREATE OR REPLACE FUNCTION public.recompute_compliance_score(
  _entity_type public.compliance_entity_type, _entity_id uuid
) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  total int := 0; n int := 0; last_at timestamptz;
BEGIN
  SELECT COALESCE(SUM(public.severity_weight(severity)), 0),
         COUNT(*), MAX(created_at)
    INTO total, n, last_at
    FROM public.compliance_events
   WHERE entity_type = _entity_type
     AND entity_id   = _entity_id
     AND resolved    = false
     AND created_at  > now() - interval '30 days';

  IF total > 100 THEN total := 100; END IF;
  IF total < 0   THEN total := 0;   END IF;

  INSERT INTO public.compliance_scores (entity_type, entity_id, score, event_count, last_event_at)
  VALUES (_entity_type, _entity_id, total, n, last_at)
  ON CONFLICT (entity_type, entity_id) DO UPDATE
    SET score = EXCLUDED.score,
        event_count = EXCLUDED.event_count,
        last_event_at = EXCLUDED.last_event_at,
        updated_at = now();

  RETURN total;
END; $function$;

-- 5. Logger — single entrypoint that writes event + activity_log + recomputes score
CREATE OR REPLACE FUNCTION public.log_compliance_event(
  _rule_name text,
  _entity_type public.compliance_entity_type,
  _entity_id uuid,
  _business_name text,
  _jurisdiction text,
  _flag_type text,
  _message text,
  _metadata jsonb DEFAULT '{}'::jsonb
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  r public.compliance_rules;
  ev_id uuid;
  sev public.compliance_severity := 'medium';
BEGIN
  SELECT * INTO r FROM public.compliance_rules
   WHERE name = _rule_name AND active = true LIMIT 1;
  IF FOUND THEN sev := r.severity; END IF;

  INSERT INTO public.compliance_events
    (rule_id, entity_type, entity_id, business_name, jurisdiction,
     severity, flag_type, message, metadata)
  VALUES
    (r.id, _entity_type, _entity_id, COALESCE(_business_name,''),
     COALESCE(_jurisdiction,'GLOBAL'), sev, _flag_type, _message, COALESCE(_metadata,'{}'::jsonb))
  RETURNING id INTO ev_id;

  INSERT INTO public.activity_log (event_type, description, entity_type, entity_id)
  VALUES ('compliance_flag',
          '[' || sev::text || '] ' || _flag_type || ' — ' || _message,
          _entity_type::text, _entity_id);

  IF _entity_id IS NOT NULL THEN
    PERFORM public.recompute_compliance_score(_entity_type, _entity_id);
  END IF;

  RETURN ev_id;
END; $function$;

-- 6. Per-domain check functions
CREATE OR REPLACE FUNCTION public.compliance_check_outbound_communication(_comm_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  comm public.communications;
  c    public.contacts;
  jp   public.jurisdiction_profiles;
  recent_count int;
  country text;
BEGIN
  SELECT * INTO comm FROM public.communications WHERE id = _comm_id;
  IF NOT FOUND OR comm.direction <> 'outbound' THEN RETURN; END IF;

  SELECT * INTO c FROM public.contacts WHERE id = comm.contact_id;
  IF NOT FOUND THEN RETURN; END IF;

  -- Try resolve country from raw data of any imported lead
  SELECT raw_data->>'country' INTO country
    FROM public.imported_leads
   WHERE contact_id = c.id LIMIT 1;
  country := COALESCE(NULLIF(country,''), 'GLOBAL');

  SELECT * INTO jp FROM public.jurisdiction_profiles WHERE country = country LIMIT 1;

  -- a) DO_NOT_CONTACT being messaged
  IF c.status = 'DO_NOT_CONTACT' THEN
    PERFORM public.log_compliance_event(
      'outreach_do_not_contact','message', comm.id, c.assigned_business, country,
      'DO_NOT_CONTACT_VIOLATION',
      'Outbound communication recorded against DO_NOT_CONTACT contact ' || c.email,
      jsonb_build_object('contact_id', c.id, 'channel', comm.channel)
    );
  END IF;

  -- b) Consent missing in jurisdictions that require it
  IF jp.consent_required IS TRUE THEN
    PERFORM public.log_compliance_event(
      'outreach_consent_required','message', comm.id, c.assigned_business, country,
      'CONSENT_NOT_RECORDED',
      'Outbound to ' || c.email || ' in ' || country || ' — consent flag not stored',
      jsonb_build_object('contact_id', c.id)
    );
  END IF;

  -- c) Frequency cap — > 5 outbound/contact in last 24h
  SELECT COUNT(*) INTO recent_count FROM public.communications
   WHERE contact_id = c.id AND direction = 'outbound'
     AND timestamp > now() - interval '24 hours';
  IF recent_count > 5 THEN
    PERFORM public.log_compliance_event(
      'outreach_frequency_cap','contact', c.id, c.assigned_business, country,
      'FREQUENCY_CAP_EXCEEDED',
      'Contact ' || c.email || ' received ' || recent_count || ' outbound messages in 24h',
      jsonb_build_object('count_24h', recent_count)
    );
  END IF;

  -- d) Unsubscribe language placeholder check (email channel)
  IF comm.channel = 'email' AND POSITION('unsubscribe' IN lower(COALESCE(comm.message,''))) = 0 THEN
    PERFORM public.log_compliance_event(
      'outreach_unsubscribe_missing','message', comm.id, c.assigned_business, country,
      'UNSUBSCRIBE_MISSING',
      'Outbound email to ' || c.email || ' missing unsubscribe language',
      '{}'::jsonb
    );
  END IF;
END; $function$;

CREATE OR REPLACE FUNCTION public.compliance_check_contact(_contact_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  c public.contacts;
  country text;
  jp public.jurisdiction_profiles;
BEGIN
  SELECT * INTO c FROM public.contacts WHERE id = _contact_id;
  IF NOT FOUND THEN RETURN; END IF;

  SELECT raw_data->>'country' INTO country
    FROM public.imported_leads WHERE contact_id = c.id LIMIT 1;
  country := COALESCE(NULLIF(country,''), 'GLOBAL');

  -- a) Personal data without source
  IF COALESCE(c.source,'') = '' THEN
    PERFORM public.log_compliance_event(
      'data_source_missing','contact', c.id, c.assigned_business, country,
      'PERSONAL_DATA_NO_SOURCE',
      'Contact ' || c.email || ' stored without recorded data source',
      '{}'::jsonb
    );
  END IF;

  -- b) Cross-border (contact country differs from business default)
  SELECT * INTO jp FROM public.jurisdiction_profiles WHERE country = country LIMIT 1;
  IF jp.gdpr_applicable IS TRUE AND COALESCE(c.assigned_business,'') NOT IN ('','UK','EU') THEN
    PERFORM public.log_compliance_event(
      'data_cross_border','contact', c.id, c.assigned_business, country,
      'CROSS_BORDER_TRANSFER',
      'Contact in GDPR jurisdiction (' || country || ') assigned to non-EU/UK business ' || c.assigned_business,
      '{}'::jsonb
    );
  END IF;
END; $function$;

CREATE OR REPLACE FUNCTION public.compliance_check_demo(_demo_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE d public.demo_access;
BEGIN
  SELECT * INTO d FROM public.demo_access WHERE id = _demo_id;
  IF NOT FOUND THEN RETURN; END IF;

  -- Token length / weak token
  IF length(COALESCE(d.demo_token,'')) < 24 THEN
    PERFORM public.log_compliance_event(
      'demo_weak_token','demo', d.id, d.business_name, 'GLOBAL',
      'WEAK_DEMO_TOKEN',
      'Demo access created with token shorter than 24 chars',
      jsonb_build_object('token_length', length(COALESCE(d.demo_token,'')))
    );
  END IF;

  -- Expiry > 60 days
  IF d.expires_at > now() + interval '60 days' THEN
    PERFORM public.log_compliance_event(
      'demo_long_expiry','demo', d.id, d.business_name, 'GLOBAL',
      'DEMO_LONG_EXPIRY',
      'Demo expiry exceeds 60 days — exposure window risk',
      jsonb_build_object('expires_at', d.expires_at)
    );
  END IF;
END; $function$;

CREATE OR REPLACE FUNCTION public.compliance_check_proposal(_proposal_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  p public.internal_proposals;
  has_template boolean;
BEGIN
  SELECT * INTO p FROM public.internal_proposals WHERE id = _proposal_id;
  IF NOT FOUND THEN RETURN; END IF;

  -- a) Missing "non-binding estimate" wording in scope/cost fields
  IF POSITION('non-binding' IN lower(
        COALESCE(p.estimated_cost_range,'') || ' ' ||
        COALESCE(p.estimated_scope,'')      || ' ' ||
        COALESCE(p.estimated_roi_summary,'')
      )) = 0 THEN
    PERFORM public.log_compliance_event(
      'proposal_non_binding_missing','proposal', p.id, p.business_name, 'GLOBAL',
      'NON_BINDING_LANGUAGE_MISSING',
      'Proposal ' || COALESCE(p.title,'') || ' missing non-binding estimate wording',
      '{}'::jsonb
    );
  END IF;

  -- b) Missing contract template for business
  SELECT EXISTS(
    SELECT 1 FROM public.contract_templates
     WHERE active = true
       AND (business_name = p.business_name OR business_name = '')
  ) INTO has_template;
  IF NOT has_template THEN
    PERFORM public.log_compliance_event(
      'proposal_template_missing','proposal', p.id, p.business_name, 'GLOBAL',
      'CONTRACT_TEMPLATE_MISSING',
      'No active contract template registered for business ' || COALESCE(p.business_name,'(unset)'),
      '{}'::jsonb
    );
  END IF;
END; $function$;

CREATE OR REPLACE FUNCTION public.compliance_check_assignment(_assignment_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  a public.assignments;
  s public.suppliers;
BEGIN
  SELECT * INTO a FROM public.assignments WHERE id = _assignment_id;
  IF NOT FOUND THEN RETURN; END IF;
  SELECT * INTO s FROM public.suppliers WHERE id = a.supplier_id;

  -- Supplier not approved (defence in depth — guard already blocks in DB)
  IF s.status <> 'APPROVED' THEN
    PERFORM public.log_compliance_event(
      'delivery_supplier_not_approved','assignment', a.id, a.business_name, 'GLOBAL',
      'SUPPLIER_NOT_APPROVED',
      'Assignment created against non-approved supplier ' || s.email || ' (' || s.status || ')',
      '{}'::jsonb
    );
  END IF;

  -- Supplier vs client business mismatch (jurisdiction proxy)
  IF COALESCE(s.business_name,'') <> '' AND COALESCE(a.business_name,'') <> ''
     AND s.business_name <> a.business_name THEN
    PERFORM public.log_compliance_event(
      'delivery_jurisdiction_mismatch','assignment', a.id, a.business_name, 'GLOBAL',
      'JURISDICTION_MISMATCH',
      'Supplier business ' || s.business_name || ' ≠ assignment business ' || a.business_name,
      '{}'::jsonb
    );
  END IF;

  -- Missing SLA
  IF a.expected_completion_date IS NULL THEN
    PERFORM public.log_compliance_event(
      'delivery_sla_missing','assignment', a.id, a.business_name, 'GLOBAL',
      'SLA_MISSING',
      'Assignment created without expected_completion_date',
      '{}'::jsonb
    );
  END IF;
END; $function$;

CREATE OR REPLACE FUNCTION public.compliance_check_invoice(_invoice_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  inv public.invoices;
  expected numeric;
BEGIN
  SELECT * INTO inv FROM public.invoices WHERE id = _invoice_id;
  IF NOT FOUND THEN RETURN; END IF;

  expected := COALESCE(inv.expected_amount, (COALESCE(inv.amount_min,0)+COALESCE(inv.amount_max,0))/2.0);

  IF inv.status IN ('OVERDUE','PARTIALLY_PAID')
     AND inv.due_date IS NOT NULL
     AND inv.due_date < CURRENT_DATE - interval '14 days' THEN
    PERFORM public.log_compliance_event(
      'finance_overdue_14d','invoice', inv.id, inv.business_name, 'GLOBAL',
      'INVOICE_OVERDUE_14D',
      'Invoice ' || inv.invoice_number || ' overdue >14 days',
      jsonb_build_object('due_date', inv.due_date, 'amount', expected)
    );
  END IF;

  IF expected >= 50000 THEN
    PERFORM public.log_compliance_event(
      'finance_large_value','invoice', inv.id, inv.business_name, 'GLOBAL',
      'LARGE_VALUE_INVOICE',
      'Invoice ' || inv.invoice_number || ' >= 50k — review threshold',
      jsonb_build_object('amount', expected)
    );
  END IF;
END; $function$;

CREATE OR REPLACE FUNCTION public.compliance_check_payment(_payment_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE p public.payments; inv public.invoices;
BEGIN
  SELECT * INTO p FROM public.payments WHERE id = _payment_id;
  IF NOT FOUND THEN RETURN; END IF;

  SELECT * INTO inv FROM public.invoices WHERE id = p.invoice_id;
  IF NOT FOUND THEN
    PERFORM public.log_compliance_event(
      'finance_payment_orphan','payment', p.id, '', 'GLOBAL',
      'PAYMENT_WITHOUT_INVOICE',
      'Payment ' || p.id::text || ' has no matching invoice',
      jsonb_build_object('amount', p.amount_received)
    );
  END IF;
END; $function$;

-- 7. Public dispatcher
CREATE OR REPLACE FUNCTION public.run_compliance_checks(
  _entity_type public.compliance_entity_type, _entity_id uuid
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  CASE _entity_type
    WHEN 'message'    THEN PERFORM public.compliance_check_outbound_communication(_entity_id);
    WHEN 'contact'    THEN PERFORM public.compliance_check_contact(_entity_id);
    WHEN 'demo'       THEN PERFORM public.compliance_check_demo(_entity_id);
    WHEN 'proposal'   THEN PERFORM public.compliance_check_proposal(_entity_id);
    WHEN 'assignment' THEN PERFORM public.compliance_check_assignment(_entity_id);
    WHEN 'invoice'    THEN PERFORM public.compliance_check_invoice(_entity_id);
    WHEN 'payment'    THEN PERFORM public.compliance_check_payment(_entity_id);
    ELSE NULL;
  END CASE;
END; $function$;

GRANT EXECUTE ON FUNCTION public.run_compliance_checks(public.compliance_entity_type, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.recompute_compliance_score(public.compliance_entity_type, uuid) TO authenticated;

-- 8. Triggers (AFTER INSERT/UPDATE — never block)
CREATE OR REPLACE FUNCTION public.trg_compliance_communication()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
  IF NEW.direction = 'outbound' THEN
    PERFORM public.compliance_check_outbound_communication(NEW.id);
  END IF;
  RETURN NEW;
END; $function$;

DROP TRIGGER IF EXISTS trg_compliance_communications ON public.communications;
CREATE TRIGGER trg_compliance_communications
  AFTER INSERT ON public.communications
  FOR EACH ROW EXECUTE FUNCTION public.trg_compliance_communication();

CREATE OR REPLACE FUNCTION public.trg_compliance_contact()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN PERFORM public.compliance_check_contact(NEW.id); RETURN NEW; END; $function$;

DROP TRIGGER IF EXISTS trg_compliance_contacts ON public.contacts;
CREATE TRIGGER trg_compliance_contacts
  AFTER INSERT ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION public.trg_compliance_contact();

CREATE OR REPLACE FUNCTION public.trg_compliance_demo()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN PERFORM public.compliance_check_demo(NEW.id); RETURN NEW; END; $function$;

DROP TRIGGER IF EXISTS trg_compliance_demos ON public.demo_access;
CREATE TRIGGER trg_compliance_demos
  AFTER INSERT ON public.demo_access
  FOR EACH ROW EXECUTE FUNCTION public.trg_compliance_demo();

CREATE OR REPLACE FUNCTION public.trg_compliance_proposal()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
  IF TG_OP = 'INSERT'
     OR (TG_OP = 'UPDATE' AND NEW.status = 'sent' AND OLD.status IS DISTINCT FROM 'sent') THEN
    PERFORM public.compliance_check_proposal(NEW.id);
  END IF;
  RETURN NEW;
END; $function$;

DROP TRIGGER IF EXISTS trg_compliance_proposals ON public.internal_proposals;
CREATE TRIGGER trg_compliance_proposals
  AFTER INSERT OR UPDATE OF status ON public.internal_proposals
  FOR EACH ROW EXECUTE FUNCTION public.trg_compliance_proposal();

CREATE OR REPLACE FUNCTION public.trg_compliance_assignment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN PERFORM public.compliance_check_assignment(NEW.id); RETURN NEW; END; $function$;

DROP TRIGGER IF EXISTS trg_compliance_assignments ON public.assignments;
CREATE TRIGGER trg_compliance_assignments
  AFTER INSERT ON public.assignments
  FOR EACH ROW EXECUTE FUNCTION public.trg_compliance_assignment();

CREATE OR REPLACE FUNCTION public.trg_compliance_invoice()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN PERFORM public.compliance_check_invoice(NEW.id); RETURN NEW; END; $function$;

DROP TRIGGER IF EXISTS trg_compliance_invoices ON public.invoices;
CREATE TRIGGER trg_compliance_invoices
  AFTER INSERT OR UPDATE OF status, due_date ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.trg_compliance_invoice();

CREATE OR REPLACE FUNCTION public.trg_compliance_payment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN PERFORM public.compliance_check_payment(NEW.id); RETURN NEW; END; $function$;

DROP TRIGGER IF EXISTS trg_compliance_payments ON public.payments;
CREATE TRIGGER trg_compliance_payments
  AFTER INSERT ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.trg_compliance_payment();

-- 9. Updated_at trigger
DROP TRIGGER IF EXISTS trg_compliance_rules_updated ON public.compliance_rules;
CREATE TRIGGER trg_compliance_rules_updated BEFORE UPDATE ON public.compliance_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_jurisdiction_profiles_updated ON public.jurisdiction_profiles;
CREATE TRIGGER trg_jurisdiction_profiles_updated BEFORE UPDATE ON public.jurisdiction_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_contract_templates_updated ON public.contract_templates;
CREATE TRIGGER trg_contract_templates_updated BEFORE UPDATE ON public.contract_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 10. Seed jurisdictions
INSERT INTO public.jurisdiction_profiles (country, region, gdpr_applicable, email_marketing_allowed, consent_required, data_transfer_restrictions, notes)
VALUES
  ('UK',     'Europe',        true,  true, true,  'Adequacy with EU; SCCs for non-adequate countries', 'UK GDPR + PECR'),
  ('EU',     'Europe',        true,  true, true,  'SCCs required for transfers outside EEA',           'GDPR + ePrivacy'),
  ('US',     'North America', false, true, false, 'No federal GDPR; state laws (CCPA, CPRA, etc.)',   'CAN-SPAM (opt-out)'),
  ('CA',     'North America', false, true, true,  'PIPEDA; cross-border allowed with safeguards',     'CASL (opt-in)'),
  ('AE',     'Middle East',   false, true, false, 'PDPL applies; light email rules',                  'UAE PDPL'),
  ('GLOBAL', 'Global',        false, true, false, 'Default fallback profile',                          'Used when contact has no country')
ON CONFLICT (country) DO NOTHING;

-- 11. Seed baseline rules
INSERT INTO public.compliance_rules (name, category, jurisdiction, severity, description) VALUES
  ('outreach_do_not_contact',         'outreach',     'GLOBAL', 'critical', 'Outbound message attempted against DO_NOT_CONTACT contact'),
  ('outreach_consent_required',       'outreach',     'EU',     'high',     'Outbound to GDPR jurisdiction without recorded consent'),
  ('outreach_frequency_cap',          'outreach',     'GLOBAL', 'medium',   'More than 5 outbound messages to a contact in 24 hours'),
  ('outreach_unsubscribe_missing',    'outreach',     'GLOBAL', 'medium',   'Outbound email missing unsubscribe language'),
  ('data_source_missing',             'data_privacy', 'GLOBAL', 'low',      'Personal data stored without recorded source'),
  ('data_cross_border',               'data_privacy', 'EU',     'high',     'GDPR contact assigned to non-EU/UK business — cross-border transfer risk'),
  ('demo_weak_token',                 'data_privacy', 'GLOBAL', 'high',     'Demo access token shorter than 24 chars'),
  ('demo_long_expiry',                'data_privacy', 'GLOBAL', 'medium',   'Demo expiry exceeds 60 days'),
  ('proposal_non_binding_missing',    'contracts',    'GLOBAL', 'medium',   'Proposal missing non-binding estimate wording'),
  ('proposal_template_missing',       'contracts',    'GLOBAL', 'medium',   'No active contract template registered for business'),
  ('delivery_supplier_not_approved',  'delivery',     'GLOBAL', 'critical', 'Assignment to non-approved supplier'),
  ('delivery_jurisdiction_mismatch',  'delivery',     'GLOBAL', 'medium',   'Supplier business differs from assignment business'),
  ('delivery_sla_missing',            'delivery',     'GLOBAL', 'low',      'Assignment created without expected_completion_date'),
  ('finance_overdue_14d',             'payments',     'GLOBAL', 'high',     'Invoice overdue more than 14 days'),
  ('finance_large_value',             'payments',     'GLOBAL', 'medium',   'Invoice value at or above 50k — review threshold'),
  ('finance_payment_orphan',          'payments',     'GLOBAL', 'critical', 'Payment recorded without matching invoice')
ON CONFLICT DO NOTHING;