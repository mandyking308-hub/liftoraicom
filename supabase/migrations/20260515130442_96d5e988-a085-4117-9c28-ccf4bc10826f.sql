-- 1. ai_agent_roles
CREATE TABLE IF NOT EXISTS public.ai_agent_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_key text NOT NULL UNIQUE,
  agent_name text NOT NULL,
  agent_category text NOT NULL,
  description text,
  primary_module text,
  default_status text NOT NULL DEFAULT 'preview',
  can_read_crm boolean NOT NULL DEFAULT true,
  can_read_conversations boolean NOT NULL DEFAULT true,
  can_read_finance boolean NOT NULL DEFAULT false,
  can_read_suppliers boolean NOT NULL DEFAULT false,
  can_call_external_providers boolean NOT NULL DEFAULT false,
  can_mutate_operational_data boolean NOT NULL DEFAULT false,
  can_send_email boolean NOT NULL DEFAULT false,
  can_create_proposals boolean NOT NULL DEFAULT false,
  can_create_deals boolean NOT NULL DEFAULT false,
  can_create_invoices boolean NOT NULL DEFAULT false,
  founder_approval_required boolean NOT NULL DEFAULT true,
  auto_action_allowed boolean NOT NULL DEFAULT false,
  risk_level text NOT NULL DEFAULT 'medium',
  guardrails jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_agent_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Founders/admins read ai_agent_roles" ON public.ai_agent_roles;
CREATE POLICY "Founders/admins read ai_agent_roles" ON public.ai_agent_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'founder'::app_role));
DROP POLICY IF EXISTS "Founders/admins write ai_agent_roles" ON public.ai_agent_roles;
CREATE POLICY "Founders/admins write ai_agent_roles" ON public.ai_agent_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'founder'::app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'founder'::app_role));

-- 2. ai_agent_permissions
CREATE TABLE IF NOT EXISTS public.ai_agent_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_role_id uuid NOT NULL REFERENCES public.ai_agent_roles(id) ON DELETE CASCADE,
  permission_key text NOT NULL,
  permission_label text NOT NULL,
  allowed boolean NOT NULL DEFAULT false,
  requires_founder_approval boolean NOT NULL DEFAULT true,
  feature_flag_required text,
  notes text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (agent_role_id, permission_key)
);
ALTER TABLE public.ai_agent_permissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Founders/admins read ai_agent_permissions" ON public.ai_agent_permissions;
CREATE POLICY "Founders/admins read ai_agent_permissions" ON public.ai_agent_permissions FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'founder'::app_role));
DROP POLICY IF EXISTS "Founders/admins write ai_agent_permissions" ON public.ai_agent_permissions;
CREATE POLICY "Founders/admins write ai_agent_permissions" ON public.ai_agent_permissions FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'founder'::app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'founder'::app_role));

-- 3. ai_agent_operating_status
CREATE TABLE IF NOT EXISTS public.ai_agent_operating_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_key text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'preview',
  health text NOT NULL DEFAULT 'unknown',
  last_checked_at timestamptz,
  last_run_at timestamptz,
  pending_items integer NOT NULL DEFAULT 0,
  blocked_items integer NOT NULL DEFAULT 0,
  completed_items integer NOT NULL DEFAULT 0,
  error_count integer NOT NULL DEFAULT 0,
  current_blockers jsonb NOT NULL DEFAULT '[]'::jsonb,
  no_send_status boolean NOT NULL DEFAULT true,
  auto_action_status boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_agent_operating_status ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Founders/admins read ai_agent_operating_status" ON public.ai_agent_operating_status;
CREATE POLICY "Founders/admins read ai_agent_operating_status" ON public.ai_agent_operating_status FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'founder'::app_role));
DROP POLICY IF EXISTS "Founders/admins write ai_agent_operating_status" ON public.ai_agent_operating_status;
CREATE POLICY "Founders/admins write ai_agent_operating_status" ON public.ai_agent_operating_status FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'founder'::app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'founder'::app_role));

