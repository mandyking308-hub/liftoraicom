CREATE OR REPLACE FUNCTION public.apollo_encrypt_key(plain text, enc_key text)
RETURNS bytea
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF plain IS NULL OR length(plain) = 0 THEN RETURN NULL; END IF;
  IF enc_key IS NULL OR length(enc_key) = 0 THEN RAISE EXCEPTION 'missing_encryption_key'; END IF;
  RETURN extensions.pgp_sym_encrypt(plain, enc_key);
END;
$$;

CREATE OR REPLACE FUNCTION public.apollo_decrypt_key(cipher bytea, enc_key text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF cipher IS NULL THEN RETURN NULL; END IF;
  IF enc_key IS NULL OR length(enc_key) = 0 THEN RAISE EXCEPTION 'missing_encryption_key'; END IF;
  RETURN extensions.pgp_sym_decrypt(cipher, enc_key);
END;
$$;

REVOKE ALL ON FUNCTION public.apollo_encrypt_key(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.apollo_decrypt_key(bytea, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apollo_encrypt_key(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.apollo_decrypt_key(bytea, text) TO service_role;