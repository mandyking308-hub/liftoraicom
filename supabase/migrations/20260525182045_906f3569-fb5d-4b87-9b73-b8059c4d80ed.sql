
ALTER TABLE public.customer_sales_conversations
  ADD COLUMN IF NOT EXISTS test_label text,
  ADD COLUMN IF NOT EXISTS customer_memory_summary text,
  ADD COLUMN IF NOT EXISTS call_outcome text,
  ADD COLUMN IF NOT EXISTS last_call_log_id uuid,
  ADD COLUMN IF NOT EXISTS last_analysed_at timestamptz,
  ADD COLUMN IF NOT EXISTS linked_contact_email text;

ALTER TABLE public.customer_sales_call_logs
  ADD COLUMN IF NOT EXISTS test_label text,
  ADD COLUMN IF NOT EXISTS contact_id uuid,
  ADD COLUMN IF NOT EXISTS analysis_output jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS analysed_at timestamptz,
  ADD COLUMN IF NOT EXISTS sentiment_score numeric,
  ADD COLUMN IF NOT EXISTS customer_need text,
  ADD COLUMN IF NOT EXISTS customer_pain text,
  ADD COLUMN IF NOT EXISTS objections text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS buying_signals text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS qualification_score numeric,
  ADD COLUMN IF NOT EXISTS close_probability numeric,
  ADD COLUMN IF NOT EXISTS recommended_next_step text,
  ADD COLUMN IF NOT EXISTS follow_up_draft text,
  ADD COLUMN IF NOT EXISTS close_action_suggestion text,
  ADD COLUMN IF NOT EXISTS escalation_reason text;

CREATE INDEX IF NOT EXISTS idx_cscl_test_label ON public.customer_sales_call_logs(test_label);
CREATE INDEX IF NOT EXISTS idx_csc_test_label  ON public.customer_sales_conversations(test_label);

CREATE OR REPLACE FUNCTION public.customer_sales_link_contact_by_email(p_email text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.contacts WHERE lower(email) = lower(p_email) LIMIT 1;
$$;
