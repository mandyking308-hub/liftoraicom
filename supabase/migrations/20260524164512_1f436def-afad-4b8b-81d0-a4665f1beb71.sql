
DO $$ BEGIN
  CREATE TYPE ma_ai_rec_status AS ENUM ('proposed','approved','rejected','actioned','archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
