
DO $$ BEGIN
  CREATE TYPE ma_recommendation_type AS ENUM (
    'build','scale','iterate','park','kill','warm_buyer','adviser_review',
    'improve_data_room','increase_outreach','adjust_positioning','update_jurisdiction_review'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE ma_recommendation_status AS ENUM ('proposed','approved','rejected','actioned','archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE ma_risk_level AS ENUM ('low','medium','high');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE ma_briefing_kind AS ENUM ('portfolio','asset','build_memo');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
