-- =========================================================
-- Liftor Social Relationship Engine — data layer
-- Founder/admin only, fail-closed RLS, service_role for edge functions.
-- =========================================================

-- ---------- helper: founder/admin predicate is has_role() (already exists)

-- 1. provider connections
CREATE TABLE public.social_relationship_provider_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID,
  provider TEXT NOT NULL CHECK (provider IN ('unipile','manychat')),
  display_name TEXT,
  connection_status TEXT NOT NULL DEFAULT 'not_configured'
    CHECK (connection_status IN ('not_configured','configured','connected','error','disabled')),
  base_url TEXT,
  credentials_present BOOLEAN NOT NULL DEFAULT false,
  webhook_registered BOOLEAN NOT NULL DEFAULT false,
  webhook_status TEXT,
  last_test_at TIMESTAMPTZ,
  last_test_ok BOOLEAN,
  last_error TEXT,
  provider_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_test_data BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (business_id, provider)
);

-- 2. accounts
CREATE TABLE public.social_relationship_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  connection_id UUID NOT NULL REFERENCES public.social_relationship_provider_connections(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  network TEXT NOT NULL CHECK (network IN ('linkedin','instagram','messenger','whatsapp','x','other')),
  provider_account_id TEXT NOT NULL,
  account_name TEXT,
  account_handle TEXT,
  account_status TEXT NOT NULL DEFAULT 'unknown'
    CHECK (account_status IN ('unknown','ok','credentials','disconnected','challenge','rate_limited','cooldown','disabled')),
  real_account_declared BOOLEAN NOT NULL DEFAULT false,
  cooldown_until TIMESTAMPTZ,
  last_sync_at TIMESTAMPTZ,
  last_error TEXT,
  provider_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_test_data BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (connection_id, provider_account_id)
);
CREATE INDEX idx_srl_accounts_business ON public.social_relationship_accounts(business_id, network);

-- 3. capabilities
CREATE TABLE public.social_relationship_capabilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.social_relationship_accounts(id) ON DELETE CASCADE,
  business_id UUID NOT NULL,
  capability TEXT NOT NULL,
  supported BOOLEAN NOT NULL DEFAULT false,
  source TEXT NOT NULL DEFAULT 'declared' CHECK (source IN ('declared','provider','manual')),
  detail JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (account_id, capability)
);

-- 4. searches
CREATE TABLE public.social_relationship_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  account_id UUID REFERENCES public.social_relationship_accounts(id) ON DELETE SET NULL,
  network TEXT NOT NULL,
  search_type TEXT NOT NULL DEFAULT 'people' CHECK (search_type IN ('people','company')),
  criteria JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','previewed','blocked','running','completed','failed')),
  blocked_reason TEXT,
  results_count INTEGER NOT NULL DEFAULT 0,
  provider_calls INTEGER NOT NULL DEFAULT 0,
  last_run_at TIMESTAMPTZ,
  created_by UUID,
  is_test_data BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_srl_searches_business ON public.social_relationship_searches(business_id, created_at DESC);

-- 5. profiles
CREATE TABLE public.social_relationship_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  network TEXT NOT NULL,
  provider_profile_id TEXT NOT NULL,
  profile_url TEXT,
  full_name TEXT,
  headline TEXT,
  job_title TEXT,
  company_name TEXT,
  industry TEXT,
  location TEXT,
  relationship_status TEXT NOT NULL DEFAULT 'unknown'
    CHECK (relationship_status IN ('unknown','none','pending_invite','connected','follower','blocked')),
  risk_flags JSONB NOT NULL DEFAULT '[]'::jsonb,
  source TEXT NOT NULL DEFAULT 'provider_search',
  source_search_id UUID REFERENCES public.social_relationship_searches(id) ON DELETE SET NULL,
  provider_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_test_data BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (business_id, network, provider_profile_id)
);
CREATE INDEX idx_srl_profiles_business ON public.social_relationship_profiles(business_id, network);

