
-- 1) Extend buyer targets with warm-up planning fields
ALTER TABLE public.founder_led_buyer_targets
  ADD COLUMN IF NOT EXISTS warm_up_status text NOT NULL DEFAULT 'monitoring',
  ADD COLUMN IF NOT EXISTS buyer_motive text,
  ADD COLUMN IF NOT EXISTS next_warm_up_action text,
  ADD COLUMN IF NOT EXISTS next_action_due_date date,
  ADD COLUMN IF NOT EXISTS warm_up_notes text;

DO $$ BEGIN
  ALTER TABLE public.founder_led_buyer_targets
    ADD CONSTRAINT founder_led_buyer_targets_warm_up_status_check
    CHECK (warm_up_status = ANY (ARRAY[
      'monitoring','content_touchpoint_planned','intro_path_identified',
      'draft_ready','founder_approved_to_contact','contacted','replied',
      'meeting_booked','sale_conversation_ready','parked'
    ]));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2) Warm-up actions log (internal planning only — nothing leaves Liftor)
CREATE TABLE IF NOT EXISTS public.founder_led_buyer_warm_up_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid,
  buyer_target_id uuid REFERENCES public.founder_led_buyer_targets(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  action_summary text,
  channel_hint text,
  due_date date,
  status text NOT NULL DEFAULT 'planned',
  founder_approval_required boolean NOT NULL DEFAULT true,
  founder_approved boolean NOT NULL DEFAULT false,
  founder_approved_at timestamptz,
  founder_approved_by uuid,
  evidence_links jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT founder_led_buyer_warm_up_actions_action_type_check
    CHECK (action_type = ANY (ARRAY[
      'follow_company','monitor_acquisitions','monitor_hiring_growth',
      'identify_warm_intro_path','draft_soft_relationship_email',
      'draft_founder_positioning_note','draft_partnership_angle',
      'draft_buyer_thesis','prepare_data_room_readiness_note',
      'mark_buyer_ready_for_founder_review','mark_sale_conversation_ready'
    ])),
  CONSTRAINT founder_led_buyer_warm_up_actions_status_check
    CHECK (status = ANY (ARRAY['planned','in_progress','blocked','awaiting_founder_approval','completed','cancelled']))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.founder_led_buyer_warm_up_actions TO authenticated;
GRANT ALL ON public.founder_led_buyer_warm_up_actions TO service_role;

ALTER TABLE public.founder_led_buyer_warm_up_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "founder_led_buyer_warm_up_actions_founder_only"
  ON public.founder_led_buyer_warm_up_actions
  FOR ALL TO authenticated
  USING (public._is_founder_or_admin())
  WITH CHECK (public._is_founder_or_admin());

CREATE TRIGGER trg_founder_led_buyer_warm_up_actions_updated_at
  BEFORE UPDATE ON public.founder_led_buyer_warm_up_actions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Safety trigger: never let an action be marked completed/in-progress
-- as an external contact step without explicit founder approval.
CREATE OR REPLACE FUNCTION public.enforce_founder_approval_for_warm_up_action()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.action_type IN (
    'draft_soft_relationship_email','draft_founder_positioning_note',
    'draft_partnership_angle','draft_buyer_thesis','mark_sale_conversation_ready'
  ) AND NEW.status = 'completed' AND NEW.founder_approved IS NOT TRUE THEN
    RAISE EXCEPTION 'Founder approval required before marking buyer-contact-style warm-up action completed';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_enforce_founder_approval_for_warm_up_action
  BEFORE INSERT OR UPDATE ON public.founder_led_buyer_warm_up_actions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_founder_approval_for_warm_up_action();
