-- Enums
DO $$ BEGIN
  CREATE TYPE public.conversation_status AS ENUM ('OPEN','QUALIFIED','CLOSED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.ai_action_type AS ENUM ('classify','reply','escalate');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.ai_action_status AS ENUM ('success','failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- conversations
CREATE TABLE IF NOT EXISTS public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL,
  business_name text NOT NULL DEFAULT '',
  status public.conversation_status NOT NULL DEFAULT 'OPEN',
  last_message_at timestamptz NOT NULL DEFAULT now(),
  ai_last_used_at timestamptz,
  escalation_pending boolean NOT NULL DEFAULT false,
  escalation_reason text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (contact_id)
);
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Founders can manage conversations" ON public.conversations;
CREATE POLICY "Founders can manage conversations" ON public.conversations
  FOR ALL USING (public.has_role(auth.uid(),'founder'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'founder'::app_role));
CREATE INDEX IF NOT EXISTS idx_conversations_contact ON public.conversations(contact_id);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON public.conversations(status);

-- messages (mirror of communications, scoped to AI engine view)
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL,
  direction public.communication_direction NOT NULL,
  content text NOT NULL DEFAULT '',
  channel public.communication_channel NOT NULL DEFAULT 'email',
  inbox_id uuid,
  ai_generated boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Founders can manage messages" ON public.messages;
CREATE POLICY "Founders can manage messages" ON public.messages
  FOR ALL USING (public.has_role(auth.uid(),'founder'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'founder'::app_role));
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_contact ON public.messages(contact_id);

-- ai_actions
CREATE TABLE IF NOT EXISTS public.ai_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL,
  action_type public.ai_action_type NOT NULL,
  classification text NOT NULL DEFAULT '',
  reply_preview text NOT NULL DEFAULT '',
  tokens_used integer NOT NULL DEFAULT 0,
  status public.ai_action_status NOT NULL DEFAULT 'success',
  error_message text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_actions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Founders can manage ai actions" ON public.ai_actions;
CREATE POLICY "Founders can manage ai actions" ON public.ai_actions
  FOR ALL USING (public.has_role(auth.uid(),'founder'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'founder'::app_role));
CREATE INDEX IF NOT EXISTS idx_ai_actions_conv_day ON public.ai_actions(conversation_id, created_at DESC);

-- Mirror communications -> messages + invoke AI for inbound
CREATE OR REPLACE FUNCTION public.mirror_comm_to_messages_and_invoke_ai()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_conv_id uuid;
  v_contact public.contacts%ROWTYPE;
BEGIN
  SELECT * INTO v_contact FROM public.contacts WHERE id = NEW.contact_id;
  IF NOT FOUND THEN RETURN NEW; END IF;

  -- find or create conversation
  SELECT id INTO v_conv_id FROM public.conversations WHERE contact_id = NEW.contact_id;
  IF v_conv_id IS NULL THEN
    INSERT INTO public.conversations (contact_id, business_name, status, last_message_at)
    VALUES (NEW.contact_id, COALESCE(v_contact.assigned_business,''), 'OPEN', NEW."timestamp")
    RETURNING id INTO v_conv_id;
  ELSE
    UPDATE public.conversations
       SET last_message_at = NEW."timestamp", updated_at = now()
     WHERE id = v_conv_id;
  END IF;

  -- mirror message
  INSERT INTO public.messages (conversation_id, contact_id, direction, content, channel, inbox_id, ai_generated, created_at)
  VALUES (v_conv_id, NEW.contact_id, NEW.direction, COALESCE(NEW.message,''), NEW.channel, NEW.inbox_id, NEW.ai_generated, NEW."timestamp");

  -- only invoke AI on inbound
  IF NEW.direction = 'inbound' THEN
    PERFORM net.http_post(
      url := 'https://oiwbletmjhrhqksosphi.supabase.co/functions/v1/ai-conversation-engine',
      headers := jsonb_build_object(
        'Content-Type','application/json',
        'Authorization','Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := jsonb_build_object('conversation_id', v_conv_id, 'contact_id', NEW.contact_id)
    );
  END IF;

  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_mirror_comm_to_messages_and_invoke_ai ON public.communications;
CREATE TRIGGER trg_mirror_comm_to_messages_and_invoke_ai
  AFTER INSERT ON public.communications
  FOR EACH ROW EXECUTE FUNCTION public.mirror_comm_to_messages_and_invoke_ai();

-- Helper: check daily AI action cap
CREATE OR REPLACE FUNCTION public.ai_actions_today(_conversation_id uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::int FROM public.ai_actions
   WHERE conversation_id = _conversation_id
     AND created_at >= date_trunc('day', now());
$$;