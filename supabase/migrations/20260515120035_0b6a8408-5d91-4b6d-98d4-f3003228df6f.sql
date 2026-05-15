CREATE TABLE IF NOT EXISTS public.outbound_channel_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NULL,
  policy_key text NOT NULL,
  communication_type text NOT NULL,
  recommended_channel text NOT NULL,
  provider_type text NULL,
  native_allowed boolean NOT NULL DEFAULT false,
  smartlead_allowed boolean NOT NULL DEFAULT false,
  requires_founder_approval boolean NOT NULL DEFAULT true,
  auto_send_allowed boolean NOT NULL DEFAULT false,
  scale_allowed boolean NOT NULL DEFAULT false,
  notes text NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Unique guard: only one policy per business + communication_type, and one global per type.
CREATE UNIQUE INDEX IF NOT EXISTS outbound_channel_policies_business_type_uq
  ON public.outbound_channel_policies (business_id, communication_type)
  WHERE business_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS outbound_channel_policies_global_type_uq
  ON public.outbound_channel_policies (communication_type)
  WHERE business_id IS NULL;

ALTER TABLE public.outbound_channel_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders/admins read outbound channel policies"
  ON public.outbound_channel_policies
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'founder') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Founders/admins insert outbound channel policies"
  ON public.outbound_channel_policies
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'founder') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Founders/admins update outbound channel policies"
  ON public.outbound_channel_policies
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'founder') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'founder') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Founders/admins delete outbound channel policies"
  ON public.outbound_channel_policies
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'founder') OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_outbound_channel_policies_updated_at
  BEFORE UPDATE ON public.outbound_channel_policies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed safe global defaults (idempotent on communication_type when business_id IS NULL).
INSERT INTO public.outbound_channel_policies
  (business_id, policy_key, communication_type, recommended_channel, provider_type,
   native_allowed, smartlead_allowed, requires_founder_approval, auto_send_allowed, scale_allowed, notes)
VALUES
  (NULL, 'cold_outreach',                 'cold_outreach',                 'smartlead',            'smartlead',  false, true,  true, false, false, 'Cold scale outreach is routed via Smartlead. Founder approval required; auto-send disabled.'),
  (NULL, 'cold_followup_before_reply',    'cold_followup_before_reply',    'smartlead',            'smartlead',  false, true,  true, false, false, 'Cold follow-ups before any prospect reply route via Smartlead.'),
  (NULL, 'reply_after_interest',          'reply_after_interest',          'liftor_conversation',  'native',     true,  false, true, false, false, 'Once a prospect replies, hand off to the Liftor native conversation lane.'),
  (NULL, 'existing_customer_email',       'existing_customer_email',       'native',               'ionos_smtp', true,  false, true, false, false, 'Existing customer correspondence stays on the native IONOS lane.'),
  (NULL, 'proposal_send',                 'proposal_send',                 'native',               'ionos_smtp', true,  false, true, false, false, 'Proposals are sent over the native IONOS lane with founder approval.'),
  (NULL, 'invoice_chaser',                'invoice_chaser',                'native',               'ionos_smtp', true,  false, true, false, false, 'Invoice chasers go via the native IONOS lane.'),
  (NULL, 'supplier_message',              'supplier_message',              'native',               'ionos_smtp', true,  false, true, false, false, 'Supplier messages route through the native IONOS lane.'),
  (NULL, 'founder_manual_email',          'founder_manual_email',          'native_manual',        'native',     true,  false, true, false, false, 'Founder-composed manual email — native lane only, never auto-sent.')
ON CONFLICT DO NOTHING;
