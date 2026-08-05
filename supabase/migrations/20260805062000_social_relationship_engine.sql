-- Liftor Social Relationship Engine
-- Safe-off, founder-controlled social discovery, connection, conversation and CRM handoff.

CREATE TABLE IF NOT EXISTS public.social_relationship_provider_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  connection_status text NOT NULL DEFAULT 'not_configured'
    CHECK (connection_status IN ('not_configured','connected','degraded','blocked','disconnected')),
  connection_mode text NOT NULL DEFAULT 'test_only'
    CHECK (connection_mode IN ('test_only','draft_actions','approval_required','approved_batch_autopilot','paused')),
  provider_workspace_id text,
  provider_workspace_name text,
  last_tested_at timestamptz,
  last_account_sync_at timestamptz,
  last_capability_sync_at timestamptz,
  webhook_status text NOT NULL DEFAULT 'not_registered'
    CHECK (webhook_status IN ('not_registered','registered','degraded','failed')),
  webhook_external_id text,
  sanitised_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider)
);

CREATE TABLE IF NOT EXISTS public.social_relationship_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_connection_id uuid NOT NULL REFERENCES public.social_relationship_provider_connections(id) ON DELETE CASCADE,
  provider text NOT NULL,
  platform text NOT NULL,
  external_account_id text NOT NULL,
  display_name text,
  account_handle text,
  profile_url text,
  account_status text NOT NULL DEFAULT 'connected'
    CHECK (account_status IN ('connected','degraded','checkpoint','rate_limited','blocked','disconnected')),
  real_account_confirmed boolean NOT NULL DEFAULT false,
  execution_enabled boolean NOT NULL DEFAULT false,
  cooldown_until timestamptz,
  last_synced_at timestamptz,
  sanitised_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_test_data boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, external_account_id)
);

CREATE TABLE IF NOT EXISTS public.social_relationship_capabilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.social_relationship_accounts(id) ON DELETE CASCADE,
  capability text NOT NULL,
  supported boolean NOT NULL DEFAULT false,
  support_level text NOT NULL DEFAULT 'unsupported'
    CHECK (support_level IN ('unsupported','read_only','approval_required','supported')),
  constraints_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (account_id, capability)
);

CREATE TABLE IF NOT EXISTS public.social_relationship_searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  provider text NOT NULL,
  platform text NOT NULL,
  account_id uuid REFERENCES public.social_relationship_accounts(id) ON DELETE SET NULL,
  search_name text NOT NULL,
  search_status text NOT NULL DEFAULT 'draft'
    CHECK (search_status IN ('draft','previewed','approved','running','completed','failed','cancelled')),
  criteria_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  result_count integer NOT NULL DEFAULT 0,
  external_search_allowed boolean NOT NULL DEFAULT false,
  approval_status text NOT NULL DEFAULT 'pending'
    CHECK (approval_status IN ('pending','approved','rejected','expired')),
  approved_by uuid,
  approved_at timestamptz,
  last_error text,
  is_test_data boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.social_relationship_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  provider text NOT NULL,
  platform text NOT NULL,
  account_id uuid REFERENCES public.social_relationship_accounts(id) ON DELETE SET NULL,
  external_profile_id text NOT NULL,
  public_identifier text,
  profile_url text,
  first_name text,
  last_name text,
  full_name text,
  headline text,
  current_company text,
  job_title text,
  geography text,
  industry text,
  relationship_status text NOT NULL DEFAULT 'unknown'
    CHECK (relationship_status IN ('unknown','not_connected','invitation_pending','connected','following','blocked')),
  source_type text NOT NULL DEFAULT 'provider_search',
  source_search_id uuid REFERENCES public.social_relationship_searches(id) ON DELETE SET NULL,
  source_provenance jsonb NOT NULL DEFAULT '{}'::jsonb,
  profile_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  risk_status text NOT NULL DEFAULT 'unreviewed'
    CHECK (risk_status IN ('unreviewed','low','medium','high','blocked')),
  do_not_contact boolean NOT NULL DEFAULT false,
  last_synced_at timestamptz,
  is_test_data boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, provider, external_profile_id)
);

