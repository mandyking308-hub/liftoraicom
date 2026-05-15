CREATE TABLE IF NOT EXISTS public.customer_stewardship_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NULL,
  contact_id uuid NULL,
  conversation_id uuid NULL,
  current_owner_agent_key text NOT NULL,
  previous_owner_agent_key text NULL,
  stewardship_status text NOT NULL DEFAULT 'active',
  customer_stage text NULL,
  detected_intent text NULL,
  current_priority text NOT NULL DEFAULT 'normal',
  next_best_action text NULL,
  founder_review_required boolean NOT NULL DEFAULT true,
  last_agent_handover_id uuid NULL,
  last_interaction_at timestamptz NULL,
  next_due_at timestamptz NULL,
  risk_flags jsonb NOT NULL DEFAULT '[]'::jsonb,
  handover_summary text NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_csa_business ON public.customer_stewardship_assignments(business_id);
CREATE INDEX IF NOT EXISTS idx_csa_contact ON public.customer_stewardship_assignments(contact_id);
CREATE INDEX IF NOT EXISTS idx_csa_conversation ON public.customer_stewardship_assignments(conversation_id);
CREATE INDEX IF NOT EXISTS idx_csa_status ON public.customer_stewardship_assignments(stewardship_status);
CREATE INDEX IF NOT EXISTS idx_csa_owner ON public.customer_stewardship_assignments(current_owner_agent_key);

ALTER TABLE public.customer_stewardship_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "csa_founder_admin_select" ON public.customer_stewardship_assignments;
CREATE POLICY "csa_founder_admin_select" ON public.customer_stewardship_assignments
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'founder'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "csa_founder_admin_insert" ON public.customer_stewardship_assignments;
CREATE POLICY "csa_founder_admin_insert" ON public.customer_stewardship_assignments
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'founder'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "csa_founder_admin_update" ON public.customer_stewardship_assignments;
CREATE POLICY "csa_founder_admin_update" ON public.customer_stewardship_assignments
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'founder'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "csa_founder_admin_delete" ON public.customer_stewardship_assignments;
CREATE POLICY "csa_founder_admin_delete" ON public.customer_stewardship_assignments
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'founder'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));

DROP TRIGGER IF EXISTS update_csa_updated_at ON public.customer_stewardship_assignments;
CREATE TRIGGER update_csa_updated_at
  BEFORE UPDATE ON public.customer_stewardship_assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();