-- 6. target lists
CREATE TABLE public.social_relationship_target_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  name TEXT NOT NULL,
  network TEXT NOT NULL,
  account_id UUID REFERENCES public.social_relationship_accounts(id) ON DELETE SET NULL,
  objective TEXT,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','pending_approval','approved','rejected','paused','completed')),
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  approval_note TEXT,
  targets_count INTEGER NOT NULL DEFAULT 0,
  is_test_data BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_srl_lists_business ON public.social_relationship_target_lists(business_id, status);

-- 7. targets
CREATE TABLE public.social_relationship_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  target_list_id UUID NOT NULL REFERENCES public.social_relationship_target_lists(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.social_relationship_profiles(id) ON DELETE CASCADE,
  score NUMERIC NOT NULL DEFAULT 0,
  score_reasons JSONB NOT NULL DEFAULT '[]'::jsonb,
  target_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (target_status IN ('pending','approved','rejected','suppressed','invited','connected','in_conversation','qualified','closed')),
  blocked_reason TEXT,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  first_touch_at TIMESTAMPTZ,
  is_test_data BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (target_list_id, profile_id)
);
CREATE INDEX idx_srl_targets_business ON public.social_relationship_targets(business_id, target_status);

-- 8. action queue
CREATE TABLE public.social_relationship_action_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  account_id UUID REFERENCES public.social_relationship_accounts(id) ON DELETE SET NULL,
  target_id UUID REFERENCES public.social_relationship_targets(id) ON DELETE SET NULL,
  profile_id UUID REFERENCES public.social_relationship_profiles(id) ON DELETE SET NULL,
  conversation_id UUID,
  network TEXT NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN (
    'send_invitation','follow','start_chat','send_message','reply_message',
    'accept_or_decline_received_invitation','sync_profile','sync_conversation')),
  action_status TEXT NOT NULL DEFAULT 'draft' CHECK (action_status IN (
    'draft','blocked','pending_approval','ready','submitting','sent','accepted',
    'replied','failed','retrying','submission_unknown','dead_letter','cancelled')),
  blocked_reason TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  rendered_preview TEXT,
  batch_id UUID,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  scheduled_for TIMESTAMPTZ,
  not_before TIMESTAMPTZ,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  idempotency_key TEXT NOT NULL,
  provider_action_id TEXT,
  provider_response JSONB,
  last_error TEXT,
  submitted_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  is_test_data BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (business_id, idempotency_key)
);
CREATE INDEX idx_srl_queue_due ON public.social_relationship_action_queue(business_id, action_status, not_before);
CREATE INDEX idx_srl_queue_batch ON public.social_relationship_action_queue(batch_id);

-- 9. conversations
CREATE TABLE public.social_relationship_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  account_id UUID REFERENCES public.social_relationship_accounts(id) ON DELETE SET NULL,
  profile_id UUID REFERENCES public.social_relationship_profiles(id) ON DELETE SET NULL,
  network TEXT NOT NULL,
  provider_chat_id TEXT NOT NULL,
  subject TEXT,
  conversation_status TEXT NOT NULL DEFAULT 'open'
    CHECK (conversation_status IN ('open','qualified','escalated','closed','suppressed')),
  unread_count INTEGER NOT NULL DEFAULT 0,
  priority_boost INTEGER NOT NULL DEFAULT 0,
  last_intent TEXT,
  intent_history JSONB NOT NULL DEFAULT '[]'::jsonb,
  last_message_at TIMESTAMPTZ,
  last_inbound_at TIMESTAMPTZ,
  last_outbound_at TIMESTAMPTZ,
  ai_last_used_at TIMESTAMPTZ,
  ai_replies_today INTEGER NOT NULL DEFAULT 0,
  ai_replies_day DATE,
  escalation_pending BOOLEAN NOT NULL DEFAULT false,
  escalation_reason TEXT,
  crm_contact_id UUID,
  is_test_data BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (business_id, network, provider_chat_id)
);
CREATE INDEX idx_srl_convos_business ON public.social_relationship_conversations(business_id, conversation_status, last_message_at DESC);

