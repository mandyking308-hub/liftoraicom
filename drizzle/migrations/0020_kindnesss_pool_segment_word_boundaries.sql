DO $m$ DECLARE def text; BEGIN
 SELECT pg_get_functiondef('public.kindnesss_email_candidate_pool(boolean)'::regprocedure) INTO def;
 def:=replace(def,'''charit|non-?profit|ngo|civic''','''\mcharit|non-?profit|\mngo\M|\mcivic''');
 def:=replace(def,'''care|health|hospital|nursing|medical''','''\mcare\M|\mhealth|\mhospital|\mnursing|\mmedical''');
 EXECUTE def;
END $m$;