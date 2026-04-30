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
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions, pg_catalog
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

  UPDATE public.inboxes
     SET provider_type = _provider_type::public.inbox_provider_type,
         from_name = _from_name,
         from_email = _from_email,
         reply_to_email = _reply_to_email,
         live_readiness = CASE
           WHEN _provider_type = 'simulated' THEN 'simulated_only'::public.inbox_live_readiness
           WHEN v_pwd_enc IS NULL OR _smtp_host IS NULL OR _smtp_username IS NULL
                THEN 'not_configured'::public.inbox_live_readiness
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

CREATE OR REPLACE FUNCTION public.get_inbox_credentials_for_send(_inbox_id uuid, _enc_key text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions, pg_catalog
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