-- 10. messages
CREATE TABLE public.social_relationship_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  conversation_id UUID NOT NULL REFERENCES public.social_relationship_conversations(id) ON DELETE CASCADE,
  network TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('inbound','outbound')),
  message_status TEXT NOT NULL DEFAULT 'received'
    CHECK (message_status IN ('received','draft','pending_approval','queued','sent','failed','suppressed')),
  content TEXT NOT NULL DEFAULT '',
  ai_generated BOOLEAN NOT NULL DEFAULT false,
  provider_message_id TEXT,
  provider_timestamp TIMESTAMPTZ,
  action_id UUID REFERENCES public.social_relationship_action_queue(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_test_data BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_srl_msg_provider_unique
  ON public.social_relationship_messages(conversation_id, provider_message_id)
  WHERE provider_message_id IS NOT NULL;
CREATE INDEX idx_srl_msg_convo ON public.social_relationship_messages(conversation_id, created_at);

-- 11. webhook events
CREATE TABLE public.social_relationship_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  business_id UUID,
  event_type TEXT,
  provider_event_id TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  signature_valid BOOLEAN NOT NULL DEFAULT false,
  processing_status TEXT NOT NULL DEFAULT 'received'
    CHECK (processing_status IN ('received','duplicate','processed','ignored','failed')),
  processing_error TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_event_id)
);
CREATE INDEX idx_srl_webhook_created ON public.social_relationship_webhook_events(created_at DESC);

-- 12. rate limits
CREATE TABLE public.social_relationship_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  account_id UUID NOT NULL REFERENCES public.social_relationship_accounts(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  window_kind TEXT NOT NULL CHECK (window_kind IN ('day','week')),
  window_start DATE NOT NULL,
  used_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (account_id, action_type, window_kind, window_start)
);

-- 13. suppressions
CREATE TABLE public.social_relationship_suppressions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID,
  scope TEXT NOT NULL DEFAULT 'business' CHECK (scope IN ('business','global')),
  network TEXT,
  provider_profile_id TEXT,
  profile_url TEXT,
  email TEXT,
  reason TEXT NOT NULL CHECK (reason IN (
    'opt_out','negative_reply','complaint','do_not_contact','client','supplier',
    'duplicate_person','high_risk','manual')),
  detail TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_srl_suppr_lookup ON public.social_relationship_suppressions(network, provider_profile_id);

-- 14. audit (immutable)
CREATE TABLE public.social_relationship_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID,
  account_id UUID,
  action_id UUID,
  conversation_id UUID,
  event TEXT NOT NULL,
  event_status TEXT NOT NULL DEFAULT 'info'
    CHECK (event_status IN ('info','ok','blocked','failed','override','approval')),
  actor TEXT NOT NULL DEFAULT 'system',
  actor_user_id UUID,
  provider TEXT,
  provider_calls INTEGER NOT NULL DEFAULT 0,
  detail JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_srl_audit_business ON public.social_relationship_audit(business_id, created_at DESC);

-- 15. policies
CREATE TABLE public.social_relationship_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  account_id UUID REFERENCES public.social_relationship_accounts(id) ON DELETE CASCADE,
  mode TEXT NOT NULL DEFAULT 'test_only'
    CHECK (mode IN ('test_only','draft_actions','approval_required','approved_batch_autopilot','paused')),
  daily_invite_limit INTEGER NOT NULL DEFAULT 10,
  weekly_invite_limit INTEGER NOT NULL DEFAULT 40,
  daily_message_limit INTEGER NOT NULL DEFAULT 15,
  weekly_message_limit INTEGER NOT NULL DEFAULT 60,
  max_ai_replies_per_conversation_per_day INTEGER NOT NULL DEFAULT 3,
  min_delay_seconds INTEGER NOT NULL DEFAULT 90,
  max_delay_seconds INTEGER NOT NULL DEFAULT 420,
  working_hours_start INTEGER NOT NULL DEFAULT 9 CHECK (working_hours_start BETWEEN 0 AND 23),
  working_hours_end INTEGER NOT NULL DEFAULT 17 CHECK (working_hours_end BETWEEN 1 AND 24),
  working_days INTEGER[] NOT NULL DEFAULT ARRAY[1,2,3,4,5],
  timezone TEXT NOT NULL DEFAULT 'Europe/London',
  allow_connect_then_dm BOOLEAN NOT NULL DEFAULT false,
  allow_ai_autosend BOOLEAN NOT NULL DEFAULT false,
  require_real_account_declaration BOOLEAN NOT NULL DEFAULT true,
  cooldown_minutes_after_warning INTEGER NOT NULL DEFAULT 1440,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (business_id, account_id)
);

