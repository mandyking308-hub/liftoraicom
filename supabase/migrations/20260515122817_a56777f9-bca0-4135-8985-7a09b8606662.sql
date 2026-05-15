-- ============ crm_interaction_types ============
CREATE TABLE IF NOT EXISTS public.crm_interaction_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interaction_type TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  description TEXT,
  default_direction TEXT,
  default_source_system TEXT,
  default_source_channel TEXT,
  creates_conversation_candidate BOOLEAN NOT NULL DEFAULT false,
  founder_review_required BOOLEAN NOT NULL DEFAULT true,
  compliance_relevant BOOLEAN NOT NULL DEFAULT true,
  priority_relevant BOOLEAN NOT NULL DEFAULT true,
  ai_relevant BOOLEAN NOT NULL DEFAULT true,
  proposal_relevant BOOLEAN NOT NULL DEFAULT false,
  deal_relevant BOOLEAN NOT NULL DEFAULT false,
  suppression_relevant BOOLEAN NOT NULL DEFAULT false,
  unsubscribe_relevant BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_interaction_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders/admins read interaction types"
  ON public.crm_interaction_types FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Founders/admins write interaction types"
  ON public.crm_interaction_types FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Founders/admins update interaction types"
  ON public.crm_interaction_types FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Founders/admins delete interaction types"
  ON public.crm_interaction_types FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_crm_interaction_types_updated_at
  BEFORE UPDATE ON public.crm_interaction_types
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ crm_interaction_ledger ============
CREATE TABLE IF NOT EXISTS public.crm_interaction_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  business_contact_relationship_id UUID REFERENCES public.business_contact_relationships(id) ON DELETE SET NULL,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  communication_id UUID REFERENCES public.communications(id) ON DELETE SET NULL,
  email_event_id UUID REFERENCES public.email_events(id) ON DELETE SET NULL,
  provider_event_id UUID REFERENCES public.outbound_provider_events(id) ON DELETE SET NULL,
  ai_action_id UUID REFERENCES public.ai_actions(id) ON DELETE SET NULL,
  ai_draft_id UUID REFERENCES public.ai_drafts(id) ON DELETE SET NULL,
  internal_proposal_id UUID REFERENCES public.internal_proposals(id) ON DELETE SET NULL,
  demo_access_id UUID REFERENCES public.demo_access(id) ON DELETE SET NULL,
  demo_event_id UUID REFERENCES public.demo_events(id) ON DELETE SET NULL,
  deal_id UUID REFERENCES public.deals(id) ON DELETE SET NULL,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
  assignment_id UUID REFERENCES public.assignments(id) ON DELETE SET NULL,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,

  source_system TEXT NOT NULL,
  source_channel TEXT NOT NULL,
  interaction_type TEXT NOT NULL,
  direction TEXT,
  provider_type TEXT,
  provider_message_id TEXT,
  provider_campaign_id TEXT,
  provider_lead_id TEXT,
  external_event_id TEXT,
  external_thread_id TEXT,
  contact_email TEXT,
  contact_name TEXT,
  subject TEXT,
  summary TEXT,
  body_preview TEXT,
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,

  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  matched_status TEXT NOT NULL DEFAULT 'unmatched',
  match_confidence NUMERIC,
  dedupe_key TEXT,
  processing_status TEXT NOT NULL DEFAULT 'captured',
  founder_review_required BOOLEAN NOT NULL DEFAULT true,
  ai_relevant BOOLEAN NOT NULL DEFAULT true,
  compliance_relevant BOOLEAN NOT NULL DEFAULT true,
  priority_relevant BOOLEAN NOT NULL DEFAULT true,
  proposal_relevant BOOLEAN NOT NULL DEFAULT false,
  deal_relevant BOOLEAN NOT NULL DEFAULT false,
  compliance_status_snapshot TEXT,
  contact_status_snapshot TEXT,
  bcr_stage_snapshot TEXT,
  ai_action_recommended TEXT,
  next_step TEXT,
  risk_flags JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT crm_interaction_ledger_direction_chk
    CHECK (direction IS NULL OR direction IN ('inbound','outbound','internal','system','unknown'))
);

CREATE UNIQUE INDEX IF NOT EXISTS crm_interaction_ledger_dedupe_uniq
  ON public.crm_interaction_ledger (dedupe_key) WHERE dedupe_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cil_business ON public.crm_interaction_ledger (business_id);