CREATE TABLE IF NOT EXISTS public.social_relationship_target_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  list_name text NOT NULL,
  list_status text NOT NULL DEFAULT 'draft'
    CHECK (list_status IN ('draft','pending_approval','approved','active','completed','paused','cancelled')),
  primary_goal text,
  default_action text,
  approval_status text NOT NULL DEFAULT 'pending'
    CHECK (approval_status IN ('pending','approved','rejected','expired')),
  approved_by uuid,
  approved_at timestamptz,
  policy_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_test_data boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.social_relationship_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  target_list_id uuid NOT NULL REFERENCES public.social_relationship_target_lists(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.social_relationship_profiles(id) ON DELETE CASCADE,
  overall_score numeric(8,2) NOT NULL DEFAULT 0,
  score_breakdown jsonb NOT NULL DEFAULT '{}'::jsonb,
  ranking_reason text,
  recommended_action text,
  approval_status text NOT NULL DEFAULT 'pending'
    CHECK (approval_status IN ('pending','approved','rejected','suppressed','completed')),
  approved_by uuid,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (target_list_id, profile_id)
);

CREATE TABLE IF NOT EXISTS public.social_relationship_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  provider text NOT NULL,
  account_id uuid REFERENCES public.social_relationship_accounts(id) ON DELETE CASCADE,
  policy_mode text NOT NULL DEFAULT 'test_only'
    CHECK (policy_mode IN ('test_only','draft_actions','approval_required','approved_batch_autopilot','paused')),
  timezone text NOT NULL DEFAULT 'Europe/London',
  working_days smallint[] NOT NULL DEFAULT ARRAY[1,2,3,4,5]::smallint[],
  working_hour_start smallint NOT NULL DEFAULT 9 CHECK (working_hour_start BETWEEN 0 AND 23),
  working_hour_end smallint NOT NULL DEFAULT 17 CHECK (working_hour_end BETWEEN 1 AND 24),
  min_delay_seconds integer NOT NULL DEFAULT 180 CHECK (min_delay_seconds >= 60),
  max_jitter_seconds integer NOT NULL DEFAULT 240 CHECK (max_jitter_seconds >= 0),
  allow_connection_then_message boolean NOT NULL DEFAULT false,
  low_risk_ai_reply_enabled boolean NOT NULL DEFAULT false,
  max_ai_replies_per_conversation_day integer NOT NULL DEFAULT 3 CHECK (max_ai_replies_per_conversation_day BETWEEN 0 AND 10),
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE NULLS NOT DISTINCT (business_id, provider, account_id)
);

CREATE TABLE IF NOT EXISTS public.social_relationship_pauses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL CHECK (scope IN ('global','business','provider','account')),
  scope_key text NOT NULL DEFAULT 'global',
  paused boolean NOT NULL DEFAULT true,
  reason text,
  actor_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (scope, scope_key)
);

CREATE TABLE IF NOT EXISTS public.social_relationship_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.social_relationship_accounts(id) ON DELETE CASCADE,
  platform text NOT NULL,
  action_type text NOT NULL,
  daily_limit integer NOT NULL DEFAULT 10 CHECK (daily_limit >= 0),
  weekly_limit integer NOT NULL DEFAULT 40 CHECK (weekly_limit >= 0),
  daily_count integer NOT NULL DEFAULT 0 CHECK (daily_count >= 0),
  weekly_count integer NOT NULL DEFAULT 0 CHECK (weekly_count >= 0),
  daily_window_started_at timestamptz NOT NULL DEFAULT now(),
  weekly_window_started_at timestamptz NOT NULL DEFAULT now(),
  provider_limit_state text NOT NULL DEFAULT 'ok'
    CHECK (provider_limit_state IN ('ok','near_limit','rate_limited','blocked')),
  cooldown_until timestamptz,
  last_provider_warning text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (account_id, action_type)
);

CREATE TABLE IF NOT EXISTS public.social_relationship_suppressions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid,
  provider text,
  platform text,
  external_profile_id text,
  profile_id uuid REFERENCES public.social_relationship_profiles(id) ON DELETE SET NULL,
  suppression_type text NOT NULL
    CHECK (suppression_type IN ('opt_out','not_interested','complaint','do_not_contact','duplicate','risk','manual','provider_block')),
  reason text,
  source_message_id text,
  active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  lifted_at timestamptz,
  lifted_by uuid
);

