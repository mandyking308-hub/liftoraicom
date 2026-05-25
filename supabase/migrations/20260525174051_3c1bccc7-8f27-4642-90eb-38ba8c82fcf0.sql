
-- 1. Products
CREATE TABLE IF NOT EXISTS public.customer_sales_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID,
  product_name TEXT NOT NULL,
  product_type TEXT NOT NULL DEFAULT 'service',
  description TEXT,
  target_customer TEXT,
  customer_pain_points TEXT[],
  outcomes_promised TEXT[],
  features TEXT[],
  benefits TEXT[],
  proof_points TEXT[],
  pricing_type TEXT DEFAULT 'quote_required',
  price_amount NUMERIC,
  price_currency TEXT DEFAULT 'USD',
  price_range_min NUMERIC,
  price_range_max NUMERIC,
  billing_frequency TEXT,
  refund_policy TEXT,
  guarantee_terms TEXT,
  eligibility_rules TEXT,
  compliance_notes TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Offers
CREATE TABLE IF NOT EXISTS public.customer_sales_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID,
  product_id UUID REFERENCES public.customer_sales_products(id) ON DELETE SET NULL,
  offer_name TEXT NOT NULL,
  offer_summary TEXT,
  offer_stage TEXT NOT NULL DEFAULT 'draft',
  price_amount NUMERIC,
  price_currency TEXT DEFAULT 'USD',
  discount_allowed BOOLEAN DEFAULT false,
  discount_rules TEXT,
  urgency_or_bonus TEXT,
  approved_claims TEXT[],
  prohibited_claims TEXT[],
  close_type TEXT DEFAULT 'manual_review',
  requires_founder_approval BOOLEAN NOT NULL DEFAULT true,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Playbooks
CREATE TABLE IF NOT EXISTS public.customer_sales_playbooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID,
  playbook_name TEXT NOT NULL,
  use_case TEXT NOT NULL DEFAULT 'discovery',
  opening_script TEXT,
  discovery_questions TEXT[],
  qualification_rules TEXT,
  objection_responses JSONB DEFAULT '[]'::jsonb,
  closing_script TEXT,
  escalation_rules TEXT,
  do_not_say_rules TEXT[],
  compliance_notes TEXT,
  tone_of_voice TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Conversations
CREATE TABLE IF NOT EXISTS public.customer_sales_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID,
  contact_id UUID,
  channel TEXT NOT NULL DEFAULT 'manual',
  direction TEXT NOT NULL DEFAULT 'inbound',
  conversation_status TEXT NOT NULL DEFAULT 'planned',
  customer_name TEXT,
  customer_phone TEXT,
  customer_email TEXT,
  product_id UUID REFERENCES public.customer_sales_products(id) ON DELETE SET NULL,
  offer_id UUID REFERENCES public.customer_sales_offers(id) ON DELETE SET NULL,
  playbook_id UUID REFERENCES public.customer_sales_playbooks(id) ON DELETE SET NULL,
  transcript_summary TEXT,
  customer_need TEXT,
  objections_raised TEXT[],
  buying_signals TEXT[],
  qualification_score NUMERIC,
  sentiment_score NUMERIC,
  close_probability NUMERIC,
  recommended_next_action TEXT,
  founder_approval_required BOOLEAN NOT NULL DEFAULT true,
  external_action_locked BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Call logs
CREATE TABLE IF NOT EXISTS public.customer_sales_call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID,
  conversation_id UUID REFERENCES public.customer_sales_conversations(id) ON DELETE CASCADE,
  provider_name TEXT,
  provider_call_id TEXT,
  call_direction TEXT,
  from_number TEXT,
  to_number TEXT,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  recording_url TEXT,
  transcript_text TEXT,
  transcript_summary TEXT,
  consent_recorded BOOLEAN DEFAULT false,
  recording_notice_given BOOLEAN DEFAULT false,
  outcome TEXT,
  next_step TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Close actions
