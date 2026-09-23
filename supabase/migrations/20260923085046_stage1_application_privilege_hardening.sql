-- Stage 1: remove dangerous table privileges from application roles.
--
-- This intentionally preserves all existing SELECT/INSERT/UPDATE/DELETE grants
-- and does not touch service_role, owners, RLS policies, or business data.
REVOKE TRUNCATE, TRIGGER, REFERENCES, MAINTAIN
  ON ALL TABLES IN SCHEMA public
  FROM anon, authenticated;

-- Prevent future postgres-owned public tables from receiving the same
-- dangerous privileges automatically. Deliberate CRUD defaults are preserved.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE TRUNCATE, TRIGGER, REFERENCES, MAINTAIN
  ON TABLES
  FROM anon, authenticated;
