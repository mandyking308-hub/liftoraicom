-- ============================================================
-- CRM + SANITY CONTROL LAYER
-- ============================================================

-- Status enum for contacts
DO $$ BEGIN
  CREATE TYPE public.contact_status AS ENUM (
    'NEW', 'CONTACTED', 'ENGAGED', 'QUALIFIED', 'CLIENT', 'SUPPLIER', 'DO_NOT_CONTACT'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.communication_channel AS ENUM ('email', 'whatsapp', 'linkedin');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.communication_direction AS ENUM ('outbound', 'inbound');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.email_event_type AS ENUM (
    'sent', 'delivered', 'opened', 'clicked', 'replied', 'bounced'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.inbox_warmup_status AS ENUM ('new', 'warming', 'active');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ============================================================
-- INBOXES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.inboxes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email_address text NOT NULL UNIQUE,
  business_name text NOT NULL DEFAULT '',
  daily_send_limit integer NOT NULL DEFAULT 50,
  current_send_count integer NOT NULL DEFAULT 0,
  warmup_status public.inbox_warmup_status NOT NULL DEFAULT 'new',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.inboxes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders can manage inboxes"
  ON public.inboxes FOR ALL
  USING (public.has_role(auth.uid(), 'founder'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'founder'::app_role));

CREATE TRIGGER inboxes_updated_at
  BEFORE UPDATE ON public.inboxes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- CONTACTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  name text NOT NULL DEFAULT '',
  company text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT '',
  status public.contact_status NOT NULL DEFAULT 'NEW',
  source text NOT NULL DEFAULT '',
  assigned_business text NOT NULL DEFAULT '',
  assigned_inbox_id uuid REFERENCES public.inboxes(id) ON DELETE SET NULL,
  last_contacted_at timestamptz,
  last_replied_at timestamptz,
  conversation_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS contacts_status_idx ON public.contacts(status);
CREATE INDEX IF NOT EXISTS contacts_assigned_business_idx ON public.contacts(assigned_business);
CREATE INDEX IF NOT EXISTS contacts_conversation_active_idx ON public.contacts(conversation_active);

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders can manage contacts"
  ON public.contacts FOR ALL
  USING (public.has_role(auth.uid(), 'founder'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'founder'::app_role));

CREATE TRIGGER contacts_updated_at
  BEFORE UPDATE ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- COMMUNICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.communications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  channel public.communication_channel NOT NULL DEFAULT 'email',
  direction public.communication_direction NOT NULL,
  message text NOT NULL DEFAULT '',
  inbox_id uuid REFERENCES public.inboxes(id) ON DELETE SET NULL,
  ai_generated boolean NOT NULL DEFAULT false,
  "timestamp" timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS communications_contact_idx ON public.communications(contact_id);
CREATE INDEX IF NOT EXISTS communications_timestamp_idx ON public.communications("timestamp" DESC);

ALTER TABLE public.communications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders can manage communications"
  ON public.communications FOR ALL
  USING (public.has_role(auth.uid(), 'founder'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'founder'::app_role));

-- ============================================================
-- EMAIL EVENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.email_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  email_id text NOT NULL DEFAULT '',
  event_type public.email_event_type NOT NULL,
  "timestamp" timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS email_events_contact_idx ON public.email_events(contact_id);
CREATE INDEX IF NOT EXISTS email_events_type_idx ON public.email_events(event_type);
CREATE INDEX IF NOT EXISTS email_events_timestamp_idx ON public.email_events("timestamp" DESC);

ALTER TABLE public.email_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders can manage email events"
  ON public.email_events FOR ALL
  USING (public.has_role(auth.uid(), 'founder'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'founder'::app_role));

-- ============================================================
-- CONVERSATION STATE TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_communication()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.direction = 'inbound' THEN
    UPDATE public.contacts
       SET conversation_active = true,
           last_replied_at = NEW."timestamp",
           status = CASE
             WHEN status IN ('NEW', 'CONTACTED') THEN 'ENGAGED'::contact_status
             ELSE status
           END
     WHERE id = NEW.contact_id;
  ELSIF NEW.direction = 'outbound' THEN
    UPDATE public.contacts
       SET last_contacted_at = NEW."timestamp",
           status = CASE
             WHEN status = 'NEW' THEN 'CONTACTED'::contact_status
             ELSE status
           END
     WHERE id = NEW.contact_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS communications_state_trigger ON public.communications;
CREATE TRIGGER communications_state_trigger
  AFTER INSERT ON public.communications
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_communication();

-- ============================================================
-- BOUNCE HANDLER
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_email_bounce()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.event_type = 'bounced' THEN
    UPDATE public.contacts
       SET status = 'DO_NOT_CONTACT'::contact_status
     WHERE id = NEW.contact_id;
  ELSIF NEW.event_type = 'replied' THEN
    UPDATE public.contacts
       SET conversation_active = true,
           last_replied_at = NEW."timestamp"
     WHERE id = NEW.contact_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS email_events_bounce_trigger ON public.email_events;
CREATE TRIGGER email_events_bounce_trigger
  AFTER INSERT ON public.email_events
  FOR EACH ROW EXECUTE FUNCTION public.handle_email_bounce();

-- ============================================================
-- 7-DAY INACTIVITY SWEEP (called by sanity-check function or cron)
-- ============================================================
CREATE OR REPLACE FUNCTION public.expire_inactive_conversations()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected integer;
BEGIN
  UPDATE public.contacts
     SET conversation_active = false
   WHERE conversation_active = true
     AND (last_replied_at IS NULL OR last_replied_at < (now() - interval '7 days'));
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;

-- ============================================================
-- OUTREACH SANITY CHECK (RPC)
-- ============================================================
CREATE OR REPLACE FUNCTION public.check_outreach_allowed(_contact_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c public.contacts%ROWTYPE;
  recent_bounce boolean;
BEGIN
  SELECT * INTO c FROM public.contacts WHERE id = _contact_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'CONTACT_NOT_FOUND');
  END IF;

  IF c.status = 'DO_NOT_CONTACT' THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'DO_NOT_CONTACT');
  END IF;

  IF c.status IN ('ENGAGED', 'QUALIFIED', 'CLIENT') THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'STATUS_BLOCKED', 'status', c.status);
  END IF;

  IF c.conversation_active = true THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'CONVERSATION_ACTIVE');
  END IF;

  IF c.last_contacted_at IS NOT NULL AND c.last_contacted_at > (now() - interval '48 hours') THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'RECENTLY_CONTACTED', 'last_contacted_at', c.last_contacted_at);
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.email_events
     WHERE contact_id = _contact_id AND event_type = 'bounced'
  ) INTO recent_bounce;

  IF recent_bounce THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'EMAIL_BOUNCED');
  END IF;

  IF c.assigned_inbox_id IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'NO_INBOX_ASSIGNED');
  END IF;

  RETURN jsonb_build_object('allowed', true, 'inbox_id', c.assigned_inbox_id);
