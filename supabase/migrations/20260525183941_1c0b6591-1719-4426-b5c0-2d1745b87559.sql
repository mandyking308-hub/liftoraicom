-- 1. Follow-up tasks
CREATE TABLE IF NOT EXISTS public.customer_sales_follow_up_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID,
  conversation_id UUID REFERENCES public.customer_sales_conversations(id) ON DELETE SET NULL,
  call_log_id UUID,
  contact_id UUID,
  close_action_id UUID REFERENCES public.customer_sales_close_actions(id) ON DELETE SET NULL,
  next_best_action TEXT NOT NULL DEFAULT 'follow_up_email',
  follow_up_priority TEXT NOT NULL DEFAULT 'normal',
  follow_up_due_at TIMESTAMPTZ,
  channel TEXT NOT NULL DEFAULT 'email',
  template_key TEXT,
  draft_subject TEXT,
  draft_message TEXT,
  approval_required BOOLEAN NOT NULL DEFAULT true,
  approval_status TEXT NOT NULL DEFAULT 'pending',
  assigned_to UUID,
  task_status TEXT NOT NULL DEFAULT 'open',
  outcome TEXT,
  reason TEXT,
  risk_flags JSONB NOT NULL DEFAULT '[]'::jsonb,
  test_label TEXT,
  sent_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_csfut_status ON public.customer_sales_follow_up_tasks(task_status);
CREATE INDEX IF NOT EXISTS idx_csfut_priority ON public.customer_sales_follow_up_tasks(follow_up_priority);
CREATE INDEX IF NOT EXISTS idx_csfut_due ON public.customer_sales_follow_up_tasks(follow_up_due_at);

DROP TRIGGER IF EXISTS trg_csfut_updated_at ON public.customer_sales_follow_up_tasks;
CREATE TRIGGER trg_csfut_updated_at BEFORE UPDATE ON public.customer_sales_follow_up_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Follow-up templates
CREATE TABLE IF NOT EXISTS public.customer_sales_follow_up_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key TEXT NOT NULL UNIQUE,
  template_label TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'email',
  default_priority TEXT NOT NULL DEFAULT 'normal',
  default_subject TEXT,
  body_template TEXT NOT NULL,
  requires_approval BOOLEAN NOT NULL DEFAULT true,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.customer_sales_follow_up_templates (template_key, template_label, channel, default_subject, body_template) VALUES
  ('thanks_for_speaking', 'Thanks for speaking',       'email', 'Thanks for your time today',
    'Hi {{first_name}},\n\nThanks for taking the time to speak today. Quick recap of what you shared and what we agreed:\n\n{{recap}}\n\nNext step from our side: {{next_step}}.\n\nLet me know if anything looks off.\n\n{{sender_signature}}'),
  ('here_is_the_offer',  'Here is the offer',          'email', 'The offer we discussed',
    'Hi {{first_name}},\n\nAs promised, here is the offer we discussed:\n\n{{offer_summary}}\n\nPrice: {{price}}\nTerms: {{terms}}\n\nHappy to walk through this on a quick call if useful.\n\n{{sender_signature}}'),
  ('here_is_the_proposal','Here is the proposal',      'email', 'Your proposal',
    'Hi {{first_name}},\n\nThe proposal is attached / linked below:\n\n{{proposal_link}}\n\nKey points:\n{{proposal_highlights}}\n\nLet me know what you think.\n\n{{sender_signature}}'),
  ('here_is_the_booking','Here is the booking link',   'email', 'Booking link',
    'Hi {{first_name}},\n\nHere is the booking link for our next call:\n\n{{booking_link}}\n\nPick any slot that works.\n\n{{sender_signature}}'),
  ('answering_your_question','Answering your question','email', 'Re: your question',
    'Hi {{first_name}},\n\nYou asked: {{question}}\n\nShort answer: {{answer}}\n\n{{supporting_detail}}\n\nLet me know if that helps.\n\n{{sender_signature}}'),
  ('checking_in',        'Checking in',                'email', 'Quick check-in',
    'Hi {{first_name}},\n\nJust checking in on {{topic}}. Anything I can do from here, or want me to pause and circle back later?\n\n{{sender_signature}}'),
  ('human_callback_confirmed','Human callback confirmed','email','Callback confirmed',
    'Hi {{first_name}},\n\nConfirming a human callback at {{callback_time}} from {{callback_name}}. Number we will call: {{phone}}.\n\n{{sender_signature}}'),
  ('closed_lost_no_problem','Closed lost / no problem','email','Thanks for considering us',
    'Hi {{first_name}},\n\nUnderstood — no problem at all. Thanks for considering us. If anything changes on {{topic}}, you have my details.\n\n{{sender_signature}}'),
  ('nurture_later',      'Nurture later',              'email', 'Catching up later',
    'Hi {{first_name}},\n\nWe will park this for now and circle back around {{nurture_date}}. If anything changes before then, just reply.\n\n{{sender_signature}}')
ON CONFLICT (template_key) DO NOTHING;

-- 3. Human handoff tasks
CREATE TABLE IF NOT EXISTS public.customer_sales_human_handoff_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID,
  conversation_id UUID REFERENCES public.customer_sales_conversations(id) ON DELETE SET NULL,
  contact_id UUID,
  close_action_id UUID REFERENCES public.customer_sales_close_actions(id) ON DELETE SET NULL,
  reason_key TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'high',
  transcript_summary TEXT,
  customer_need TEXT,
  objections JSONB NOT NULL DEFAULT '[]'::jsonb,
  recommended_response TEXT,
  product_id UUID,
  offer_id UUID,
  risk_flags JSONB NOT NULL DEFAULT '[]'::jsonb,
  suggested_next_step TEXT,
  assigned_to UUID,
  task_status TEXT NOT NULL DEFAULT 'open',
  outcome TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cshht_status ON public.customer_sales_human_handoff_tasks(task_status);
CREATE INDEX IF NOT EXISTS idx_cshht_priority ON public.customer_sales_human_handoff_tasks(priority);

DROP TRIGGER IF EXISTS trg_cshht_updated_at ON public.customer_sales_human_handoff_tasks;
CREATE TRIGGER trg_cshht_updated_at BEFORE UPDATE ON public.customer_sales_human_handoff_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. RLS
DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'customer_sales_follow_up_tasks',
    'customer_sales_follow_up_templates',
    'customer_sales_human_handoff_tasks'
  ]) LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "founders_admins_all_%s" ON public.%I', t, t);
    EXECUTE format($p$CREATE POLICY "founders_admins_all_%s" ON public.%I FOR ALL TO authenticated USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'founder'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'founder'::app_role))$p$, t, t);
  END LOOP;
END $$;