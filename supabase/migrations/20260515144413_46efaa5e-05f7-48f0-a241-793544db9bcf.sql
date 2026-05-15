CREATE TABLE IF NOT EXISTS public.smartlead_activation_checklist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid,
  liftor_campaign_id uuid,
  provider_campaign_id text,
  checklist_key text NOT NULL,
  checklist_label text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  blocker_reason text,
  last_checked_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_smac_business ON public.smartlead_activation_checklist(business_id);
CREATE INDEX IF NOT EXISTS idx_smac_key ON public.smartlead_activation_checklist(checklist_key);
CREATE INDEX IF NOT EXISTS idx_smac_status ON public.smartlead_activation_checklist(status);

ALTER TABLE public.smartlead_activation_checklist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "founders_admins_all_smac"
ON public.smartlead_activation_checklist
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'founder'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'founder'::app_role));

CREATE TRIGGER trg_smac_updated_at BEFORE UPDATE ON public.smartlead_activation_checklist
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();