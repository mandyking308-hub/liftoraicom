-- Remove legacy sparse manual pages (version 1) so only the comprehensive
-- v2 manual content remains. The detailed v2 pages (110 entries spanning every
-- platform route, edge function, database layer and storage bucket) were
-- seeded directly and are kept untouched.
DELETE FROM public.manual_pages WHERE version = 1;

-- Record this milestone in the manual_versions table
INSERT INTO public.manual_versions (version_number, summary)
VALUES (2, 'Comprehensive manual rebuild — 110 module pages covering every public route, portal page, founder console screen, edge function, database layer, and storage bucket. Replaces the original 24 sparse pages.');

-- Record the change in the build log so it appears in the founder audit trail
INSERT INTO public.build_log_entries (title, description, module_affected, change_type, author)
VALUES (
  'Founder Manual fully reinforced',
  'Removed 24 legacy sparse manual pages and consolidated the manual around 110 comprehensive module pages. Every public route, portal page, founder console screen, edge function, database layer and storage bucket is now individually documented with purpose, core functions, user roles, connected modules, data inputs, data outputs and operational notes.',
  'Founder Manual',
  'documentation_overhaul',
  'Founder'
);