CREATE TABLE IF NOT EXISTS public.customer_sales_close_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID,
  conversation_id UUID REFERENCES public.customer_sales_conversations(id) ON DELETE SET NULL,
  contact_id UUID,
  product_id UUID REFERENCES public.customer_sales_products(id) ON DELETE SET NULL,
  offer_id UUID REFERENCES public.customer_sales_offers(id) ON DELETE SET NULL,
  close_action_type TEXT NOT NULL DEFAULT 'follow_up_email',
  action_status TEXT NOT NULL DEFAULT 'draft',
  amount NUMERIC,
  currency TEXT DEFAULT 'USD',
  payment_provider TEXT,
  payment_link_url TEXT,
  invoice_id UUID,
  proposal_id UUID,
  contract_id UUID,
  booking_url TEXT,
  founder_approval_required BOOLEAN NOT NULL DEFAULT true,
  founder_approved_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  audit_metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Provider settings
CREATE TABLE IF NOT EXISTS public.customer_sales_provider_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID,
  provider_type TEXT NOT NULL DEFAULT 'custom',
  provider_status TEXT NOT NULL DEFAULT 'not_connected',
  inbound_enabled BOOLEAN DEFAULT false,
  outbound_enabled BOOLEAN DEFAULT false,
  web_call_enabled BOOLEAN DEFAULT false,
  phone_number TEXT,
  webhook_url TEXT,
  api_secret_configured BOOLEAN DEFAULT false,
  default_voice_id TEXT,
  default_agent_id TEXT,
  rate_limit_per_hour INTEGER DEFAULT 0,
  require_founder_approval_for_outbound BOOLEAN NOT NULL DEFAULT true,
  require_founder_approval_for_payment BOOLEAN NOT NULL DEFAULT true,
  require_founder_approval_for_contract BOOLEAN NOT NULL DEFAULT true,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Objection library
CREATE TABLE IF NOT EXISTS public.customer_sales_objection_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID,
  product_id UUID REFERENCES public.customer_sales_products(id) ON DELETE SET NULL,
  objection TEXT NOT NULL,
  approved_response TEXT,
  evidence_or_proof TEXT,
  escalation_required BOOLEAN DEFAULT false,
  do_not_say TEXT[],
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. Knowledge sources
CREATE TABLE IF NOT EXISTS public.customer_sales_knowledge_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID,
  source_type TEXT NOT NULL DEFAULT 'manual',
  title TEXT NOT NULL,
  summary TEXT,
  source_url TEXT,
  source_file_id UUID,
  verified_by_founder BOOLEAN DEFAULT false,
  last_verified_at TIMESTAMPTZ,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS + founder/admin policy on all tables
DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'customer_sales_products','customer_sales_offers','customer_sales_playbooks',
    'customer_sales_conversations','customer_sales_call_logs','customer_sales_close_actions',
    'customer_sales_provider_settings','customer_sales_objection_library','customer_sales_knowledge_sources'
  ]) LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format($p$CREATE POLICY "founders_admins_all_%s" ON public.%I FOR ALL TO authenticated USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'founder'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'founder'::app_role))$p$, t, t);
  END LOOP;
END $$;

-- updated_at triggers
DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'customer_sales_products','customer_sales_offers','customer_sales_playbooks',
    'customer_sales_conversations','customer_sales_close_actions',
    'customer_sales_provider_settings','customer_sales_objection_library','customer_sales_knowledge_sources'
  ]) LOOP
    EXECUTE format('CREATE TRIGGER trg_%s_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()', t, t);
  END LOOP;
END $$;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_csc_status ON public.customer_sales_conversations(conversation_status);
CREATE INDEX IF NOT EXISTS idx_csc_created ON public.customer_sales_conversations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cscl_started ON public.customer_sales_call_logs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_csca_status ON public.customer_sales_close_actions(action_status);
