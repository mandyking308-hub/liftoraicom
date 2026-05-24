
DROP VIEW IF EXISTS public.ma_approval_queue_open;
CREATE VIEW public.ma_approval_queue_open
WITH (security_invoker = true) AS
SELECT * FROM public.ma_approval_queue
WHERE status IN ('pending','needs_more_information','escalated_to_adviser');
