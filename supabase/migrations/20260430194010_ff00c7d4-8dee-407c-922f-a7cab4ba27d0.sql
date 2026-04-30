-- ===== Enums =====
DO $$ BEGIN CREATE TYPE public.ai_reply_mode AS ENUM ('disabled','draft_only','approval_required','auto_send'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.inbound_provider_type AS ENUM ('none','ionos_imap'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.inbound_status_type AS ENUM ('not_configured','forwarding_required','configured_not_tested','inbound_test_passed','live_ready','error'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.ai_draft_status AS ENUM ('pending','approved','rejected','sent','superseded'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.inboxes
  ADD COLUMN IF NOT EXISTS ai_reply_mode public.ai_reply_mode NOT NULL DEFAULT 'approval_required',
  ADD COLUMN IF NOT EXISTS inbound_provider public.inbound_provider_type NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS inbound_status public.inbound_status_type NOT NULL DEFAULT 'not_configured',
  ADD COLUMN IF NOT EXISTS inbound_polling_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS monitored_mailbox text,
  ADD COLUMN IF NOT EXISTS last_poll_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_inbound_message_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_inbound_error text;

ALTER TABLE public.inbox_credentials
  ADD COLUMN IF NOT EXISTS imap_host text,
  ADD COLUMN IF NOT EXISTS imap_port integer,
  ADD COLUMN IF NOT EXISTS imap_ssl boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS imap_username text,
  ADD COLUMN IF NOT EXISTS imap_password_enc bytea,
  ADD COLUMN IF NOT EXISTS imap_password_set_at timestamptz;

CREATE TABLE IF NOT EXISTS public.inbound_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inbox_id uuid NOT NULL REFERENCES public.inboxes(id) ON DELETE CASCADE,
  message_id text NOT NULL,
  in_reply_to text,
  references_header text,
  from_email text NOT NULL,
  to_email text,
  subject text,
  body_text text,
  body_html text,
  is_bounce boolean NOT NULL DEFAULT false,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE SET NULL,
  campaign_id uuid REFERENCES public.outreach_campaigns(id) ON DELETE SET NULL,
  processing_status text NOT NULL DEFAULT 'received',
  processing_error text,
  received_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT inbound_messages_unique_per_inbox UNIQUE (inbox_id, message_id)
);
CREATE INDEX IF NOT EXISTS idx_inbound_messages_contact ON public.inbound_messages(contact_id);
CREATE INDEX IF NOT EXISTS idx_inbound_messages_received_at ON public.inbound_messages(received_at DESC);
ALTER TABLE public.inbound_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Founders manage inbound messages" ON public.inbound_messages;
CREATE POLICY "Founders manage inbound messages" ON public.inbound_messages
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'founder'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'founder'::public.app_role));

CREATE TABLE IF NOT EXISTS public.ai_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  inbox_id uuid REFERENCES public.inboxes(id) ON DELETE SET NULL,
  classification text,
  suggested_tags text[] DEFAULT '{}',
  draft_body text NOT NULL,
  status public.ai_draft_status NOT NULL DEFAULT 'pending',
  triggered_by_inbound_id uuid REFERENCES public.inbound_messages(id) ON DELETE SET NULL,
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  sent_at timestamptz,
  edited_body text,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ai_drafts_conversation ON public.ai_drafts(conversation_id);
CREATE INDEX IF NOT EXISTS idx_ai_drafts_status ON public.ai_drafts(status);
ALTER TABLE public.ai_drafts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Founders manage ai drafts" ON public.ai_drafts;
CREATE POLICY "Founders manage ai drafts" ON public.ai_drafts
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'founder'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'founder'::public.app_role));