CREATE TABLE IF NOT EXISTS public.social_relationship_action_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  provider text NOT NULL,
  platform text NOT NULL,
  account_id uuid NOT NULL REFERENCES public.social_relationship_accounts(id) ON DELETE CASCADE,
  target_list_id uuid REFERENCES public.social_relationship_target_lists(id) ON DELETE SET NULL,
  target_id uuid REFERENCES public.social_relationship_targets(id) ON DELETE SET NULL,
  profile_id uuid REFERENCES public.social_relationship_profiles(id) ON DELETE SET NULL,
  conversation_id uuid,
  action_type text NOT NULL
    CHECK (action_type IN ('send_invitation','connect','follow','start_chat','send_message','reply_message','accept_invitation','decline_invitation','sync_profile','sync_conversation')),
  action_status text NOT NULL DEFAULT 'draft'
    CHECK (action_status IN ('draft','pending_approval','ready','blocked','submitting','sent','accepted','replied','failed','retrying','submission_unknown','dead_letter','cancelled')),
  approval_status text NOT NULL DEFAULT 'pending'
    CHECK (approval_status IN ('pending','approved','rejected','not_required')),
  payload_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  blocker_codes text[] NOT NULL DEFAULT '{}'::text[],
  idempotency_key text,
  provider_action_id text,
  provider_response_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  scheduled_for timestamptz,
  claimed_at timestamptz,
  attempt_count integer NOT NULL DEFAULT 0,
  next_retry_at timestamptz,
  last_error text,
  submitted_at timestamptz,
  completed_at timestamptz,
  dead_letter_reason text,
  is_test_data boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.social_relationship_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  provider text NOT NULL,
  platform text NOT NULL,
  account_id uuid NOT NULL REFERENCES public.social_relationship_accounts(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES public.social_relationship_profiles(id) ON DELETE SET NULL,
  external_chat_id text NOT NULL,
  conversation_status text NOT NULL DEFAULT 'open'
    CHECK (conversation_status IN ('open','qualified','escalated','suppressed','closed')),
  last_intent text,
  intent_history jsonb NOT NULL DEFAULT '[]'::jsonb,
  ai_reply_count_today integer NOT NULL DEFAULT 0,
  ai_reply_window_started_at timestamptz NOT NULL DEFAULT now(),
  escalation_pending boolean NOT NULL DEFAULT false,
  last_message_at timestamptz,
  last_inbound_at timestamptz,
  last_outbound_at timestamptz,
  last_ai_reply_at timestamptz,
  crm_contact_id uuid,
  crm_opportunity_id uuid,
  source_attribution jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_test_data boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, account_id, external_chat_id)
);

ALTER TABLE public.social_relationship_action_queue
  DROP CONSTRAINT IF EXISTS social_relationship_action_queue_conversation_id_fkey;
ALTER TABLE public.social_relationship_action_queue
  ADD CONSTRAINT social_relationship_action_queue_conversation_id_fkey
  FOREIGN KEY (conversation_id) REFERENCES public.social_relationship_conversations(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.social_relationship_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  conversation_id uuid NOT NULL REFERENCES public.social_relationship_conversations(id) ON DELETE CASCADE,
  provider text NOT NULL,
  platform text NOT NULL,
  external_message_id text NOT NULL,
  direction text NOT NULL CHECK (direction IN ('inbound','outbound')),
  message_type text NOT NULL DEFAULT 'text',
  content text,
  attachments_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  provider_created_at timestamptz,
  delivery_status text NOT NULL DEFAULT 'received'
    CHECK (delivery_status IN ('draft','queued','sent','delivered','read','received','failed','unknown')),
  ai_generated boolean NOT NULL DEFAULT false,
  classification text,
  raw_event_id text,
  is_test_data boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, external_message_id)
);

CREATE TABLE IF NOT EXISTS public.social_relationship_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  external_event_id text NOT NULL,
  event_type text NOT NULL,
  account_external_id text,
  signature_verified boolean NOT NULL DEFAULT false,
  processing_status text NOT NULL DEFAULT 'received'
    CHECK (processing_status IN ('received','processing','processed','ignored','failed')),
  payload_hash text NOT NULL,
  sanitised_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  UNIQUE (provider, external_event_id)
);

CREATE TABLE IF NOT EXISTS public.social_relationship_escalations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  conversation_id uuid REFERENCES public.social_relationship_conversations(id) ON DELETE SET NULL,
  message_id uuid REFERENCES public.social_relationship_messages(id) ON DELETE SET NULL,
  escalation_type text NOT NULL,
  severity text NOT NULL DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','acknowledged','resolved','dismissed')),
  founder_approval_item_id uuid,
  assigned_to uuid,
  resolved_by uuid,
  resolved_at timestamptz,
  resolution_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.social_relationship_crm_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  profile_id uuid REFERENCES public.social_relationship_profiles(id) ON DELETE CASCADE,
  conversation_id uuid REFERENCES public.social_relationship_conversations(id) ON DELETE SET NULL,
  contact_id uuid,
  opportunity_id uuid,
  source_platform text NOT NULL,
  source_campaign text,
  source_target_list_id uuid REFERENCES public.social_relationship_target_lists(id) ON DELETE SET NULL,
  first_touch_at timestamptz,
  qualified_at timestamptz,
  attribution_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE NULLS NOT DISTINCT (business_id, profile_id, contact_id)
);

