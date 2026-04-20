-- Conversations: intent history + reply tracking + priority
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS last_intent text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS intent_history jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS last_ai_reply_at timestamptz,
  ADD COLUMN IF NOT EXISTS priority_boost integer NOT NULL DEFAULT 0;

-- AI actions: response latency
ALTER TABLE public.ai_actions
  ADD COLUMN IF NOT EXISTS reply_latency_seconds numeric;