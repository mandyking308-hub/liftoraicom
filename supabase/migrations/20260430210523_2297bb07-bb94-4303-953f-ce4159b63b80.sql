ALTER TABLE public.inboxes
  ADD COLUMN IF NOT EXISTS ai_prompt_instructions text,
  ADD COLUMN IF NOT EXISTS ai_prompt_updated_at timestamptz;