END;
$$;

-- ============================================================
-- DUPLICATE-SAFE UPSERT HELPER
-- ============================================================
CREATE OR REPLACE FUNCTION public.upsert_contact(
  _email text,
  _name text DEFAULT NULL,
  _company text DEFAULT NULL,
  _role text DEFAULT NULL,
  _source text DEFAULT NULL,
  _assigned_business text DEFAULT NULL,
  _assigned_inbox_id uuid DEFAULT NULL
)
RETURNS public.contacts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result public.contacts;
BEGIN
  INSERT INTO public.contacts (email, name, company, role, source, assigned_business, assigned_inbox_id)
  VALUES (
    lower(_email),
    COALESCE(_name, ''),
    COALESCE(_company, ''),
    COALESCE(_role, ''),
    COALESCE(_source, ''),
    COALESCE(_assigned_business, ''),
    _assigned_inbox_id
  )
  ON CONFLICT (email) DO UPDATE
    SET name = COALESCE(NULLIF(EXCLUDED.name, ''), public.contacts.name),
        company = COALESCE(NULLIF(EXCLUDED.company, ''), public.contacts.company),
        role = COALESCE(NULLIF(EXCLUDED.role, ''), public.contacts.role),
        source = COALESCE(NULLIF(EXCLUDED.source, ''), public.contacts.source),
        assigned_business = COALESCE(NULLIF(EXCLUDED.assigned_business, ''), public.contacts.assigned_business),
        updated_at = now()
  RETURNING * INTO result;
  RETURN result;
END;
$$;