-- Seed agents
INSERT INTO public.ai_agent_roles (agent_key, agent_name, agent_category, description, primary_module, can_read_finance, can_read_suppliers, risk_level, guardrails) VALUES
  ('outreach_agent','Outreach Agent','outreach','Cold outreach readiness and provider state. No sends; no Apollo unless founder enables; Smartlead mutation disabled.','outreach',false,false,'high','{"no_send":true,"no_apollo":true,"no_smartlead_post":true}'::jsonb),
  ('inbox_agent','Inbox Agent','conversations','Reads inbound communications and replies, classifies urgency, prepares draft routing. No send.','conversations',false,false,'medium','{"no_send":true}'::jsonb),
  ('ai_engagement_agent','AI Engagement Agent','crm','Uses CRM interaction/timeline/conversation data to classify intent and recommend next action. No send.','crm',false,false,'medium','{"no_send":true}'::jsonb),
  ('proposal_agent','Proposal Agent','proposals','Previews/generates proposal drafts. Founder approval required. No sending.','proposals',true,false,'high','{"no_send":true,"founder_approval":true}'::jsonb),
  ('demo_agent','Demo Agent','demos','Previews demo access readiness. No live demo token creation unless future flag.','demos',false,false,'medium','{"no_token_creation":true}'::jsonb),
  ('deal_agent','Deal Agent','deals','Recommends deal creation/stage movement. No auto deal creation.','deals',true,false,'high','{"no_auto_create":true}'::jsonb),
  ('finance_agent','Finance Agent','finance','Reads invoices/payments/targets and recommends finance action. No automatic chasing or invoice mutation.','finance',true,false,'high','{"no_auto_chase":true,"no_invoice_mutation":true}'::jsonb),
  ('supplier_agent','Supplier Agent','suppliers','Reads suppliers/assignments and recommends. No automatic supplier assignment.','suppliers',false,true,'medium','{"no_auto_assign":true}'::jsonb),
  ('compliance_agent','Compliance Agent','compliance','Reviews compliance state. Can recommend suppression/review. No automatic bulk approval.','compliance',false,false,'high','{"no_bulk_approval":true}'::jsonb),
  ('ops_agent','Ops Agent','operations','Reads system warnings/diagnostics and recommends fixes. No operational mutation.','system',false,false,'medium','{"no_mutation":true}'::jsonb),
  ('founder_copilot_agent','Founder Copilot','copilot','Summarises system and recommends founder decisions. No direct operational mutation.','copilot',true,true,'low','{"no_mutation":true}'::jsonb),
  ('priority_agent','Priority Agent','priority','Scores and prioritises tasks. No direct send/action.','priority',false,false,'low','{"no_send":true}'::jsonb)
ON CONFLICT (agent_key) DO NOTHING;

-- Seed permissions for every agent
DO $$
DECLARE r record;
DECLARE perms text[][] := ARRAY[
  ARRAY['read_crm','Read CRM','t','f'],
  ARRAY['read_conversations','Read conversations','t','f'],
  ARRAY['classify_intent','Classify intent','t','f'],
  ARRAY['draft_reply','Draft reply','t','t'],
  ARRAY['recommend_next_action','Recommend next action','t','t'],
  ARRAY['preview_proposal','Preview proposal','t','t'],
  ARRAY['preview_demo','Preview demo','t','t'],
  ARRAY['preview_deal','Preview deal','t','t'],
  ARRAY['preview_invoice','Preview invoice','t','t'],
  ARRAY['preview_supplier_assignment','Preview supplier assignment','t','t'],
  ARRAY['create_ai_action_preview','Create AI action preview','t','t'],
  ARRAY['create_founder_review_item','Create founder review item','t','t'],
  ARRAY['send_email','Send email','f','t'],
  ARRAY['call_apollo','Call Apollo','f','t'],
  ARRAY['smartlead_post','Smartlead POST','f','t'],
  ARRAY['mutate_contacts','Mutate contacts','f','t'],
  ARRAY['mutate_compliance','Mutate compliance','f','t'],
  ARRAY['create_deal','Create deal','f','t'],
  ARRAY['create_invoice','Create invoice','f','t']
];
DECLARE p text[];
BEGIN
  FOR r IN SELECT id FROM public.ai_agent_roles LOOP
    FOREACH p SLICE 1 IN ARRAY perms LOOP
      INSERT INTO public.ai_agent_permissions (agent_role_id, permission_key, permission_label, allowed, requires_founder_approval)
      VALUES (r.id, p[1], p[2], p[3]='t', p[4]='t')
      ON CONFLICT (agent_role_id, permission_key) DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

-- Seed operating status
INSERT INTO public.ai_agent_operating_status (agent_key, status, health, no_send_status, auto_action_status)
SELECT agent_key, 'preview', 'unknown', true, false FROM public.ai_agent_roles
ON CONFLICT (agent_key) DO NOTHING;