
-- Provider model + encrypted credentials + readiness fields for outbound email
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Provider type enum
DO $$ BEGIN
  CREATE TYPE public.inbox_provider_type AS ENUM ('simulated', 'ionos_smtp');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.inbox_live_readiness AS ENUM (
    'simulated_only','not_configured','configured_not_tested',
    'test_failed','test_passed','live_ready','paused','error'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Extend inboxes
ALTER TABLE public.inboxes
  ADD COLUMN IF NOT EXISTS provider_type public.inbox_provider_type NOT NULL DEFAULT 'simulated',
  ADD COLUMN IF NOT EXISTS live_readiness public.inbox_live_readiness NOT NULL DEFAULT 'simulated_only',
  ADD COLUMN IF NOT EXISTS last_test_send_status text,
  ADD COLUMN IF NOT EXISTS last_test_send_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_test_send_to text,
  ADD COLUMN IF NOT EXISTS last_error_message text,
  ADD COLUMN IF NOT EXISTS from_name text,
  ADD COLUMN IF NOT EXISTS from_email text,
  ADD COLUMN IF NOT EXISTS reply_to_email text;

-- 3. Encrypted credentials table — locked down, no client access
CREATE TABLE IF NOT EXISTS public.inbox_credentials (
  inbox_id uuid PRIMARY KEY REFERENCES public.inboxes(id) ON DELETE CASCADE,
  provider_type public.inbox_provider_type NOT NULL,
  smtp_host text,
  smtp_port int,
  smtp_username text,
  smtp_encryption text, -- 'starttls' | 'ssl'
  -- ciphertext only, never plaintext
  smtp_password_enc bytea,
  password_set_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.inbox_credentials ENABLE ROW LEVEL SECURITY;
-- No policies = no client/anon/authenticated access. Only service_role bypass.
REVOKE ALL ON public.inbox_credentials FROM anon, authenticated;

-- 4. Founder admin check helper (reuse if exists)
-- Assume has_role(uid, 'admin') exists per project memory. We'll guard RPCs with it.

-- 5. RPC: save credentials (encrypts password using key passed by edge function)
CREATE OR REPLACE FUNCTION public.save_inbox_credentials(
  _inbox_id uuid,
  _provider_type text,
  _smtp_host text,
  _smtp_port int,
  _smtp_username text,
  _smtp_encryption text,
  _smtp_password text,
  _from_name text,
  _from_email text,
  _reply_to_email text,
  _enc_key text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog
AS $$
DECLARE
  v_pwd_enc bytea;
  v_set_at timestamptz;
  v_existing_pwd bytea;
BEGIN
  IF _provider_type NOT IN ('simulated','ionos_smtp') THEN
    RAISE EXCEPTION 'invalid provider_type %', _provider_type;
  END IF;
  IF _enc_key IS NULL OR length(_enc_key) < 16 THEN
    RAISE EXCEPTION 'encryption key missing or too short';
  END IF;

  -- Preserve existing password when caller passes NULL/empty (edit without retyping)
  SELECT smtp_password_enc INTO v_existing_pwd
    FROM public.inbox_credentials WHERE inbox_id = _inbox_id;

  IF _smtp_password IS NOT NULL AND length(_smtp_password) > 0 THEN
    v_pwd_enc := pgp_sym_encrypt(_smtp_password, _enc_key);
    v_set_at := now();
  ELSE
    v_pwd_enc := v_existing_pwd;
    v_set_at := (SELECT password_set_at FROM public.inbox_credentials WHERE inbox_id = _inbox_id);
  END IF;

  INSERT INTO public.inbox_credentials (
    inbox_id, provider_type, smtp_host, smtp_port, smtp_username,
    smtp_encryption, smtp_password_enc, password_set_at
  ) VALUES (
    _inbox_id, _provider_type::public.inbox_provider_type,
    _smtp_host, _smtp_port, _smtp_username, _smtp_encryption, v_pwd_enc, v_set_at
  )
  ON CONFLICT (inbox_id) DO UPDATE SET
    provider_type = EXCLUDED.provider_type,
    smtp_host = EXCLUDED.smtp_host,
    smtp_port = EXCLUDED.smtp_port,
    smtp_username = EXCLUDED.smtp_username,
    smtp_encryption = EXCLUDED.smtp_encryption,
    smtp_password_enc = EXCLUDED.smtp_password_enc,
    password_set_at = EXCLUDED.password_set_at,
    updated_at = now();

  -- Update inbox-level fields and readiness
  UPDATE public.inboxes
     SET provider_type = _provider_type::public.inbox_provider_type,
         from_name = _from_name,
         from_email = _from_email,
         reply_to_email = _reply_to_email,
         live_readiness = CASE
           WHEN _provider_type = 'simulated' THEN 'simulated_only'::public.inbox_live_readiness
           WHEN v_pwd_enc IS NULL OR _smtp_host IS NULL OR _smtp_username IS NULL
                THEN 'not_configured'::public.inbox_live_readiness
           -- preserve test_passed/live_ready if password unchanged and currently passed
           WHEN (SELECT live_readiness FROM public.inboxes WHERE id = _inbox_id)
                IN ('test_passed','live_ready')
                AND (_smtp_password IS NULL OR length(_smtp_password) = 0)
                THEN (SELECT live_readiness FROM public.inboxes WHERE id = _inbox_id)
           ELSE 'configured_not_tested'::public.inbox_live_readiness
         END,
         updated_at = now()
   WHERE id = _inbox_id;

  RETURN jsonb_build_object('ok', true, 'inbox_id', _inbox_id);
END;
$$;

REVOKE ALL ON FUNCTION public.save_inbox_credentials(uuid,text,text,int,text,text,text,text,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_inbox_credentials(uuid,text,text,int,text,text,text,text,text,text,text) TO service_role;

-- 6. RPC: fetch credentials with decrypted password — service_role only
CREATE OR REPLACE FUNCTION public.get_inbox_credentials_for_send(_inbox_id uuid, _enc_key text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog
AS $$
DECLARE
  v jsonb;
  v_pwd text;
  c public.inbox_credentials%ROWTYPE;
  i public.inboxes%ROWTYPE;
BEGIN
  IF _enc_key IS NULL THEN RAISE EXCEPTION 'enc key required'; END IF;
  SELECT * INTO c FROM public.inbox_credentials WHERE inbox_id = _inbox_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'credentials not found for inbox %', _inbox_id; END IF;
  SELECT * INTO i FROM public.inboxes WHERE id = _inbox_id;

  IF c.smtp_password_enc IS NOT NULL THEN
    v_pwd := pgp_sym_decrypt(c.smtp_password_enc, _enc_key);
  END IF;

  v := jsonb_build_object(
    'inbox_id', c.inbox_id,
    'provider_type', c.provider_type,
    'smtp_host', c.smtp_host,
    'smtp_port', c.smtp_port,
    'smtp_username', c.smtp_username,
    'smtp_encryption', c.smtp_encryption,
    'smtp_password', v_pwd,
    'from_name', i.from_name,
    'from_email', i.from_email,
    'reply_to_email', i.reply_to_email,
    'email_address', i.email_address
  );
  RETURN v;
END;
$$;

REVOKE ALL ON FUNCTION public.get_inbox_credentials_for_send(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_inbox_credentials_for_send(uuid,text) TO service_role;

-- 7. RPC: record test send result (service_role)
CREATE OR REPLACE FUNCTION public.record_inbox_test_send(
  _inbox_id uuid, _success boolean, _to text, _error text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE public.inboxes
     SET last_test_send_status = CASE WHEN _success THEN 'passed' ELSE 'failed' END,
         last_test_send_at = now(),
         last_test_send_to = _to,
         last_error_message = CASE WHEN _success THEN NULL ELSE _error END,
         live_readiness = CASE WHEN _success THEN 'live_ready'::public.inbox_live_readiness
                               ELSE 'test_failed'::public.inbox_live_readiness END,
         updated_at = now()
   WHERE id = _inbox_id;

  -- Mark global outbound provider configured + test passed if any inbox has passed
  IF _success THEN
    INSERT INTO public.system_settings(key, value, updated_at)
    VALUES ('outbound_provider_configured','true'::jsonb, now())
    ON CONFLICT (key) DO UPDATE SET value='true'::jsonb, updated_at=now();
    INSERT INTO public.system_settings(key, value, updated_at)
    VALUES ('outbound_provider_test_passed_at', to_jsonb(now()::text), now())
    ON CONFLICT (key) DO UPDATE SET value=to_jsonb(now()::text), updated_at=now();
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.record_inbox_test_send(uuid,boolean,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_inbox_test_send(uuid,boolean,text,text) TO service_role;

-- 8. Public read view for the UI (no secrets) — what was configured but not the password
CREATE OR REPLACE VIEW public.inbox_credentials_public AS
SELECT
  c.inbox_id,
  c.provider_type,
  c.smtp_host,
  c.smtp_port,
  c.smtp_username,
  c.smtp_encryption,
  (c.smtp_password_enc IS NOT NULL) AS password_is_set,
  c.password_set_at,
  c.updated_at
FROM public.inbox_credentials c;

GRANT SELECT ON public.inbox_credentials_public TO authenticated;

-- 9. Live readiness check helper for activation guard
CREATE OR REPLACE FUNCTION public.inbox_is_live_ready(_inbox_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT live_readiness = 'live_ready'::public.inbox_live_readiness
    FROM public.inboxes WHERE id = _inbox_id;
$$;
GRANT EXECUTE ON FUNCTION public.inbox_is_live_ready(uuid) TO authenticated, service_role;