-- 16. pauses
CREATE TABLE public.social_relationship_pauses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope TEXT NOT NULL CHECK (scope IN ('global','business','provider','account')),
  business_id UUID,
  provider TEXT,
  account_id UUID REFERENCES public.social_relationship_accounts(id) ON DELETE CASCADE,
  is_paused BOOLEAN NOT NULL DEFAULT true,
  reason TEXT,
  paused_by UUID,
  paused_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  released_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_srl_pauses_scope ON public.social_relationship_pauses(scope, business_id, account_id);

-- 17. escalations
CREATE TABLE public.social_relationship_escalations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  conversation_id UUID REFERENCES public.social_relationship_conversations(id) ON DELETE CASCADE,
  action_id UUID REFERENCES public.social_relationship_action_queue(id) ON DELETE SET NULL,
  category TEXT NOT NULL CHECK (category IN (
    'legal','complaint','refund','safeguarding','regulated','high_value','press','investor','negative','uncertain','other')),
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
  summary TEXT,
  escalation_status TEXT NOT NULL DEFAULT 'open'
    CHECK (escalation_status IN ('open','acknowledged','resolved','dismissed')),
  resolved_by UUID,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_srl_escalations_business ON public.social_relationship_escalations(business_id, escalation_status);

-- 18. crm links
CREATE TABLE public.social_relationship_crm_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  profile_id UUID NOT NULL REFERENCES public.social_relationship_profiles(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.social_relationship_conversations(id) ON DELETE SET NULL,
  crm_contact_id UUID,
  crm_lead_status TEXT,
  link_status TEXT NOT NULL DEFAULT 'linked'
    CHECK (link_status IN ('linked','created','merged','failed')),
  source_platform TEXT,
  source_target_list_id UUID REFERENCES public.social_relationship_target_lists(id) ON DELETE SET NULL,
  first_touch_at TIMESTAMPTZ,
  detail JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (business_id, profile_id)
);

-- ---------- GRANTS, RLS, POLICIES ----------
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'social_relationship_provider_connections','social_relationship_accounts',
    'social_relationship_capabilities','social_relationship_searches',
    'social_relationship_profiles','social_relationship_target_lists',
    'social_relationship_targets','social_relationship_action_queue',
    'social_relationship_conversations','social_relationship_messages',
    'social_relationship_webhook_events','social_relationship_rate_limits',
    'social_relationship_suppressions','social_relationship_audit',
    'social_relationship_policies','social_relationship_pauses',
    'social_relationship_escalations','social_relationship_crm_links'
  ] LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated;', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role;', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format($f$
      CREATE POLICY "founder_admin_all_%1$s" ON public.%1$I
      FOR ALL TO authenticated
      USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'founder'::app_role))
      WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'founder'::app_role));
    $f$, t);
    EXECUTE format(
      'CREATE TRIGGER trg_updated_at_%1$s BEFORE UPDATE ON public.%1$I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();', t);
  END LOOP;
END $$;

-- audit + webhook events are append-only for authenticated users
DROP POLICY IF EXISTS "founder_admin_all_social_relationship_audit" ON public.social_relationship_audit;
CREATE POLICY "srl_audit_read" ON public.social_relationship_audit
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'founder'::app_role));
CREATE POLICY "srl_audit_insert" ON public.social_relationship_audit
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'founder'::app_role));

DROP POLICY IF EXISTS "founder_admin_all_social_relationship_webhook_events" ON public.social_relationship_webhook_events;
CREATE POLICY "srl_webhook_read" ON public.social_relationship_webhook_events
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'founder'::app_role));