CREATE INDEX IF NOT EXISTS idx_cil_contact ON public.crm_interaction_ledger (contact_id);
CREATE INDEX IF NOT EXISTS idx_cil_conversation ON public.crm_interaction_ledger (conversation_id);
CREATE INDEX IF NOT EXISTS idx_cil_communication ON public.crm_interaction_ledger (communication_id);
CREATE INDEX IF NOT EXISTS idx_cil_email_event ON public.crm_interaction_ledger (email_event_id);
CREATE INDEX IF NOT EXISTS idx_cil_provider_event ON public.crm_interaction_ledger (provider_event_id);
CREATE INDEX IF NOT EXISTS idx_cil_occurred_at ON public.crm_interaction_ledger (occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_cil_captured_at ON public.crm_interaction_ledger (captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_cil_contact_email ON public.crm_interaction_ledger (lower(contact_email));
CREATE INDEX IF NOT EXISTS idx_cil_source_system ON public.crm_interaction_ledger (source_system);
CREATE INDEX IF NOT EXISTS idx_cil_source_channel ON public.crm_interaction_ledger (source_channel);
CREATE INDEX IF NOT EXISTS idx_cil_interaction_type ON public.crm_interaction_ledger (interaction_type);
CREATE INDEX IF NOT EXISTS idx_cil_provider_type ON public.crm_interaction_ledger (provider_type);
CREATE INDEX IF NOT EXISTS idx_cil_provider_message ON public.crm_interaction_ledger (provider_message_id);
CREATE INDEX IF NOT EXISTS idx_cil_provider_campaign ON public.crm_interaction_ledger (provider_campaign_id);
CREATE INDEX IF NOT EXISTS idx_cil_external_event ON public.crm_interaction_ledger (external_event_id);
CREATE INDEX IF NOT EXISTS idx_cil_dedupe ON public.crm_interaction_ledger (dedupe_key);

ALTER TABLE public.crm_interaction_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders/admins read interaction ledger"
  ON public.crm_interaction_ledger FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Founders/admins insert interaction ledger"
  ON public.crm_interaction_ledger FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Founders/admins update interaction ledger"
  ON public.crm_interaction_ledger FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Founders/admins delete interaction ledger"
  ON public.crm_interaction_ledger FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_crm_interaction_ledger_updated_at
  BEFORE UPDATE ON public.crm_interaction_ledger
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ Seed interaction types (idempotent) ============
INSERT INTO public.crm_interaction_types
  (interaction_type, label, default_direction, default_source_system, default_source_channel,
   creates_conversation_candidate, founder_review_required, compliance_relevant, priority_relevant,
   ai_relevant, proposal_relevant, deal_relevant, suppression_relevant, unsubscribe_relevant)
VALUES
  ('smartlead_email_sent','Smartlead email sent','outbound','smartlead','email', false, false, true, true, true, false, false, false, false),
  ('smartlead_email_opened','Smartlead email opened','inbound','smartlead','email', false, false, false, true, true, false, false, false, false),
  ('smartlead_link_clicked','Smartlead link clicked','inbound','smartlead','email', false, false, false, true, true, false, false, false, false),
  ('smartlead_reply_received','Smartlead reply received','inbound','smartlead','email', true, true, true, true, true, false, true, false, false),
  ('smartlead_bounce','Smartlead bounce','system','smartlead','email', false, true, true, true, true, false, false, true, false),
  ('smartlead_unsubscribe','Smartlead unsubscribe','inbound','smartlead','email', false, true, true, true, true, false, false, true, true),
  ('smartlead_campaign_completed','Smartlead campaign completed','system','smartlead','email', false, false, false, true, true, false, false, false, false),
  ('smartlead_lead_status_changed','Smartlead lead status changed','system','smartlead','email', false, false, false, true, true, false, false, false, false),
  ('smartlead_account_error','Smartlead account error','system','smartlead','email', false, true, true, true, true, false, false, false, false),
  ('native_email_sent','Native email sent','outbound','native_smtp','email', false, false, true, true, true, false, false, false, false),
  ('native_email_reply_received','Native email reply received','inbound','native_smtp','email', true, true, true, true, true, false, true, false, false),
  ('native_email_bounce','Native email bounce','system','native_smtp','email', false, true, true, true, true, false, false, true, false),
  ('native_email_unsubscribe','Native email unsubscribe','inbound','native_smtp','email', false, true, true, true, true, false, false, true, true),
  ('founder_manual_note','Founder manual note','internal','founder','manual', false, false, false, true, true, false, false, false, false),
  ('founder_call_note','Founder call note','internal','founder','phone', true, false, false, true, true, false, true, false, false),
  ('founder_meeting_note','Founder meeting note','internal','founder','meeting', true, false, false, true, true, false, true, false, false),
  ('ai_reply_draft_created','AI reply draft created','internal','liftor_ai','ai', false, true, true, true, true, false, false, false, false),
  ('ai_reply_approved','AI reply approved','internal','founder','ai', false, false, true, true, true, false, false, false, false),
  ('ai_reply_rejected','AI reply rejected','internal','founder','ai', false, false, true, true, true, false, false, false, false),
  ('ai_reply_sent','AI reply sent','outbound','liftor_ai','email', false, false, true, true, true, false, false, false, false),
  ('proposal_created','Proposal created','internal','liftor','proposal', false, false, false, true, true, true, false, false, false),
  ('proposal_sent','Proposal sent','outbound','liftor','proposal', false, false, true, true, true, true, false, false, false),
  ('proposal_viewed','Proposal viewed','inbound','liftor','proposal', false, false, false, true, true, true, true, false, false),
  ('proposal_accepted','Proposal accepted','inbound','liftor','proposal', true, true, false, true, true, true, true, false, false),
  ('proposal_declined','Proposal declined','inbound','liftor','proposal', false, true, false, true, true, true, false, false, false),
  ('demo_access_created','Demo access created','internal','liftor','demo', false, false, false, true, true, false, false, false, false),
  ('demo_viewed','Demo viewed','inbound','liftor','demo', false, false, false, true, true, false, true, false, false),
  ('demo_completed','Demo completed','inbound','liftor','demo', true, false, false, true, true, false, true, false, false),
  ('deal_created','Deal created','internal','liftor','deal', false, false, false, true, true, false, true, false, false),
  ('deal_stage_changed','Deal stage changed','internal','liftor','deal', false, false, false, true, true, false, true, false, false),
  ('deal_won','Deal won','internal','liftor','deal', false, false, false, true, true, false, true, false, false),
  ('deal_lost','Deal lost','internal','liftor','deal', false, false, false, true, true, false, true, false, false),
  ('invoice_created','Invoice created','internal','liftor','finance', false, false, false, true, true, false, true, false, false),
  ('invoice_sent','Invoice sent','outbound','liftor','finance', false, false, true, true, true, false, true, false, false),
  ('payment_received','Payment received','inbound','liftor','finance', false, false, false, true, true, false, true, false, false),
  ('supplier_assignment_created','Supplier assignment created','internal','liftor','operations', false, false, false, true, true, false, false, false, false),
  ('supplier_update_received','Supplier update received','inbound','supplier','operations', true, true, false, true, true, false, false, false, false),
  ('compliance_event_created','Compliance event created','system','liftor','compliance', false, true, true, true, true, false, false, false, false),
  ('system_event_created','System event created','system','liftor','system', false, false, false, false, true, false, false, false, false)
ON CONFLICT (interaction_type) DO NOTHING;

-- ============ Summary RPC ============
CREATE OR REPLACE FUNCTION public.get_crm_interaction_ledger_summary(p_business_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total INT;
  v_matched INT;
  v_unmatched INT;
  v_last7 INT;
  v_review INT;
  v_ai INT;
  v_compliance INT;
  v_dupes INT;
  v_by_source JSONB;
  v_by_type JSONB;
BEGIN
  IF NOT (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin') OR auth.role() = 'service_role') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  SELECT count(*) INTO v_total FROM public.crm_interaction_ledger l
    WHERE p_business_id IS NULL OR l.business_id = p_business_id;
  SELECT count(*) INTO v_matched FROM public.crm_interaction_ledger l
    WHERE (p_business_id IS NULL OR l.business_id = p_business_id) AND matched_status = 'matched';
  SELECT count(*) INTO v_unmatched FROM public.crm_interaction_ledger l
    WHERE (p_business_id IS NULL OR l.business_id = p_business_id) AND matched_status <> 'matched';
  SELECT count(*) INTO v_last7 FROM public.crm_interaction_ledger l
    WHERE (p_business_id IS NULL OR l.business_id = p_business_id) AND occurred_at > now() - interval '7 days';
  SELECT count(*) INTO v_review FROM public.crm_interaction_ledger l
    WHERE (p_business_id IS NULL OR l.business_id = p_business_id) AND founder_review_required = true;
  SELECT count(*) INTO v_ai FROM public.crm_interaction_ledger l
    WHERE (p_business_id IS NULL OR l.business_id = p_business_id) AND ai_relevant = true;
  SELECT count(*) INTO v_compliance FROM public.crm_interaction_ledger l
    WHERE (p_business_id IS NULL OR l.business_id = p_business_id) AND compliance_relevant = true;

  SELECT coalesce(jsonb_object_agg(source_system, c), '{}'::jsonb) INTO v_by_source FROM (
    SELECT source_system, count(*)::int AS c FROM public.crm_interaction_ledger l
      WHERE (p_business_id IS NULL OR l.business_id = p_business_id)
      GROUP BY source_system
  ) x;
  SELECT coalesce(jsonb_object_agg(interaction_type, c), '{}'::jsonb) INTO v_by_type FROM (
    SELECT interaction_type, count(*)::int AS c FROM public.crm_interaction_ledger l
      WHERE (p_business_id IS NULL OR l.business_id = p_business_id)
      GROUP BY interaction_type
  ) y;

  SELECT count(*) INTO v_dupes FROM (
    SELECT dedupe_key FROM public.crm_interaction_ledger
      WHERE dedupe_key IS NOT NULL
      GROUP BY dedupe_key HAVING count(*) > 1
  ) d;

  RETURN jsonb_build_object(
    'ok', true,
    'total_interactions', v_total,
    'matched_interactions', v_matched,
    'unmatched_interactions', v_unmatched,
    'interactions_last_7_days', v_last7,
    'interactions_by_source_system', v_by_source,
    'interactions_by_type', v_by_type,
    'interactions_requiring_founder_review', v_review,
    'ai_relevant_interactions', v_ai,
    'compliance_relevant_interactions', v_compliance,
    'duplicate_dedupe_conflicts', v_dupes,
    'ledger_ready', true
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_crm_interaction_ledger_summary(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_crm_interaction_ledger_summary(UUID) TO authenticated, service_role;