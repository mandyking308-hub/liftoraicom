CREATE OR REPLACE FUNCTION public.evaluate_ai_reply(_text text)
RETURNS jsonb LANGUAGE plpgsql IMMUTABLE
SET search_path = public
AS $$
DECLARE
  word_count int; has_cta boolean; has_repetition boolean;
  reasons text[] := ARRAY[]::text[]; pass boolean := true; lower_t text; repeated_word text;
BEGIN
  IF _text IS NULL OR length(trim(_text)) = 0 THEN
    RETURN jsonb_build_object('pass', false, 'reasons', ARRAY['empty']);
  END IF;
  word_count := array_length(regexp_split_to_array(trim(_text), '\s+'), 1);
  IF word_count > 120 THEN pass := false; reasons := reasons || 'too_long'; END IF;
  lower_t := lower(_text);
  has_cta := lower_t ~ '(book|schedule|reply|let me know|next step|chat|call|meeting|demo|introduce|connect|available|interested)';
  IF NOT has_cta THEN pass := false; reasons := reasons || 'missing_cta'; END IF;
  WITH words AS (
    SELECT lower(regexp_split_to_table(regexp_replace(_text,'[^a-zA-Z0-9 ]','','g'),'\s+')) AS w
  ), grams AS (
    SELECT string_agg(w, ' ') AS phrase
    FROM (SELECT w, row_number() OVER () rn FROM words) t
    GROUP BY (rn-1)/4
  )
  SELECT phrase INTO repeated_word FROM grams
  WHERE length(phrase) > 10 GROUP BY phrase HAVING COUNT(*) > 1 LIMIT 1;
  has_repetition := repeated_word IS NOT NULL;
  IF has_repetition THEN pass := false; reasons := reasons || 'repetition'; END IF;
  RETURN jsonb_build_object('pass', pass, 'word_count', word_count,
    'has_cta', has_cta, 'has_repetition', has_repetition, 'reasons', reasons);
END; $$;