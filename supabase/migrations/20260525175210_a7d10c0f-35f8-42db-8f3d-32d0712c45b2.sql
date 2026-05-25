
-- Extend playbooks
ALTER TABLE public.customer_sales_playbooks
  ADD COLUMN IF NOT EXISTS consent_notice text,
  ADD COLUMN IF NOT EXISTS product_matching_logic text,
  ADD COLUMN IF NOT EXISTS approved_claims text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS prohibited_claims text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS closing_questions text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS close_action_allowed text NOT NULL DEFAULT 'prepare_only',
  ADD COLUMN IF NOT EXISTS buying_signal_triggers text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS escalation_triggers text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS product_id uuid REFERENCES public.customer_sales_products(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS offer_id uuid REFERENCES public.customer_sales_offers(id) ON DELETE SET NULL;

-- Conversation state machine
CREATE TABLE IF NOT EXISTS public.customer_sales_conversation_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.customer_sales_conversations(id) ON DELETE CASCADE,
  stage text NOT NULL DEFAULT 'greeting',
  previous_stage text,
  required_info_collected jsonb NOT NULL DEFAULT '{}'::jsonb,
  signals_detected text[] NOT NULL DEFAULT '{}',
  objections_detected text[] NOT NULL DEFAULT '{}',
  next_best_question text,
  escalation_reason text,
  stage_history jsonb NOT NULL DEFAULT '[]'::jsonb,
  brain_output jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.customer_sales_conversation_states ENABLE ROW LEVEL SECURITY;
CREATE POLICY "founders_admins_all_csc_states"
  ON public.customer_sales_conversation_states FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'founder'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'founder'::app_role));
CREATE TRIGGER trg_csc_states_updated_at BEFORE UPDATE ON public.customer_sales_conversation_states
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX IF NOT EXISTS idx_csc_states_conv ON public.customer_sales_conversation_states(conversation_id);

-- Signal library
CREATE TABLE IF NOT EXISTS public.customer_sales_signal_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_key text NOT NULL UNIQUE,
  signal_kind text NOT NULL DEFAULT 'buying',
  label text NOT NULL,
  description text,
  keywords text[] NOT NULL DEFAULT '{}',
  weight numeric NOT NULL DEFAULT 1,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.customer_sales_signal_library ENABLE ROW LEVEL SECURITY;
CREATE POLICY "founders_admins_all_csc_signals"
  ON public.customer_sales_signal_library FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'founder'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'founder'::app_role));
CREATE TRIGGER trg_csc_signals_updated_at BEFORE UPDATE ON public.customer_sales_signal_library
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Brain runs (AI Gateway backed analysis)
CREATE TABLE IF NOT EXISTS public.customer_sales_brain_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES public.customer_sales_conversations(id) ON DELETE CASCADE,
  business_id uuid,
  product_id uuid,
  playbook_id uuid,
  input_transcript text,
  input_context jsonb NOT NULL DEFAULT '{}'::jsonb,
  output jsonb NOT NULL DEFAULT '{}'::jsonb,
  model text,
  tokens_in integer,
  tokens_out integer,
  cost_usd numeric,
  status text NOT NULL DEFAULT 'pending',
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.customer_sales_brain_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "founders_admins_all_csc_brain_runs"
  ON public.customer_sales_brain_runs FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'founder'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'founder'::app_role));
CREATE INDEX IF NOT EXISTS idx_csc_brain_runs_conv ON public.customer_sales_brain_runs(conversation_id);
CREATE INDEX IF NOT EXISTS idx_csc_brain_runs_created ON public.customer_sales_brain_runs(created_at DESC);

-- Seed signal library
INSERT INTO public.customer_sales_signal_library (signal_key, signal_kind, label, keywords, weight) VALUES
  ('asks_price','buying','Asks price', ARRAY['price','cost','how much','pricing','fee'], 2),
  ('asks_how_to_start','buying','Asks how to start', ARRAY['how do i start','sign up','get started','onboard'], 3),
  ('asks_availability','buying','Asks availability', ARRAY['available','when can','do you have','in stock'], 2),
  ('asks_payment','buying','Asks payment', ARRAY['pay','payment','credit card','invoice','bank'], 3),
  ('asks_timeline','buying','Asks timeline', ARRAY['how long','timeline','when will','delivery'], 2),
  ('asks_comparison','buying','Asks comparison', ARRAY['vs','compared to','better than','versus','difference'], 1),
  ('says_yes_ready','buying','Says yes / ready', ARRAY['yes','i am ready','let''s do it','ready to','sounds good'], 3),
  ('asks_to_speak_to_someone','buying','Asks to speak to someone', ARRAY['talk to','speak to','manager','founder','director'], 2),
  ('repeats_objection','warning','Repeats objection', ARRAY[]::text[], 1),
  ('asks_guarantee','sensitive','Asks guarantee/refund', ARRAY['guarantee','refund','money back','warranty'], 2),
  ('asks_legal','sensitive','Asks legal/financial/compliance', ARRAY['legal','contract','tax','compliance','regulation','liability'], 3),
  ('obj_too_expensive','objection','Too expensive', ARRAY['expensive','too much','out of budget','can''t afford'], 1),
  ('obj_need_to_think','objection','Need to think', ARRAY['think about it','get back to you','let me think'], 1),
  ('obj_ask_partner','objection','Need to ask partner', ARRAY['ask my partner','speak to my wife','speak to my husband','check with'], 1),
  ('obj_not_sure_works','objection','Not sure it works', ARRAY['not sure','does it really','will it work','proof'], 1),
  ('obj_competitor','objection','Competitor comparison', ARRAY['other provider','competitor','already using'], 1),
  ('obj_timing','objection','Timing issue', ARRAY['not right now','bad time','next quarter','next year'], 1),
  ('obj_trust','objection','Trust issue', ARRAY['never heard of','who are you','reviews','testimonial'], 1),
  ('obj_technical','objection','Technical concern', ARRAY['integration','api','technical','setup difficult'], 1),
  ('obj_refund','objection','Refund/guarantee concern', ARRAY['if it doesn''t work','refund policy','money back'], 1),
  ('obj_contract','objection','Contract concern', ARRAY['lock in','contract length','cancel anytime','terms'], 1)
ON CONFLICT (signal_key) DO NOTHING;
