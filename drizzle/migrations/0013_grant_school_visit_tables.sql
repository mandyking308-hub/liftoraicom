GRANT SELECT, INSERT, UPDATE ON public.founder_school_visit_records TO authenticated;
GRANT SELECT ON public.founder_school_visit_templates TO authenticated;
GRANT ALL ON public.founder_school_visit_records, public.founder_school_visit_templates TO service_role;