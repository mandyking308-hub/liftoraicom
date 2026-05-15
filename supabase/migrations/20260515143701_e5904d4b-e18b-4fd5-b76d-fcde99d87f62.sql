CREATE TABLE IF NOT EXISTS public.execution_result_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  approved_action_id uuid,
  business_id uuid,
  action_type text NOT NULL,
  execution_status text NOT NULL,
  target_table text,
  target_id uuid,
  result_summary text,
  blocked_reason text,
  external_action_attempted boolean NOT NULL DEFAULT false,
  email_sent boolean NOT NULL DEFAULT false,
  apollo_called boolean NOT NULL DEFAULT false,
  smartlead_post_called boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_erl_approved_action ON public.execution_result_log(approved_action_id);
CREATE INDEX IF NOT EXISTS idx_erl_business ON public.execution_result_log(business_id);
CREATE INDEX IF NOT EXISTS idx_erl_created ON public.execution_result_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_erl_status ON public.execution_result_log(execution_status);

ALTER TABLE public.execution_result_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "founders_admins_all_erl"
ON public.execution_result_log
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'founder'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'founder'::app_role));