DROP TRIGGER IF EXISTS trg_ai_drafts_updated_at ON public.ai_drafts;
CREATE TRIGGER trg_ai_drafts_updated_at BEFORE UPDATE ON public.ai_drafts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.save_inbox_inbound_config(
  _inbox_id uuid, _inbound_provider text, _imap_host text, _imap_port integer,
  _imap_ssl boolean, _imap_username text, _imap_password text, _reuse_smtp_password boolean,
  _polling_enabled boolean, _monitored_mailbox text, _enc_key text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions, pg_catalog AS $$
DECLARE v_pwd_enc bytea; v_set_at timestamptz; v_existing_pwd bytea; v_existing_smtp_pwd bytea;
BEGIN
  IF _inbound_provider NOT IN ('none','ionos_imap') THEN RAISE EXCEPTION 'invalid inbound_provider %', _inbound_provider; END IF;
  IF _enc_key IS NULL OR length(_enc_key) < 16 THEN RAISE EXCEPTION 'encryption key missing or too short'; END IF;
  SELECT imap_password_enc, smtp_password_enc INTO v_existing_pwd, v_existing_smtp_pwd FROM public.inbox_credentials WHERE inbox_id = _inbox_id;
  IF _reuse_smtp_password IS TRUE THEN
    IF v_existing_smtp_pwd IS NULL THEN RAISE EXCEPTION 'cannot reuse SMTP password — none stored'; END IF;
    v_pwd_enc := v_existing_smtp_pwd; v_set_at := now();
  ELSIF _imap_password IS NOT NULL AND length(_imap_password) > 0 THEN
    v_pwd_enc := pgp_sym_encrypt(_imap_password, _enc_key); v_set_at := now();
  ELSE
    v_pwd_enc := v_existing_pwd; v_set_at := (SELECT imap_password_set_at FROM public.inbox_credentials WHERE inbox_id = _inbox_id);
  END IF;
  INSERT INTO public.inbox_credentials (
    inbox_id, provider_type, imap_host, imap_port, imap_ssl, imap_username, imap_password_enc, imap_password_set_at
  ) VALUES (
    _inbox_id,
    COALESCE((SELECT provider_type FROM public.inbox_credentials WHERE inbox_id = _inbox_id), 'simulated')::public.inbox_provider_type,
    _imap_host, _imap_port, COALESCE(_imap_ssl, true), _imap_username, v_pwd_enc, v_set_at
  ) ON CONFLICT (inbox_id) DO UPDATE
    SET imap_host = EXCLUDED.imap_host, imap_port = EXCLUDED.imap_port, imap_ssl = EXCLUDED.imap_ssl,
        imap_username = EXCLUDED.imap_username, imap_password_enc = EXCLUDED.imap_password_enc,
        imap_password_set_at = EXCLUDED.imap_password_set_at, updated_at = now();
  UPDATE public.inboxes
     SET inbound_provider = _inbound_provider::public.inbound_provider_type,
         inbound_polling_enabled = COALESCE(_polling_enabled, false),
         monitored_mailbox = _monitored_mailbox,
         inbound_status = CASE
           WHEN _inbound_provider = 'none' THEN 'not_configured'::public.inbound_status_type
           WHEN inbound_status IN ('inbound_test_passed','live_ready') THEN inbound_status
           ELSE 'configured_not_tested'::public.inbound_status_type END,
         updated_at = now()
   WHERE id = _inbox_id;
  RETURN jsonb_build_object('ok', true);
END; $$;
REVOKE ALL ON FUNCTION public.save_inbox_inbound_config(uuid,text,text,integer,boolean,text,text,boolean,boolean,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_inbox_inbound_config(uuid,text,text,integer,boolean,text,text,boolean,boolean,text,text) TO service_role;

CREATE OR REPLACE FUNCTION public.get_inbox_imap_credentials(_inbox_id uuid, _enc_key text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions, pg_catalog AS $$
DECLARE c public.inbox_credentials%ROWTYPE; i public.inboxes%ROWTYPE; v_pwd text;
BEGIN
  IF _enc_key IS NULL THEN RAISE EXCEPTION 'enc key required'; END IF;
  SELECT * INTO c FROM public.inbox_credentials WHERE inbox_id = _inbox_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'credentials not found'; END IF;
  SELECT * INTO i FROM public.inboxes WHERE id = _inbox_id;
  IF c.imap_password_enc IS NOT NULL THEN v_pwd := pgp_sym_decrypt(c.imap_password_enc, _enc_key); END IF;
  RETURN jsonb_build_object(
    'inbox_id', c.inbox_id, 'imap_host', c.imap_host, 'imap_port', c.imap_port,
    'imap_ssl', c.imap_ssl, 'imap_username', c.imap_username, 'imap_password', v_pwd,
    'monitored_mailbox', i.monitored_mailbox, 'inbound_provider', i.inbound_provider,
    'polling_enabled', i.inbound_polling_enabled, 'email_address', i.email_address);
END; $$;
REVOKE ALL ON FUNCTION public.get_inbox_imap_credentials(uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_inbox_imap_credentials(uuid,text) TO service_role;

CREATE OR REPLACE FUNCTION public.record_inbound_poll(_inbox_id uuid, _ok boolean, _error text, _new_messages integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_catalog AS $$
BEGIN
  UPDATE public.inboxes
     SET last_poll_at = now(),
         last_inbound_error = CASE WHEN _ok THEN NULL ELSE _error END,
         last_inbound_message_at = CASE WHEN COALESCE(_new_messages,0) > 0 THEN now() ELSE last_inbound_message_at END,
         inbound_status = CASE
           WHEN NOT _ok THEN 'error'::public.inbound_status_type
           WHEN COALESCE(_new_messages,0) > 0 AND inbound_status <> 'live_ready' THEN 'live_ready'::public.inbound_status_type
           WHEN inbound_status = 'configured_not_tested' AND _ok THEN 'inbound_test_passed'::public.inbound_status_type
           ELSE inbound_status END,
         updated_at = now()
   WHERE id = _inbox_id;
END; $$;
REVOKE ALL ON FUNCTION public.record_inbound_poll(uuid,boolean,text,integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_inbound_poll(uuid,boolean,text,integer) TO service_role;

DROP FUNCTION IF EXISTS public.list_inbox_credentials_public(uuid);
CREATE OR REPLACE FUNCTION public.list_inbox_credentials_public(_inbox_id uuid)
RETURNS TABLE(
  inbox_id uuid, provider_type text, smtp_host text, smtp_port integer, smtp_username text,
  smtp_encryption text, password_is_set boolean, password_set_at timestamptz,
  imap_host text, imap_port integer, imap_ssl boolean, imap_username text,
  imap_password_is_set boolean, imap_password_set_at timestamptz)
LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
  SELECT c.inbox_id, c.provider_type::text, c.smtp_host, c.smtp_port, c.smtp_username,
    c.smtp_encryption, (c.smtp_password_enc IS NOT NULL), c.password_set_at,
    c.imap_host, c.imap_port, c.imap_ssl, c.imap_username,
    (c.imap_password_enc IS NOT NULL), c.imap_password_set_at
  FROM public.inbox_credentials c
  WHERE c.inbox_id = _inbox_id AND public.has_role(auth.uid(), 'founder'::public.app_role);
$$;
GRANT EXECUTE ON FUNCTION public.list_inbox_credentials_public(uuid) TO authenticated;