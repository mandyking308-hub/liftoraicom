CREATE TABLE IF NOT EXISTS public.social_relationship_ai_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  conversation_id uuid NOT NULL REFERENCES public.social_relationship_conversations(id) ON DELETE CASCADE,
  message_id uuid REFERENCES public.social_relationship_messages(id) ON DELETE SET NULL,
  action_type text NOT NULL CHECK (action_type IN ('classify','draft_reply','send_reply','escalate','suppress')),
  classification text,
  reply_preview text,
  model text,
  tokens_used integer NOT NULL DEFAULT 0,
  status text NOT NULL CHECK (status IN ('pending','completed','suppressed','failed','escalated')),
  error_message text,
  reply_latency_seconds numeric,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS social_relationship_ai_actions_conversation_idx
  ON public.social_relationship_ai_actions(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS social_relationship_ai_actions_business_idx
  ON public.social_relationship_ai_actions(business_id, created_at DESC);

ALTER TABLE public.social_relationship_ai_actions ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.social_relationship_ai_actions TO authenticated;
GRANT ALL ON public.social_relationship_ai_actions TO service_role;
DROP POLICY IF EXISTS founder_admin_all_social_relationship_ai_actions ON public.social_relationship_ai_actions;
CREATE POLICY founder_admin_all_social_relationship_ai_actions
  ON public.social_relationship_ai_actions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'));