CREATE TABLE IF NOT EXISTS public.social_relationship_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid,
  provider text,
  account_id uuid,
  actor_type text NOT NULL DEFAULT 'system',
  actor_id uuid,
  action text NOT NULL,
  action_status text NOT NULL,
  entity_type text,
  entity_id uuid,
  idempotency_key text,
  blocker_codes text[] NOT NULL DEFAULT '{}'::text[],
  before_json jsonb,
  after_json jsonb,
  provider_response_summary jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS social_relationship_action_idempotency_uidx
  ON public.social_relationship_action_queue (idempotency_key)
  WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS social_relationship_action_due_idx
  ON public.social_relationship_action_queue (action_status, scheduled_for, next_retry_at);
CREATE INDEX IF NOT EXISTS social_relationship_action_business_idx
  ON public.social_relationship_action_queue (business_id, action_status);
CREATE INDEX IF NOT EXISTS social_relationship_profiles_lookup_idx
  ON public.social_relationship_profiles (business_id, platform, relationship_status);
CREATE INDEX IF NOT EXISTS social_relationship_messages_thread_idx
  ON public.social_relationship_messages (conversation_id, provider_created_at DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS social_relationship_conversations_inbox_idx
  ON public.social_relationship_conversations (business_id, conversation_status, last_message_at DESC);
CREATE INDEX IF NOT EXISTS social_relationship_suppressions_lookup_idx
  ON public.social_relationship_suppressions (provider, external_profile_id, active);
CREATE INDEX IF NOT EXISTS social_relationship_audit_created_idx
  ON public.social_relationship_audit (created_at DESC);

CREATE OR REPLACE FUNCTION public.social_relationship_claim_action(
  p_action_id uuid,
  p_business_id uuid,
  p_idempotency_key text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  claimed integer;
BEGIN
  IF p_idempotency_key IS NULL OR length(trim(p_idempotency_key)) < 12 THEN
    RETURN false;
  END IF;

  UPDATE public.social_relationship_action_queue
     SET action_status = 'submitting',
         idempotency_key = p_idempotency_key,
         claimed_at = now(),
         attempt_count = attempt_count + 1,
         updated_at = now()
   WHERE id = p_action_id
     AND business_id = p_business_id
     AND action_status IN ('ready','retrying')
     AND (idempotency_key IS NULL OR idempotency_key = p_idempotency_key);
  GET DIAGNOSTICS claimed = ROW_COUNT;
  RETURN claimed = 1;
END;
$$;
REVOKE ALL ON FUNCTION public.social_relationship_claim_action(uuid,uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.social_relationship_claim_action(uuid,uuid,text) TO service_role;

CREATE OR REPLACE FUNCTION public.social_relationship_immutable_audit()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  RAISE EXCEPTION 'social_relationship_audit is append-only';
END;
$$;
DROP TRIGGER IF EXISTS trg_social_relationship_audit_immutable ON public.social_relationship_audit;
CREATE TRIGGER trg_social_relationship_audit_immutable
  BEFORE UPDATE OR DELETE ON public.social_relationship_audit
  FOR EACH ROW EXECUTE FUNCTION public.social_relationship_immutable_audit();

DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'social_relationship_provider_connections','social_relationship_accounts',
    'social_relationship_capabilities','social_relationship_searches',
    'social_relationship_profiles','social_relationship_target_lists',
    'social_relationship_targets','social_relationship_policies',
    'social_relationship_pauses','social_relationship_rate_limits',
    'social_relationship_suppressions','social_relationship_action_queue',
    'social_relationship_conversations','social_relationship_messages',
    'social_relationship_webhook_events','social_relationship_escalations',
    'social_relationship_crm_links','social_relationship_audit'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('DROP POLICY IF EXISTS founder_admin_all_%I ON public.%I', t, t);
    EXECUTE format(
      'CREATE POLICY founder_admin_all_%I ON public.%I FOR ALL TO authenticated USING (public.has_role(auth.uid(),''founder'') OR public.has_role(auth.uid(),''admin'')) WITH CHECK (public.has_role(auth.uid(),''founder'') OR public.has_role(auth.uid(),''admin''))',
      t, t
    );
  END LOOP;
END $$;

DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'social_relationship_provider_connections','social_relationship_accounts',
    'social_relationship_capabilities','social_relationship_searches',
    'social_relationship_profiles','social_relationship_target_lists',
    'social_relationship_targets','social_relationship_policies',
    'social_relationship_pauses','social_relationship_rate_limits',
    'social_relationship_action_queue','social_relationship_conversations',
    'social_relationship_escalations','social_relationship_crm_links'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_updated ON public.%I', t, t);
    EXECUTE format('CREATE TRIGGER trg_%I_updated BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()', t, t);
  END LOOP;
END $$;
